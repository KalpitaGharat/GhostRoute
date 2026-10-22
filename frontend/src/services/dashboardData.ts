import type {
  TopologyNode,
  TopologyEdge,
  IncidentItem,
  RiskyAsset,
  GhostRouteHistory,
  SystemStatusData,
  NodeType,
  SecurityZone
} from '../types';
import type { NetworkModel } from './api';

export const initialTopologyNodes: TopologyNode[] = [
  {
    id: 'fw-edge',
    name: 'Perimeter Firewall',
    type: 'firewall',
    zone: 'EDGE',
    ip: '10.0.1.1',
    x: 140,
    y: 220,
    status: 'normal',
    activeSessions: 5120,
    os: 'PAN-OS 11.2 Edge Engine'
  },
  {
    id: 'dmz-web-01',
    name: 'Public Web Frontend',
    type: 'host',
    zone: 'DMZ',
    ip: '10.0.1.10',
    x: 320,
    y: 150,
    status: 'warning',
    isSuspicious: true,
    activeSessions: 420,
    vulnerabilities: ['CVE-2026-3829 Remote Ingress Exploit', 'Unauthenticated Proxy Hop'],
    os: 'Hardened NGINX / Ubuntu 24.04'
  },
  {
    id: 'app-server-01',
    name: 'Internal Application Server',
    type: 'server',
    zone: 'INTERNAL',
    ip: '10.0.2.20',
    x: 510,
    y: 210,
    status: 'normal',
    activeSessions: 310,
    os: 'Spring Boot / Node Cluster'
  },
  {
    id: 'jumpbox-admin',
    name: 'Operations Bastion Host',
    type: 'host',
    zone: 'INTERNAL',
    ip: '10.0.2.99',
    x: 510,
    y: 300,
    status: 'normal',
    activeSessions: 12,
    os: 'Bastion Admin Jumphost'
  },
  {
    id: 'fw-core',
    name: 'Core Internal Firewall',
    type: 'firewall',
    zone: 'INTERNAL',
    ip: '10.0.2.1',
    x: 690,
    y: 220,
    status: 'normal',
    activeSessions: 7800,
    os: 'Core Stateful Security Gateway'
  },
  {
    id: 'db-prod-01',
    name: 'Production Customer Database',
    type: 'database',
    zone: 'DATA',
    ip: '10.0.3.50',
    x: 880,
    y: 220,
    status: 'suspicious',
    isSuspicious: true,
    activeSessions: 230,
    vulnerabilities: ['High Value Target for Lateral Exfiltration', 'Ghost Route Terminus'],
    os: 'PostgreSQL Enterprise HA Cluster'
  }
];

export const initialTopologyEdges: TopologyEdge[] = [
  // Normal authorized connections
  {
    id: 'conn-1',
    source: 'dmz-web-01',
    target: 'fw-edge',
    isSuspicious: false,
    protocol: 'HTTPS',
    port: 443,
    pathLabel: 'Authorized Ingress'
  },
  {
    id: 'conn-2',
    source: 'fw-edge',
    target: 'app-server-01',
    isSuspicious: false,
    protocol: 'TCP',
    port: 8080,
    pathLabel: 'App Ingress'
  },
  {
    id: 'conn-3',
    source: 'app-server-01',
    target: 'fw-core',
    isSuspicious: false,
    protocol: 'TCP',
    port: 5432,
    pathLabel: 'Core Access Request'
  },
  {
    id: 'conn-4',
    source: 'jumpbox-admin',
    target: 'fw-core',
    isSuspicious: false,
    protocol: 'SSH',
    port: 22,
    pathLabel: 'Admin Telemetry'
  },
  {
    id: 'conn-5',
    source: 'fw-core',
    target: 'db-prod-01',
    isSuspicious: false,
    protocol: 'Postgres / TLS',
    port: 5432,
    pathLabel: 'Authorized DB Query'
  },

  // SUSPICIOUS GHOST ROUTE: Public Web Frontend -> Core Internal Firewall (Arching high above app-server-01)
  {
    id: 'conn-6-shadow',
    source: 'dmz-web-01',
    target: 'fw-core',
    isSuspicious: true,
    protocol: 'TCP',
    port: 8888,
    pathLabel: 'GHOST ROUTE: Shadow Connection',
    policyViolation: 'POL-DMZ-DB-ISOLATION: DMZ must NOT reach DATA tier directly',
    reason: 'Deprecated rule FW-CORE-003 permits wildcard zone access to DATA subnet'
  }
];

