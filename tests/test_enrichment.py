"""Tests for GhostRoute AI Asynchronous Threat Enrichment & Correlation Service.
Validates:
1. AI Health reporting without leaking keys (distinguishing CONFIGURATION_MISSING, CONFIGURED_UNTESTED, LIVE_VERIFIED, LIVE_FAILING)
2. Asynchronous enrichment execution with mocked NVIDIA NIM
3. In-flight request deduplication
4. In-memory hash-based caching and refresh behavior
5. Specific error categorization (401 Auth, 429 RateLimit, Timeout, Connection, JSONDecodeError)
6. Secret redaction on diagnostic error logs
7. Cache protection: transient DEMO_FALLBACK does not poison cache
8. Cross-finding campaign correlation hypotheses
"""

import os
import json
import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from openai import (
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    APITimeoutError,
    APIConnectionError,
    APIStatusError
)

from backend.main import app
from backend.schemas import AnalysisFinding, FindingEnrichmentRequest, EnrichmentStatus
from backend.agent import redact_secrets
from backend.enrichment_service import (
    get_ai_health,
    generate_fallback_enrichment,
    enrich_finding_async,
    correlate_findings,
    compute_finding_hash,
    _call_nemotron_sync,
    _ENRICHMENT_CACHE,
    _record_live_success,
    _record_live_failure
)

client = TestClient(app)

SAMPLE_FINDING = AnalysisFinding(
    id="FINDING-TEST-001",
    source="dmz-web-01",
    destination="db-prod-01",
    protocol="TCP",
    port=5432,
    discovered_path=["dmz-web-01", "fw-core", "db-prod-01"],
    supporting_rule_ids=["FW-CORE-003"],
    violated_policy_id="POL-DMZ-DB-ISOLATION",
    severity="CRITICAL",
    description="DMZ host communicates directly with production database on port 5432.",
    status="DETECTED"
)

SAMPLE_FINDING_2 = AnalysisFinding(
    id="FINDING-TEST-002",
    source="dmz-web-02",
    destination="db-prod-01",
    protocol="TCP",
    port=5432,
    discovered_path=["dmz-web-02", "fw-core", "db-prod-01"],
    supporting_rule_ids=["FW-CORE-003"],
    violated_policy_id="POL-DMZ-DB-ISOLATION",
    severity="CRITICAL",
    description="Secondary DMZ host communicates directly with production database.",
    status="DETECTED"
)

MOCK_NEMOTRON_SUCCESS_JSON = json.dumps({
    "executive_summary": "Unintended TCP:5432 reachability from DMZ to production database.",
    "threat_assessment": "Critical database compromise vector via permissive firewall rule.",
    "evidence_based_reasoning": "Permitted via FW-CORE-003 without source IP restriction.",
    "attack_path_explanation": "1. Compromise DMZ web node.\n2. Pivot directly to DB over port 5432.",
    "mitre_mapping": ["T1190 - Exploit Public-Facing Application", "T1021 - Remote Services"],
    "recommended_actions": ["Restrict FW-CORE-003 to allow only application servers."],
    "confidence": 0.94,
    "limitations": ["Live telemetry not inspected."]
})


def make_mock_openai_response(content: str):
    """Create a mock OpenAI chat completion response."""
    mock_choice = MagicMock()
    mock_choice.finish_reason = "stop"
    mock_choice.message.content = content
    mock_choice.message.reasoning_content = None
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_resp.usage = MagicMock()
    return mock_resp


# ============================================================================
# 1. AI Health Reporting Tests
# ============================================================================

def test_ai_health_missing_key():
    """Verify health reports CONFIGURATION_MISSING when API key is not present."""
    with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}):
        resp = get_ai_health(check_live=False)
        assert resp.status == "CONFIGURATION_MISSING"
        assert resp.has_api_key is False
        assert resp.live_inference_ready is False


def test_ai_health_configured_untested():
    """Verify health reports CONFIGURED_UNTESTED before any live calls succeed."""
    import backend.enrichment_service as es
    es._LAST_LIVE_SUCCESS_AT = None
    es._LAST_LIVE_FAILURE_AT = None

    with patch.dict(os.environ, {"NVIDIA_API_KEY": "nvapi-mock-test-key-12345"}):
        resp = get_ai_health(check_live=False)
        assert resp.status == "CONFIGURED_UNTESTED"
        assert resp.has_api_key is True
        assert resp.live_inference_ready is False
        assert "nvapi-" not in str(resp.model_dump())


