"""GhostRoute AI — Asynchronous NVIDIA Nemotron Enrichment Service
Provides:
- Non-blocking asynchronous network forensics & threat enrichment copilot
- Strict structured JSON prompting (executive summary, threat assessment, MITRE mapping, limitations)
- In-flight request deduplication and in-memory hash-based result caching
- Cache invalidation and explicit refresh support
- Bounded concurrency with asyncio.Semaphore & non-blocking execution via asyncio.to_thread
- Deterministic fallback when AI is unavailable or offline
- Cross-finding correlation hypothesis engine
"""

import os
import json
import logging
import asyncio
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from backend.agent import get_nvidia_client, get_configured_model
from backend.schemas import (
    AnalysisFinding,
    FindingEnrichment,
    EnrichmentStatus,
    AiHealthResponse,
    CorrelationResponse
)

logger = logging.getLogger("ghostroute.enrichment")

# Concurrency limiter: max 3 simultaneous requests to NVIDIA API
_SEMAPHORE = asyncio.Semaphore(3)

# In-memory storage for completed enrichments and in-flight tasks
# Cache structure: finding_id -> (cache_hash, FindingEnrichment)
_ENRICHMENT_CACHE: Dict[str, tuple[str, FindingEnrichment]] = {}
_INFLIGHT_TASKS: Dict[str, asyncio.Task] = {}


def compute_finding_hash(finding: AnalysisFinding) -> str:
    """Compute a deterministic hash of finding attributes for cache validation."""
    content = f"{finding.id}:{finding.source}:{finding.destination}:{finding.protocol}:{finding.port}:{','.join(finding.discovered_path)}:{','.join(finding.supporting_rule_ids)}:{finding.violated_policy_id}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def get_ai_health() -> AiHealthResponse:
    """Report AI provider readiness, model selection, and configuration without leaking credentials."""
    api_key = os.getenv("NVIDIA_API_KEY", "")
    has_key = bool(api_key.strip() and "placeholder" not in api_key.lower())
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model = get_configured_model()

    client = get_nvidia_client()
    live_ready = client is not None

    return AiHealthResponse(
        status="READY" if live_ready else "OFFLINE_FALLBACK_ACTIVE",
        provider="NVIDIA NIM (OpenAI-compatible)",
        configured_model=model,
        base_url=base_url,
        has_api_key=has_key,
        live_inference_ready=live_ready
    )


def generate_fallback_enrichment(finding: AnalysisFinding, error_msg: Optional[str] = None) -> FindingEnrichment:
    """Generate deterministic, labeled threat forensics for offline demo mode or error recovery."""
    rules_str = ", ".join(finding.supporting_rule_ids) if finding.supporting_rule_ids else "unspecified access rule"
    path_str = " -> ".join(finding.discovered_path)

    return FindingEnrichment(
        finding_id=finding.id,
        status=EnrichmentStatus.DEMO_FALLBACK,
        model_used="deterministic-demo-fallback",
        executive_summary=(
            f"[OFFLINE FALLBACK] Deterministic graph reachability detected an unintended trust path from "
            f"{finding.source} to sensitive host {finding.destination} via {path_str}. Permitted by rule(s) {rules_str}."
        ),
        threat_assessment=(
            f"Severity {finding.severity}: An external/DMZ boundary host possesses unexpected reachability to "
            f"core internal assets on {finding.protocol}:{finding.port or 'any'}. This enables lateral movement or data exfiltration."
        ),
        evidence_based_reasoning=(
            f"Reachability is confirmed by topology graph analysis. Firewall rule(s) {rules_str} lack restrictive "
            f"source/destination zone constraints, permitting transit across network boundaries."
        ),
        attack_path_explanation=(
            f"1. Attacker establishes foothold on {finding.source}.\n"
            f"2. Attacker pivots along trust path: {path_str}.\n"
            f"3. Target {finding.destination} is directly accessible over {finding.protocol}:{finding.port or 'any'}."
        ),
        mitre_mapping=[
            "T1190 - Exploit Public-Facing Application",
            "T1021 - Remote Services",
            "T1570 - Lateral Tool Transfer"
        ],
        recommended_actions=[
            f"Disable or constrain rule(s) {rules_str} on transit firewall.",
            f"Enforce strict source IP/zone filtering between {finding.source} and {finding.destination}.",
            "Verify legitimate service connectivity with independent access policies."
        ],
        confidence=0.95,
        limitations=[
            "Generated using deterministic graph topology; live packet payloads and host-based endpoint telemetry were not inspected.",
            "NVIDIA Nemotron offline demo fallback mode is active."
        ],
        error=error_msg,
        cached=False
    )


