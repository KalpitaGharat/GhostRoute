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

from openai import (
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    APITimeoutError,
    APIConnectionError,
    APIStatusError
)

from backend.agent import get_nvidia_client, get_configured_model, redact_secrets
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

# Live health tracking state across service lifecycle
_LAST_LIVE_SUCCESS_AT: Optional[str] = None
_LAST_LIVE_FAILURE_AT: Optional[str] = None
_LAST_LIVE_ERROR_MESSAGE: Optional[str] = None
_LAST_LIVE_ERROR_CATEGORY: Optional[str] = None


def _record_live_success() -> None:
    """Record that a live inference call succeeded."""
    global _LAST_LIVE_SUCCESS_AT, _LAST_LIVE_ERROR_MESSAGE, _LAST_LIVE_ERROR_CATEGORY
    _LAST_LIVE_SUCCESS_AT = datetime.now(timezone.utc).isoformat()
    _LAST_LIVE_ERROR_MESSAGE = None
    _LAST_LIVE_ERROR_CATEGORY = None


def _record_live_failure(error_msg: str, category: str) -> None:
    """Record that a live inference call failed."""
    global _LAST_LIVE_FAILURE_AT, _LAST_LIVE_ERROR_MESSAGE, _LAST_LIVE_ERROR_CATEGORY
    _LAST_LIVE_FAILURE_AT = datetime.now(timezone.utc).isoformat()
    _LAST_LIVE_ERROR_MESSAGE = redact_secrets(error_msg)
    _LAST_LIVE_ERROR_CATEGORY = category


def compute_finding_hash(finding: AnalysisFinding) -> str:
    """Compute a deterministic hash of finding attributes for cache validation."""
    content = f"{finding.id}:{finding.source}:{finding.destination}:{finding.protocol}:{finding.port}:{','.join(finding.discovered_path)}:{','.join(finding.supporting_rule_ids)}:{finding.violated_policy_id}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def get_ai_health(check_live: bool = False) -> AiHealthResponse:
    """Report AI provider readiness, model selection, and configuration without leaking credentials.
    
    Distinguishes:
    - CONFIGURATION_MISSING: No valid API key configured
    - CONFIGURED_UNTESTED: Key present but no live calls completed yet
    - LIVE_VERIFIED: Real model inference verified
    - LIVE_FAILING: API call failed with diagnostic category
    """
    api_key = os.getenv("NVIDIA_API_KEY", "")
    has_key = bool(api_key.strip() and "placeholder" not in api_key.lower())
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model = get_configured_model()

    if not has_key:
        return AiHealthResponse(
            status="CONFIGURATION_MISSING",
            provider="NVIDIA NIM (OpenAI-compatible)",
            configured_model=model,
            base_url=base_url,
            has_api_key=False,
            live_inference_ready=False,
            last_error="NVIDIA_API_KEY is not configured or contains placeholder.",
            last_error_category="CONFIGURATION_MISSING"
        )

    # Optional bounded live connectivity test
    if check_live:
        client = get_nvidia_client()
        if client:
            try:
                # 5-second bounded shallow ping
                client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=1,
                    timeout=5.0
                )
                _record_live_success()
            except Exception as exc:
                cat = "CONNECTION_ERROR" if isinstance(exc, APIConnectionError) else "AUTHENTICATION_ERROR" if isinstance(exc, AuthenticationError) else "API_ERROR"
                _record_live_failure(str(exc), cat)

    # Evaluate current truthful health status
    if _LAST_LIVE_SUCCESS_AT and (not _LAST_LIVE_FAILURE_AT or _LAST_LIVE_SUCCESS_AT >= _LAST_LIVE_FAILURE_AT):
        status = "LIVE_VERIFIED"
        live_ready = True
    elif _LAST_LIVE_FAILURE_AT:
        status = "LIVE_FAILING"
        live_ready = False
    else:
        status = "CONFIGURED_UNTESTED"
        live_ready = False

    return AiHealthResponse(
        status=status,
        provider="NVIDIA NIM (OpenAI-compatible)",
        configured_model=model,
        base_url=base_url,
        has_api_key=True,
        live_inference_ready=live_ready,
        last_verified_at=_LAST_LIVE_SUCCESS_AT,
        last_error=_LAST_LIVE_ERROR_MESSAGE,
        last_error_category=_LAST_LIVE_ERROR_CATEGORY
    )


