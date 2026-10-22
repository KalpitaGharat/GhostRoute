"""GhostRoute AI - Lightweight Persistent Audit Store (SQLite)
Durable audit logging for verified and approved network security remediations.

SECURITY & AUDIT PRINCIPLES:
1. Records human approval and deterministic verification assertions.
2. Never claims a firewall rule was applied (applied_to_firewall is always False / 0).
3. Never stores API keys, credentials, or confidential network secrets.
4. Persists durably across backend restarts and page reloads.
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DEFAULT_DB_PATH = str(Path(__file__).resolve().parent.parent / "data" / "audit_history.db")


def get_db_path(custom_path: Optional[str] = None) -> str:
    """Resolve database path from argument, environment, or default."""
    if custom_path:
        return custom_path
    env_path = os.getenv("GHOSTROUTE_AUDIT_DB")
    if env_path:
        return env_path
    return DEFAULT_DB_PATH


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize the SQLite audit database and ensure table schema exists."""
    path = get_db_path(db_path)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proposal_id TEXT NOT NULL,
                target_rule_id TEXT,
                target_device_id TEXT,
                operation TEXT NOT NULL,
                status TEXT NOT NULL,
                verification_verdict TEXT NOT NULL,
                original_violation_resolved INTEGER NOT NULL,
                legitimate_paths_intact INTEGER NOT NULL,
                new_violations_count INTEGER NOT NULL,
                approver TEXT NOT NULL,
                notes TEXT,
                timestamp TEXT NOT NULL,
                event_summary TEXT NOT NULL,
                applied_to_firewall INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.commit()


def record_approval_audit(
    proposal_id: str,
    target_rule_id: Optional[str],
    target_device_id: Optional[str],
    operation: str,
    status: str,
    verification_verdict: str,
    original_violation_resolved: bool,
    legitimate_paths_intact: bool,
    new_violations_count: int,
    approver: str,
    notes: Optional[str] = None,
    event_summary: Optional[str] = None,
    db_path: Optional[str] = None
) -> Dict[str, Any]:
    """Insert a persistent audit record for an approved remediation.
    
    Guaranteed: applied_to_firewall is strictly False (0) since live firewall execution is disabled.
    """
    path = get_db_path(db_path)
    init_db(path)

    ts = datetime.now(timezone.utc).isoformat()
    summary = event_summary or (
        f"Proposal '{proposal_id}' ({operation} on {target_rule_id or 'new rule'} @ {target_device_id or 'gateway'}) "
        f"authorized by {approver} following verified zero-regression analysis."
    )

    with sqlite3.connect(path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_records (
                proposal_id,
                target_rule_id,
                target_device_id,
                operation,
                status,
                verification_verdict,
                original_violation_resolved,
                legitimate_paths_intact,
                new_violations_count,
                approver,
                notes,
                timestamp,
                event_summary,
                applied_to_firewall
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            proposal_id,
            target_rule_id,
            target_device_id,
            operation,
            status,
            verification_verdict,
            1 if original_violation_resolved else 0,
            1 if legitimate_paths_intact else 0,
            new_violations_count,
            approver,
            notes or "",
            ts,
            summary
        ))
        conn.commit()
        record_id = cursor.lastrowid

    return {
        "id": record_id,
        "proposal_id": proposal_id,
        "target_rule_id": target_rule_id,
        "target_device_id": target_device_id,
        "operation": operation,
        "status": status,
        "verification_verdict": verification_verdict,
        "original_violation_resolved": original_violation_resolved,
        "legitimate_paths_intact": legitimate_paths_intact,
        "new_violations_count": new_violations_count,
        "approver": approver,
        "notes": notes,
        "timestamp": ts,
        "event_summary": summary,
        "applied_to_firewall": False
    }


def get_audit_history(limit: int = 50, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve persistent audit history ordered newest first."""
    path = get_db_path(db_path)
    init_db(path)

    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                id,
                proposal_id,
                target_rule_id,
                target_device_id,
                operation,
                status,
                verification_verdict,
                original_violation_resolved,
                legitimate_paths_intact,
                new_violations_count,
                approver,
                notes,
                timestamp,
                event_summary,
                applied_to_firewall
            FROM audit_records
            ORDER BY id DESC
            LIMIT ?
        """, (max(1, min(limit, 500)),))
        rows = cursor.fetchall()

    return [
        {
            "id": row["id"],
            "proposal_id": row["proposal_id"],
            "target_rule_id": row["target_rule_id"],
            "target_device_id": row["target_device_id"],
            "operation": row["operation"],
            "status": row["status"],
            "verification_verdict": row["verification_verdict"],
            "original_violation_resolved": bool(row["original_violation_resolved"]),
            "legitimate_paths_intact": bool(row["legitimate_paths_intact"]),
            "new_violations_count": row["new_violations_count"],
            "approver": row["approver"],
            "notes": row["notes"],
            "timestamp": row["timestamp"],
            "event_summary": row["event_summary"],
            "applied_to_firewall": bool(row["applied_to_firewall"])
        }
        for row in rows
    ]
