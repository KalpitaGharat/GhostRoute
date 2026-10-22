"""Tests for Simulation Safety and Independent Verification Engine."""

import json
from pathlib import Path
import pytest

from backend.schemas import (
    NetworkModel,
    RemediationProposal,
    RemediationOperation,
    FirewallRule,
    RuleAction,
    AnalysisFinding,
    SeverityLevel
)
from backend.remediation import (
    simulate_network_fix,
    validate_remediation_proposal,
    RemediationValidationError
)
from backend.verification import verify_simulated_network
from backend.graph_adapter import get_active_graph_engine


@pytest.fixture
def sample_network() -> NetworkModel:
    """Fixture providing a fresh sample network model."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return NetworkModel.model_validate(data)


def test_simulation_does_not_mutate_original(sample_network: NetworkModel):
    """Verify that simulating a fix does not modify the original network object."""
    original_rule_count = len(sample_network.firewall_rules)
    target_rule = sample_network.firewall_rules[-1]
    assert target_rule.enabled is True

    proposal = RemediationProposal(
        proposal_id="PROP-TEST-01",
        target_rule_id=target_rule.id,
        target_device_id=target_rule.device_id,
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Disable rule to test immutability",
        expected_impact="None"
    )

    sim_res = simulate_network_fix(sample_network, proposal)
    assert sim_res.status == "SIMULATED"

    # Original network must be completely untouched
    assert len(sample_network.firewall_rules) == original_rule_count
    assert sample_network.firewall_rules[-1].enabled is True

    # Simulated network has the disabled rule
    sim_rule = next(r for r in sim_res.simulated_network.firewall_rules if r.id == target_rule.id)
    assert sim_rule.enabled is False


def test_reject_unsupported_or_unsafe_proposal(sample_network: NetworkModel):
    """Verify that proposals targeting non-existent devices or invalid operations are rejected."""
    # Targeting a fake device not in topology
    fake_device_prop = RemediationProposal(
        proposal_id="PROP-UNSAFE-01",
        target_rule_id="RULE-XYZ",
        target_device_id="non-existent-device-99",
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Unsafe device modification",
        expected_impact="Unknown"
    )

    sim_res = simulate_network_fix(sample_network, fake_device_prop)
    assert sim_res.status == "REJECTED"
    assert "does not exist in the network model" in sim_res.message


def test_reject_missing_rule_spec_for_add_rule():
    """Verify that ADD_RULE operation without rule_spec fails validation."""
    invalid_prop = RemediationProposal(
        proposal_id="PROP-BAD-ADD",
        target_rule_id=None,
        target_device_id="fw-core",
        operation=RemediationOperation.ADD_RULE,
        rule_spec=None,  # Missing!
        rationale="Invalid addition",
        expected_impact="None"
    )

    with pytest.raises(RemediationValidationError):
        validate_remediation_proposal(invalid_prop)


def test_verification_pass_on_effective_fix(sample_network: NetworkModel):
    """Verify that an effective remediation that disables the offending rule yields a PASS."""
    engine = get_active_graph_engine()
    initial_findings = engine.analyze_policies(sample_network)
    assert len(initial_findings) >= 1
    original_violation = initial_findings[0]

    # Propose disabling the offending rule FW-CORE-003
    proposal = RemediationProposal(
        proposal_id="PROP-PASS-01",
        target_rule_id="FW-CORE-003",
        target_device_id="fw-core",
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Disable overly broad wildcard rule FW-CORE-003",
        expected_impact="Closes DMZ to DB path while keeping application DB access open"
    )

    sim_res = simulate_network_fix(sample_network, proposal)
    assert sim_res.status == "SIMULATED"

    verif_res = verify_simulated_network(
        simulated_network=sim_res.simulated_network,
        original_violation=original_violation,
        policies_override=sample_network.access_policies
    )

    assert verif_res.verdict == "PASS"
    assert verif_res.original_violation_resolved is True
    assert verif_res.legitimate_paths_intact is True
    assert verif_res.new_violations_count == 0


def test_verification_fail_when_legitimate_traffic_broken(sample_network: NetworkModel):
    """Verify that a remediation which mistakenly blocks legitimate business rules yields FAIL."""
    engine = get_active_graph_engine()
    initial_findings = engine.analyze_policies(sample_network)
    original_violation = initial_findings[0]

    # Malicious or blunt fix: inserts a top-priority DENY-ALL rule on fw-core
    proposal = RemediationProposal(
        proposal_id="PROP-REGRESS-01",
        target_rule_id=None,
        target_device_id="fw-core",
        operation=RemediationOperation.ADD_RULE,
        rule_spec=FirewallRule(
            id="FW-BLOCK-ALL",
            device_id="fw-core",
            action=RuleAction.DENY,
            source_zone="*",
            destination_zone="*",
            protocol="ANY",
            port=None,
            priority=1,  # Priority 1 evaluates before legitimate ALLOW rules
            enabled=True,
            description="Blunt deny-all rule that disrupts business traffic"
        ),
        rationale="Overly aggressive firewall fix",
        expected_impact="Disrupts legitimate application and bastion connectivity"
    )

    sim_res = simulate_network_fix(sample_network, proposal)
    assert sim_res.status == "SIMULATED"

    verif_res = verify_simulated_network(
        simulated_network=sim_res.simulated_network,
        original_violation=original_violation,
        policies_override=sample_network.access_policies
    )

    # Verification must catch the regression and return FAIL!
    assert verif_res.verdict == "FAIL"
    assert verif_res.legitimate_paths_intact is False
    assert any("BLOCKED" in c.details for c in verif_res.checks if c.check_type == "LEGITIMATE_PATH_INTACT")


def test_verification_fail_when_original_violation_not_resolved(sample_network: NetworkModel):
    """Verify that a no-op or irrelevant fix fails verification because the violation persists."""
    engine = get_active_graph_engine()
    initial_findings = engine.analyze_policies(sample_network)
    original_violation = initial_findings[0]

    # Fix targets FW-CORE-002 (bastion SSH rule), leaving the vulnerable FW-CORE-003 wide open
    proposal = RemediationProposal(
        proposal_id="PROP-INEFFECTIVE-01",
        target_rule_id="FW-CORE-002",
        target_device_id="fw-core",
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Disabling SSH bastion rule does not resolve the DMZ->DB path",
        expected_impact="Admin locked out, vulnerability remains"
    )

    sim_res = simulate_network_fix(sample_network, proposal)
    assert sim_res.status == "SIMULATED"

    verif_res = verify_simulated_network(
        simulated_network=sim_res.simulated_network,
        original_violation=original_violation,
        policies_override=sample_network.access_policies
    )

    assert verif_res.verdict == "FAIL"
    assert verif_res.original_violation_resolved is False


def test_verification_fail_when_new_violations_introduced(sample_network: NetworkModel):
    """Verify that a remediation which introduces a new unauthorized path fails verification."""
    # Add a second DENY policy: Jumpbox should never reach DMZ
    new_deny_policy = sample_network.access_policies[0].model_copy()
    new_deny_policy.id = "POL-JUMPBOX-DMZ-DENIED"
    new_deny_policy.source = "jumpbox-admin"
    new_deny_policy.destination = "dmz-web-01"
    new_deny_policy.expected_verdict = "DENY"
    new_deny_policy.required = False
    sample_network.access_policies.append(new_deny_policy)

    # Proposed fix disables the original violation on fw-core, but carelessly adds an open rule to fw-edge
    proposal = RemediationProposal(
        proposal_id="PROP-NEW-VIOLATION",
        target_rule_id="FW-CORE-003",
        target_device_id="fw-core",
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Disables FW-CORE-003",
        expected_impact="Resolves original violation"
    )

    sim_res = simulate_network_fix(sample_network, proposal)
    assert sim_res.status == "SIMULATED"

    # Now add an unauthorized rule into the simulated network connecting jumpbox to dmz
    unauthorized_rule = FirewallRule(
        id="FW-LEAK-01",
        device_id="fw-core",
        action=RuleAction.ALLOW,
        source_zone="*",
        destination_zone="*",
        protocol="ANY",
        port=None,
        priority=50,
        enabled=True,
        description="Leaked rule allowing unauthorized internal to DMZ path"
    )
    sim_res.simulated_network.firewall_rules.append(unauthorized_rule)

    original_violation = AnalysisFinding(
        id="FINDING-ORIGINAL",
        source="dmz-web-01",
        destination="db-prod-01",
        protocol="TCP",
        port=5432,
        discovered_path=["dmz-web-01", "fw-core", "db-prod-01"],
        supporting_rule_ids=["FW-CORE-003"],
        violated_policy_id="POL-DMZ-DB-ISOLATION",
        severity=SeverityLevel.CRITICAL,
        description="Original DMZ to DB violation",
        status="DETECTED"
    )

    verif_res = verify_simulated_network(
        simulated_network=sim_res.simulated_network,
        original_violation=original_violation,
        policies_override=sample_network.access_policies
    )

    assert verif_res.verdict == "FAIL"
    assert verif_res.new_violations_count > 0
    assert any(c.check_type == "NO_NEW_VIOLATIONS" and c.verdict == "FAIL" for c in verif_res.checks)