def generate_fallback_enrichment(
    finding: AnalysisFinding,
    error_msg: Optional[str] = None,
    error_category: Optional[str] = None
) -> FindingEnrichment:
    """Generate deterministic, labeled threat forensics for offline demo mode or error recovery.
    
    IMPORTANT: confidence is None for fallback to prevent misleading claims of measured model accuracy.
    """
    rules_str = ", ".join(finding.supporting_rule_ids) if finding.supporting_rule_ids else "unspecified access rule"
    path_str = " -> ".join(finding.discovered_path)
    safe_error = redact_secrets(error_msg) if error_msg else None

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
            f"Reachability is confirmed by deterministic NetworkX topology graph analysis. Firewall rule(s) {rules_str} lack restrictive "
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
        confidence=None,  # Do not invent 95% LLM confidence for deterministic graph fallback
        limitations=[
            "Generated using deterministic graph topology; live packet payloads and host-based endpoint telemetry were not inspected.",
            f"NVIDIA Nemotron offline demo fallback active: {safe_error or 'Provider call unavailable.'}"
        ],
        error=safe_error,
        error_category=error_category or "OFFLINE_FALLBACK",
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
            max_tokens=8192
        )

        content = response.choices[0].message.content or ""
        if not content.strip() and hasattr(response.choices[0].message, "reasoning_content"):
            rc = getattr(response.choices[0].message, "reasoning_content") or ""
            if "```json" in rc:
                # Use the last json block (final output) rather than the prompt template
                content = rc.split("```json")[-1].split("```")[0].strip()
            else:
                content = rc
        cleaned = content.strip()

        # Extract JSON content
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[-1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[-1].split("```")[0].strip()
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

        # Live inference successfully generated and validated
        _record_live_success()

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
            error_category=None,
            cached=False
        )

    except AuthenticationError as auth_err:
        safe_msg = "Invalid or expired NVIDIA API key (HTTP 401). Please check NVIDIA_API_KEY."
        logger.error("Nemotron enrichment auth failure [stage: chat_completion]: %s", safe_msg)
        _record_live_failure(safe_msg, "AUTHENTICATION_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="AUTHENTICATION_ERROR")

    except RateLimitError as rate_err:
        safe_msg = "NVIDIA NIM rate limit or credit quota reached (HTTP 429). Please verify account credits."
        logger.warning("Nemotron enrichment rate limit [stage: chat_completion]: %s", safe_msg)
        _record_live_failure(safe_msg, "RATE_LIMIT_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="RATE_LIMIT_ERROR")

    except NotFoundError as nf_err:
        safe_msg = f"Configured model '{model}' not found on NVIDIA NIM endpoint (HTTP 404)."
        logger.error("Nemotron enrichment model missing [stage: chat_completion]: %s", safe_msg)
        _record_live_failure(safe_msg, "MODEL_NOT_FOUND_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="MODEL_NOT_FOUND_ERROR")

    except APITimeoutError as timeout_err:
        safe_msg = "NVIDIA NIM inference request timed out. Model reasoning took longer than configured limit."
        logger.warning("Nemotron enrichment timeout [stage: chat_completion]: %s", safe_msg)
        _record_live_failure(safe_msg, "TIMEOUT_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="TIMEOUT_ERROR")

    except APIConnectionError as conn_err:
        safe_msg = f"Network connection error reaching NVIDIA NIM endpoint at {client.base_url}."
        logger.warning("Nemotron enrichment connection error [stage: network_connect]: %s", safe_msg)
        _record_live_failure(safe_msg, "CONNECTION_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="CONNECTION_ERROR")

    except APIStatusError as status_err:
        code = getattr(status_err, "status_code", "unknown")
        safe_msg = f"NVIDIA NIM API returned error status HTTP {code}."
        logger.warning("Nemotron enrichment API status error [stage: chat_completion, code: %s]: %s", code, safe_msg)
        _record_live_failure(safe_msg, "API_STATUS_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="API_STATUS_ERROR")

    except json.JSONDecodeError as json_err:
        safe_msg = f"Nemotron response format error: Unterminated or invalid JSON ({json_err.msg})."
        logger.warning("Nemotron enrichment JSON decode failure [stage: response_parsing]: %s", safe_msg)
        _record_live_failure(safe_msg, "JSON_DECODE_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="JSON_DECODE_ERROR")

    except Exception as exc:
        safe_msg = f"Nemotron enrichment failed ({type(exc).__name__}): {redact_secrets(str(exc))}"
        logger.warning("Nemotron enrichment unexpected error [stage: pipeline]: %s", safe_msg)
        _record_live_failure(safe_msg, "UNEXPECTED_ERROR")
        return generate_fallback_enrichment(finding, error_msg=safe_msg, error_category="UNEXPECTED_ERROR")


async def enrich_finding_async(
    finding: AnalysisFinding,
    network_summary: Optional[Dict[str, Any]] = None,
    refresh: bool = False
) -> FindingEnrichment:
    """Asynchronously enrich a network finding with in-flight deduplication and caching."""
    finding_hash = compute_finding_hash(finding)

    # Invalidate cache if fresh evaluation requested
    if refresh:
        _ENRICHMENT_CACHE.pop(finding.id, None)

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
            # Only cache verified live inferences; never poison cache with transient fallbacks
            if result.status == EnrichmentStatus.ANALYZED_LLM:
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
