"""GhostRoute AI - Remediation & Simulation Engine
Provides strict validation of remediation proposals and safe, non-destructive
in-memory simulation on copies of the network model.

SECURITY ASSURANCES:
1. All remediation operations are strictly allowlisted (ADD_RULE, UPDATE_RULE, DELETE_RULE, DISABLE_RULE).
2. Deep copies of network models are used exclusively; the original network is never mutated.
3. Live network connections, shell commands, and code execution are strictly prohibited.
"""

import copy
from typing import List, Tuple, Dict, Any, Optional
from pydantic import ValidationError

from backend.schemas import (
    NetworkModel,
    FirewallRule,
    RemediationProposal,
    RemediationOperation,
    SimulateFixResponse,
    RuleAction
)
from backend.validation import (
    parse_ip_or_network,
    parse_port_or_range,
    assert_network_valid,
    NetworkValidationError
)


class RemediationValidationError(Exception):
    """Raised when an AI-generated remediation proposal fails security or schema constraints."""
    pass


def validate_remediation_proposal(
    proposal: RemediationProposal,
    valid_device_ids: Optional[List[str]] = None,
    valid_rule_ids: Optional[List[str]] = None
) -> None:
    """Strictly validate an AI remediation proposal before simulation or execution.
    
    Checks:
    - Operation is in the strict allowlist.
    - Target device exists in the modeled network.
    - Rule IDs exist when updating, deleting, or disabling rules.
    - Rule specifications are well-formed and contain no unauthorized actions.
    """
    if not proposal.proposal_id or not proposal.proposal_id.strip():
        raise RemediationValidationError("Proposal must have a non-empty proposal_id.")

    if not proposal.target_device_id or not proposal.target_device_id.strip():
        raise RemediationValidationError("Proposal must specify a valid target_device_id.")

    if valid_device_ids is not None and proposal.target_device_id not in valid_device_ids:
        raise RemediationValidationError(
            f"Target device '{proposal.target_device_id}' does not exist in the network model."
        )

    op = proposal.operation
    if op not in (
        RemediationOperation.ADD_RULE,
        RemediationOperation.UPDATE_RULE,
        RemediationOperation.DELETE_RULE,
        RemediationOperation.DISABLE_RULE
    ):
        raise RemediationValidationError(f"Unsupported remediation operation: '{op}'")

    # If deleting or disabling, target_rule_id is mandatory
    if op in (RemediationOperation.DELETE_RULE, RemediationOperation.DISABLE_RULE):
        if not proposal.target_rule_id:
            raise RemediationValidationError(
                f"Operation '{op}' requires an existing target_rule_id."
            )
        if valid_rule_ids is not None and proposal.target_rule_id not in valid_rule_ids:
            raise RemediationValidationError(
                f"Target rule '{proposal.target_rule_id}' does not exist in the network model."
            )

    # If adding or updating, rule_spec is mandatory
    if op in (RemediationOperation.ADD_RULE, RemediationOperation.UPDATE_RULE):
        if proposal.rule_spec is None:
            raise RemediationValidationError(
                f"Operation '{op}' requires a populated rule_spec."
            )
        if proposal.rule_spec.action not in (RuleAction.ALLOW, RuleAction.DENY):
            raise RemediationValidationError(
                f"Invalid rule action: '{proposal.rule_spec.action}'"
            )

        # Validate IP/CIDR and port formatting on proposed rule
        try:
            if proposal.rule_spec.source_ip:
                parse_ip_or_network(proposal.rule_spec.source_ip, field_name="proposal source_ip")
            if proposal.rule_spec.destination_ip:
                parse_ip_or_network(proposal.rule_spec.destination_ip, field_name="proposal destination_ip")
            if proposal.rule_spec.port is not None:
                parse_port_or_range(proposal.rule_spec.port, field_name="proposal port")
        except ValueError as exc:
            raise RemediationValidationError(str(exc)) from exc

        if op == RemediationOperation.UPDATE_RULE:
            if not proposal.target_rule_id:
                raise RemediationValidationError(
                    "UPDATE_RULE requires an existing target_rule_id to modify."
                )
            if valid_rule_ids is not None and proposal.target_rule_id not in valid_rule_ids:
                raise RemediationValidationError(
                    f"Target rule '{proposal.target_rule_id}' to update was not found."
                )