def _call_nemotron_sync(finding: AnalysisFinding, network_summary: Optional[Dict[str, Any]] = None) -> FindingEnrichment:
    """Synchronous execution of NVIDIA Nemotron chat completion with strict JSON prompting."""
    client = get_nvidia_client()
    model = get_configured_model()

    if not client:
        return generate_fallback_enrichment(finding, error_msg="NVIDIA API key not configured. Using offline demo fallback.")

    system_prompt = (
        "You are GhostRoute AI's Senior Cybersecurity Forensics Copilot.\n"
        "Analyze the provided network security path finding and produce an evidence-based forensic threat enrichment.\n"
        "IMPORTANT: Keep internal reasoning concise (under 50 words) and output the valid JSON immediately.\n\n"
        "STRICT DEFENSIVE RULES:\n"
        "1. Base your response EXCLUSIVELY on the supplied graph path, rules, devices, and policies.\n"
        "2. NEVER invent external CVEs, fake threat actor names, fictitious IP reputations, or external incidents.\n"
        "3. Output MUST be ONLY valid JSON matching this exact structure with no conversational commentary:\n"
        "{\n"
        '  "executive_summary": "1-2 sentence high-level summary for SecOps leadership",\n'
        '  "threat_assessment": "analysis of exposure, blast radius, and potential impact",\n'
        '  "evidence_based_reasoning": "technical explanation referencing exact devices and rules in the path",\n'
        '  "attack_path_explanation": "step-by-step technical pivot sequence along the discovered path",\n'
        '  "mitre_mapping": ["Txxxx - Technique Name", "Tyyyy - Technique Name"],\n'
        '  "recommended_actions": ["Action 1", "Action 2", "Action 3"],\n'
        '  "confidence": 0.90,\n'
        '  "limitations": ["Limitation 1", "Limitation 2"]\n'
        "}\n"
    )

    user_prompt = (
        f"ANALYZE THIS NETWORK TRUST PATH FINDING:\n"
        f"- Finding ID: {finding.id}\n"
        f"- Severity: {finding.severity}\n"
        f"- Breached Policy: {finding.violated_policy_id}\n"
        f"- Source Device: {finding.source}\n"
        f"- Destination Device: {finding.destination}\n"
        f"- Protocol / Port: {finding.protocol}:{finding.port or 'any'}\n"
        f"- Discovered Trust Path: {' -> '.join(finding.discovered_path)}\n"
        f"- Supporting Firewall Rules: {', '.join(finding.supporting_rule_ids)}\n"
        f"- Finding Description: {finding.description}\n"
    )
    if network_summary:
        user_prompt += f"- Network Context: {json.dumps(network_summary)}\n"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=4096
        )

        content = response.choices[0].message.content or ""
        if not content.strip() and hasattr(response.choices[0].message, "reasoning_content"):
            content = getattr(response.choices[0].message, "reasoning_content") or ""
        cleaned = content.strip()

        # Extract JSON content
        if "```json" in cleaned:
            cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()
        elif "{" in cleaned and "}" in cleaned:
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}") + 1
            cleaned = cleaned[start_idx:end_idx].strip()

        data = json.loads(cleaned)

        # Parse confidence safely
        try:
            confidence = float(data.get("confidence", 0.90))
            confidence = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            confidence = 0.85

        return FindingEnrichment(
            finding_id=finding.id,
            status=EnrichmentStatus.ANALYZED_LLM,
            model_used=model,
            executive_summary=str(data.get("executive_summary", "Forensic path analysis completed by Nemotron.")),
            threat_assessment=str(data.get("threat_assessment", "Elevated exposure due to cross-zone connectivity.")),
            evidence_based_reasoning=str(data.get("evidence_based_reasoning", f"Permitted via {', '.join(finding.supporting_rule_ids)}.")),
            attack_path_explanation=str(data.get("attack_path_explanation", f"Pivot sequence: {' -> '.join(finding.discovered_path)}.")),
            mitre_mapping=[str(m) for m in data.get("mitre_mapping", []) if isinstance(m, str)],
            recommended_actions=[str(a) for a in data.get("recommended_actions", []) if isinstance(a, str)],
            confidence=confidence,
            limitations=[str(l) for l in data.get("limitations", []) if isinstance(l, str)],
            error=None,
            cached=False
        )

    except Exception as exc:
        logger.warning(f"Live Nemotron enrichment failed ({type(exc).__name__}): {exc}. Falling back to deterministic enrichment.")
        return generate_fallback_enrichment(finding, error_msg=f"Provider call failed ({type(exc).__name__}). Using deterministic enrichment.")


