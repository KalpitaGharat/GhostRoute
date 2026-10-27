"""GhostRoute AI - Data Schemas
Pydantic schemas for network topology, security policies, analysis findings,
AI explanations, remediation proposals, simulation, and verification.
"""

from enum import Enum
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# 1. Network Topology & Access Control Models
# ============================================================================

class DeviceType(str, Enum):
    """Supported network device types."""
    HOST = "host"
    SERVER = "server"
    DATABASE = "database"
    FIREWALL = "firewall"
    ROUTER = "router"
    SWITCH = "switch"
    GATEWAY = "gateway"


class RuleAction(str, Enum):
    """Firewall rule actions."""
    ALLOW = "ALLOW"
    DENY = "DENY"


class PolicyVerdict(str, Enum):
    """Expected verdict for an intended access policy."""
    ALLOW = "ALLOW"
    DENY = "DENY"


class SeverityLevel(str, Enum):
    """Severity ratings for detected security violations."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class FlowVerdict(str, Enum):
    """Result states for multi-hop traffic flow and reachability."""
    ALLOWED = "ALLOWED"
    BLOCKED = "BLOCKED"
    UNREACHABLE = "UNREACHABLE"
    INDETERMINATE = "INDETERMINATE"


class Device(BaseModel):
    """Represents a network device/node in the modeled graph."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique device identifier (e.g., 'dmz-web-1')")
    name: str = Field(..., description="Human-readable device name")
    type: DeviceType = Field(default=DeviceType.HOST, description="Device classification")
    zone: str = Field(..., description="Network security zone (e.g., 'DMZ', 'INTERNAL', 'DATA')")
    ip: Optional[str] = Field(None, description="IPv4 or IPv6 address")
    can_forward: bool = Field(False, description="Whether host/server is configured to forward transit IP packets")
    default_action: Optional[RuleAction] = Field(None, description="Default policy on device (defaults to DENY for firewalls)")

    def is_forwarding_capable(self) -> bool:
        """Returns True if device is capable of forwarding transit traffic."""
        if self.can_forward:
            return True
        return self.type in (DeviceType.FIREWALL, DeviceType.ROUTER, DeviceType.GATEWAY, DeviceType.SWITCH)


class Connection(BaseModel):
    """Represents a physical or logical link between two network devices."""
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = Field(None, description="Optional connection identifier")
    source: str = Field(..., description="Source device ID")
    target: str = Field(..., description="Target device ID")
    bidirectional: bool = Field(True, description="Whether traffic can flow both ways on the wire")


class FirewallRule(BaseModel):
    """Represents an access control rule evaluated at a firewall or router."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique rule ID (e.g., 'FW-RULE-001')")
    device_id: str = Field(..., description="Device ID where this rule is enforced (e.g., 'fw-core')")
    action: RuleAction = Field(..., description="Rule action: ALLOW or DENY")
    source_zone: Optional[str] = Field("*", description="Source zone match (* for all)")
    destination_zone: Optional[str] = Field("*", description="Destination zone match (* for all)")
    source_ip: Optional[str] = Field("*", description="Source IP/CIDR match (* for all)")
    destination_ip: Optional[str] = Field("*", description="Destination IP/CIDR match (* for all)")
    protocol: str = Field("TCP", description="IP protocol: TCP, UDP, ICMP, ANY")
    port: Optional[int] = Field(None, description="Destination port number, None for all ports")
    port_range: Optional[str] = Field(None, description="Destination port range, e.g. '80-443'")
    priority: int = Field(100, description="Evaluation order: lower values indicate higher priority")
    enabled: bool = Field(True, description="Whether rule is active")
    description: Optional[str] = Field("", description="Rule comment or ticket reference")


class HopTrace(BaseModel):
    """Detailed hop evaluation record along a multi-hop traffic path."""
    model_config = ConfigDict(extra="ignore")

    device_id: str
    device_type: str
    can_forward: bool
    firewall_evaluated: bool = False
    action: Optional[RuleAction] = None
    rule_id: Optional[str] = None
    reason: str = ""


class FlowTrace(BaseModel):
    """End-to-end multi-hop traffic flow trace."""
    model_config = ConfigDict(extra="ignore")

    path: List[str]
    status: FlowVerdict
    hops: List[HopTrace] = Field(default_factory=list)
    supporting_rule_ids: List[str] = Field(default_factory=list)
    blocking_device_id: Optional[str] = None
    reason: str = ""


class AccessPolicy(BaseModel):
    """Represents an intended security policy or legitimate traffic requirement."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique policy identifier (e.g., 'POL-ISOLATION-01')")
    name: str = Field(..., description="Descriptive policy name")
    description: str = Field("", description="Policy intent and governance rationale")
    source: str = Field(..., description="Source device ID or zone name")
    destination: str = Field(..., description="Destination device ID or zone name")
    protocol: str = Field("TCP", description="Expected protocol")
    port: Optional[int] = Field(None, description="Expected port, or None for any")
    expected_verdict: PolicyVerdict = Field(..., description="DENY (security boundary) or ALLOW (business requirement)")
    required: bool = Field(
        False,
        description="If True, path MUST be reachable for business continuity. If False and expected=DENY, path MUST NOT exist."
    )
    severity: SeverityLevel = Field(SeverityLevel.HIGH, description="Violation severity")