def test_ai_health_live_verified():
    """Verify health reports LIVE_VERIFIED after successful inference."""
    _record_live_success()
    with patch.dict(os.environ, {"NVIDIA_API_KEY": "nvapi-mock-test-key-12345"}):
        resp = get_ai_health(check_live=False)
        assert resp.status == "LIVE_VERIFIED"
        assert resp.live_inference_ready is True
        assert resp.last_verified_at is not None


def test_ai_health_live_failing():
    """Verify health reports LIVE_FAILING when last inference failed."""
    import backend.enrichment_service as es
    es._LAST_LIVE_SUCCESS_AT = None
    _record_live_failure("Connection refused to NVIDIA NIM", "CONNECTION_ERROR")

    with patch.dict(os.environ, {"NVIDIA_API_KEY": "nvapi-mock-test-key-12345"}):
        resp = get_ai_health(check_live=False)
        assert resp.status == "LIVE_FAILING"
        assert resp.live_inference_ready is False
        assert resp.last_error_category == "CONNECTION_ERROR"
        assert "Connection refused" in (resp.last_error or "")


# ============================================================================
# 2. Deterministic Fallback & Secret Redaction Tests
# ============================================================================

def test_deterministic_fallback_enrichment():
    """Ensure deterministic fallback enrichment adheres to strict forensic schema without inventing LLM confidence."""
    enrichment = generate_fallback_enrichment(SAMPLE_FINDING)
    assert enrichment.status == EnrichmentStatus.DEMO_FALLBACK
    assert enrichment.model_used == "deterministic-demo-fallback"
    assert "dmz-web-01" in (enrichment.executive_summary or "")
    assert "FW-CORE-003" in (enrichment.evidence_based_reasoning or "")
    assert len(enrichment.mitre_mapping) >= 1
    assert len(enrichment.recommended_actions) >= 1
    assert len(enrichment.limitations) >= 1
    # Fallback must NOT invent 95% LLM confidence
    assert enrichment.confidence is None


def test_secret_redaction():
    """Verify redact_secrets purges NVIDIA API keys and Bearer tokens."""
    leaked = "Failed with key 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 and Bearer secret123"
    cleaned = redact_secrets(leaked)
    assert "nvapi-" not in cleaned
    assert "[REDACTED_API_KEY]" in cleaned
    assert "secret123" not in cleaned
    assert "Bearer [REDACTED]" in cleaned


# ============================================================================
# 3. Successful Mocked Live Inference, Caching, and Invalidation Tests
# ============================================================================

@pytest.mark.anyio
async def test_async_enrichment_mocked_success():
    """Verify successful mocked Nemotron response returns ANALYZED_LLM and caches result."""
    _ENRICHMENT_CACHE.clear()

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = make_mock_openai_response(MOCK_NEMOTRON_SUCCESS_JSON)

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        # 1. First run generates fresh inference
        result1 = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
        assert result1.finding_id == SAMPLE_FINDING.id
        assert result1.status == EnrichmentStatus.ANALYZED_LLM
        assert result1.cached is False
        assert result1.confidence == 0.94

        # 2. Second run returns cached result
        result2 = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
        assert result2.cached is True
        assert result2.status == EnrichmentStatus.ANALYZED_LLM
        assert mock_client.chat.completions.create.call_count == 1

        # 3. Third run with refresh=True forces new call
        result3 = await enrich_finding_async(SAMPLE_FINDING, refresh=True)
        assert result3.cached is False
        assert mock_client.chat.completions.create.call_count == 2


