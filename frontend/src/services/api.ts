/**
 * GhostRoute AI — Backend API Client
 * Typed fetch wrappers matching the FastAPI endpoints in API_CONTRACT.md
 * Base URL: http://localhost:8000
 */

const BASE_URL = 'http://localhost:8000';

// ─── Backend Schema Types ───────────────────────────────────────────────────

export type DeviceType = 'host' | 'server' | 'database' | 'firewall' | 'router' | 'switch' | 'gateway';
export type RuleAction = 'ALLOW' | 'DENY';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PolicyVerdict = 'ALLOW' | 'DENY';
export type RemediationOperation = 'ADD_RULE' | 'UPDATE_RULE' | 'DELETE_RULE' | 'DISABLE_RULE';

export interface ApiDevice {
  id: string;
  name: string;
  type: DeviceType;
  zone: string;
  ip?: string;
  can_forward?: boolean;
  default_action?: RuleAction;
}

export interface ApiConnection {
  id?: string;
  source: string;
  target: string;
  bidirectional?: boolean;
}

export interface ApiFirewallRule {
  id: string;
  device_id: string;
  action: RuleAction;
  source_zone?: string;
  destination_zone?: string;
  source_ip?: string;
  destination_ip?: string;
  protocol?: string;
  port?: number;
  port_range?: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
}

export interface ApiAccessPolicy {
  id: string;
  name: string;
  description?: string;
  source: string;
  destination: string;
  protocol?: string;
  port?: number;
  expected_verdict: PolicyVerdict;
  required?: boolean;
  severity?: SeverityLevel;
}

export interface NetworkModel {
  id?: string;
  name: string;
  version?: string;
  devices: ApiDevice[];
  connections: ApiConnection[];
  firewall_rules: ApiFirewallRule[];
  access_policies: ApiAccessPolicy[];
}

export interface AnalysisFinding {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port?: number;
  discovered_path: string[];
  supporting_rule_ids: string[];
  violated_policy_id: string;
  severity: SeverityLevel;
  description: string;
  status: 'DETECTED' | 'MOCK';
}

export interface AnalyzeResponse {
  model_name: string;
  total_violations: number;
  findings: AnalysisFinding[];
  execution_mode: 'DETERMINISTIC_GRAPH' | 'MOCK_FALLBACK';
}

export type RemediationStatus =
  | 'PROPOSED'
  | 'SIMULATED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'APPLIED';

export interface RemediationProposal {
  proposal_id: string;
  target_rule_id?: string;
  target_device_id: string;
  operation: RemediationOperation;
  rule_spec?: ApiFirewallRule | null;
  rationale: string;
  expected_impact: string;
  status?: RemediationStatus;
}

export interface ApproveRemediationRequest {
  proposal_id: string;
  approver?: string;
  notes?: string;
  verification_verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  target_rule_id?: string;
  target_device_id?: string;
  operation?: RemediationOperation;
  original_violation_resolved?: boolean;
  legitimate_paths_intact?: boolean;
  new_violations_count?: number;
}

export interface AuditRecord {
  id: number;
  proposal_id: string;
  target_rule_id?: string | null;
  target_device_id?: string | null;
  operation: string;
  status: string;
  verification_verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  original_violation_resolved: boolean;
  legitimate_paths_intact: boolean;
  new_violations_count: number;
  approver: string;
  notes?: string | null;
  timestamp: string;
  event_summary: string;
  applied_to_firewall: boolean;
}

export interface ApproveRemediationResponse {
  proposal_id: string;
  status: RemediationStatus;
  approved: boolean;
  approver: string;
  timestamp: string;
  message: string;
  apply_available: boolean;
  apply_unavailability_reason: string;
}

export interface ExplainResponse {
  finding_id: string;
  explanation: string;
  root_cause: string;
  proposed_remediation: RemediationProposal;
  model_used: string;
  status: 'ANALYZED_LLM' | 'DEMO_FALLBACK' | 'ERROR';
  error?: string | null;
}

export type EnrichmentStatus = 'PENDING' | 'ANALYZED_LLM' | 'DEMO_FALLBACK' | 'ERROR';

export interface FindingEnrichment {
  finding_id: string;
  status: EnrichmentStatus;
  model_used?: string | null;
  executive_summary?: string | null;
  threat_assessment?: string | null;
  evidence_based_reasoning?: string | null;
  attack_path_explanation?: string | null;
  mitre_mapping: string[];
  recommended_actions: string[];
  confidence?: number | null;
  limitations: string[];
  error?: string | null;
  timestamp: string;
  cached: boolean;
}

export interface AiHealthResponse {
  status: string;
  provider: string;
  configured_model: string;
  base_url: string;
  has_api_key: boolean;
  live_inference_ready: boolean;
}

export interface CorrelationResponse {
  related_findings: string[];
  shared_indicators: Record<string, string[]>;
  possible_attack_path: string[];
  recommended_investigations: string[];
  evidence_limitations: string[];
  status: EnrichmentStatus;
  timestamp: string;
}

export interface SimulateFixResponse {
  status: 'SIMULATED' | 'REJECTED' | 'ERROR';
  changes_applied: string[];
  simulated_network: NetworkModel;
  message: string;
}

