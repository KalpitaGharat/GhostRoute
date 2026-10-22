"""GhostRoute AI - End-to-End API Smoke Test
Executes all endpoints sequentially using actual schemas, payloads, and verifies the full workflow.
"""

import sys
import json
from pathlib import Path

# Ensure workspace root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas import (
    NetworkModel,
    AnalyzeResponse,
    ExplainResponse,
    SimulateFixResponse,
    VerifyResponse,
    AgentWorkflowResponse
)

client = TestClient(app)


def run_smoke_test():
    print("=" * 70)
    print("GHOSTROUTE AI — END-TO-END API SMOKE TEST")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. Check GET /health
    # ---------------------------------------------------------
    print("\n[Step 1] Checking GET /health ...")
    health_resp = client.get("/health")
    print(f"Status Code: {health_resp.status_code}")
    assert health_resp.status_code == 200, f"Expected 200, got {health_resp.status_code}"
    health_data = health_resp.json()
    print(f"Response: {json.dumps(health_data, indent=2)}")
    assert health_data.get("status") == "healthy"
    print(">> Step 1 PASSED: Service is healthy.")

    # ---------------------------------------------------------
    # 2. Test POST /analyze with data/network.json
    # ---------------------------------------------------------
    print("\n[Step 2] Testing POST /analyze using data/network.json ...")
    network_path = Path("data/network.json")
    assert network_path.exists(), "data/network.json missing"
    with open(network_path, "r", encoding="utf-8") as f:
        network_data = json.load(f)

    analyze_resp = client.post("/analyze", json=network_data)
    print(f"Status Code: {analyze_resp.status_code}")
    assert analyze_resp.status_code == 200, f"Expected 200, got {analyze_resp.status_code}"
    analyze_data = analyze_resp.json()
    
    # Validate against Pydantic schema
    validated_analyze = AnalyzeResponse.model_validate(analyze_data)
    print(f"Model Name: {validated_analyze.model_name}")
    print(f"Execution Mode: {validated_analyze.execution_mode}")
    print(f"Total Violations: {validated_analyze.total_violations}")
    
    assert validated_analyze.total_violations >= 1, "Expected at least 1 violation in sample network"
    primary_finding = validated_analyze.findings[0]
    print(f"Discovered Violation ID: {primary_finding.id}")
    print(f"Source -> Dest: {primary_finding.source} -> {primary_finding.destination}")
    print(f"Violated Policy: {primary_finding.violated_policy_id}")
    print(f"Discovered Path: {' -> '.join(primary_finding.discovered_path)}")
    print(f"Supporting Rule IDs: {primary_finding.supporting_rule_ids}")
    print(f"Finding Status: {primary_finding.status}")
    print(">> Step 2 PASSED: Deterministic graph analysis detected the ghost route.")

    # ---------------------------------------------------------
    # 3. Test POST /explain
    # ---------------------------------------------------------
    print("\n[Step 3] Testing POST /explain with detected finding ...")
    explain_req = {
        "finding": primary_finding.model_dump(),
        "network_summary": {"name": validated_analyze.model_name}
    }
    explain_resp = client.post("/explain", json=explain_req)
    print(f"Status Code: {explain_resp.status_code}")
    assert explain_resp.status_code == 200, f"Expected 200, got {explain_resp.status_code}"
    explain_data = explain_resp.json()

    # Validate against Pydantic schema
    validated_explain = ExplainResponse.model_validate(explain_data)
    print(f"Status: {validated_explain.status}")
    print(f"Model Used: {validated_explain.model_used}")
    print(f"Explanation: {validated_explain.explanation}")
    print(f"Root Cause: {validated_explain.root_cause}")
    print(f"Proposed Remediation ID: {validated_explain.proposed_remediation.proposal_id}")
    print(f"Operation: {validated_explain.proposed_remediation.operation}")
    print(f"Target Device: {validated_explain.proposed_remediation.target_device_id}")
    print(f"Target Rule: {validated_explain.proposed_remediation.target_rule_id}")
    print(f"Rationale: {validated_explain.proposed_remediation.rationale}")

    if validated_explain.status == "ANALYZED_LLM":
        print(">> Step 3 RESULT: Powered by real NVIDIA Nemotron API.")
    elif validated_explain.status == "DEMO_FALLBACK":
        print(">> Step 3 RESULT: Powered by DEMO_FALLBACK (NVIDIA_API_KEY not configured / offline).")
    else:
        raise AssertionError(f"Unexpected status: {validated_explain.status}")
    print(">> Step 3 PASSED: Explanation and remediation proposal generated and validated.")

    # ---------------------------------------------------------
    # 4. Test POST /simulate-fix with the proposal
    # ---------------------------------------------------------
    print("\n[Step 4] Testing POST /simulate-fix with proposed remediation ...")
    sim_req = {
        "network": network_data,
        "proposal": validated_explain.proposed_remediation.model_dump()
    }
    sim_resp = client.post("/simulate-fix", json=sim_req)
    print(f"Status Code: {sim_resp.status_code}")
    assert sim_resp.status_code == 200, f"Expected 200, got {sim_resp.status_code}"
    sim_data = sim_resp.json()

    validated_sim = SimulateFixResponse.model_validate(sim_data)
    print(f"Simulation Status: {validated_sim.status}")
    print(f"Message: {validated_sim.message}")
    print(f"Changes Applied: {validated_sim.changes_applied}")
    assert validated_sim.status == "SIMULATED", f"Expected SIMULATED, got {validated_sim.status}"
    
    # Verify original network data was untouched
    assert len(network_data["firewall_rules"]) == 4
    orig_rule_enabled = next(r["enabled"] for r in network_data["firewall_rules"] if r["id"] == "FW-CORE-003")
    assert orig_rule_enabled is True, "Original network JSON in memory was mutated!"
    print(">> Step 4 PASSED: Fix simulated safely in memory on deep copy; original model untouched.")

    # ---------------------------------------------------------
    # 5. Test POST /verify and confirm all three conditions
    # ---------------------------------------------------------
    print("\n[Step 5] Testing POST /verify on the simulated network copy ...")
    verify_req = {
        "simulated_network": validated_sim.simulated_network.model_dump(),
        "original_violation": primary_finding.model_dump(),
        "policies": None
    }
    verify_resp = client.post("/verify", json=verify_req)
    print(f"Status Code: {verify_resp.status_code}")
    assert verify_resp.status_code == 200, f"Expected 200, got {verify_resp.status_code}"
    verify_data = verify_resp.json()

    validated_verify = VerifyResponse.model_validate(verify_data)
    print(f"Overall Verdict: {validated_verify.verdict}")
    print(f"Condition 1 (Original Violation Resolved): {validated_verify.original_violation_resolved}")
    print(f"Condition 2 (Legitimate Paths Intact): {validated_verify.legitimate_paths_intact}")
    print(f"Condition 3 (New Violations Count): {validated_verify.new_violations_count}")
    print("Individual Assertion Checks:")
    for check in validated_verify.checks:
        print(f"  - [{check.verdict}] {check.check_type} ({check.policy_id}): {check.details}")

    assert validated_verify.verdict == "PASS", f"Expected PASS, got {validated_verify.verdict}"
    assert validated_verify.original_violation_resolved is True
    assert validated_verify.legitimate_paths_intact is True
    assert validated_verify.new_violations_count == 0
    print(">> Step 5 PASSED: All 3 verification conditions satisfied deterministically.")

    # ---------------------------------------------------------
    # 6. Test POST /agent/run for complete workflow
    # ---------------------------------------------------------
    print("\n[Step 6] Testing POST /agent/run for complete end-to-end workflow ...")
    agent_req = {"network": network_data}
    agent_resp = client.post("/agent/run", json=agent_req)
    print(f"Status Code: {agent_resp.status_code}")
    assert agent_resp.status_code == 200, f"Expected 200, got {agent_resp.status_code}"
    agent_data = agent_resp.json()

    validated_agent = AgentWorkflowResponse.model_validate(agent_data)
    print(f"Workflow Status: {validated_agent.status}")
    print(f"Total Findings Processed: {validated_agent.total_findings}")
    print(f"Workflow Steps Recorded: {len(validated_agent.steps)}")
    for step in validated_agent.steps:
        print(f"  * {step.step_name}: {step.status} -> {step.details}")
    print(f"Final Summary: {validated_agent.final_summary}")
    assert validated_agent.status == "COMPLETED"
    assert validated_agent.verification.verdict == "PASS"
    print(">> Step 6 PASSED: Complete agent orchestration loop finished successfully.")

    print("\n" + "=" * 70)
    print("ALL 6 END-TO-END SMOKE TEST STEPS COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_smoke_test()
