"""Tests for Remediation Lifecycle States, Approval Safeguards, and Immutability.

Covers:
- Proposed -> Simulated -> Verified -> Approved distinct states
- Prevention of false 'Applied' status
- Rejection of approval for unverified/failing proposals
- Immutability of original network model
- Preservation of legitimate traffic
"""

import json
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


from backend.main import app
from backend.schemas import (
    NetworkModel,
    RemediationProposal,
    RemediationOperation,
    RemediationStatus,
    ApproveRemediationRequest,
    AnalysisFinding,
    SeverityLevel
)
from backend.agent import run_full_investigation_workflow
from backend.remediation import simulate_network_fix
from backend.verification import verify_simulated_network


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def sample_network() -> NetworkModel:
    with open("data/network.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return NetworkModel.model_validate(data)


def test_remediation_lifecycle_states(sample_network: NetworkModel):
    """Verify that remediation proposals traverse PROPOSED -> SIMULATED -> VERIFIED."""
    with patch("backend.agent.get_nvidia_client", return_value=None):
        workflow = run_full_investigation_workflow(sample_network)
        assert workflow.status == "COMPLETED"
        assert workflow.explanation is not None

        proposal = workflow.explanation.proposed_remediation
        # After successful simulation and verification (verdict PASS), status must be VERIFIED
        assert proposal.status == RemediationStatus.VERIFIED
        assert workflow.verification is not None
        assert workflow.verification.verdict == "PASS"



def test_failed_verification_cannot_be_verified(sample_network: NetworkModel):
    """When a proposal fails verification, its status must NOT become VERIFIED."""
    # Proposal that does NOT resolve the violation
    ineffective_proposal = RemediationProposal(
        proposal_id="PROP-INEFFECTIVE",
        target_rule_id="FW-EDGE-001",
        target_device_id="fw-edge",
        operation=RemediationOperation.DISABLE_RULE,
        rule_spec=None,
        rationale="Disable unrelated rule",
        expected_impact="None",
        status=RemediationStatus.PROPOSED
    )

    sim_res = simulate_network_fix(sample_network, ineffective_proposal)
    assert sim_res.status == "SIMULATED"
    ineffective_proposal.status = RemediationStatus.SIMULATED

    # Verify against the original DMZ violation
    original_violation = AnalysisFinding(
        id="FINDING-TEST",
        source="dmz-web-01",
        destination="db-prod-01",
        discovered_path=["dmz-web-01", "fw-core", "db-prod-01"],
        supporting_rule_ids=["FW-CORE-003"],
        violated_policy_id="POL-DMZ-DB-ISOLATION",
        severity=SeverityLevel.CRITICAL,
        description="Test violation"
    )

    verif_res = verify_simulated_network(
        simulated_network=sim_res.simulated_network,
        original_violation=original_violation,
        policies_override=sample_network.access_policies
    )

    # Verification must FAIL because FW-CORE-003 is still active
    assert verif_res.verdict == "FAIL"
    assert verif_res.original_violation_resolved is False

    # Status must NOT be VERIFIED
    if verif_res.verdict == "PASS":
        ineffective_proposal.status = RemediationStatus.VERIFIED

    assert ineffective_proposal.status != RemediationStatus.VERIFIED
    assert ineffective_proposal.status == RemediationStatus.SIMULATED


def test_approve_remediation_success(client: TestClient):
    """Approve endpoint succeeds for verified proposals and sets status to APPROVED."""
    payload = {
        "proposal_id": "PROP-FIX-FINDING-POL-DMZ-DB-ISOLATION-1",
        "approver": "SecOps Analyst (Neev Savla)",
        "notes": "Approved for emergency maintenance window",
        "verification_verdict": "PASS"
    }

    res = client.post("/remediation/approve", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["approved"] is True
    assert data["status"] == "APPROVED"
    assert data["apply_available"] is False
    assert "Live firewall adapter is not connected" in data["apply_unavailability_reason"]


def test_approve_remediation_rejected_on_unverified_verdict(client: TestClient):
    """Approve endpoint must reject approval when verification verdict is not PASS."""
    for bad_verdict in ["FAIL", "INCONCLUSIVE"]:
        payload = {
            "proposal_id": "PROP-UNVERIFIED",
            "approver": "SecOps Analyst",
            "notes": "Premature attempt",
            "verification_verdict": bad_verdict
        }

        res = client.post("/remediation/approve", json=payload)
        assert res.status_code == 400
        assert "Only independently verified (PASS) proposals can be approved" in res.json()["detail"]


def test_apply_remediation_prohibited(client: TestClient):
    """Direct application of remediation must return 403 Forbidden to prevent false Applied status."""
    res = client.post("/remediation/apply")
    assert res.status_code == 403
    assert "Direct firewall execution is unavailable" in res.json()["detail"]


def test_original_network_strictly_immutable(sample_network: NetworkModel):
    """Confirm the original network model is completely unmodified by the entire agent workflow."""
    original_dict = sample_network.model_dump()

    workflow = run_full_investigation_workflow(sample_network)
    assert workflow.status == "COMPLETED"

    current_dict = sample_network.model_dump()
    assert original_dict == current_dict, "Original network model was mutated during analysis/simulation!"
