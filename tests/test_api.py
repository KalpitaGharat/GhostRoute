"""Tests for GhostRoute AI API Endpoints."""

import json
from unittest.mock import patch
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas import NetworkModel

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint returns project identity and running status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "GhostRoute AI"
    assert data["status"] == "running"
    assert "version" in data


def test_health_endpoint():
    """Verify health endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ghostroute-backend"


def test_analyze_endpoint_valid_network():
    """Verify POST /analyze correctly identifies unintended paths and supporting rules."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        network_data = json.load(f)

    response = client.post("/analyze", json=network_data)
    assert response.status_code == 200
    result = response.json()

    assert result["total_violations"] >= 1
    assert result["execution_mode"] == "DETERMINISTIC_GRAPH"
    
    violation = result["findings"][0]
    assert violation["source"] == "dmz-web-01"
    assert violation["destination"] == "db-prod-01"
    assert violation["violated_policy_id"] == "POL-DMZ-DB-ISOLATION"
    assert "FW-CORE-003" in violation["supporting_rule_ids"]
    assert "fw-core" in violation["discovered_path"]


def test_analyze_endpoint_invalid_payload():
    """Verify POST /analyze returns 422 Unprocessable Entity on malformed payloads."""
    bad_payload = {"name": "Invalid Model", "devices": "not-a-list"}
    response = client.post("/analyze", json=bad_payload)
    assert response.status_code == 422


def test_explain_endpoint():
    """Verify POST /explain generates explanation and remediation proposal."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        network_data = json.load(f)

    # Analyze first to get a finding
    analyze_resp = client.post("/analyze", json=network_data)
    finding = analyze_resp.json()["findings"][0]

    explain_req = {
        "finding": finding,
        "network_summary": {"name": network_data["name"]}
    }

    with patch("backend.agent.get_nvidia_client", return_value=None):
        response = client.post("/explain", json=explain_req)
        assert response.status_code == 200
        result = response.json()

        assert result["finding_id"] == finding["id"]
        assert "explanation" in result
        assert "proposed_remediation" in result
        assert result["status"] in ("ANALYZED_LLM", "DEMO_FALLBACK")


def test_simulate_fix_endpoint():
    """Verify POST /simulate-fix safely applies a validated change."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        network_data = json.load(f)

    proposal = {
        "proposal_id": "PROP-API-TEST",
        "target_rule_id": "FW-CORE-003",
        "target_device_id": "fw-core",
        "operation": "DISABLE_RULE",
        "rationale": "Disable wildcard rule",
        "expected_impact": "Isolate DMZ from DB"
    }

    payload = {
        "network": network_data,
        "proposal": proposal
    }

    response = client.post("/simulate-fix", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["status"] == "SIMULATED"
    assert len(result["changes_applied"]) >= 1


def test_verify_endpoint():
    """Verify POST /verify evaluates simulated network against policies."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        network_data = json.load(f)

    # Simulate fix
    proposal = {
        "proposal_id": "PROP-API-TEST",
        "target_rule_id": "FW-CORE-003",
        "target_device_id": "fw-core",
        "operation": "DISABLE_RULE",
        "rationale": "Disable wildcard rule",
        "expected_impact": "Isolate DMZ from DB"
    }
    sim_resp = client.post("/simulate-fix", json={"network": network_data, "proposal": proposal})
    simulated_net = sim_resp.json()["simulated_network"]

    verify_payload = {
        "simulated_network": simulated_net,
        "original_violation": None,
        "policies": None
    }

    response = client.post("/verify", json=verify_payload)
    assert response.status_code == 200
    result = response.json()

    assert result["verdict"] == "PASS"
    assert result["original_violation_resolved"] is True
    assert result["legitimate_paths_intact"] is True


def test_agent_run_endpoint():
    """Verify POST /agent/run executes full investigation workflow."""
    with open("data/network.json", "r", encoding="utf-8") as f:
        network_data = json.load(f)

    with patch("backend.agent.get_nvidia_client", return_value=None):
        response = client.post("/agent/run", json={"network": network_data})
        assert response.status_code == 200
        result = response.json()

        assert result["status"] == "COMPLETED"
        assert result["total_findings"] >= 1
        assert result["verification"]["verdict"] == "PASS"
        assert len(result["steps"]) == 4


def test_dashboard_endpoint():
    """Verify GET /dashboard returns the interactive Cytoscape dashboard HTML."""
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert "GhostRoute AI" in response.text
    assert "cytoscape" in response.text.lower()


def test_sample_network_endpoint():
    """Verify GET /network/sample returns valid default network model."""
    response = client.get("/network/sample")
    assert response.status_code == 200
    data = response.json()
    assert "devices" in data
    assert "connections" in data
    assert any(d["id"] == "dmz-web-01" for d in data["devices"])
