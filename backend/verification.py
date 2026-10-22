"""GhostRoute AI - Independent Deterministic Verification Engine
Reruns graph analysis on the simulated network model to verify remediation.

VERIFICATION CONTRACT:
- Never trust LLM claims of success; ground every verdict in deterministic graph checks.
- Condition 1: Original unintended path violation must be eliminated.
- Condition 2: All required legitimate business paths (ALLOW policies) must remain intact.
- Condition 3: No new policy violations may be introduced.
- Only if (1 AND 2 AND 3) are true -> PASS. Otherwise -> FAIL or INCONCLUSIVE.
"""

from typing import List, Optional
from backend.schemas import (
    NetworkModel,
    AnalysisFinding,
    AccessPolicy,
    PolicyVerdict,
    VerificationCheck,
    VerifyResponse
)
from backend.graph_adapter import get_active_graph_engine


def verify_simulated_network(
    simulated_network: NetworkModel,
    original_violation: Optional[AnalysisFinding] = None,
    policies_override: Optional[List[AccessPolicy]] = None
) -> VerifyResponse:
    """Perform independent deterministic verification of the simulated network.
    
    Evaluates:
    1. Did the specific original violation disappear?
    2. Are all required legitimate paths still intact?
    3. Did any new policy violations emerge?
    """
    engine = get_active_graph_engine()
    checks: List[VerificationCheck] = []

    # Use simulated network's policies or override if provided
    policies = policies_override if policies_override is not None else simulated_network.access_policies

    # Run deterministic graph analysis on the simulated copy
    current_violations = engine.analyze_policies(simulated_network)

    # Condition 1: Check if original violation is resolved
    original_resolved = True
    if original_violation:
        # Check if any current violation matches the original violation's policy or source/dest
        matching_violations = [
            v for v in current_violations
            if (v.violated_policy_id == original_violation.violated_policy_id and
                v.source == original_violation.source and
                v.destination == original_violation.destination)
        ]

        if matching_violations:
            original_resolved = False
            checks.append(
                VerificationCheck(
                    policy_id=original_violation.violated_policy_id,
                    check_type="ORIGINAL_VIOLATION_RESOLVED",
                    verdict="FAIL",
                    details=(
                        f"Original violation persists: Path still permitted from "
                        f"{original_violation.source} to {original_violation.destination}."
                    )
                )
            )
        else:
            checks.append(
                VerificationCheck(
                    policy_id=original_violation.violated_policy_id,
                    check_type="ORIGINAL_VIOLATION_RESOLVED",
                    verdict="PASS",
                    details=(
                        f"Original violation resolved: Unintended path between "
                        f"{original_violation.source} and {original_violation.destination} is closed."
                    )
                )
            )
    else:
        # If no specific original violation provided, check if any violations exist
        original_resolved = len(current_violations) == 0
        checks.append(
            VerificationCheck(
                policy_id="GLOBAL_CHECK",
                check_type="ORIGINAL_VIOLATION_RESOLVED",
                verdict="PASS" if original_resolved else "FAIL",
                details=f"{len(current_violations)} active violations detected."
            )
        )

    # Condition 2: Check required legitimate paths
    legitimate_paths_intact = True
    required_policies = [
        p for p in policies
        if p.expected_verdict == PolicyVerdict.ALLOW and p.required
    ]

    for req_pol in required_policies:
        # Verify connectivity
        res = engine.find_permitted_path(
            simulated_network,
            req_pol.source,
            req_pol.destination,
            protocol=req_pol.protocol,
            port=req_pol.port
        )
        if res is not None:
            checks.append(
                VerificationCheck(
                    policy_id=req_pol.id,
                    check_type="LEGITIMATE_PATH_INTACT",
                    verdict="PASS",
                    details=(
                        f"Legitimate required path {req_pol.source} -> {req_pol.destination} "
                        f"({req_pol.protocol}:{req_pol.port or 'any'}) remains operational."
                    )
                )
            )
        else:
            legitimate_paths_intact = False
            checks.append(
                VerificationCheck(
                    policy_id=req_pol.id,
                    check_type="LEGITIMATE_PATH_INTACT",
                    verdict="FAIL",
                    details=(
                        f"Regressive break: Required business traffic {req_pol.source} -> {req_pol.destination} "
                        f"is now BLOCKED by the proposed remediation!"
                    )
                )
            )

    # Condition 3: Check for new violations
    # Count any violations other than the original violation (if that wasn't resolved)
    new_violations_count = 0
    if original_violation:
        new_violations = [
            v for v in current_violations
            if not (v.violated_policy_id == original_violation.violated_policy_id and
                    v.source == original_violation.source and
                    v.destination == original_violation.destination)
        ]
        new_violations_count = len(new_violations)
    else:
        new_violations_count = len(current_violations)

    if new_violations_count == 0:
        checks.append(
            VerificationCheck(
                policy_id="SAFETY_POLICY",
                check_type="NO_NEW_VIOLATIONS",
                verdict="PASS",
                details="No new policy violations introduced by the proposed change."
            )
        )
    else:
        checks.append(
            VerificationCheck(
                policy_id="SAFETY_POLICY",
                check_type="NO_NEW_VIOLATIONS",
                verdict="FAIL",
                details=f"{new_violations_count} new or unexpected policy violations emerged."
            )
        )

    # Final overall verdict determination
    if original_resolved and legitimate_paths_intact and (new_violations_count == 0):
        overall_verdict = "PASS"
        message = "Verification SUCCESS: Remediation resolved violation without breaking legitimate traffic."
    else:
        overall_verdict = "FAIL"
        reasons = []
        if not original_resolved:
            reasons.append("original violation remains unmitigated")
        if not legitimate_paths_intact:
            reasons.append("legitimate required traffic was disrupted")
        if new_violations_count > 0:
            reasons.append(f"{new_violations_count} new violations introduced")
        message = f"Verification FAILED: {', '.join(reasons)}."

    return VerifyResponse(
        verdict=overall_verdict,
        original_violation_resolved=original_resolved,
        legitimate_paths_intact=legitimate_paths_intact,
        new_violations_count=new_violations_count,
        checks=checks,
        message=message
    )
