"""GhostRoute AI - Main FastAPI Application
Provides endpoints for network security analysis, LLM explanation, simulation, and verification.

Workflow: Detect -> Investigate -> Explain -> Recommend -> Simulate -> Verify
"""

import json
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.schemas import (
    NetworkModel,
    AnalyzeResponse,
    ExplainRequest,
    ExplainResponse,
    SimulateFixRequest,
    SimulateFixResponse,
    VerifyRequest,
    VerifyResponse,
    AgentWorkflowRequest,
    AgentWorkflowResponse,
    ApproveRemediationRequest,
    ApproveRemediationResponse,
    RemediationStatus,
    FindingEnrichment,
    FindingEnrichmentRequest,
    AiHealthResponse,
    CorrelationRequest,
    CorrelationResponse
)
from backend.graph_adapter import get_active_graph_engine
from backend.remediation import simulate_network_fix
from backend.verification import verify_simulated_network
from backend.agent import explain_finding_with_nemotron, run_full_investigation_workflow
from backend.validation import NetworkValidationError
from backend.audit_store import record_approval_audit, get_audit_history
from backend.enrichment_service import (
    get_ai_health,
    enrich_finding_async,
    get_enrichment_status,
    correlate_findings
)

app = FastAPI(
    title="GhostRoute AI - The Network Trust Path Investigator",
    description="Simulation-first network security analysis API with AI-guided remediation and deterministic verification.",
    version="0.1.0"
)

# Enable CORS for Kalpita's frontend dashboard (Cytoscape.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def get_root() -> Dict[str, Any]:
    """Root endpoint returning service identity, version, and status."""
    return {
        "name": "GhostRoute AI",
        "description": "The Network Trust Path Investigator",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
def get_health() -> Dict[str, Any]:
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "ghostroute-backend"
    }


@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard() -> HTMLResponse:
    """Serve the interactive Cytoscape.js network security dashboard."""
    dashboard_path = Path(__file__).resolve().parent.parent / "static" / "index.html"
    if not dashboard_path.exists():
        return HTMLResponse("<h1>Dashboard file not found</h1>", status_code=404)
    return HTMLResponse(content=dashboard_path.read_text(encoding="utf-8"))


@app.get("/network/sample", response_model=NetworkModel)
def get_sample_network() -> NetworkModel:
    """Return the default enterprise network model for analysis and visualization."""
    sample_path = Path(__file__).resolve().parent.parent / "data" / "network.json"
    with open(sample_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return NetworkModel.model_validate(data)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_network(network: NetworkModel) -> AnalyzeResponse:
    """Analyze a network model against access policies using the deterministic graph adapter.
    
    Identifies unauthorized communication paths, supporting firewall rules,
    and violated security policies.
    """
    try:
        engine = get_active_graph_engine()
        findings = engine.analyze_policies(network)
    except NetworkValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Network validation failed before graph analysis", "errors": exc.errors}
        ) from exc

    return AnalyzeResponse(
        model_name=network.name,
        total_violations=len(findings),
        findings=findings,
        execution_mode="DETERMINISTIC_GRAPH"
    )


@app.post("/explain", response_model=ExplainResponse)
def explain_violation(request: ExplainRequest) -> ExplainResponse:
    """Send verified analysis finding to NVIDIA Nemotron to generate a root-cause explanation
    and structured least-privilege remediation proposal.
    """
    return explain_finding_with_nemotron(
        finding=request.finding,
        network_summary=request.network_summary
    )


@app.post("/simulate-fix", response_model=SimulateFixResponse)
def simulate_fix(request: SimulateFixRequest) -> SimulateFixResponse:
    """Apply a validated remediation proposal strictly to a deep copy of the network model.
    
    The original network model is never modified.
    """
    return simulate_network_fix(
        original_network=request.network,
        proposal=request.proposal
    )


@app.post("/verify", response_model=VerifyResponse)
def verify_simulation(request: VerifyRequest) -> VerifyResponse:
    """Independently verify whether the simulated network resolves the original violation
    without breaking required legitimate paths or introducing new violations.
    """
    return verify_simulated_network(
        simulated_network=request.simulated_network,
        original_violation=request.original_violation,
        policies_override=request.policies
    )


