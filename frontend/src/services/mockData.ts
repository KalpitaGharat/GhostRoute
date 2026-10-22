import type {
  Node,
  Edge,
  AnomalyIncident,
  TelemetryDataPoint,
  AnomalyTimelinePoint,
  ScatterPoint,
  ActivityLog,
  RiskMetrics
} from '../types';

export const initialNodes: Node[] = [
  {
    id: 'gateway-nok',
    name: 'NoK Ingress Gateway',
    type: 'gateway',
    zone: 'EDGE',
    ip: '10.0.1.1',
    cidr: '10.0.1.0/24',
    status: 'healthy',
    encrypted: true,
    mTLS: true,
    x: 120,
    y: 190,
    connectionsCount: 3,
    threatLevel: 'Low',
    os: 'GhostEdge Envoy 1.28-FIPS',
    activeSessions: 1420
  },
  {
    id: 'dmz-web-01',
    name: 'DMZ Web Frontend 01',
    type: 'host',
    zone: 'DMZ',
    ip: '10.0.1.10',
    cidr: '10.0.1.0/24',
    status: 'compromised',
    encrypted: true,
    mTLS: false,
    x: 280,
    y: 110,
    connectionsCount: 3,
    threatLevel: 'Critical',
    vulnerabilities: ['CVE-2026-3829 Remote Code Exec', 'Bypassed Ingress Filter'],
    os: 'Ubuntu 24.04 LTS (Hardened)',
    activeSessions: 398
  },
  {
    id: 'fw-edge',
    name: 'Perimeter Firewall Edge',
    type: 'firewall',
    zone: 'EDGE',
    ip: '10.0.1.254',
    cidr: '10.0.1.0/24',
    status: 'healthy',
    encrypted: true,
    mTLS: true,
    x: 310,
    y: 290,
    connectionsCount: 4,
    threatLevel: 'Low',
    os: 'PAN-OS 11.1 / eBPF Rule Engine',
    activeSessions: 5210
  },
  {
    id: 'subnet-vpc-east',
    name: 'Subnet VPC-East-01',
    type: 'subnet',
    zone: 'INTERNAL',
    ip: '10.0.2.0',
    cidr: '10.0.2.0/24',
    status: 'warning',
    encrypted: true,
    mTLS: true,
    x: 490,
    y: 140,
    connectionsCount: 4,
    threatLevel: 'High',
    vulnerabilities: ['Unscheduled Peering Route', 'Shadow Lateral Hop'],
    os: 'AWS VPC Virtual Router v3',
    activeSessions: 890
  },
  {
    id: 'fw-core',
    name: 'Core Internal Firewall',
    type: 'firewall',
    zone: 'CORE',
    ip: '10.0.2.1',
    cidr: '10.0.2.0/24',
    status: 'warning',
    encrypted: true,
    mTLS: true,
    x: 520,
    y: 310,
    connectionsCount: 5,
    threatLevel: 'High',
    vulnerabilities: ['Rule Shadowing FW-CORE-009', 'Direct DMZ Penetration'],
    os: 'Cisco Secure Firewall ASA 9.18',
    activeSessions: 8400
  },
  {
    id: 'app-server-01',
    name: 'Internal App Server 01',
    type: 'server',
    zone: 'INTERNAL',
    ip: '10.0.2.20',
    cidr: '10.0.2.0/24',
    status: 'healthy',
    encrypted: true,
    mTLS: true,
    x: 690,
    y: 110,
    connectionsCount: 3,
    threatLevel: 'Medium',
    os: 'Alpine Linux 3.20 (K8s Pod)',
    activeSessions: 412
  },
  {
    id: 'jumpbox-admin',
    name: 'Operations Bastion Host',
    type: 'host',
    zone: 'INTERNAL',
    ip: '10.0.2.99',
    cidr: '10.0.2.0/24',
    status: 'healthy',
    encrypted: true,
    mTLS: true,
    x: 700,
    y: 250,
    connectionsCount: 2,
    threatLevel: 'Low',
    os: 'Debian 12 Security Hardened',
    activeSessions: 4
  },
  {
    id: 'db-prod-01',
    name: 'Production DB Cluster (Data)',
    type: 'database',
    zone: 'DATA',
    ip: '10.0.3.50',
    cidr: '10.0.3.0/24',
    status: 'warning',
    encrypted: true,
    mTLS: true,
    x: 880,
    y: 200,
    connectionsCount: 3,
    threatLevel: 'Critical',
    vulnerabilities: ['High Value Exfiltration Target', 'Ghost Route Reached Interface'],
    os: 'PostgreSQL 16 Enterprise (Encrypted-at-Rest)',
    activeSessions: 165
  }
];

