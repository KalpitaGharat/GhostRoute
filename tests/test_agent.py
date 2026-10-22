"""Tests for AI Agent Orchestration and NVIDIA Nemotron Integration."""

import json
from unittest.mock import patch, MagicMock
import pytest

from backend.schemas import (
    NetworkModel,
    AnalysisFinding,
    SeverityLevel,
    RemediationProposal,
    RemediationOperation
)
from backend.agent import (
    explain_finding_with_nemotron,
    generate_demo_fallback_explanation,
    run_full_investigation_workflow
)


@pytest.fixture
def sample_finding() -> AnalysisFinding:
    """Fixture providing a verified analysis finding."""
    return AnalysisFinding(
        id="FINDING-POL-DMZ-DB-1",
        source="dmz-web-01",
        destination="db-prod-01",
        protocol="TCP",
        port=5432,
        discovered_path=["dmz-web-01", "fw-core", "db-prod-01"],
        supporting_rule_ids=["FW-CORE-003"],
        violated_policy_id="POL-DMZ-DB-ISOLATION",
        severity=SeverityLevel.CRITICAL,
        description="Unintended path from DMZ to production database via rule FW-CORE-003",
        status="DETECTED"
    )


@pytest.fixture
def sample_network() -> NetworkModel:
    """Fixture providing the sample network model."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return NetworkModel.model_validate(data)


def test_missing_nvidia_credentials_uses_labeled_fallback(sample_finding: AnalysisFinding):
    """Verify that when no NVIDIA credentials are set, an explicit DEMO_FALLBACK is returned."""
    with patch("backend.agent.get_nvidia_client", return_value=None):
        response = explain_finding_with_nemotron(sample_finding)

        assert response.status == "DEMO_FALLBACK"
        assert response.model_used == "deterministic-demo-fallback"
        assert "[OFFLINE DEMO FALLBACK]" in response.explanation
        assert response.proposed_remediation.target_rule_id == "FW-CORE-003"
        assert response.proposed_remediation.operation in (
            RemediationOperation.DISABLE_RULE, RemediationOperation.DELETE_RULE
        )


def test_mocked_nemotron_valid_response(sample_finding: AnalysisFinding):
    """Verify that when Nemotron returns valid structured JSON, it is parsed and validated."""
    mock_llm_json = json.dumps({
        "explanation": "Rule FW-CORE-003 wildcard allows DMZ traffic directly to the customer database.",
        "root_cause": "Wildcard source_zone in FW-CORE-003 overrides isolation boundaries.",
        "proposed_remediation": {
            "proposal_id": "PROP-LLM-01",
            "target_rule_id": "FW-CORE-003",
            "target_device_id": "fw-core",
            "operation": "DISABLE_RULE",
            "rule_spec": None,
            "rationale": "Disabling FW-CORE-003 restores the DMZ boundary without altering application rules.",
            "expected_impact": "Blocks unintended DMZ traffic; legitimate app traffic remains permitted."
        }
    })

    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion

    with patch("backend.agent.get_nvidia_client", return_value=mock_client):
        response = explain_finding_with_nemotron(sample_finding)

        assert response.status == "ANALYZED_LLM"
        assert "FW-CORE-003" in response.explanation
        assert response.proposed_remediation.proposal_id == "PROP-LLM-01"
        assert response.proposed_remediation.operation == RemediationOperation.DISABLE_RULE


def test_mocked_nemotron_malformed_response_fallback(sample_finding: AnalysisFinding):
    """Verify that if Nemotron returns malformed JSON or invalid schema, the system gracefully falls back."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    # Malformed non-JSON output
    mock_choice.message.content = "I cannot propose a fix because the network is confusing."
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion

    with patch("backend.agent.get_nvidia_client", return_value=mock_client):
        response = explain_finding_with_nemotron(sample_finding)

        # Must fall back safely rather than crashing
        assert response.status == "DEMO_FALLBACK"
        assert response.error is not None
        assert "Nemotron response processing error" in response.error


def test_full_agent_workflow_end_to_end(sample_network: NetworkModel):
    """Verify that the full agent investigation workflow executes successfully end-to-end."""
    workflow_res = run_full_investigation_workflow(sample_network)

    assert workflow_res.total_findings >= 1
    assert workflow_res.selected_finding is not None
    assert workflow_res.explanation is not None
    assert workflow_res.simulation is not None
    assert workflow_res.verification is not None

    # Verification of our sample network with the disabled rule must PASS
    assert workflow_res.verification.verdict == "PASS"
    assert workflow_res.status == "COMPLETED"
    assert len(workflow_res.steps) == 4


def test_agent_workflow_clean_network():
    """Verify that when a network has no violations, the agent completes with zero findings."""
    clean_network = NetworkModel(
        name="Zero Violation Network",
        devices=[],
        connections=[],
        firewall_rules=[],
        access_policies=[]
    )

    workflow_res = run_full_investigation_workflow(clean_network)
    assert workflow_res.total_findings == 0
    assert workflow_res.status == "COMPLETED"
    assert "No policy violations detected" in workflow_res.final_summary