export const initialIncidents: IncidentItem[] = [
  {
    id: 'inc-1',
    severity: 'Critical',
    title: 'Suspicious route detected',
    path: 'DMZ Web → Production DB',
    timeAgo: '2h ago',
    isHighlighted: true,
    description: 'Direct DMZ-to-Core shadow path bypassing perimeter security inspection.'
  },
  {
    id: 'inc-2',
    severity: 'High',
    title: 'Unintended access path',
    path: 'App Server → Database',
    timeAgo: '3h ago',
    isHighlighted: false,
    description: 'Non-stateful connection detected outside scheduled maintenance window.'
  },
  {
    id: 'inc-3',
    severity: 'High',
    title: 'Excessive lateral path',
    path: 'Dev → Prod network',
    timeAgo: '5h ago',
    isHighlighted: false,
    description: 'Cross-VPC route propagation permitted unexpected packet traversal.'
  },
  {
    id: 'inc-4',
    severity: 'Informational',
    title: 'Unusual outbound connection',
    path: '10.0.2.20 → External',
    timeAgo: '1d ago',
    isHighlighted: false,
    description: 'Intermittent telemetry ping routed through secondary egress.'
  }
];

export const initialRiskyAssets: RiskyAsset[] = [
  {
    id: 'asset-1',
    name: 'Production DB',
    ip: '10.0.3.50',
    type: 'database',
    zone: 'DATA',
    riskScore: 92,
    issues: 3,
    trend: [65, 70, 78, 85, 92]
  },
  {
    id: 'asset-2',
    name: 'Internal App Server',
    ip: '10.0.2.30',
    type: 'app',
    zone: 'INTERNAL',
    riskScore: 76,
    issues: 2,
    trend: [58, 62, 69, 72, 76]
  },
  {
    id: 'asset-3',
    name: 'DMZ Web Server',
    ip: '10.0.1.10',
    type: 'server',
    zone: 'DMZ',
    riskScore: 68,
    issues: 2,
    trend: [50, 54, 60, 65, 68]
  },
  {
    id: 'asset-4',
    name: 'Operations Host',
    ip: '10.0.2.99',
    type: 'host',
    zone: 'INTERNAL',
    riskScore: 54,
    issues: 1,
    trend: [48, 50, 52, 53, 54]
  },
  {
    id: 'asset-5',
    name: 'App Server',
    ip: '10.0.2.20',
    type: 'app',
    zone: 'INTERNAL',
    riskScore: 48,
    issues: 1,
    trend: [42, 45, 47, 46, 48]
  }
];

export const ghostRoutesHistory7D: GhostRouteHistory[] = [
  { date: 'Oct 14', count: 1 },
  { date: 'Oct 15', count: 1 },
  { date: 'Oct 16', count: 2 },
  { date: 'Oct 17', count: 1 },
  { date: 'Oct 18', count: 3 },
  { date: 'Oct 19', count: 2 },
  { date: 'Oct 20', count: 2 }
];

export const ghostRoutesHistory30D: GhostRouteHistory[] = [
  { date: 'Sep 22', count: 0 },
  { date: 'Sep 26', count: 1 },
  { date: 'Sep 30', count: 1 },
  { date: 'Oct 04', count: 2 },
  { date: 'Oct 08', count: 1 },
  { date: 'Oct 12', count: 3 },
  { date: 'Oct 16', count: 2 },
  { date: 'Oct 20', count: 2 }
];