@app.post("/agent/run", response_model=AgentWorkflowResponse)
def run_agent_workflow(request: AgentWorkflowRequest) -> AgentWorkflowResponse:
    """Execute the full agentic loop:
    Detect -> Investigate -> Explain -> Recommend -> Simulate -> Verify
    """
    try:
        return run_full_investigation_workflow(request.network)
    except NetworkValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Network validation failed before agent workflow", "errors": exc.errors}
        ) from exc


@app.post("/remediation/approve", response_model=ApproveRemediationResponse)
def approve_remediation(request: ApproveRemediationRequest) -> ApproveRemediationResponse:
    """Authorize a verified remediation proposal.
    
    Guards:
    - The proposal MUST have passed independent deterministic verification.
    - Approval does not modify production hardware (simulation-first architecture).
    """
    if request.verification_verdict != "PASS":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot approve remediation '{request.proposal_id}': Verification verdict is "
                f"'{request.verification_verdict}'. Only independently verified (PASS) proposals "
                f"can be approved."
            )
        )

    # Durably record verified human approval in SQLite audit store
    record_approval_audit(
        proposal_id=request.proposal_id,
        target_rule_id=request.target_rule_id,
        target_device_id=request.target_device_id,
        operation=request.operation or "DISABLE_RULE",
        status=RemediationStatus.APPROVED.value,
        verification_verdict=request.verification_verdict,
        original_violation_resolved=request.original_violation_resolved,
        legitimate_paths_intact=request.legitimate_paths_intact,
        new_violations_count=request.new_violations_count,
        approver=request.approver,
        notes=request.notes,
    )

    return ApproveRemediationResponse(
        proposal_id=request.proposal_id,
        status=RemediationStatus.APPROVED,
        approved=True,
        approver=request.approver,
        timestamp=datetime.now(timezone.utc).isoformat(),
        message=f"Remediation proposal '{request.proposal_id}' authorized by {request.approver} for deployment window.",
        apply_available=False,
        apply_unavailability_reason=(
            "Live firewall adapter is not connected. GhostRoute AI operates in simulation-first "
            "mode; automated execution to production firewalls requires an enterprise orchestrator plugin."
        )
    )


@app.post("/remediation/apply")
def apply_remediation() -> Dict[str, Any]:
    """Safety guard: Real firewall modification is prohibited without a live hardware adapter."""
    raise HTTPException(
        status_code=403,
        detail=(
            "Direct firewall execution is unavailable. GhostRoute AI is running in simulation-only "
            "mode. No real firewall changes are permitted without a connected enterprise orchestrator."
        )
    )


@app.get("/audit/history")
def get_remediation_audit_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve persistent audit history of remediation reviews and approvals."""
    return get_audit_history(limit=limit)


# ============================================================================
# Asynchronous AI Threat Forensics & Correlation Endpoints
# ============================================================================

@app.get("/ai/health", response_model=AiHealthResponse)
def get_ai_provider_health() -> AiHealthResponse:
    """Report AI copilot readiness, model configuration, and endpoint status without leaking keys."""
    return get_ai_health()


@app.post("/findings/{finding_id}/enrichment", response_model=FindingEnrichment)
async def enrich_finding(finding_id: str, request: FindingEnrichmentRequest) -> FindingEnrichment:
    """Asynchronously request or retrieve AI threat enrichment for a specific finding.
    
    Includes in-flight deduplication, result caching, and explicit refresh support.
    """
    if request.finding.id != finding_id:
        # Align finding ID if slightly mismatched
        request.finding.id = finding_id

    return await enrich_finding_async(
        finding=request.finding,
        network_summary=request.network_summary,
        refresh=request.refresh
    )


@app.get("/findings/{finding_id}/enrichment")
def get_finding_enrichment(finding_id: str) -> Dict[str, Any]:
    """Retrieve enrichment status (PENDING, ANALYZED_LLM, DEMO_FALLBACK, or NOT_STARTED) and result."""
    return get_enrichment_status(finding_id)


@app.post("/findings/correlation", response_model=CorrelationResponse)
def correlate_threat_findings(request: CorrelationRequest) -> CorrelationResponse:
    """Analyze multiple findings to identify shared devices, rules, and multi-stage pivoting hypotheses."""
    return correlate_findings(request.findings, request.network_summary)