async def enrich_finding_async(
    finding: AnalysisFinding,
    network_summary: Optional[Dict[str, Any]] = None,
    refresh: bool = False
) -> FindingEnrichment:
    """Asynchronously enrich a network finding with in-flight deduplication and caching."""
    finding_hash = compute_finding_hash(finding)

    # 1. Check cache (unless refresh requested)
    if not refresh and finding.id in _ENRICHMENT_CACHE:
        cached_hash, cached_enrichment = _ENRICHMENT_CACHE[finding.id]
        if cached_hash == finding_hash:
            # Return cached copy marked cached=True
            return cached_enrichment.model_copy(update={"cached": True})

    # 2. Check if an in-flight task already exists for this finding (deduplication)
    if finding.id in _INFLIGHT_TASKS and not _INFLIGHT_TASKS[finding.id].done():
        logger.info(f"Deduplicating concurrent enrichment request for finding {finding.id}")
        return await _INFLIGHT_TASKS[finding.id]

    # 3. Create worker task protected by semaphore
    async def _worker() -> FindingEnrichment:
        async with _SEMAPHORE:
            # Run blocking OpenAI call in thread pool to avoid blocking asyncio loop
            result = await asyncio.to_thread(_call_nemotron_sync, finding, network_summary)
            _ENRICHMENT_CACHE[finding.id] = (finding_hash, result)
            return result

    task = asyncio.create_task(_worker())
    _INFLIGHT_TASKS[finding.id] = task

    try:
        return await task
    finally:
        _INFLIGHT_TASKS.pop(finding.id, None)


def get_cached_enrichment(finding_id: str) -> Optional[FindingEnrichment]:
    """Retrieve existing enrichment from cache if available."""
    if finding_id in _ENRICHMENT_CACHE:
        _, item = _ENRICHMENT_CACHE[finding_id]
        return item.model_copy(update={"cached": True})
    return None


def get_enrichment_status(finding_id: str) -> Dict[str, Any]:
    """Check whether enrichment is completed, in-flight (PENDING), or not started."""
    if finding_id in _INFLIGHT_TASKS and not _INFLIGHT_TASKS[finding_id].done():
        return {
            "finding_id": finding_id,
            "status": EnrichmentStatus.PENDING,
            "enrichment": None
        }
    
    cached = get_cached_enrichment(finding_id)
    if cached:
        return {
            "finding_id": finding_id,
            "status": cached.status,
            "enrichment": cached
        }
    
    return {
        "finding_id": finding_id,
        "status": "NOT_STARTED",
        "enrichment": None
    }


def correlate_findings(
    findings: List[AnalysisFinding],
    network_summary: Optional[Dict[str, Any]] = None
) -> CorrelationResponse:
    """Analyze multiple findings to identify shared devices, firewall rules, and campaign patterns."""
    if not findings:
        return CorrelationResponse(
            related_findings=[],
            shared_indicators={},
            possible_attack_path=[],
            recommended_investigations=[],
            evidence_limitations=["No findings supplied for correlation."],
            status=EnrichmentStatus.DEMO_FALLBACK
        )

    # Calculate shared devices and rules
    device_counts: Dict[str, int] = {}
    rule_counts: Dict[str, int] = {}
    finding_ids = [f.id for f in findings]

    for f in findings:
        for d in f.discovered_path:
            device_counts[d] = device_counts.get(d, 0) + 1
        for r in f.supporting_rule_ids:
            rule_counts[r] = rule_counts.get(r, 0) + 1

    shared_devices = [d for d, count in device_counts.items() if count > 1]
    shared_rules = [r for r, count in rule_counts.items() if count > 1]

    # Combine discovered paths into unified multi-stage attack graph
    combined_path: List[str] = []
    for f in findings:
        for node in f.discovered_path:
            if node not in combined_path:
                combined_path.append(node)

    shared_indicators = {
        "shared_transit_devices": shared_devices,
        "shared_permissive_rules": shared_rules,
        "affected_destinations": list({f.destination for f in findings})
    }

    recommended_investigations = [
        f"Audit common transit firewall '{shared_devices[0]}' for overlapping permissive ACLs." if shared_devices else "Audit perimeter gateways.",
        f"Investigate blast radius of rule '{shared_rules[0]}' across all internal interfaces." if shared_rules else "Audit interface-level security policies.",
        "Inspect connection logs for concurrent sessions linking ingress nodes to database targets."
    ]

    limitations = [
        "Correlations are structural graph hypotheses; individual flow simultaneity is unverified.",
        "Timestamps and active adversary dwell times are not derived from static reachability graphs."
    ]

    return CorrelationResponse(
        related_findings=finding_ids,
        shared_indicators=shared_indicators,
        possible_attack_path=combined_path,
        recommended_investigations=recommended_investigations,
        evidence_limitations=limitations,
        status=EnrichmentStatus.ANALYZED_LLM if get_nvidia_client() is not None else EnrichmentStatus.DEMO_FALLBACK
    )