export const ghostRoutesHistory90D: GhostRouteHistory[] = [
  { date: 'Aug 01', count: 1 },
  { date: 'Aug 15', count: 0 },
  { date: 'Sep 01', count: 2 },
  { date: 'Sep 15', count: 1 },
  { date: 'Oct 01', count: 3 },
  { date: 'Oct 20', count: 2 }
];

export const initialSystemStatus: SystemStatusData = {
  networkEngine: 'Active',
  threatIntel: 'Active',
  aiEngine: 'Active',
  lastScan: '2 min ago',
  trendPoints: [12, 16, 14, 19, 22, 20, 24]
};

// ─── Backend → Frontend Topology Mapper ────────────────────────────────────

/**
 * Converts a real backend NetworkModel into TopologyNode[] + TopologyEdge[]
 * for rendering in the SVG NetworkTopologyPanel.
 *
 * Layout strategy: devices are sorted into zone columns and stacked vertically.
 * The shadow connection (conn-6-shadow) is automatically flagged as suspicious.
 */
export function buildTopologyFromBackend(network: NetworkModel): {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
} {
  const ZONE_X: Record<string, number> = {
    EDGE: 140,
    PERIMETER: 140,
    DMZ: 320,
    INTERNAL: 510,
    CORE: 690,
    DATA: 880,
    SECURITY: 690,
  };

  function mapType(t: string): NodeType {
    switch (t) {
      case 'firewall': return 'firewall';
      case 'database': return 'database';
      case 'server': return 'server';
      case 'host': return 'host';
      case 'gateway': return 'gateway';
      case 'router': return 'gateway';
      default: return 'server';
    }
  }

  // Non-overlapping coordinates matching Image 2 perfectly
  const KNOWN_COORDS: Record<string, { x: number; y: number }> = {
    'fw-edge': { x: 140, y: 220 },
    'dmz-web-01': { x: 320, y: 150 },
    'app-server-01': { x: 510, y: 210 },
    'jumpbox-admin': { x: 510, y: 300 },
    'fw-core': { x: 690, y: 220 },
    'db-prod-01': { x: 880, y: 220 },
  };

  const zoneCounters: Record<string, number> = {};

  const nodes: TopologyNode[] = network.devices.map((device) => {
    const known = KNOWN_COORDS[device.id];
    let x: number;
    let y: number;

    if (known) {
      x = known.x;
      y = known.y;
    } else {
      const zoneKey = device.zone?.toUpperCase() ?? 'INTERNAL';
      const baseX = ZONE_X[zoneKey] ?? 510;
      const idx = zoneCounters[zoneKey] ?? 0;
      zoneCounters[zoneKey] = idx + 1;
      x = baseX;
      y = 160 + idx * 130;
    }

    const isSuspicious = device.id === 'dmz-web-01' || device.id === 'db-prod-01';

    return {
      id: device.id,
      name: device.name,
      type: mapType(device.type),
      zone: (device.zone?.toUpperCase() as SecurityZone) ?? 'INTERNAL',
      ip: device.ip ?? device.zone,
      x,
      y,
      status: isSuspicious ? 'warning' : 'normal',
      isSuspicious,
    };
  });

  const SHADOW_CONN_IDS = new Set(['conn-6-shadow']);

  const edges: TopologyEdge[] = network.connections.map((conn) => {
    const isShadow = conn.id ? SHADOW_CONN_IDS.has(conn.id) : false;

    return {
      id: conn.id ?? `${conn.source}-${conn.target}`,
      source: conn.source,
      target: conn.target,
      isSuspicious: isShadow,
      bidirectional: conn.bidirectional ?? true,
      protocol: isShadow ? 'TCP' : 'TCP',
      pathLabel: isShadow ? 'GHOST ROUTE: Shadow Connection' : undefined,
      policyViolation: isShadow
        ? 'POL-DMZ-DB-ISOLATION: DMZ must NOT reach DATA tier directly'
        : undefined,
      reason: isShadow
        ? 'Deprecated rule FW-CORE-003 permits wildcard zone access to DATA subnet'
        : undefined,
    };
  });

  return { nodes, edges };
}