export const initialEdges: Edge[] = [
  {
    id: 'e-gw-dmz',
    source: 'gateway-nok',
    target: 'dmz-web-01',
    bidirectional: true,
    protocol: 'mTLS',
    port: 443,
    latencyMs: 1.4,
    trafficRate: '48.2 MB/s',
    compromised: false
  },
  {
    id: 'e-gw-fwedge',
    source: 'gateway-nok',
    target: 'fw-edge',
    bidirectional: true,
    protocol: 'TCP',
    port: 8443,
    latencyMs: 0.8,
    trafficRate: '124.8 MB/s',
    compromised: false
  },
  {
    id: 'e-dmz-fwedge',
    source: 'dmz-web-01',
    target: 'fw-edge',
    bidirectional: true,
    protocol: 'TCP',
    port: 8080,
    latencyMs: 1.1,
    trafficRate: '18.4 MB/s',
    compromised: false
  },
  {
    id: 'e-fwedge-subnet',
    source: 'fw-edge',
    target: 'subnet-vpc-east',
    bidirectional: true,
    protocol: 'GRE-Tunnel',
    latencyMs: 3.2,
    trafficRate: '35.6 MB/s',
    compromised: false
  },
  {
    id: 'e-subnet-app',
    source: 'subnet-vpc-east',
    target: 'app-server-01',
    bidirectional: true,
    protocol: 'HTTP/2',
    port: 8000,
    latencyMs: 0.6,
    trafficRate: '28.9 MB/s',
    compromised: false
  },
  {
    id: 'e-app-fwcore',
    source: 'app-server-01',
    target: 'fw-core',
    bidirectional: true,
    protocol: 'TCP',
    port: 5432,
    latencyMs: 1.2,
    trafficRate: '12.1 MB/s',
    compromised: false
  },
  {
    id: 'e-bastion-fwcore',
    source: 'jumpbox-admin',
    target: 'fw-core',
    bidirectional: true,
    protocol: 'mTLS',
    port: 2222,
    latencyMs: 0.5,
    trafficRate: '0.2 MB/s',
    compromised: false
  },
  {
    id: 'e-fwcore-db',
    source: 'fw-core',
    target: 'db-prod-01',
    bidirectional: true,
    protocol: 'mTLS',
    port: 5432,
    latencyMs: 0.9,
    trafficRate: '64.5 MB/s',
    compromised: false
  },
  // FLAG: Ghost Routes / Suspicious Paths highlighted in vibrant glowing CRIMSON RED lines with pulsing animation
  {
    id: 'ghost-route-dmz-fwcore',
    source: 'dmz-web-01',
    target: 'fw-core',
    bidirectional: true,
    isGhostRoute: true,
    protocol: 'TCP',
    port: 8888,
    latencyMs: 18.4,
    trafficRate: '92.4 MB/s (Exfil Spikes)',
    compromised: true,
    reason: 'Suspicious Route DETECTED: Direct DMZ penetration bypassing Edge inspection.',
    policyViolation: 'VIOLATION-SEC-09: Untrusted DMZ host communicating directly with Core Tier.',
    riskScore: 94
  },
  {
    id: 'ghost-route-subnet-db',
    source: 'subnet-vpc-east',
    target: 'db-prod-01',
    bidirectional: false,
    isGhostRoute: true,
    protocol: 'BGP',
    port: 179,
    latencyMs: 24.1,
    trafficRate: '14.8 MB/s',
    compromised: true,
    reason: 'Suspicious Route DETECTED: Lateral movement warning via unscheduled peering link.',
    policyViolation: 'VIOLATION-NET-03: VPC-East peering bypasses Core Firewall validation policy.',
    riskScore: 88
  }
];

export const initialRiskMetrics: RiskMetrics = {
  threatScore: 78,
  threatDelta: +4.2,
  activeAnomalies: 14,
  anomaliesDelta: +3,
  encryptedNodes: 432,
  totalNodes: 450,
  mTLSCoveragePercentage: 96.0,
  threatSparkline: [62, 65, 68, 64, 71, 74, 76, 75, 78],
  anomaliesSparkline: [4, 6, 5, 8, 7, 11, 9, 12, 14],
  encryptedSparkline: [410, 415, 420, 422, 425, 428, 430, 431, 432]
};

export const initialPacketFlowData: TelemetryDataPoint[] = [
  { time: '10:00', timestamp: 1, nokGateway: 420, apiGateway: 340, customSubnets: 180, totalThroughput: 940, latency: 12 },
  { time: '12:00', timestamp: 2, nokGateway: 580, apiGateway: 460, customSubnets: 240, totalThroughput: 1280, latency: 15 },
  { time: '14:00', timestamp: 3, nokGateway: 760, apiGateway: 620, customSubnets: 390, totalThroughput: 1770, latency: 22 },
  { time: '16:00', timestamp: 4, nokGateway: 980, apiGateway: 810, customSubnets: 620, totalThroughput: 2410, latency: 46 },
  { time: '18:00', timestamp: 5, nokGateway: 840, apiGateway: 710, customSubnets: 480, totalThroughput: 2030, latency: 31 }
];

