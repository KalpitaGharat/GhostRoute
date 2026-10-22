"""GhostRoute AI - Network Model Validation Engine
Validates network topology, device definitions, links, firewall rules, and security
policies before graph analysis to prevent malformed or undefined configurations from entering analysis.
"""

import ipaddress
import re
from typing import List, Optional, Set, Union, Tuple
from backend.schemas import (
    NetworkModel,
    Device,
    Connection,
    FirewallRule,
    AccessPolicy,
    DeviceType,
    RuleAction,
    PolicyVerdict
)


class NetworkValidationError(ValueError):
    """Raised when a network model fails structural or semantic validation."""

    def __init__(self, errors: List[str]):
        self.errors = errors
        message = f"Network validation failed with {len(errors)} error(s):\n" + "\n".join(f"- {e}" for e in errors)
        super().__init__(message)


def parse_ip_or_network(
    val: Optional[str],
    field_name: str = "IP/CIDR"
) -> Optional[Union[ipaddress.IPv4Network, ipaddress.IPv6Network]]:
    """Parse an IP address or CIDR notation into an ip_network object (strict=False).
    
    Accepts:
        - None, '', '*' -> returns None (unrestricted)
        - '192.168.1.1' -> returns IPv4Network('192.168.1.1/32')
        - '10.0.0.0/24' -> returns IPv4Network('10.0.0.0/24')
        - '2001:db8::1' -> returns IPv6Network('2001:db8::1/128')
        - '2001:db8::/64' -> returns IPv6Network('2001:db8::/64')
    Raises:
        ValueError if the format is invalid or malformed.
    """
    if val is None:
        return None
    val_str = str(val).strip()
    if val_str in ("", "*", "ANY", "any"):
        return None
    try:
        return ipaddress.ip_network(val_str, strict=False)
    except ValueError as exc:
        raise ValueError(f"Invalid {field_name} definition '{val_str}': {exc}") from exc


def parse_port_or_range(
    port_val: Optional[Union[int, str]],
    field_name: str = "port"
) -> Optional[Tuple[int, int]]:
    """Parse a port or port range into a tuple of (start_port, end_port).
    
    Accepts:
        - None, '', '*' -> returns None (unrestricted)
        - int (1..65535) -> returns (int, int)
        - str '80' -> returns (80, 80)
        - str '80-443' -> returns (80, 443)
    Raises:
        ValueError if the port number or range is invalid or out of bounds.
    """
    if port_val is None:
        return None
    if isinstance(port_val, int):
        if port_val < 1 or port_val > 65535:
            raise ValueError(f"Invalid {field_name} {port_val}: port number must be between 1 and 65535.")
        return (port_val, port_val)

    s = str(port_val).strip()
    if s in ("", "*", "ANY", "any"):
        return None

    # Check for range "start-end"
    if "-" in s:
        parts = s.split("-", 1)
        try:
            start = int(parts[0].strip())
            end = int(parts[1].strip())
        except ValueError as exc:
            raise ValueError(f"Invalid {field_name} range '{s}': range bounds must be integers.") from exc
        if start < 1 or start > 65535 or end < 1 or end > 65535:
            raise ValueError(f"Invalid {field_name} range '{s}': ports must be between 1 and 65535.")
        if start > end:
            raise ValueError(f"Invalid {field_name} range '{s}': start port ({start}) cannot exceed end port ({end}).")
        return (start, end)

    # Single port as string
    try:
        p = int(s)
    except ValueError as exc:
        raise ValueError(f"Invalid {field_name} '{s}': must be an integer between 1 and 65535.") from exc
    if p < 1 or p > 65535:
        raise ValueError(f"Invalid {field_name} {p}: port number must be between 1 and 65535.")
    return (p, p)


