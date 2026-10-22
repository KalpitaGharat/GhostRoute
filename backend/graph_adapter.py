"""GhostRoute AI - Graph Analysis Adapter
Defines the integration interface for graph analysis engines and provides
a deterministic NetworkX reference implementation with explicit forwarding,
CIDR subnet matching, port range evaluation, and default-deny firewall policies.

CONTRACT NOTICE FOR NEEV (Graph Engine Developer):
--------------------------------------------------
To plug in your custom deterministic graph engine:
1. Implement the `NetworkGraphEngine` abstract base class.
2. Call `set_active_graph_engine(MyCustomEngine())` at application startup.
3. Your engine must return findings conforming to `List[AnalysisFinding]`.
"""

import ipaddress
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Set, Dict, Any, Union
import networkx as nx

from backend.schemas import (
    NetworkModel,
    AnalysisFinding,
    FirewallRule,
    Device,
    DeviceType,
    RuleAction,
    PolicyVerdict,
    SeverityLevel,
    FlowVerdict,
    HopTrace,
    FlowTrace
)
from backend.validation import (
    parse_ip_or_network,
    parse_port_or_range,
    assert_network_valid,
    NetworkValidationError
)


class NetworkGraphEngine(ABC):
    """Abstract interface for network graph analysis engines."""

    @property
    @abstractmethod
    def engine_name(self) -> str:
        """Identifies the analysis engine implementation."""
        pass

    @abstractmethod
    def analyze_policies(self, network: NetworkModel) -> List[AnalysisFinding]:
        """Analyze network model against access policies and return violations."""
        pass

    @abstractmethod
    def find_permitted_path(
        self,
        network: NetworkModel,
        source_id: str,
        dest_id: str,
        protocol: str = "TCP",
        port: Optional[int] = None
    ) -> Optional[Tuple[List[str], List[str]]]:
        """Check if a path is permitted between source and destination.
        
        Returns:
            Tuple of (path_device_ids, supporting_rule_ids) if reachable, or None.
        """
        pass

    @abstractmethod
    def trace_flow(
        self,
        network: NetworkModel,
        source_id: str,
        dest_id: str,
        protocol: str = "TCP",
        port: Optional[int] = None
    ) -> FlowTrace:
        """Trace traffic flow end-to-end, distinguishing reachability, forwarding, and authorization."""
        pass


