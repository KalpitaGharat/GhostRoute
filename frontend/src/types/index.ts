export type NodeType =
  | 'internet'
  | 'firewall'
  | 'server'
  | 'database'
  | 'app'
  | 'host'
  | 'gateway'
  | 'subnet';

export type SecurityZone = 'EDGE' | 'DMZ' | 'INTERNAL' | 'DATA' | 'CORE' | 'VPC-EAST';

export interface TopologyNode {
  id: string;
  name: string;
  type: NodeType;
  zone: SecurityZone;
  ip: string;
  x: number;
  y: number;
  status: 'normal' | 'suspicious' | 'warning' | 'healthy' | 'compromised' | 'encrypted';
  isSuspicious?: boolean;
  policyEnforced?: boolean;
  activeSessions?: number;
  vulnerabilities?: string[];
  os?: string;
  cidr?: string;
  encrypted?: boolean;
  mTLS?: boolean;
  connectionsCount?: number;
  threatLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  isSuspicious?: boolean;
  protocol?: string;
  port?: number;
  pathLabel?: string;
  policyViolation?: string;
  reason?: string;
  bidirectional?: boolean;
  isGhostRoute?: boolean;
  latencyMs?: number;
  trafficRate?: string;
  compromised?: boolean;
  riskScore?: number;
}

// Aliases for compatibility
export type Node = TopologyNode;
export type Edge = TopologyEdge;

export interface IncidentItem {
  id: string;
  severity: 'Critical' | 'High' | 'Informational';
  title: string;
  path: string;
  timeAgo: string;
  isHighlighted?: boolean;
  description?: string;
}

export interface RiskyAsset {
  id: string;
  name: string;
  ip: string;
  type: NodeType;
  zone: SecurityZone;
  riskScore: number;
  issues: number;
  trend: number[]; // mini sparkline
}

export interface GhostRouteHistory {
  date: string;
  count: number;
}

export interface SystemStatusData {
  networkEngine: 'Active' | 'Degraded';
  threatIntel: 'Active' | 'Degraded';
  aiEngine: 'Active' | 'Degraded';
  lastScan: string;
  trendPoints: number[];
}

export interface AnomalyIncident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  source: string;
  destination?: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
  description: string;
  suggestedAction?: string;
  affectedPath?: string[];
}

export interface TelemetryDataPoint {
  time: string;
  timestamp: number;
  nokGateway: number;
  apiGateway: number;
  customSubnets: number;
  totalThroughput: number;
  latency: number;
  anomaliesDetected?: number;
}

export interface AnomalyTimelinePoint {
  timestampSeconds: number;
  timeLabel: string;
  anomalyScore: number;
  alertVolume: number;
  baseline: number;
  inBreachWindow: boolean;
}

export interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  cluster: 'Normal' | 'Suspicious' | 'Critical Spike';
  label: string;
  nodeId: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  timeAgo: string;
  type: 'anomaly' | 'system' | 'crypto' | 'remediation';
  category: 'Anomaly Incidents' | 'System Log' | 'Encrypted Nodes' | 'Firewall Engine';
  dotColor: 'crimson' | 'purple' | 'cyan' | 'green';
  message: string;
  targetAsset: string;
  severity: 'CRITICAL' | 'WARN' | 'INFO' | 'SUCCESS';
  user?: string;
}

export interface RiskMetrics {
  threatScore: number;
  threatDelta: number;
  activeAnomalies: number;
  anomaliesDelta: number;
  encryptedNodes: number;
  totalNodes: number;
  mTLSCoveragePercentage: number;
  threatSparkline: number[];
  anomaliesSparkline: number[];
  encryptedSparkline: number[];
}