export const initialAnomalyTimeline: AnomalyTimelinePoint[] = [
  { timestampSeconds: 100, timeLabel: '100s', anomalyScore: 12, alertVolume: 4, baseline: 10, inBreachWindow: false },
  { timestampSeconds: 200, timeLabel: '200s', anomalyScore: 18, alertVolume: 6, baseline: 12, inBreachWindow: false },
  { timestampSeconds: 300, timeLabel: '300s', anomalyScore: 24, alertVolume: 9, baseline: 15, inBreachWindow: false },
  { timestampSeconds: 400, timeLabel: '400s', anomalyScore: 88, alertVolume: 34, baseline: 20, inBreachWindow: true },
  { timestampSeconds: 450, timeLabel: '450s', anomalyScore: 96, alertVolume: 42, baseline: 22, inBreachWindow: true },
  { timestampSeconds: 500, timeLabel: '500s', anomalyScore: 91, alertVolume: 38, baseline: 21, inBreachWindow: true },
  { timestampSeconds: 600, timeLabel: '600s', anomalyScore: 32, alertVolume: 14, baseline: 18, inBreachWindow: false }
];

export const initialScatterData: ScatterPoint[] = [
  { x: 14, y: 120, z: 20, cluster: 'Normal', label: 'Gateway NoK ingress', nodeId: 'gateway-nok' },
  { x: 19, y: 160, z: 24, cluster: 'Normal', label: 'Perimeter FW edge', nodeId: 'fw-edge' },
  { x: 22, y: 140, z: 18, cluster: 'Normal', label: 'Bastion Admin', nodeId: 'jumpbox-admin' },
  { x: 34, y: 240, z: 30, cluster: 'Suspicious', label: 'App Server 01 pod', nodeId: 'app-server-01' },
  { x: 58, y: 390, z: 42, cluster: 'Suspicious', label: 'Subnet VPC-East-01', nodeId: 'subnet-vpc-east' },
  { x: 74, y: 480, z: 58, cluster: 'Critical Spike', label: 'DMZ Web 01 (Ghost hopping)', nodeId: 'dmz-web-01' },
  { x: 86, y: 540, z: 64, cluster: 'Critical Spike', label: 'Core FW (Shadowed rule bypass)', nodeId: 'fw-core' },
  { x: 92, y: 590, z: 70, cluster: 'Critical Spike', label: 'Database Cluster Exfil Target', nodeId: 'db-prod-01' }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: '12:04:18',
    timeAgo: 'Just now',
    type: 'anomaly',
    category: 'Anomaly Incidents',
    dotColor: 'crimson',
    message: 'Suspicious route hopping detected on VPC-East-01',
    targetAsset: 'VPC-East-01 / Subnet-A',
    severity: 'CRITICAL',
    user: 'AI-Detector-v2'
  },
  {
    id: 'log-2',
    timestamp: '12:02:44',
    timeAgo: '2m ago',
    type: 'anomaly',
    category: 'Anomaly Incidents',
    dotColor: 'purple',
    message: 'Unscheduled peering link established',
    targetAsset: 'Peer-Mesh-Link-08',
    severity: 'WARN',
    user: 'BGP-Route-Daemon'
  },
  {
    id: 'log-3',
    timestamp: '11:58:12',
    timeAgo: '6m ago',
    type: 'system',
    category: 'System Log',
    dotColor: 'cyan',
    message: 'Endpoint authorized via mTLS cert validation',
    targetAsset: 'gateway-nok.internal',
    severity: 'INFO',
    user: 'Vault-CA-Manager'
  },
  {
    id: 'log-4',
    timestamp: '11:42:05',
    timeAgo: '22m ago',
    type: 'crypto',
    category: 'Encrypted Nodes',
    dotColor: 'green',
    message: 'Key rotation completed',
    targetAsset: 'KMS-HSM-Cluster-East',
    severity: 'SUCCESS',
    user: 'Automated-KMS'
  },
  {
    id: 'log-5',
    timestamp: '11:30:19',
    timeAgo: '34m ago',
    type: 'anomaly',
    category: 'Anomaly Incidents',
    dotColor: 'crimson',
    message: 'Unencrypted lateral probe targeting 10.0.3.50 (PostgreSQL)',
    targetAsset: 'db-prod-01',
    severity: 'CRITICAL',
    user: 'Nemotron-Analyzer'
  },
  {
    id: 'log-6',
    timestamp: '11:15:00',
    timeAgo: '49m ago',
    type: 'system',
    category: 'System Log',
    dotColor: 'cyan',
    message: 'Security telemetry sync completed with deterministic graph adapter',
    targetAsset: 'Core-Graph-Engine',
    severity: 'INFO',
    user: 'SecOps-Scheduler'
  }
];