class NetworkModel(BaseModel):
    """Complete network specification containing topology, rules, and policies."""
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = Field("net-sample", description="Network model ID")
    name: str = Field("Sample Corporate Network", description="Network model name")
    version: str = Field("1.0.0", description="Schema/data version")
    devices: List[Device] = Field(default_factory=list, description="List of network devices")
    connections: List[Connection] = Field(default_factory=list, description="List of network links")
    firewall_rules: List[FirewallRule] = Field(default_factory=list, description="List of access rules")
    access_policies: List[AccessPolicy] = Field(default_factory=list, description="List of security policies")


# ============================================================================
# 2. Analysis Engine Findings Models
# ============================================================================

class AnalysisFinding(BaseModel):
    """Detected unintended communication path or policy violation."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique finding ID")
    source: str = Field(..., description="Source device identifier")
    destination: str = Field(..., description="Destination device identifier")
    protocol: str = Field("TCP", description="Protocol tested")
    port: Optional[int] = Field(None, description="Port tested")
    discovered_path: List[str] = Field(..., description="Ordered list of device IDs forming the unintended path")
    supporting_rule_ids: List[str] = Field(..., description="Firewall rules that permitted or routed this traffic")
    violated_policy_id: str = Field(..., description="ID of the access policy that was breached")
    severity: SeverityLevel = Field(..., description="Severity of the violation")
    description: str = Field(..., description="Human-readable summary of the finding")
    status: Literal["DETECTED", "MOCK"] = Field("DETECTED", description="Source of finding")


class AnalyzeResponse(BaseModel):
    """Response payload for POST /analyze."""
    model_config = ConfigDict(extra="ignore")

    model_name: str
    total_violations: int
    findings: List[AnalysisFinding]
    execution_mode: Literal["DETERMINISTIC_GRAPH", "MOCK_FALLBACK"]


# ============================================================================
# 3. AI Explanation & Remediation Proposal Models
# ============================================================================

class RemediationOperation(str, Enum):
    """Strictly allowlisted operations for firewall remediation."""
    ADD_RULE = "ADD_RULE"
    UPDATE_RULE = "UPDATE_RULE"
    DELETE_RULE = "DELETE_RULE"
    DISABLE_RULE = "DISABLE_RULE"


class RemediationStatus(str, Enum):
    """Distinct lifecycle states for network security remediation."""
    PROPOSED = "PROPOSED"
    SIMULATED = "SIMULATED"
    VERIFIED = "VERIFIED"
    APPROVED = "APPROVED"
    APPLIED = "APPLIED"


class RemediationProposal(BaseModel):
    """Structured least-privilege remediation proposed by AI."""
    model_config = ConfigDict(extra="ignore")

    proposal_id: str = Field(..., description="Unique proposal identifier")
    target_rule_id: Optional[str] = Field(None, description="Existing rule ID to modify/delete, or new ID")
    target_device_id: str = Field(..., description="Device ID where rule change applies (e.g. 'fw-core')")
    operation: RemediationOperation = Field(..., description="Allowlisted operation: ADD_RULE, UPDATE_RULE, DELETE_RULE, DISABLE_RULE")
    rule_spec: Optional[FirewallRule] = Field(None, description="Detailed rule specification if ADD or UPDATE")
    rationale: str = Field(..., description="Why this proposal fixes the issue according to least-privilege principles")
    expected_impact: str = Field(..., description="Expected traffic impact and confirmation that legitimate paths are preserved")
    status: RemediationStatus = Field(
        default=RemediationStatus.PROPOSED,
        description="Lifecycle status: PROPOSED -> SIMULATED -> VERIFIED -> APPROVED -> APPLIED"
    )


class ApproveRemediationRequest(BaseModel):
    """Request payload for approving a verified remediation proposal."""
    model_config = ConfigDict(extra="ignore")

    proposal_id: str = Field(..., description="Unique ID of the verified proposal")
    approver: str = Field(default="SecOps Analyst (Neev Savla)", description="Name/role of authorizing user")
    notes: Optional[str] = Field(None, description="Approval notes or change ticket reference")
    verification_verdict: Literal["PASS", "FAIL", "INCONCLUSIVE"] = Field(
        ..., description="Verification verdict from independent analysis engine (must be PASS)"
    )
    target_rule_id: Optional[str] = Field(None, description="Rule ID targeted by proposal")
    target_device_id: Optional[str] = Field(None, description="Device ID targeted by proposal")
    operation: Optional[str] = Field(default="DISABLE_RULE", description="Remediation operation")
    original_violation_resolved: bool = Field(default=True, description="Whether original violation was verified resolved")
    legitimate_paths_intact: bool = Field(default=True, description="Whether legitimate paths remain intact")
    new_violations_count: int = Field(default=0, description="Count of newly introduced violations")


class ApproveRemediationResponse(BaseModel):
    """Response payload for remediation approval."""
    model_config = ConfigDict(extra="ignore")

    proposal_id: str
    status: RemediationStatus
    approved: bool
    approver: str
    timestamp: str
    message: str
    apply_available: bool = Field(
        default=False,
        description="Whether an automated live firewall application mechanism is connected"
    )
    apply_unavailability_reason: str = Field(
        default=(
            "Live firewall adapter is not connected. GhostRoute AI operates in simulation-first "
            "mode; production firewall modification requires a connected firewall orchestrator."
        ),
        description="Explanation for why direct application is disabled"
    )


class ExplainRequest(BaseModel):
    """Request payload for POST /explain."""
    model_config = ConfigDict(extra="ignore")

    finding: AnalysisFinding = Field(..., description="The verified analysis finding with evidence")
    network_summary: Optional[Dict[str, Any]] = Field(None, description="Optional brief context on network topology")


class ExplainResponse(BaseModel):
    """Response payload for POST /explain."""
    model_config = ConfigDict(extra="ignore")

    finding_id: str
    explanation: str = Field(..., description="Clear explanation of the unintended path and why it is permitted")
    root_cause: str = Field(..., description="Identified root cause (e.g., overly broad wildcard rule)")
    proposed_remediation: RemediationProposal = Field(..., description="Structured least-privilege fix proposal")
    model_used: str = Field(..., description="Model identifier used for inference")
    status: Literal["ANALYZED_LLM", "DEMO_FALLBACK", "ERROR"] = Field(..., description="Status of explanation generation")
    error: Optional[str] = Field(None, description="Error details if LLM call failed")
    error_category: Optional[str] = Field(None, description="Diagnostic error category if LLM call failed")


# ============================================================================
# 4. Simulation Models
# ============================================================================

class SimulateFixRequest(BaseModel):
    """Request payload for POST /simulate-fix."""
    model_config = ConfigDict(extra="ignore")

    network: NetworkModel = Field(..., description="Original network model (remains untouched)")
    proposal: RemediationProposal = Field(..., description="Validated remediation proposal to simulate")


class SimulateFixResponse(BaseModel):
    """Response payload for POST /simulate-fix."""
    model_config = ConfigDict(extra="ignore")

    status: Literal["SIMULATED", "REJECTED", "ERROR"]
    changes_applied: List[str] = Field(default_factory=list, description="Log of modifications made in simulation")
    simulated_network: NetworkModel = Field(..., description="Deep copy of the network with proposed fix applied")
    message: str = Field(..., description="Summary of simulation outcome")


# ============================================================================
# 5. Verification Models
# ============================================================================

class VerificationCheck(BaseModel):
    """Individual assertion check in verification."""
    model_config = ConfigDict(extra="ignore")

    policy_id: str
    check_type: Literal["ORIGINAL_VIOLATION_RESOLVED", "LEGITIMATE_PATH_INTACT", "NO_NEW_VIOLATIONS"]
    verdict: Literal["PASS", "FAIL", "INCONCLUSIVE"]
    details: str


class VerifyRequest(BaseModel):
    """Request payload for POST /verify."""
    model_config = ConfigDict(extra="ignore")

    simulated_network: NetworkModel = Field(..., description="Network model with simulated fix")
    original_violation: Optional[AnalysisFinding] = Field(None, description="Original finding to ensure resolved")
    policies: Optional[List[AccessPolicy]] = Field(None, description="Optional override list of policies to evaluate")


class VerifyResponse(BaseModel):
    """Response payload for POST /verify."""
    model_config = ConfigDict(extra="ignore")

    verdict: Literal["PASS", "FAIL", "INCONCLUSIVE"]
    original_violation_resolved: bool
    legitimate_paths_intact: bool
    new_violations_count: int
    checks: List[VerificationCheck]
    message: str


# ============================================================================
# 6. Agent Orchestration Models
# ============================================================================

class WorkflowStep(BaseModel):
    """Progress record for each stage in the end-to-end workflow."""
    model_config = ConfigDict(extra="ignore")

    step_name: str
    status: Literal["SUCCESS", "FAILED", "SKIPPED"]
    details: Dict[str, Any] = Field(default_factory=dict)


class AgentWorkflowRequest(BaseModel):
    """Request payload for POST /agent/run."""
    model_config = ConfigDict(extra="ignore")

    network: NetworkModel = Field(..., description="Network model to analyze, remediate, simulate, and verify")


class AgentWorkflowResponse(BaseModel):
    """Response payload for POST /agent/run."""
    model_config = ConfigDict(extra="ignore")

    status: Literal["COMPLETED", "FAILED", "PARTIAL"]
    total_findings: int
    selected_finding: Optional[AnalysisFinding] = None
    explanation: Optional[ExplainResponse] = None
    simulation: Optional[SimulateFixResponse] = None
    verification: Optional[VerifyResponse] = None
    steps: List[WorkflowStep] = Field(default_factory=list)
    final_summary: str


# ============================================================================
# 7. Asynchronous AI Threat Enrichment & Correlation Models
# ============================================================================

class EnrichmentStatus(str, Enum):
    """Lifecycle status of an asynchronous threat enrichment query."""
    PENDING = "PENDING"
    ANALYZED_LLM = "ANALYZED_LLM"
    DEMO_FALLBACK = "DEMO_FALLBACK"
    ERROR = "ERROR"


class FindingEnrichment(BaseModel):
    """Structured network forensics and threat enrichment generated by Nemotron or fallback."""
    model_config = ConfigDict(extra="ignore")

    finding_id: str
    status: EnrichmentStatus
    model_used: Optional[str] = None
    executive_summary: Optional[str] = None
    threat_assessment: Optional[str] = None
    evidence_based_reasoning: Optional[str] = None
    attack_path_explanation: Optional[str] = None
    mitre_mapping: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    confidence: Optional[float] = Field(None, description="Confidence score (0.0 to 1.0) derived strictly from deterministic graph evidence")
    limitations: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    error_category: Optional[str] = Field(None, description="Diagnostic error category if provider call failed")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    cached: bool = False


class FindingEnrichmentRequest(BaseModel):
    """Request payload for POST /findings/{finding_id}/enrichment."""
    model_config = ConfigDict(extra="ignore")

    finding: AnalysisFinding
    network_summary: Optional[Dict[str, Any]] = None
    refresh: bool = Field(False, description="Whether to bypass cache and force a new provider call")


class AiHealthResponse(BaseModel):
    """Response payload for GET /ai/health."""
    model_config = ConfigDict(extra="ignore")

    status: str
    provider: str
    configured_model: str
    base_url: str
    has_api_key: bool
    live_inference_ready: bool
    last_verified_at: Optional[str] = None
    last_error: Optional[str] = None
    last_error_category: Optional[str] = None


class CorrelationRequest(BaseModel):
    """Request payload for POST /findings/correlation."""
    model_config = ConfigDict(extra="ignore")

    findings: List[AnalysisFinding]
    network_summary: Optional[Dict[str, Any]] = None


class CorrelationResponse(BaseModel):
    """Cross-finding attack campaign correlation hypothesis."""
    model_config = ConfigDict(extra="ignore")

    related_findings: List[str]
    shared_indicators: Dict[str, List[str]]
    possible_attack_path: List[str]
    recommended_investigations: List[str]
    evidence_limitations: List[str]
    status: EnrichmentStatus
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

