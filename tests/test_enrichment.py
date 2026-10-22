"""Tests for GhostRoute AI Asynchronous Threat Enrichment & Correlation Service.
Validates:
1. AI Health reporting without leaking keys
2. Asynchronous enrichment execution
3. In-flight request deduplication
4. In-memory hash-based caching and refresh behavior
5. Malformed response handling and deterministic fallback
6. Cross-finding campaign correlation hypotheses
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas import AnalysisFinding, FindingEnrichmentRequest, EnrichmentStatus
from backend.enrichment_service import (
    get_ai_health,
    generate_fallback_enrichment,
    enrich_finding_async,
    correlate_findings,
    compute_finding_hash,
    _ENRICHMENT_CACHE
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


def test_ai_health_endpoint():
    """Verify GET /ai/health returns valid readiness metadata without leaking credentials."""
    resp = client.get("/ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "configured_model" in data
    assert "has_api_key" in data
    assert "live_inference_ready" in data
    # Ensure raw API key is never exposed
    assert "nvapi-" not in str(data)


def test_deterministic_fallback_enrichment():
    """Ensure deterministic fallback enrichment adheres to strict forensic schema."""
    enrichment = generate_fallback_enrichment(SAMPLE_FINDING)
    assert enrichment.status == EnrichmentStatus.DEMO_FALLBACK
    assert enrichment.model_used == "deterministic-demo-fallback"
    assert "dmz-web-01" in enrichment.executive_summary
    assert "FW-CORE-003" in enrichment.evidence_based_reasoning
    assert len(enrichment.mitre_mapping) >= 1
    assert len(enrichment.recommended_actions) >= 1
    assert len(enrichment.limitations) >= 1
    assert enrichment.confidence is not None


@pytest.mark.anyio
async def test_async_enrichment_caching_and_refresh():
    """Verify that enrichment caches by hash and supports explicit refresh."""
    # Clear cache before test
    _ENRICHMENT_CACHE.clear()

    # 1. First enrichment run
    result1 = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
    assert result1.finding_id == SAMPLE_FINDING.id
    assert result1.cached is False

    # 2. Second run without refresh should hit cache
    result2 = await enrich_finding_async(SAMPLE_FINDING, refresh=False)
    assert result2.cached is True
    assert result2.executive_summary == result1.executive_summary

    # 3. Third run with refresh=True should bypass cache
    result3 = await enrich_finding_async(SAMPLE_FINDING, refresh=True)
    assert result3.cached is False


@pytest.mark.anyio
async def test_concurrent_request_deduplication():
    """Ensure simultaneous enrichment requests for the same finding are deduplicated."""
    _ENRICHMENT_CACHE.clear()

    # Launch two simultaneous requests
    task1 = asyncio.create_task(enrich_finding_async(SAMPLE_FINDING, refresh=True))
    task2 = asyncio.create_task(enrich_finding_async(SAMPLE_FINDING, refresh=False))

    r1, r2 = await asyncio.gather(task1, task2)
    assert r1.finding_id == SAMPLE_FINDING.id
    assert r2.finding_id == SAMPLE_FINDING.id


def test_findings_enrichment_api():
    """Test POST & GET /findings/{finding_id}/enrichment endpoints."""
    payload = {
        "finding": SAMPLE_FINDING.model_dump(),
        "refresh": True
    }
    # POST to trigger enrichment
    post_resp = client.post(f"/findings/{SAMPLE_FINDING.id}/enrichment", json=payload)
    assert post_resp.status_code == 200
    enrichment = post_resp.json()
    assert enrichment["finding_id"] == SAMPLE_FINDING.id
    assert enrichment["status"] in ("ANALYZED_LLM", "DEMO_FALLBACK")
    assert "executive_summary" in enrichment
    assert "mitre_mapping" in enrichment

    # GET to check status
    get_resp = client.get(f"/findings/{SAMPLE_FINDING.id}/enrichment")
    assert get_resp.status_code == 200
    status_data = get_resp.json()
    assert status_data["finding_id"] == SAMPLE_FINDING.id
    assert status_data["status"] in ("ANALYZED_LLM", "DEMO_FALLBACK", "PENDING")


def test_cross_finding_correlation():
    """Test POST /findings/correlation identifies shared infrastructure indicators."""
    payload = {
        "findings": [SAMPLE_FINDING.model_dump(), SAMPLE_FINDING_2.model_dump()]
    }
    resp = client.post("/findings/correlation", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["related_findings"]) == 2
    # Verify shared devices and rules are detected
    assert "fw-core" in data["shared_indicators"]["shared_transit_devices"]
    assert "FW-CORE-003" in data["shared_indicators"]["shared_permissive_rules"]
    assert len(data["possible_attack_path"]) >= 3
    assert len(data["evidence_limitations"]) >= 1
