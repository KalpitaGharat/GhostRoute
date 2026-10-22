"""Tests for GhostRoute AI Persistent SQLite Audit Store.
Validates:
1. Table creation and persistent storage
2. Verification verdict and approval tracking
3. applied_to_firewall is always strictly False
4. Data durability across reopening the SQLite database file
5. API endpoints POST /remediation/approve and GET /audit/history
"""

import os
import shutil
import tempfile
import sqlite3
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.audit_store import (
    record_approval_audit,
    get_audit_history,
)

client = TestClient(app)


def test_sqlite_audit_persistence_across_reconnect():
    """Verify that records saved to the database survive closing and reopening the DB."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_audit.db")

    try:
        # 1. Initialize and insert first approval record
        rec1 = record_approval_audit(
            proposal_id="PROP-TEST-001",
            target_rule_id="FW-CORE-003",
            target_device_id="fw-core",
            operation="DISABLE_RULE",
            status="APPROVED",
            verification_verdict="PASS",
            original_violation_resolved=True,
            legitimate_paths_intact=True,
            new_violations_count=0,
            approver="SecOps Lead",
            notes="Change ticket SEC-1049",
            db_path=db_path
        )

        assert rec1["id"] is not None
        assert rec1["applied_to_firewall"] is False

        # 2. Simulate closing connection, reopen and verify persistence
        history1 = get_audit_history(limit=10, db_path=db_path)
        assert len(history1) == 1
        assert history1[0]["proposal_id"] == "PROP-TEST-001"
        assert history1[0]["target_rule_id"] == "FW-CORE-003"
        assert history1[0]["applied_to_firewall"] is False
        assert history1[0]["verification_verdict"] == "PASS"

        # 3. Add second record and re-query
        rec2 = record_approval_audit(
            proposal_id="PROP-TEST-002",
            target_rule_id="FW-CORE-004",
            target_device_id="fw-core",
            operation="ADD_RULE",
            status="APPROVED",
            verification_verdict="PASS",
            original_violation_resolved=True,
            legitimate_paths_intact=True,
            new_violations_count=0,
            approver="Cyber Architect",
            notes="Zero trust policy",
            db_path=db_path
        )

        # 4. Independent raw sqlite connection check (simulating backend reboot)
        with sqlite3.connect(db_path) as raw_conn:
            cursor = raw_conn.cursor()
            cursor.execute("SELECT proposal_id, applied_to_firewall FROM audit_records ORDER BY id ASC")
            rows = cursor.fetchall()
            assert len(rows) == 2
            assert rows[0] == ("PROP-TEST-001", 0)
            assert rows[1] == ("PROP-TEST-002", 0)

        # 5. get_audit_history orders newest first
        history2 = get_audit_history(limit=10, db_path=db_path)
        assert len(history2) == 2
        assert history2[0]["proposal_id"] == "PROP-TEST-002"
        assert history2[1]["proposal_id"] == "PROP-TEST-001"

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_api_approval_creates_audit_record(monkeypatch):
    """Test that POST /remediation/approve writes to the persistent audit store and GET /audit/history retrieves it."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_api_audit.db")

    try:
        monkeypatch.setenv("GHOSTROUTE_AUDIT_DB", db_path)

        # 1. Post approved remediation
        payload = {
            "proposal_id": "PROP-API-TEST",
            "approver": "Auditor (Neev)",
            "notes": "Emergency fix for DMZ shadow path",
            "verification_verdict": "PASS",
            "target_rule_id": "FW-CORE-003",
            "target_device_id": "fw-core",
            "operation": "DISABLE_RULE",
            "original_violation_resolved": True,
            "legitimate_paths_intact": True,
            "new_violations_count": 0
        }
        resp = client.post("/remediation/approve", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "APPROVED"
        assert data["approved"] is True
        assert data["apply_available"] is False

        # 2. Query GET /audit/history
        hist_resp = client.get("/audit/history")
        assert hist_resp.status_code == 200
        records = hist_resp.json()
        assert len(records) >= 1
        latest = records[0]
        assert latest["proposal_id"] == "PROP-API-TEST"
        assert latest["approver"] == "Auditor (Neev)"
        assert latest["verification_verdict"] == "PASS"
        assert latest["applied_to_firewall"] is False

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_unverified_approval_does_not_create_audit_record(monkeypatch):
    """Ensure that failed/unverified approvals are rejected with 400 and NOT written to audit store."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_api_audit_fail.db")

    try:
        monkeypatch.setenv("GHOSTROUTE_AUDIT_DB", db_path)

        payload = {
            "proposal_id": "PROP-FAIL-TEST",
            "approver": "SecOps Tester",
            "verification_verdict": "FAIL"
        }
        resp = client.post("/remediation/approve", json=payload)
        assert resp.status_code == 400

        # Ensure no audit record was recorded
        hist_resp = client.get("/audit/history")
        assert hist_resp.status_code == 200
        assert len(hist_resp.json()) == 0

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