export interface VerificationCheck {
  policy_id: string;
  check_type: 'ORIGINAL_VIOLATION_RESOLVED' | 'LEGITIMATE_PATH_INTACT' | 'NO_NEW_VIOLATIONS';
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  details: string;
}

export interface VerifyResponse {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  original_violation_resolved: boolean;
  legitimate_paths_intact: boolean;
  new_violations_count: number;
  checks: VerificationCheck[];
  message: string;
}

export interface WorkflowStep {
  step_name: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details: Record<string, unknown>;
}

export interface AgentWorkflowResponse {
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  total_findings: number;
  selected_finding?: AnalysisFinding;
  explanation?: ExplainResponse;
  simulation?: SimulateFixResponse;
  verification?: VerifyResponse;
  steps: WorkflowStep[];
  final_summary: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

// ─── API Error ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  statusCode: number;
  detail?: unknown;

  constructor(
    statusCode: number,
    message: string,
    detail?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { /* ignore */ }
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`, detail);
  }
  return res.json() as Promise<T>;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/** GET /health — poll backend connectivity */
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health');
}

/** GET /network/sample — load the default enterprise network model */
export function getSampleNetwork(): Promise<NetworkModel> {
  return apiFetch<NetworkModel>('/network/sample');
}

/** POST /analyze — deterministic graph reachability analysis */
export function analyzeNetwork(network: NetworkModel): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(network),
  });
}

/** POST /explain — AI root cause + structured remediation proposal */
export function explainFinding(
  finding: AnalysisFinding,
  networkSummary?: Record<string, unknown>
): Promise<ExplainResponse> {
  return apiFetch<ExplainResponse>('/explain', {
    method: 'POST',
    body: JSON.stringify({ finding, network_summary: networkSummary ?? null }),
  });
}

/** POST /simulate-fix — apply proposal strictly to a deep-copy */
export function simulateFix(
  network: NetworkModel,
  proposal: RemediationProposal
): Promise<SimulateFixResponse> {
  return apiFetch<SimulateFixResponse>('/simulate-fix', {
    method: 'POST',
    body: JSON.stringify({ network, proposal }),
  });
}

/** POST /verify — independent 3-condition deterministic verification */
export function verifySimulation(
  simulatedNetwork: NetworkModel,
  originalViolation?: AnalysisFinding,
  policies?: ApiAccessPolicy[]
): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>('/verify', {
    method: 'POST',
    body: JSON.stringify({
      simulated_network: simulatedNetwork,
      original_violation: originalViolation ?? null,
      policies: policies ?? null,
    }),
  });
}

/**
 * POST /agent/run — full autonomous investigation:
 * Detect → Investigate → Explain → Recommend → Simulate → Verify
 */
export function runAgentWorkflow(network: NetworkModel): Promise<AgentWorkflowResponse> {
  return apiFetch<AgentWorkflowResponse>('/agent/run', {
    method: 'POST',
    body: JSON.stringify({ network }),
  });
}

/**
 * POST /remediation/approve — authorize an independently verified proposal
 */
export function approveRemediation(
  payload: ApproveRemediationRequest
): Promise<ApproveRemediationResponse> {
  return apiFetch<ApproveRemediationResponse>('/remediation/approve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /remediation/apply — guarded action (prohibits fake applied status)
 */
export function applyRemediation(): Promise<never> {
  return apiFetch<never>('/remediation/apply', {
    method: 'POST',
  });
}

/**
 * GET /audit/history — retrieve persistent audit history of remediation reviews and approvals
 */
export function getAuditHistory(limit = 50): Promise<AuditRecord[]> {
  return apiFetch<AuditRecord[]>(`/audit/history?limit=${limit}`);
}

/**
 * GET /ai/health — report provider readiness and model
 */
export function getAiHealth(): Promise<AiHealthResponse> {
  return apiFetch<AiHealthResponse>('/ai/health');
}

/**
 * POST /findings/{finding_id}/enrichment — request asynchronous Nemotron threat enrichment
 */
export function enrichFinding(
  finding: AnalysisFinding,
  refresh = false,
  networkSummary?: Record<string, unknown>
): Promise<FindingEnrichment> {
  return apiFetch<FindingEnrichment>(`/findings/${finding.id}/enrichment`, {
    method: 'POST',
    body: JSON.stringify({
      finding,
      network_summary: networkSummary ?? null,
      refresh,
    }),
  });
}

/**
 * GET /findings/{finding_id}/enrichment — check enrichment status & cached result
 */
export function getFindingEnrichment(
  findingId: string
): Promise<{ finding_id: string; status: EnrichmentStatus; enrichment?: FindingEnrichment | null }> {
  return apiFetch<{ finding_id: string; status: EnrichmentStatus; enrichment?: FindingEnrichment | null }>(
    `/findings/${findingId}/enrichment`
  );
}

/**
 * POST /findings/correlation — cross-finding attack pattern hypothesis
 */
export function correlateFindings(
  findings: AnalysisFinding[],
  networkSummary?: Record<string, unknown>
): Promise<CorrelationResponse> {
  return apiFetch<CorrelationResponse>('/findings/correlation', {
    method: 'POST',
    body: JSON.stringify({
      findings,
      network_summary: networkSummary ?? null,
    }),
  });
}