def simulate_network_fix(
    original_network: NetworkModel,
    proposal: RemediationProposal
) -> SimulateFixResponse:
    """Apply a validated remediation proposal to a deep copy of the network model.
    
    Guarantees:
    - Original network model remains unmodified.
    - All changes are recorded in the audit trail.
    """
    # Validate network integrity
    try:
        assert_network_valid(original_network)
    except NetworkValidationError as exc:
        return SimulateFixResponse(
            status="REJECTED",
            changes_applied=[],
            simulated_network=original_network.model_copy(deep=True),
            message=f"Network validation error: {str(exc)}"
        )

    valid_device_ids = [d.id for d in original_network.devices]
    valid_rule_ids = [r.id for r in original_network.firewall_rules]

    # Defensive resolution: if target_rule_id matches an existing rule, ensure target_device_id matches its device
    if proposal.target_rule_id:
        for r in original_network.firewall_rules:
            if r.id == proposal.target_rule_id:
                if proposal.target_device_id not in valid_device_ids:
                    proposal.target_device_id = r.device_id
                break

    # Validate against network context
    try:
        validate_remediation_proposal(proposal, valid_device_ids, valid_rule_ids)
    except RemediationValidationError as exc:
        return SimulateFixResponse(
            status="REJECTED",
            changes_applied=[],
            simulated_network=original_network.model_copy(deep=True),
            message=f"Remediation proposal rejected: {str(exc)}"
        )

    # Perform DEEP COPY to protect original model
    simulated_net = original_network.model_copy(deep=True)
    changes_log: List[str] = []

    op = proposal.operation
    target_rule_id = proposal.target_rule_id
    target_device = proposal.target_device_id

    if op == RemediationOperation.DELETE_RULE:
        original_count = len(simulated_net.firewall_rules)
        simulated_net.firewall_rules = [
            r for r in simulated_net.firewall_rules if r.id != target_rule_id
        ]
        changes_log.append(
            f"DELETED rule {target_rule_id} from device {target_device} "
            f"(rules reduced from {original_count} to {len(simulated_net.firewall_rules)})."
        )

    elif op == RemediationOperation.DISABLE_RULE:
        for r in simulated_net.firewall_rules:
            if r.id == target_rule_id:
                r.enabled = False
                changes_log.append(f"DISABLED rule {target_rule_id} on device {target_device}.")
                break

    elif op == RemediationOperation.UPDATE_RULE:
        updated = False
        new_rules = []
        for r in simulated_net.firewall_rules:
            if r.id == target_rule_id:
                new_rule = proposal.rule_spec.model_copy()
                new_rule.id = target_rule_id  # Preserve ID
                new_rule.device_id = target_device
                new_rules.append(new_rule)
                updated = True
                changes_log.append(
                    f"UPDATED rule {target_rule_id} on device {target_device} "
                    f"with action={new_rule.action}, source_zone={new_rule.source_zone}, "
                    f"destination_zone={new_rule.destination_zone}, port={new_rule.port}."
                )
            else:
                new_rules.append(r)
        simulated_net.firewall_rules = new_rules

    elif op == RemediationOperation.ADD_RULE:
        new_rule = proposal.rule_spec.model_copy()
        new_rule.device_id = target_device
        # Ensure unique ID if not set
        if not new_rule.id or any(r.id == new_rule.id for r in simulated_net.firewall_rules):
            new_rule.id = f"RULE-FIX-{len(simulated_net.firewall_rules) + 1}"
        simulated_net.firewall_rules.append(new_rule)
        changes_log.append(
            f"ADDED new rule {new_rule.id} to device {target_device}: "
            f"action={new_rule.action}, priority={new_rule.priority}, port={new_rule.port}."
        )

    return SimulateFixResponse(
        status="SIMULATED",
        changes_applied=changes_log,
        simulated_network=simulated_net,
        message="Proposed remediation successfully simulated on isolated network copy."
    )