export const initialAlerts: AnomalyIncident[] = [
  {
    id: 'ALERT-8921',
    title: 'Active Ghost Route Penetration',
    severity: 'critical',
    category: 'Ghost Route',
    source: 'dmz-web-01 (10.0.1.10)',
    destination: 'fw-core (10.0.2.1) -> db-prod-01',
    timestamp: '2026-10-22 12:04:18',
    status: 'active',
    description: 'Direct DMZ-to-Core shadow path bypassing Perimeter Firewall filtering rules.',
    suggestedAction: 'Apply least-privilege remediation FW-PATCH-09; sever conn-6-shadow immediately.',
    affectedPath: ['dmz-web-01', 'fw-core', 'db-prod-01']
  },
  {
    id: 'ALERT-8922',
    title: 'Unscheduled VPC Peering Route',
    severity: 'high',
    category: 'Peering Anomaly',
    source: 'subnet-vpc-east (10.0.2.0)',
    destination: 'db-prod-01 (10.0.3.50)',
    timestamp: '2026-10-22 12:02:44',
    status: 'investigating',
    description: 'BGP route advertised unauthorized CIDR block directly into database subnet.',
    suggestedAction: 'Enforce route-map filter and drop AS-Path prepend.',
    affectedPath: ['subnet-vpc-east', 'db-prod-01']
  },
  {
    id: 'ALERT-8923',
    title: 'mTLS Handshake Cipher Downgrade Attempt',
    severity: 'medium',
    category: 'Cryptographic',
    source: 'dmz-web-01',
    destination: 'gateway-nok',
    timestamp: '2026-10-22 11:47:30',
    status: 'active',
    description: 'Client attempted TLS 1.1 legacy cipher renegotiation; automatically refused by Envoy.',
    suggestedAction: 'Verify client agent version and update TLS profile.',
    affectedPath: ['dmz-web-01', 'gateway-nok']
  }
];

// Telemetry live updates generator (every 4 seconds)
export function generateLiveTelemetryStep(prevData: TelemetryDataPoint[]): TelemetryDataPoint[] {
  const last = prevData[prevData.length - 1];
  const deltaNok = Math.floor((Math.random() - 0.45) * 60);
  const deltaApi = Math.floor((Math.random() - 0.48) * 50);
  const deltaSubnet = Math.floor((Math.random() - 0.46) * 40);

  const nextNok = Math.max(300, Math.min(1200, last.nokGateway + deltaNok));
  const nextApi = Math.max(250, Math.min(1000, last.apiGateway + deltaApi));
  const nextSubnet = Math.max(150, Math.min(800, last.customSubnets + deltaSubnet));

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const nextPoint: TelemetryDataPoint = {
    time: timeStr,
    timestamp: last.timestamp + 1,
    nokGateway: nextNok,
    apiGateway: nextApi,
    customSubnets: nextSubnet,
    totalThroughput: nextNok + nextApi + nextSubnet,
    latency: Math.max(8, Math.min(65, Math.floor(last.latency + (Math.random() - 0.5) * 8))),
    anomaliesDetected: Math.random() > 0.7 ? 1 : 0
  };

  // Keep last 6 points for high resolution flow
  const updated = [...prevData.slice(1), nextPoint];
  return updated;
}

export function generateLiveSparklines(prevMetrics: RiskMetrics): RiskMetrics {
  // Slight jitter for live feeling
  const threatJitter = Math.floor((Math.random() - 0.48) * 3);
  const newThreat = Math.max(72, Math.min(86, prevMetrics.threatScore + threatJitter));

  const anomalyJitter = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
  const newAnomalies = Math.max(10, Math.min(19, prevMetrics.activeAnomalies + anomalyJitter));

  const newThreatSparkline = [...prevMetrics.threatSparkline.slice(1), newThreat];
  const newAnomaliesSparkline = [...prevMetrics.anomaliesSparkline.slice(1), newAnomalies];
  const newEncryptedSparkline = [...prevMetrics.encryptedSparkline.slice(1), 432 + Math.floor(Math.random() * 3)];

  return {
    ...prevMetrics,
    threatScore: newThreat,
    activeAnomalies: newAnomalies,
    threatSparkline: newThreatSparkline,
    anomaliesSparkline: newAnomaliesSparkline,
    encryptedSparkline: newEncryptedSparkline
  };
}
