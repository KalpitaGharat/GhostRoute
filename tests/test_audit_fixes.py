"""GhostRoute AI - Comprehensive Audit & Correctness Regression Tests
Covers Issues 1 through 5:
- Issue 1: Port matching semantics, port ranges, and validation
- Issue 2: Real CIDR/IP subnet matching with ipaddress
- Issue 3: Explicit default firewall/router policies (default DENY on firewalls)
- Issue 4: Network validation before graph analysis
- Issue 5: Multi-hop path and transit forwarding semantics
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas import (
    NetworkModel,
    Device,
    Connection,
    FirewallRule,
    AccessPolicy,
    DeviceType,
    RuleAction,
    PolicyVerdict,
    SeverityLevel,
    FlowVerdict
)
from backend.validation import (
    parse_ip_or_network,
    parse_port_or_range,
    validate_network_model,
    assert_network_valid,
    NetworkValidationError
)
from backend.graph_adapter import DefaultNetworkXEngine

client = TestClient(app)


# ============================================================================
# ISSUE 1: Port Matching Tests
# ============================================================================

def test_port_matching_specific_ports():
    """Verify that a rule restricted to a specific port matches only that port."""
    engine = DefaultNetworkXEngine()
    rule = FirewallRule(
        id="R1",
        device_id="fw1",
        action=RuleAction.ALLOW,
        protocol="TCP",
        port=8080,
        priority=100
    )

    # Matching port
    assert engine._matches_port(rule, 8080) is True
    # Mismatched port
    assert engine._matches_port(rule, 80) is False
    assert engine._matches_port(rule, 443) is False


def test_port_matching_missing_request_port():
    """Verify that a rule restricted to a specific port does NOT match an unknown request port (None)."""
    engine = DefaultNetworkXEngine()
    rule_specific = FirewallRule(
        id="R-SPECIFIC",
        device_id="fw1",
        action=RuleAction.ALLOW,
        protocol="TCP",
        port=8080,
        priority=100
    )

    # Request port is None -> must NOT match!
    assert engine._matches_port(rule_specific, None) is False


def test_port_matching_unrestricted_rule():
    """Verify that a genuinely unrestricted rule (port=None) matches any port and None."""
    engine = DefaultNetworkXEngine()
    rule_unrestricted = FirewallRule(
        id="R-ANY-PORT",
        device_id="fw1",
        action=RuleAction.ALLOW,
        protocol="TCP",
        port=None,
        port_range=None,
        priority=100
    )

    # Matches specific ports and unknown ports
    assert engine._matches_port(rule_unrestricted, 80) is True
    assert engine._matches_port(rule_unrestricted, 443) is True
    assert engine._matches_port(rule_unrestricted, None) is True


def test_port_range_matching():
    """Verify port range matching semantics (e.g. 8000-8080)."""
    engine = DefaultNetworkXEngine()
    rule_range = FirewallRule(
        id="R-RANGE",
        device_id="fw1",
        action=RuleAction.ALLOW,
        protocol="TCP",
        port=None,
        port_range="8000-8080",
        priority=100
    )

    assert engine._matches_port(rule_range, 8000) is True
    assert engine._matches_port(rule_range, 8050) is True
    assert engine._matches_port(rule_range, 8080) is True
    assert engine._matches_port(rule_range, 7999) is False
    assert engine._matches_port(rule_range, 8081) is False
    assert engine._matches_port(rule_range, None) is False


def test_port_validation_rejects_malformed_ports():
    """Verify that invalid ports and malformed ranges raise ValueError."""
    # Negative port
    with pytest.raises(ValueError):
        parse_port_or_range(-1)

    # Port zero
    with pytest.raises(ValueError):
        parse_port_or_range(0)

    # Port > 65535
    with pytest.raises(ValueError):
        parse_port_or_range(65536)

    # Inverted range (start > end)
    with pytest.raises(ValueError):
        parse_port_or_range("500-100")

    # Non-integer string
    with pytest.raises(ValueError):
        parse_port_or_range("eighty")


def test_protocol_matching_tcp_vs_udp():
    """Verify TCP does not match UDP, and ANY matches both."""
    engine = DefaultNetworkXEngine()
    assert engine._matches_protocol("TCP", "TCP") is True
    assert engine._matches_protocol("TCP", "UDP") is False
    assert engine._matches_protocol("UDP", "TCP") is False
    assert engine._matches_protocol("ANY", "TCP") is True
    assert engine._matches_protocol("ANY", "UDP") is True


# ============================================================================
# ISSUE 2: Real CIDR/IP Subnet Matching Tests
# ============================================================================

def test_cidr_ip_inside_subnet_matches():
    """Verify an IP inside a CIDR subnet matches correctly."""
    engine = DefaultNetworkXEngine()
    # 10.0.1.50 is inside 10.0.1.0/24
    assert engine._matches_ip("10.0.1.0/24", "10.0.1.50") is True
    assert engine._matches_ip("192.168.0.0/16", "192.168.10.5") is True


def test_cidr_ip_outside_subnet_does_not_match():
    """Verify an IP outside a CIDR subnet does NOT match."""
    engine = DefaultNetworkXEngine()
    assert engine._matches_ip("10.0.1.0/24", "10.0.2.10") is False
    assert engine._matches_ip("192.168.1.0/24", "192.168.2.1") is False


def test_exact_ip_matches_only_intended_host():
    """Verify an exact IP specification matches only that host."""
    engine = DefaultNetworkXEngine()
    assert engine._matches_ip("10.0.1.10", "10.0.1.10") is True
    assert engine._matches_ip("10.0.1.10", "10.0.1.11") is False


def test_cidr_network_boundary_matching():
    """Verify network boundary addresses."""
    engine = DefaultNetworkXEngine()
    # Network and broadcast addresses are included in strict=False subnet checks
    assert engine._matches_ip("10.0.1.0/24", "10.0.1.0") is True
    assert engine._matches_ip("10.0.1.0/24", "10.0.1.255") is True
    assert engine._matches_ip("10.0.1.0/24", "10.0.2.0") is False


def test_malformed_ip_and_cidr_rejected():
    """Verify that invalid IP/CIDR definitions raise ValueError during validation."""
    with pytest.raises(ValueError):
        parse_ip_or_network("999.999.999.999")

    with pytest.raises(ValueError):
        parse_ip_or_network("10.0.0.1/35")

    with pytest.raises(ValueError):
        parse_ip_or_network("not-an-ip")


def test_ipv4_and_ipv6_not_mixed():
    """Verify IPv4 and IPv6 addresses do not match each other."""
    engine = DefaultNetworkXEngine()
    assert engine._matches_ip("2001:db8::/32", "192.168.1.1") is False
    assert engine._matches_ip("192.168.1.0/24", "2001:db8::1") is False


# ============================================================================
# ISSUE 3: Default Firewall/Router Behavior Tests
# ============================================================================

def test_firewall_with_no_rules_denies_transit():
    """Verify a firewall with no rules defaults to DENY (Issue 3)."""
    engine = DefaultNetworkXEngine()
    fw = Device(id="fw-empty", name="Empty Firewall", type=DeviceType.FIREWALL, zone="CORE", ip="10.0.0.1")
    src = Device(id="src-dev", name="Source Host", type=DeviceType.HOST, zone="DMZ", ip="10.0.0.10")
    dst = Device(id="dst-dev", name="Dest Host", type=DeviceType.HOST, zone="INTERNAL", ip="10.0.0.20")

    allowed, rule_id, reason = engine._is_hop_permitted(
        fw, src, dst, "TCP", 80, rules_by_device={}
    )
    assert allowed is False
    assert "default DENY" in reason


def test_firewall_unmatched_traffic_denied():
    """Verify traffic that matches no rule on a firewall is denied by default."""
    engine = DefaultNetworkXEngine()
    fw = Device(id="fw1", name="Core FW", type=DeviceType.FIREWALL, zone="CORE", ip="10.0.0.1")
    src = Device(id="src", name="Src", type=DeviceType.HOST, zone="DMZ", ip="10.0.0.10")
    dst = Device(id="dst", name="Dst", type=DeviceType.HOST, zone="INTERNAL", ip="10.0.0.20")

    # Firewall only allows port 443
    rule = FirewallRule(id="R-HTTPS", device_id="fw1", action=RuleAction.ALLOW, port=443, priority=100)
    rules_map = {"fw1": [rule]}

    # Port 80 is unmatched -> DENIED by default
    allowed, rule_id, reason = engine._is_hop_permitted(
        fw, src, dst, "TCP", 80, rules_by_device=rules_map
    )
    assert allowed is False
    assert "default DENY" in reason


def test_firewall_explicit_deny_rule_respected():
    """Verify an explicit DENY rule blocks matching traffic."""
    engine = DefaultNetworkXEngine()
    fw = Device(id="fw1", name="Core FW", type=DeviceType.FIREWALL, zone="CORE", ip="10.0.0.1")
    src = Device(id="src", name="Src", type=DeviceType.HOST, zone="DMZ", ip="10.0.0.10")
    dst = Device(id="dst", name="Dst", type=DeviceType.HOST, zone="INTERNAL", ip="10.0.0.20")

    # Priority 10: DENY port 80; Priority 20: ALLOW port 80
    deny_rule = FirewallRule(id="R-DENY", device_id="fw1", action=RuleAction.DENY, port=80, priority=10)
    allow_rule = FirewallRule(id="R-ALLOW", device_id="fw1", action=RuleAction.ALLOW, port=80, priority=20)
    rules_map = {"fw1": [deny_rule, allow_rule]}

    allowed, rule_id, reason = engine._is_hop_permitted(
        fw, src, dst, "TCP", 80, rules_by_device=rules_map
    )
    assert allowed is False
    assert rule_id == "R-DENY"
    assert "Blocked by explicit firewall DENY rule" in reason


def test_router_forwards_without_acls():
    """Verify a router without ACL rules forwards transit traffic."""
    engine = DefaultNetworkXEngine()
    router = Device(id="r1", name="Core Router", type=DeviceType.ROUTER, zone="CORE", ip="10.0.0.1")
    src = Device(id="src", name="Src", type=DeviceType.HOST, zone="SUB1", ip="10.0.1.10")
    dst = Device(id="dst", name="Dst", type=DeviceType.HOST, zone="SUB2", ip="10.0.2.10")

    allowed, rule_id, reason = engine._is_hop_permitted(
        router, src, dst, "TCP", 80, rules_by_device={}
    )
    assert allowed is True
    assert "Forwarded by transit router" in reason


# ============================================================================
# ISSUE 4: Network Validation Before Analysis Tests
# ============================================================================

def test_validation_rejects_unknown_device_in_connection():
    """Verify connection referencing non-existent device is rejected."""
    bad_net = NetworkModel(
        name="Bad Net",
        devices=[Device(id="d1", name="D1", type=DeviceType.HOST, zone="Z1")],
        connections=[Connection(source="d1", target="d2_ghost")],  # d2_ghost does not exist!
        firewall_rules=[],
        access_policies=[]
    )
    errors = validate_network_model(bad_net)
    assert len(errors) >= 1
    assert any("references unknown target device 'd2_ghost'" in e for e in errors)

    with pytest.raises(NetworkValidationError):
        assert_network_valid(bad_net)


def test_validation_rejects_unknown_device_in_rule():
    """Verify rule attached to non-existent device is rejected."""
    bad_net = NetworkModel(
        name="Bad Net",
        devices=[Device(id="d1", name="D1", type=DeviceType.HOST, zone="Z1")],
        connections=[],
        firewall_rules=[
            FirewallRule(id="R1", device_id="ghost_fw", action=RuleAction.ALLOW, priority=100)
        ],
        access_policies=[]
    )
    errors = validate_network_model(bad_net)
    assert len(errors) >= 1
    assert any("attached to unknown device 'ghost_fw'" in e for e in errors)


def test_validation_rejects_duplicate_device_ids():
    """Verify duplicate device identifiers are rejected."""
    bad_net = NetworkModel(
        name="Dup Net",
        devices=[
            Device(id="d1", name="Device 1", type=DeviceType.HOST, zone="Z1"),
            Device(id="d1", name="Device 1 Duplicate", type=DeviceType.HOST, zone="Z1")
        ],
        connections=[],
        firewall_rules=[],
        access_policies=[]
    )
    errors = validate_network_model(bad_net)
    assert len(errors) >= 1
    assert any("Duplicate device identifier 'd1'" in e for e in errors)


def test_validation_rejects_malformed_rule_cidr_and_port():
    """Verify malformed CIDR and invalid port numbers in rules are caught."""
    bad_net = NetworkModel(
        name="Bad Net",
        devices=[Device(id="fw1", name="FW", type=DeviceType.FIREWALL, zone="Z1")],
        connections=[],
        firewall_rules=[
            FirewallRule(
                id="R-BAD",
                device_id="fw1",
                action=RuleAction.ALLOW,
                source_ip="999.999.999.999",  # Invalid!
                port=70000,  # Invalid!
                priority=100
            )
        ],
        access_policies=[]
    )
    errors = validate_network_model(bad_net)
    assert len(errors) >= 2
    assert any("source_ip definition" in e for e in errors)
    assert any("port number must be between 1 and 65535" in e for e in errors)


def test_api_rejects_invalid_network_before_analysis():
    """Verify POST /analyze returns 422 with validation errors before running analysis."""
    bad_payload = {
        "name": "Invalid Network",
        "devices": [{"id": "h1", "name": "Host 1", "type": "host", "zone": "Z1"}],
        "connections": [{"source": "h1", "target": "missing_node"}],
        "firewall_rules": [],
        "access_policies": []
    }
    response = client.post("/analyze", json=bad_payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert "references unknown target device 'missing_node'" in str(data)


# ============================================================================
# ISSUE 5: Multi-Hop Forwarding & Flow Semantics Tests
# ============================================================================

def test_server_without_forwarding_blocks_transit():
    """Verify an ordinary server without forwarding enabled cannot transit packets (Issue 5)."""
    engine = DefaultNetworkXEngine()
    # Topology: client -> web-server -> database
    net = NetworkModel(
        name="Three-Tier",
        devices=[
            Device(id="client", name="Client", type=DeviceType.HOST, zone="EXTERNAL", ip="192.168.1.10"),
            Device(id="web-server", name="Web Server", type=DeviceType.SERVER, zone="DMZ", ip="10.0.1.10", can_forward=False),
            Device(id="database", name="Database", type=DeviceType.DATABASE, zone="INTERNAL", ip="10.0.2.10")
        ],
        connections=[
            Connection(source="client", target="web-server"),
            Connection(source="web-server", target="database")
        ],
        firewall_rules=[],
        access_policies=[
            AccessPolicy(
                id="POL-DIRECT-ACCESS",
                name="Direct client to DB",
                source="client",
                destination="database",
                expected_verdict=PolicyVerdict.DENY,
                protocol="TCP",
                port=5432
            )
        ]
    )

    flow = engine.trace_flow(net, "client", "database", protocol="TCP", port=5432)
    assert flow.status == FlowVerdict.BLOCKED
    assert "cannot forward transit traffic" in flow.reason
    assert flow.blocking_device_id == "web-server"


def test_multihop_routed_path_with_router_succeeds():
    """Verify traffic through a transit router is allowed."""
    engine = DefaultNetworkXEngine()
    net = NetworkModel(
        name="Routed Network",
        devices=[
            Device(id="h1", name="Host 1", type=DeviceType.HOST, zone="SUB1", ip="10.0.1.10"),
            Device(id="r1", name="Core Router", type=DeviceType.ROUTER, zone="TRANSIT", ip="10.0.0.1"),
            Device(id="h2", name="Host 2", type=DeviceType.HOST, zone="SUB2", ip="10.0.2.10")
        ],
        connections=[
            Connection(source="h1", target="r1"),
            Connection(source="r1", target="h2")
        ],
        firewall_rules=[],
        access_policies=[]
    )

    flow = engine.trace_flow(net, "h1", "h2", protocol="TCP", port=80)
    assert flow.status == FlowVerdict.ALLOWED
    assert flow.path == ["h1", "r1", "h2"]


def test_multihop_blocked_by_intermediate_firewall():
    """Verify traffic through router and firewall where firewall blocks."""
    engine = DefaultNetworkXEngine()
    net = NetworkModel(
        name="Routed Firewalled Network",
        devices=[
            Device(id="h1", name="Host 1", type=DeviceType.HOST, zone="SUB1", ip="10.0.1.10"),
            Device(id="r1", name="Router", type=DeviceType.ROUTER, zone="TRANSIT", ip="10.0.0.1"),
            Device(id="fw1", name="Firewall", type=DeviceType.FIREWALL, zone="SEC", ip="10.0.0.2"),
            Device(id="h2", name="Host 2", type=DeviceType.HOST, zone="SUB2", ip="10.0.2.10")
        ],
        connections=[
            Connection(source="h1", target="r1"),
            Connection(source="r1", target="fw1"),
            Connection(source="fw1", target="h2")
        ],
        firewall_rules=[
            # fw1 only allows port 443
            FirewallRule(id="FW-HTTPS-ONLY", device_id="fw1", action=RuleAction.ALLOW, port=443, priority=100)
        ],
        access_policies=[]
    )

    # Port 80 must be blocked by fw1
    flow_80 = engine.trace_flow(net, "h1", "h2", protocol="TCP", port=80)
    assert flow_80.status == FlowVerdict.BLOCKED
    assert flow_80.blocking_device_id == "fw1"

    # Port 443 must be allowed
    flow_443 = engine.trace_flow(net, "h1", "h2", protocol="TCP", port=443)
    assert flow_443.status == FlowVerdict.ALLOWED
    assert flow_443.supporting_rule_ids == ["FW-HTTPS-ONLY"]