def validate_network_model(network: NetworkModel) -> List[str]:
    """Perform comprehensive structural and semantic validation on a NetworkModel.
    
    Returns a list of error strings. If valid, returns an empty list.
    """
    errors: List[str] = []

    # 1. Validate Devices
    device_ids: Set[str] = set()
    zones: Set[str] = set()

    for idx, dev in enumerate(network.devices):
        if not dev.id or not dev.id.strip():
            errors.append(f"Device at index {idx} has an empty or missing 'id'.")
            continue

        dev_id = dev.id.strip()
        if dev_id in device_ids:
            errors.append(f"Duplicate device identifier '{dev_id}' found at device index {idx}.")
        device_ids.add(dev_id)

        if not dev.zone or not dev.zone.strip():
            errors.append(f"Device '{dev_id}' has an empty or missing 'zone'.")
        else:
            zones.add(dev.zone.strip().upper())

        # Validate IP if specified
        if dev.ip and dev.ip.strip():
            try:
                ipaddress.ip_address(dev.ip.strip())
            except ValueError as exc:
                errors.append(f"Device '{dev_id}' has an invalid IP address '{dev.ip}': {exc}.")

    # 2. Validate Connections
    connection_ids: Set[str] = set()
    for idx, conn in enumerate(network.connections):
        conn_label = conn.id or f"connection[{idx}]"
        if conn.id:
            if conn.id in connection_ids:
                errors.append(f"Duplicate connection ID '{conn.id}' at connection index {idx}.")
            connection_ids.add(conn.id)

        if conn.source not in device_ids:
            errors.append(f"Connection '{conn_label}' references unknown source device '{conn.source}'.")
        if conn.target not in device_ids:
            errors.append(f"Connection '{conn_label}' references unknown target device '{conn.target}'.")
        if conn.source in device_ids and conn.target in device_ids and conn.source == conn.target:
            errors.append(f"Connection '{conn_label}' is a self-loop: source and target are both '{conn.source}'.")

    # 3. Validate Firewall Rules
    rule_ids: Set[str] = set()
    valid_protocols = {"TCP", "UDP", "ICMP", "ANY"}

    for idx, rule in enumerate(network.firewall_rules):
        rule_label = rule.id or f"rule[{idx}]"
        if not rule.id or not rule.id.strip():
            errors.append(f"Firewall rule at index {idx} has an empty or missing 'id'.")
        elif rule.id in rule_ids:
            errors.append(f"Duplicate firewall rule ID '{rule.id}' at rule index {idx}.")
        rule_ids.add(rule.id)

        if rule.device_id not in device_ids:
            errors.append(f"Rule '{rule_label}' is attached to unknown device '{rule.device_id}'.")

        # Validate IP/CIDR definitions
        if rule.source_ip:
            try:
                parse_ip_or_network(rule.source_ip, field_name="source_ip")
            except ValueError as exc:
                errors.append(f"Rule '{rule_label}': {exc}")

        if rule.destination_ip:
            try:
                parse_ip_or_network(rule.destination_ip, field_name="destination_ip")
            except ValueError as exc:
                errors.append(f"Rule '{rule_label}': {exc}")

        # Validate Port
        if rule.port is not None:
            try:
                parse_port_or_range(rule.port, field_name="port")
            except ValueError as exc:
                errors.append(f"Rule '{rule_label}': {exc}")

        # Validate Protocol
        if rule.protocol.upper() not in valid_protocols:
            errors.append(
                f"Rule '{rule_label}' has unsupported protocol '{rule.protocol}'. Supported: {', '.join(sorted(valid_protocols))}."
            )

        # Validate Priority
        if rule.priority < 0:
            errors.append(f"Rule '{rule_label}' has negative priority ({rule.priority}). Priority must be >= 0.")

    # 4. Validate Access Policies
    policy_ids: Set[str] = set()
    for idx, pol in enumerate(network.access_policies):
        pol_label = pol.id or f"policy[{idx}]"
        if not pol.id or not pol.id.strip():
            errors.append(f"Access policy at index {idx} has an empty or missing 'id'.")
        elif pol.id in policy_ids:
            errors.append(f"Duplicate access policy ID '{pol.id}' at policy index {idx}.")
        policy_ids.add(pol.id)

        # Verify source resolves to device ID or zone
        src_clean = pol.source.strip()
        if src_clean not in device_ids and src_clean.upper() not in zones:
            errors.append(
                f"Policy '{pol_label}' source '{pol.source}' does not match any existing device ID or zone."
            )

        # Verify destination resolves to device ID or zone
        dst_clean = pol.destination.strip()
        if dst_clean not in device_ids and dst_clean.upper() not in zones:
            errors.append(
                f"Policy '{pol_label}' destination '{pol.destination}' does not match any existing device ID or zone."
            )

        # Validate Port
        if pol.port is not None:
            try:
                parse_port_or_range(pol.port, field_name="port")
            except ValueError as exc:
                errors.append(f"Policy '{pol_label}': {exc}")

        # Validate Protocol
        if pol.protocol.upper() not in valid_protocols:
            errors.append(
                f"Policy '{pol_label}' has unsupported protocol '{pol.protocol}'. Supported: {', '.join(sorted(valid_protocols))}."
            )

    return errors


def assert_network_valid(network: NetworkModel) -> None:
    """Validate network model and raise NetworkValidationError if any errors exist."""
    errors = validate_network_model(network)
    if errors:
        raise NetworkValidationError(errors)
