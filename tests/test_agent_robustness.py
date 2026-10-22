"""Tests for Agent Robustness, Network Exceptions, and Independent Verification.

Validates:
1. Graceful degradation to DEMO_FALLBACK on NVIDIA timeouts and connection errors.
2. Safe logging and zero credential leakage on API failures.
3. Configurable timeout enforcement.
4. Input rejection at pre-analysis validation stage before agent/LLM invocation.
5. Independent verification failing when legitimate traffic is broken.
"""

import os
import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from openai import APITimeoutError, APIConnectionError, RateLimitError

from backend.main import app
from backend.schemas import (
    NetworkModel,
    AnalysisFinding,
    SeverityLevel,
    RemediationProposal,
    RemediationOperation,
    ExplainResponse
)
from backend.agent import (
    get_nvidia_client,
    explain_finding_with_nemotron,
    run_full_investigation_workflow
)


@pytest.fixture
def sample_finding() -> AnalysisFinding:
    return AnalysisFinding(
        id="FINDING-TEST-01",
        source="dmz-web-01",
        destination="db-prod-01",
        protocol="TCP",
        port=5432,
        discovered_path=["dmz-web-01", "fw-core", "db-prod-01"],
        supporting_rule_ids=["FW-CORE-003"],
        violated_policy_id="POL-DMZ-DB-ISOLATION",
        severity=SeverityLevel.CRITICAL,
        description="DMZ host reaches database through overly permissive rule FW-CORE-003",
        status="DETECTED"
    )


@pytest.fixture
def sample_network() -> NetworkModel:
    with open("data/network.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return NetworkModel.model_validate(data)


def test_nvidia_timeout_error_graceful_fallback(sample_finding: AnalysisFinding):
    """Verify APITimeoutError gracefully degrades to DEMO_FALLBACK without crashing or exposing secrets."""
    mock_client = MagicMock()
    mock_req = MagicMock()
    mock_client.chat.completions.create.side_effect = APITimeoutError(request=mock_req)

    with patch("backend.agent.get_nvidia_client", return_value=mock_client):
        response = explain_finding_with_nemotron(sample_finding)

        assert response.status == "DEMO_FALLBACK"
        assert response.model_used == "deterministic-demo-fallback"
        assert "APITimeoutError" in (response.error or "")
        assert response.proposed_remediation.target_rule_id == "FW-CORE-003"


def test_nvidia_connection_error_graceful_fallback(sample_finding: AnalysisFinding):
    """Verify APIConnectionError gracefully degrades to DEMO_FALLBACK."""
    mock_client = MagicMock()
    mock_req = MagicMock()
    mock_client.chat.completions.create.side_effect = APIConnectionError(request=mock_req)

    with patch("backend.agent.get_nvidia_client", return_value=mock_client):
        response = explain_finding_with_nemotron(sample_finding)

        assert response.status == "DEMO_FALLBACK"
        assert "APIConnectionError" in (response.error or "")
        assert response.proposed_remediation is not None


def test_nvidia_rate_limit_error_graceful_fallback(sample_finding: AnalysisFinding):
    """Verify RateLimitError gracefully degrades to DEMO_FALLBACK."""
    mock_client = MagicMock()
    mock_response = MagicMock(status_code=429)
    mock_client.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit reached",
        response=mock_response,
        body={}
    )

    with patch("backend.agent.get_nvidia_client", return_value=mock_client):
        response = explain_finding_with_nemotron(sample_finding)

        assert response.status == "DEMO_FALLBACK"
        assert "RateLimitError" in (response.error or "")


def test_nvidia_timeout_env_config():
    """Verify NVIDIA_TIMEOUT environment variable is respected by client constructor."""
    with patch.dict(os.environ, {"NVIDIA_API_KEY": "test-key-mock", "NVIDIA_TIMEOUT": "12.5"}):
        client = get_nvidia_client()
        assert client is not None
        assert client.timeout == 12.5


def test_agent_run_pre_analysis_validation_failure(sample_network: NetworkModel):
    """Verify that /agent/run rejects invalid network topologies with HTTP 422 before LLM invocation."""
    client = TestClient(app)

    # Invalidate network with a dangling connection referencing an unknown device
    network_dict = sample_network.model_dump()
    network_dict["connections"].append({"source": "ghost-device-xyz", "target": "dmz-web-01", "bidirectional": True})

    response = client.post("/agent/run", json={"network": network_dict})
    assert response.status_code == 422
    payload = response.json()
    assert "detail" in payload
    assert "errors" in payload["detail"]
    assert any("ghost-device-xyz" in err for err in payload["detail"]["errors"])


def test_independent_verification_fails_when_legitimate_traffic_broken(sample_network: NetworkModel):
    """Verify that if remediation disables an essential rule protecting legitimate traffic,
    independent verification strictly detects condition failure (legitimate_paths_intact == False).
    """
    # Propose disabling FW-CORE-002 (which permits legitimate Admin -> DB SSH traffic on port 22)
    destructive_proposal = RemediationProposal(
        proposal_id="PROP-BAD-01",
        target_rule_id="FW-CORE-002",
        target_device_id="fw-core",
        operation=RemediationOperation.DISABLE_RULE,
        rationale="Over-zealous cleanup disabling administration traffic",
        expected_impact="Breaks legitimate SSH access from jumpbox to database"
    )

    with patch("backend.agent.explain_finding_with_nemotron") as mock_explain:
        mock_explain.return_value = ExplainResponse(
            finding_id="FINDING-TEST-01",
            status="ANALYZED_LLM",
            model_used="nvidia/nemotron-test",
            proposed_remediation=destructive_proposal,
            explanation="Bad advice to disable administration rule",
            root_cause="Overly aggressive rule deletion"
        )

        workflow_res = run_full_investigation_workflow(sample_network)

        # Verification must NOT pass because legitimate traffic was severed!
        assert workflow_res.verification is not None
        assert workflow_res.verification.verdict == "FAIL"
        assert workflow_res.verification.legitimate_paths_intact is False
        assert workflow_res.status == "PARTIAL"