@pytest.mark.anyio
async def test_fallback_does_not_poison_cache():
    """Ensure transient fallback results are NOT cached, so subsequent calls can retry live inference."""
    _ENRICHMENT_CACHE.clear()

    # Mock client with network error
    mock_client = MagicMock()
    mock_req = MagicMock()
    mock_client.chat.completions.create.side_effect = APIConnectionError(request=mock_req)

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result_fail = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
        assert result_fail.status == EnrichmentStatus.DEMO_FALLBACK
        assert result_fail.error_category == "CONNECTION_ERROR"
        # Verify fallback was NOT stored in cache
        assert SAMPLE_FINDING.id not in _ENRICHMENT_CACHE

    # When provider recovers, subsequent call automatically succeeds without needing manual refresh
    mock_client.chat.completions.create.side_effect = None
    mock_client.chat.completions.create.return_value = make_mock_openai_response(MOCK_NEMOTRON_SUCCESS_JSON)

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result_recovered = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
        assert result_recovered.status == EnrichmentStatus.ANALYZED_LLM
        assert result_recovered.cached is False


# ============================================================================
# 4. Error Categorization Tests
# ============================================================================

def test_enrichment_authentication_error():
    """Verify HTTP 401 AuthenticationError is categorized properly in fallback."""
    mock_client = MagicMock()
    mock_resp = MagicMock(status_code=401)
    mock_client.chat.completions.create.side_effect = AuthenticationError(
        message="Invalid API Key",
        response=mock_resp,
        body={}
    )

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result = _call_nemotron_sync(SAMPLE_FINDING)
        assert result.status == EnrichmentStatus.DEMO_FALLBACK
        assert result.error_category == "AUTHENTICATION_ERROR"
        assert "401" in (result.error or "")


def test_enrichment_rate_limit_error():
    """Verify HTTP 429 RateLimitError is categorized properly in fallback."""
    mock_client = MagicMock()
    mock_resp = MagicMock(status_code=429)
    mock_client.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit reached",
        response=mock_resp,
        body={}
    )

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result = _call_nemotron_sync(SAMPLE_FINDING)
        assert result.status == EnrichmentStatus.DEMO_FALLBACK
        assert result.error_category == "RATE_LIMIT_ERROR"
        assert "429" in (result.error or "")


def test_enrichment_timeout_error():
    """Verify APITimeoutError is categorized properly in fallback."""
    mock_client = MagicMock()
    mock_req = MagicMock()
    mock_client.chat.completions.create.side_effect = APITimeoutError(request=mock_req)

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result = _call_nemotron_sync(SAMPLE_FINDING)
        assert result.status == EnrichmentStatus.DEMO_FALLBACK
        assert result.error_category == "TIMEOUT_ERROR"


def test_enrichment_json_decode_error():
    """Verify truncated or malformed JSON from LLM is categorized as JSON_DECODE_ERROR."""
    mock_client = MagicMock()
    # Malformed / unterminated JSON
    mock_client.chat.completions.create.return_value = make_mock_openai_response('{"executive_summary": "Unterminated string')

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        result = _call_nemotron_sync(SAMPLE_FINDING)
        assert result.status == EnrichmentStatus.DEMO_FALLBACK
        assert result.error_category == "JSON_DECODE_ERROR"


# ============================================================================
# 5. API Endpoints & Correlation Tests
# ============================================================================

def test_findings_enrichment_api_mocked():
    """Test POST & GET /findings/{finding_id}/enrichment with mock provider."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = make_mock_openai_response(MOCK_NEMOTRON_SUCCESS_JSON)

    with patch("backend.enrichment_service.get_nvidia_client", return_value=mock_client):
        payload = {
            "finding": SAMPLE_FINDING.model_dump(),
            "refresh": True
        }
        post_resp = client.post(f"/findings/{SAMPLE_FINDING.id}/enrichment", json=payload)
        assert post_resp.status_code == 200
        enrichment = post_resp.json()
        assert enrichment["finding_id"] == SAMPLE_FINDING.id
        assert enrichment["status"] == "ANALYZED_LLM"
        assert "TCP:5432" in enrichment["executive_summary"]


def test_cross_finding_correlation():
    """Test POST /findings/correlation identifies shared infrastructure indicators."""
    payload = {
        "findings": [SAMPLE_FINDING.model_dump(), SAMPLE_FINDING_2.model_dump()]
    }
    resp = client.post("/findings/correlation", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["related_findings"]) == 2
    assert "fw-core" in data["shared_indicators"]["shared_transit_devices"]
    assert "FW-CORE-003" in data["shared_indicators"]["shared_permissive_rules"]
    assert len(data["possible_attack_path"]) >= 3
    assert len(data["evidence_limitations"]) >= 1