class DefaultNetworkXEngine(NetworkGraphEngine):
    """Deterministic reference implementation using NetworkX with rigorous
    L3/L4 packet matching, CIDR network membership, port range validation,
    and explicit default-deny firewall semantics.
    """

    @property
    def engine_name(self) -> str:
        return "DeterministicNetworkXReferenceEngine"

    def _build_topology_graph(self, network: NetworkModel) -> nx.DiGraph:
        """Build directed topology graph with device metadata."""
        graph = nx.DiGraph()
        
        for device in network.devices:
            graph.add_node(
                device.id,
                name=device.name,
                type=device.type.value if hasattr(device.type, "value") else str(device.type),
                zone=device.zone,
                ip=device.ip or "",
                can_forward=device.is_forwarding_capable()
            )

        for conn in network.connections:
            graph.add_edge(conn.source, conn.target)
            if conn.bidirectional:
                graph.add_edge(conn.target, conn.source)

        return graph

    def _matches_port(
        self,
        rule: FirewallRule,
        req_port: Optional[int]
    ) -> bool:
        """Evaluate port matching semantics according to Issue 1 specifications.
        
        Semantics:
        - If a rule defines a port or port range:
            - If request port is None (unknown port): does NOT match.
            - If request port is specified: matches if port is within range.
        - If a rule has NO port restriction (port is None and port_range is None):
            - Unrestricted rule matches any port (whether specified or unknown).
        """
        rule_range = None
        if rule.port_range:
            rule_range = parse_port_or_range(rule.port_range, "rule.port_range")
        elif rule.port is not None:
            rule_range = parse_port_or_range(rule.port, "rule.port")

        if rule_range is not None:
            # Rule has port restrictions
            if req_port is None:
                # Port-restricted rule must NOT match an unknown port
                return False
            start_p, end_p = rule_range
            return start_p <= req_port <= end_p
        else:
            # Rule is genuinely unrestricted for port
            return True

    def _matches_ip(
        self,
        rule_ip_spec: Optional[str],
        device_ip: Optional[str],
        field_name: str = "IP"
    ) -> bool:
        """Evaluate CIDR subnet and exact IP matching using ipaddress (Issue 2).
        
        Semantics:
        - If rule specifies None, '', '*', 'ANY': matches any IP.
        - If rule specifies an IP or CIDR (e.g., '10.0.1.0/24' or '10.0.1.10'):
            - If device_ip is missing: returns False.
            - Validates IP versions: mixing IPv4 and IPv6 returns False.
            - Performs real network membership check: `dev_addr in rule_net`.
        """
        if rule_ip_spec is None:
            return True
        spec = str(rule_ip_spec).strip()
        if spec in ("", "*", "ANY", "any"):
            return True

        if not device_ip or not device_ip.strip():
            return False

        rule_net = parse_ip_or_network(spec, field_name=field_name)
        if rule_net is None:
            return True

        try:
            dev_addr = ipaddress.ip_address(device_ip.strip())
        except ValueError:
            return False

        # Prevent cross-protocol IPv4/IPv6 comparison
        if rule_net.version != dev_addr.version:
            return False

        return dev_addr in rule_net

    def _matches_protocol(self, rule_proto: str, req_proto: str) -> bool:
        """Check protocol match (TCP, UDP, ICMP, ANY)."""
        if not rule_proto:
            return True
        rp = rule_proto.strip().upper()
        if rp in ("ANY", "*"):
            return True
        return rp == req_proto.strip().upper()

    def _matches_zone(self, rule_zone: Optional[str], device_zone: str) -> bool:
        """Check zone match (* or exact zone name)."""
        if rule_zone is None:
            return True
        rz = str(rule_zone).strip()
        if rz in ("", "*", "ANY", "any"):
            return True
        return rz.upper() == device_zone.strip().upper()

    def _matches_rule(
        self,
        rule: FirewallRule,
        source_device: Device,
        dest_device: Device,
        protocol: str,
        port: Optional[int]
    ) -> bool:
        """Check if a firewall rule matches a flow from source to destination."""
        if not rule.enabled:
            return False

        # Match protocol
        if not self._matches_protocol(rule.protocol, protocol):
            return False

        # Match port (Issue 1)
        if not self._matches_port(rule, port):
            return False

        # Match source zone
        if not self._matches_zone(rule.source_zone, source_device.zone):
            return False

        # Match destination zone
        if not self._matches_zone(rule.destination_zone, dest_device.zone):
            return False

        # Match source IP / CIDR (Issue 2)
        if not self._matches_ip(rule.source_ip, source_device.ip, field_name="source_ip"):
            return False

        # Match destination IP / CIDR (Issue 2)
        if not self._matches_ip(rule.destination_ip, dest_device.ip, field_name="destination_ip"):
            return False

        return True

    def _is_hop_permitted(
        self,
        device: Device,
        source_device: Device,
        dest_device: Device,
        protocol: str,
        port: Optional[int],
        rules_by_device: Dict[str, List[FirewallRule]]
    ) -> Tuple[bool, Optional[str], str]:
        """Evaluate rules and transit forwarding at an intermediate hop.
        
        Semantics (Issue 3 & Issue 5):
        - Forwarding capability must be verified for transit.
        - Firewalls default to DENY if no rules are configured or no rules match.
        - Routers forward by default unless blocked by an attached ACL rule.
        
        Returns:
            Tuple of (is_permitted, matched_rule_id, decision_reason)
        """
        device_rules = rules_by_device.get(device.id, [])

        # 1. Firewall Evaluation
        if device.type == DeviceType.FIREWALL:
            if not device_rules:
                # Default policy on firewall with no rules: DENY
                default_act = device.default_action or RuleAction.DENY
                if default_act == RuleAction.ALLOW:
                    return True, None, "FIREWALL_DEFAULT_ALLOW"
                return False, None, f"FIREWALL '{device.id}' has no rules configured (default DENY)"

            # Sort rules by priority (ascending: lower number = higher priority)
            sorted_rules = sorted(device_rules, key=lambda r: r.priority)

            for rule in sorted_rules:
                if self._matches_rule(rule, source_device, dest_device, protocol, port):
                    if rule.action == RuleAction.ALLOW:
                        return True, rule.id, f"Allowed by firewall rule '{rule.id}'"
                    else:
                        return False, rule.id, f"Blocked by explicit firewall DENY rule '{rule.id}'"

            # Unmatched traffic on firewall
            default_act = device.default_action or RuleAction.DENY
            if default_act == RuleAction.ALLOW:
                return True, None, "FIREWALL_DEFAULT_ALLOW"
            return False, None, f"Unmatched by any firewall rule on '{device.id}' (default DENY)"

        # 2. Router Evaluation
        elif device.type == DeviceType.ROUTER:
            if device_rules:
                # Evaluate router ACLs
                sorted_rules = sorted(device_rules, key=lambda r: r.priority)
                for rule in sorted_rules:
                    if self._matches_rule(rule, source_device, dest_device, protocol, port):
                        if rule.action == RuleAction.ALLOW:
                            return True, rule.id, f"Allowed by router ACL rule '{rule.id}'"
                        else:
                            return False, rule.id, f"Blocked by router ACL DENY rule '{rule.id}'"
                default_act = device.default_action or RuleAction.ALLOW
                if default_act == RuleAction.ALLOW:
                    return True, None, f"Forwarded by router '{device.id}' (unmatched ACL default permit)"
                return False, None, f"Blocked by router '{device.id}' default ACL policy"
            else:
                default_act = device.default_action or RuleAction.ALLOW
                if default_act == RuleAction.ALLOW:
                    return True, None, f"Forwarded by transit router '{device.id}'"
                return False, None, f"Blocked by router '{device.id}' default policy"

        # 3. Gateway, Switch, or host with forwarding enabled
        elif device.type in (DeviceType.GATEWAY, DeviceType.SWITCH) or device.is_forwarding_capable():
            if device_rules:
                sorted_rules = sorted(device_rules, key=lambda r: r.priority)
                for rule in sorted_rules:
                    if self._matches_rule(rule, source_device, dest_device, protocol, port):
                        if rule.action == RuleAction.ALLOW:
                            return True, rule.id, f"Allowed by rule '{rule.id}'"
                        else:
                            return False, rule.id, f"Blocked by rule '{rule.id}'"
            return True, None, f"Forwarded by transit device '{device.id}'"

        # 4. Ordinary endpoint without forwarding
        return False, None, f"Device '{device.id}' ({device.type.value}) does not have packet forwarding enabled"

    def trace_flow(
        self,
        network: NetworkModel,
        source_id: str,
        dest_id: str,
        protocol: str = "TCP",
        port: Optional[int] = None
    ) -> FlowTrace:
        """Trace traffic flow end-to-end, distinguishing reachability from forwarding and authorization."""
        assert_network_valid(network)

        devices_by_id = {d.id: d for d in network.devices}
        if source_id not in devices_by_id or dest_id not in devices_by_id:
            return FlowTrace(
                path=[],
                status=FlowVerdict.UNREACHABLE,
                reason=f"Source '{source_id}' or Destination '{dest_id}' not found in network."
            )

        source_dev = devices_by_id[source_id]
        dest_dev = devices_by_id[dest_id]

        rules_by_device: Dict[str, List[FirewallRule]] = {}
        for rule in network.firewall_rules:
            rules_by_device.setdefault(rule.device_id, []).append(rule)

        graph = self._build_topology_graph(network)

        if not nx.has_path(graph, source_id, dest_id):
            return FlowTrace(
                path=[],
                status=FlowVerdict.UNREACHABLE,
                reason=f"No topological link path exists between '{source_id}' and '{dest_id}'."
            )

        try:
            paths = list(nx.all_simple_paths(graph, source_id, dest_id, cutoff=8))
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return FlowTrace(
                path=[],
                status=FlowVerdict.UNREACHABLE,
                reason="No simple paths found in topology."
            )

        first_failure_reason = ""
        first_blocking_device = None

        for path in paths:
            path_allowed = True
            used_rule_ids: List[str] = []
            hop_traces: List[HopTrace] = []

            # Check every intermediate device on the path (excluding source and destination endpoints)
            for hop in path[1:-1]:
                hop_device = devices_by_id.get(hop)
                if not hop_device:
                    path_allowed = False
                    first_failure_reason = f"Intermediate node '{hop}' missing from device registry."
                    break

                # Forwarding check (Issue 5)
                if not hop_device.is_forwarding_capable():
                    path_allowed = False
                    reason = f"Endpoint '{hop}' ({hop_device.type.value}) cannot forward transit traffic."
                    hop_traces.append(
                        HopTrace(
                            device_id=hop,
                            device_type=hop_device.type.value,
                            can_forward=False,
                            reason=reason
                        )
                    )
                    if not first_failure_reason:
                        first_failure_reason = reason
                        first_blocking_device = hop
                    break

                # Authorization check (Issue 3)
                allowed, rule_id, reason = self._is_hop_permitted(
                    hop_device, source_dev, dest_dev, protocol, port, rules_by_device
                )

                hop_traces.append(
                    HopTrace(
                        device_id=hop,
                        device_type=hop_device.type.value,
                        can_forward=True,
                        firewall_evaluated=True,
                        action=RuleAction.ALLOW if allowed else RuleAction.DENY,
                        rule_id=rule_id,
                        reason=reason
                    )
                )

                if not allowed:
                    path_allowed = False
                    if not first_failure_reason:
                        first_failure_reason = reason
                        first_blocking_device = hop
                    break
                if rule_id:
                    used_rule_ids.append(rule_id)

            if path_allowed:
                return FlowTrace(
                    path=path,
                    status=FlowVerdict.ALLOWED,
                    hops=hop_traces,
                    supporting_rule_ids=used_rule_ids,
                    reason=f"End-to-end flow permitted via path [{' -> '.join(path)}]."
                )

        return FlowTrace(
            path=paths[0] if paths else [],
            status=FlowVerdict.BLOCKED,
            blocking_device_id=first_blocking_device,
            reason=first_failure_reason or "All topological paths are blocked by firewall policy or lack forwarding."
        )

    def find_permitted_path(
        self,
        network: NetworkModel,
        source_id: str,
        dest_id: str,
        protocol: str = "TCP",
        port: Optional[int] = None
    ) -> Optional[Tuple[List[str], List[str]]]:
        """Find a path permitted by intermediate firewall rules and forwarding devices."""
        flow_result = self.trace_flow(network, source_id, dest_id, protocol, port)
        if flow_result.status == FlowVerdict.ALLOWED:
            return flow_result.path, flow_result.supporting_rule_ids
        return None

    def analyze_policies(self, network: NetworkModel) -> List[AnalysisFinding]:
        """Analyze all access policies against the network model deterministically.
        
        Validates the network first before graph analysis (Issue 4).
        """
        assert_network_valid(network)

        findings: List[AnalysisFinding] = []
        finding_seq = 1

        for policy in network.access_policies:
            # Resolve source devices (can be device ID or zone name)
            source_devices = [
                d for d in network.devices
                if d.id == policy.source or d.zone.upper() == policy.source.upper()
            ]
            dest_devices = [
                d for d in network.devices
                if d.id == policy.destination or d.zone.upper() == policy.destination.upper()
            ]

            for s_dev in source_devices:
                for d_dev in dest_devices:
                    if s_dev.id == d_dev.id:
                        continue

                    flow_res = self.trace_flow(
                        network,
                        s_dev.id,
                        d_dev.id,
                        protocol=policy.protocol,
                        port=policy.port
                    )

                    if policy.expected_verdict == PolicyVerdict.DENY:
                        # Violation: A path exists where it should be DENIED!
                        if flow_res.status == FlowVerdict.ALLOWED:
                            finding = AnalysisFinding(
                                id=f"FINDING-{policy.id}-{finding_seq}",
                                source=s_dev.id,
                                destination=d_dev.id,
                                protocol=policy.protocol,
                                port=policy.port,
                                discovered_path=flow_res.path,
                                supporting_rule_ids=flow_res.supporting_rule_ids,
                                violated_policy_id=policy.id,
                                severity=policy.severity,
                                description=(
                                    f"Unintended trust path discovered from {s_dev.id} ({s_dev.zone}) "
                                    f"to {d_dev.id} ({d_dev.zone}) via path [{' -> '.join(flow_res.path)}] "
                                    f"on {policy.protocol}:{policy.port or 'any'}. "
                                    f"Permitted by rules: {flow_res.supporting_rule_ids or ['Default-Permit']}."
                                ),
                                status="DETECTED"
                            )
                            findings.append(finding)
                            finding_seq += 1

                    elif policy.expected_verdict == PolicyVerdict.ALLOW and policy.required:
                        # Violation: Required business traffic is BLOCKED or UNREACHABLE!
                        if flow_res.status != FlowVerdict.ALLOWED:
                            finding = AnalysisFinding(
                                id=f"FINDING-{policy.id}-{finding_seq}",
                                source=s_dev.id,
                                destination=d_dev.id,
                                protocol=policy.protocol,
                                port=policy.port,
                                discovered_path=flow_res.path if flow_res.path else [],
                                supporting_rule_ids=[],
                                violated_policy_id=policy.id,
                                severity=policy.severity,
                                description=(
                                    f"Required legitimate path blocked from {s_dev.id} "
                                    f"to {d_dev.id} on {policy.protocol}:{policy.port or 'any'}. "
                                    f"Reason: {flow_res.reason}."
                                ),
                                status="DETECTED"
                            )
                            findings.append(finding)
                            finding_seq += 1

        return findings


# ============================================================================
# Engine Singleton & Adapter Registry
# ============================================================================

_active_graph_engine: NetworkGraphEngine = DefaultNetworkXEngine()


def get_active_graph_engine() -> NetworkGraphEngine:
    """Return the currently registered graph analysis engine."""
    return _active_graph_engine


def set_active_graph_engine(engine: NetworkGraphEngine) -> None:
    """Register a custom graph analysis engine (e.g., Neev's engine)."""
    global _active_graph_engine
    _active_graph_engine = engine
