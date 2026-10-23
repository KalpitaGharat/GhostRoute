import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Globe,
  Shield,
  Server,
  Database,
  Layers,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import type { TopologyNode, TopologyEdge, SecurityZone, NodeType } from '../types';

interface NetworkTopologyPanelProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: TopologyNode) => void;
  onSelectEdge: (edge: TopologyEdge) => void;
}

// Visual Node Icon Mapper
const RenderNodeIcon: React.FC<{ type: NodeType; className?: string }> = ({
  type,
  className = 'w-5 h-5'
}) => {
  if (type === 'internet') return <Globe className={className} />;
  if (type === 'firewall') return <Shield className={className} />;
  if (type === 'database') return <Database className={className} />;
  if (type === 'app') return <Layers className={className} />;
  if (type === 'host') return <Terminal className={className} />;
  return <Server className={className} />;
};

export const NetworkTopologyPanel: React.FC<NetworkTopologyPanelProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge
}) => {
  const [activeZoneFilter, setActiveZoneFilter] = useState<'ALL' | SecurityZone>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!panelRef.current) return;
    if (!isFullscreen) {
      if (panelRef.current.requestFullscreen) {
        panelRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Node lookup map
  const nodeMap = new Map<string, TopologyNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Determine connected edges if a node is selected
  const connectedEdgeIds = new Set<string>();
  if (selectedNodeId) {
    edges.forEach((e) => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        connectedEdgeIds.add(e.id);
      }
    });
  }

  // Filter nodes based on active zone and search query
  const isNodeVisible = (node: TopologyNode) => {
    if (activeZoneFilter !== 'ALL' && node.zone !== activeZoneFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.ip.toLowerCase().includes(q) ||
        node.zone.toLowerCase().includes(q)
      );
    }
    return true;
  };

  return (
    <div
      ref={panelRef}
      className={`rounded-xl bg-[#070D22] border border-[#202D50] flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#050817] p-5' : 'h-[640px]'
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. PANEL HEADER & TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[#202D50] bg-[#070D20]/95 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-20 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#F1F5F9] font-sans tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Interactive Network Topology
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-[#FF365D] border border-rose-500/50 font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,54,93,0.3)]">
              <AlertTriangle className="w-3 h-3 text-[#FF365D]" />
              2 Ghost Routes Detected
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Deterministic trust path modeling, shadow connection discovery, and zero-trust verification.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Zone filter buttons */}
          <div className="flex items-center bg-[#050817] p-0.5 rounded-lg border border-[#202D50]">
            {(['ALL', 'DMZ', 'INTERNAL', 'DATA'] as const).map((zone) => (
              <button
                key={zone}
                onClick={() => setActiveZoneFilter(zone)}
                className={`px-2.5 py-1 rounded text-[10.5px] font-medium transition-all cursor-pointer ${
                  activeZoneFilter === zone
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-bold shadow-[0_0_10px_rgba(124,58,237,0.5)]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {zone === 'ALL' ? 'All Zones' : zone}
              </button>
            ))}
          </div>

          {/* Search nodes field */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search node / IP..."
              className="w-32 sm:w-40 bg-[#050817] border border-[#202D50] focus:border-[#7C3AED] text-[#F1F5F9] placeholder-[#64748B] text-xs rounded-lg pl-8 pr-2.5 py-1 focus:outline-none transition-colors"
            />
          </div>

          {/* Zoom & Fullscreen Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              className="p-1.5 rounded bg-[#070D20] hover:bg-[#101B35] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#202D50] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1.5 rounded bg-[#070D20] hover:bg-[#101B35] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#202D50] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded bg-[#070D20] hover:bg-[#101B35] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#202D50] transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-[#070D20] hover:bg-[#101B35] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#202D50] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fit Graph / Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DOCKED CYBER TELEMETRY & LEGEND STRIP (Zero Overlapping)
      ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-1.5 bg-[#060D24] border-b border-[#1E2E55] flex flex-wrap items-center justify-between gap-3 text-[10.5px] font-mono shrink-0 z-10 shadow-sm">
        {/* Left: Path types with live neon indicators */}
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Path Types:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-[#22D3EE] inline-block shadow-[0_0_8px_#22D3EE]" />
            <span className="text-slate-300 font-medium">Authorized Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#FF365D] inline-block shadow-[0_0_8px_#FF365D]" />
            <span className="text-[#FF365D] font-bold">Suspicious Ghost Route</span>
          </div>
        </div>

        {/* Right: Security Zone Color Badges */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Zones:</span>
          <span className="text-[#38BDF8] flex items-center gap-1 font-medium">● Edge</span>
          <span className="text-[#00F0FF] flex items-center gap-1 font-medium">● DMZ</span>
          <span className="text-[#C084FC] flex items-center gap-1 font-medium">● Internal</span>
          <span className="text-[#FF365D] flex items-center gap-1 font-medium">● Data</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN SVG CANVAS AREA (100% Unobstructed, Zero Overlaps)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#040818]">

        {/* Main SVG Visualization */}
        <svg
          viewBox="0 0 1020 540"
          className="w-full h-full select-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <defs>
            {/* 1. Neon glow filters */}
            <filter id="suspicious-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* 2. Arrowhead markers */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
            </marker>

            <marker
              id="arrow-suspicious"
              viewBox="0 0 10 10"
              refX="24"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF365D" />
            </marker>

            {/* 3. Cyber grid pattern with intersection reticles */}
            <pattern id="scifi-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#122046" strokeWidth="0.8" strokeOpacity="0.55" />
              {/* Reticle crosses at corners */}
              <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke="#2563EB" strokeWidth="0.8" strokeOpacity="0.35" />
            </pattern>

            {/* 4. Hexagonal Honeycomb Cyber Grid */}
            <pattern id="cyber-hex" width="28" height="48.5" patternUnits="userSpaceOnUse">
              <path
                d="M 14 0 L 28 8.08 L 28 24.25 L 14 32.33 L 0 24.25 L 0 8.08 Z M 14 32.33 L 28 40.42 L 28 56.58 L 14 64.67 L 0 56.58 L 0 40.42 Z"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="0.5"
                strokeOpacity="0.07"
              />
            </pattern>

            {/* 5. Diagonal warning hatch pattern */}
            <pattern id="warning-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#FF365D" strokeWidth="1" strokeOpacity="0.08" />
            </pattern>

            {/* 6. Radar sweep cone gradient */}
            <linearGradient id="radarSweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.4" />
              <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.18" />
              <stop offset="85%" stopColor="#7C3AED" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* 7. Laser scan vertical glow gradient */}
            <linearGradient id="laserScanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0" />
              <stop offset="80%" stopColor="#00F0FF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* ═════════════════════════════════════════════════════════════════
              BACKGROUND LAYER: CRAZY SCI-FI TACTICAL RADAR & MATRIX
          ═════════════════════════════════════════════════════════════════ */}
          <g className="scifi-background pointer-events-none">
            {/* Hexagonal Cyber Hive Grid */}
            <rect width="1020" height="540" fill="url(#cyber-hex)" />

            {/* Deep Cyber Matrix Grid */}
            <rect width="1020" height="540" fill="url(#scifi-grid)" />

            {/* Expanding Sonar Pulse Waves centered around core (x=550, y=270) */}
            <circle cx="550" cy="270" fill="none" stroke="#00F0FF" strokeWidth="1.4">
              <animate attributeName="r" values="10; 490" dur="5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75; 0.3; 0" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="550" cy="270" fill="none" stroke="#7C3AED" strokeWidth="1.2">
              <animate attributeName="r" values="10; 490" dur="5s" begin="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.65; 0.25; 0" dur="5s" begin="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Concentric Holographic Radar System centered around network core (x=550, y=270) */}
            <g transform="translate(550, 270)">
              {/* LIVE 360° Rotating Radar Sweep Beam */}
              <g className="animate-radar-sweep">
                {/* Trailing illuminated sweep fan sector */}
                <path
                  d="M 0 0 L 460 0 A 460 460 0 0 0 325 -325 Z"
                  fill="url(#radarSweepGradient)"
                  opacity="0.35"
                />
                {/* Sharp leading edge laser line */}
                <line x1="0" y1="0" x2="460" y2="0" stroke="#00F0FF" strokeWidth="1.8" filter="url(#cyan-glow)" />
                <circle cx="460" cy="0" r="3" fill="#00F0FF" filter="url(#cyan-glow)" />
              </g>

              {/* Counter-rotating Outer Calibration Compass Ring with Degree Marks */}
              <g className="animate-radar-reverse" opacity="0.45">
                <circle r="420" fill="none" stroke="#1D4ED8" strokeWidth="1" strokeDasharray="2 12" />
                <circle r="380" fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 8" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <line x1="372" y1="0" x2="388" y2="0" stroke="#00F0FF" strokeWidth="1.2" />
                    <text x="398" y="3" fill="#38BDF8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                      {deg.toString().padStart(3, '0')}°
                    </text>
                  </g>
                ))}
              </g>

              {/* Stationary tactical distance range rings */}
              <circle r="460" fill="none" stroke="#1E3A8A" strokeWidth="0.8" strokeOpacity="0.2" />
              <circle r="360" fill="none" stroke="#2563EB" strokeWidth="0.8" strokeDasharray="6 6" strokeOpacity="0.3" />
              <circle r="260" fill="none" stroke="#00F0FF" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.35" />
              <circle r="160" fill="none" stroke="#7C3AED" strokeWidth="1" strokeOpacity="0.4" />
              <circle r="70" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.45" />

              {/* Radar Crosshairs with calibration notches */}
              <line x1="-480" y1="0" x2="480" y2="0" stroke="#1D4ED8" strokeWidth="0.8" strokeDasharray="4 8" strokeOpacity="0.25" />
              <line x1="0" y1="-260" x2="0" y2="260" stroke="#1D4ED8" strokeWidth="0.8" strokeDasharray="4 8" strokeOpacity="0.25" />

              {/* Azimuth Degree Ticks */}
              <text x="75" y="-5" fill="#38BDF8" fontSize="8" fontFamily="monospace" fillOpacity="0.5">090°</text>
              <text x="-105" y="-5" fill="#38BDF8" fontSize="8" fontFamily="monospace" fillOpacity="0.5">270°</text>
              <text x="5" y="-165" fill="#38BDF8" fontSize="8" fontFamily="monospace" fillOpacity="0.5">000°</text>
              <text x="5" y="175" fill="#38BDF8" fontSize="8" fontFamily="monospace" fillOpacity="0.5">180°</text>
            </g>

            {/* Live Vertical Laser Sonar Scanning Bar sweeping left-to-right */}
            <g>
              <rect x="-60" y="25" width="60" height="475" fill="url(#laserScanGrad)" opacity="0.35">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="-60 0; 1080 0"
                  dur="6.5s"
                  repeatCount="indefinite"
                />
              </rect>
              <line x1="0" y1="25" x2="0" y2="500" stroke="#00F0FF" strokeWidth="1.8" strokeOpacity="0.65" filter="url(#cyan-glow)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="-60 0; 1080 0"
                  dur="6.5s"
                  repeatCount="indefinite"
                />
              </line>
            </g>

            {/* High-Tech Tactical Corner Reticle Brackets */}
            <g stroke="#00F0FF" strokeWidth="1.5" fill="none" opacity="0.55">
              {/* Top-Left */}
              <path d="M 22 45 L 22 25 L 45 25" />
              <circle cx="22" cy="25" r="2" fill="#00F0FF" />
              {/* Top-Right */}
              <path d="M 998 45 L 998 25 L 975 25" />
              <circle cx="998" cy="25" r="2" fill="#00F0FF" />
              {/* Bottom-Left */}
              <path d="M 22 495 L 22 515 L 45 515" />
              <circle cx="22" cy="515" r="2" fill="#00F0FF" />
              {/* Bottom-Right */}
              <path d="M 998 495 L 998 515 L 975 515" />
              <circle cx="998" cy="515" r="2" fill="#00F0FF" />
            </g>

            {/* Live Audio / Entropy Spectrum Waveform Graphic at bottom center */}
            <g transform="translate(420, 521)" opacity="0.75">
              <text x="-95" y="4" fill="#38BDF8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">SPECTRUM:</text>
              {[6, 12, 18, 9, 15, 21, 14, 8, 16, 22, 10, 17, 13, 7, 19, 11].map((h, i) => (
                <rect
                  key={i}
                  x={i * 6}
                  y={-h / 2}
                  width="3.2"
                  height={h}
                  rx="1"
                  fill={i % 3 === 0 ? '#FF365D' : i % 2 === 0 ? '#00F0FF' : '#7C3AED'}
                >
                  <animate
                    attributeName="height"
                    values={`${h};${Math.max(3, (h * 1.5) % 22)};${Math.max(2, Math.floor(h * 0.4))};${h}`}
                    dur={`${1 + (i % 5) * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              ))}
              <circle cx="106" cy="0" r="3" fill="#10B981" className="animate-ping" />
              <circle cx="106" cy="0" r="2" fill="#10B981" />
              <text x="114" y="3" fill="#10B981" fontSize="7.5" fontFamily="monospace" fontWeight="bold">STREAM_LIVE</text>
            </g>

            {/* Floating Cyber Watermark Telemetry */}
            <text x="45" y="525" fill="#38BDF8" fontSize="8.5" fontFamily="monospace" fillOpacity="0.6">
              TELEMETRY: ACTIVE // 360° RADAR_SWEEP // REACHABILITY_OK
            </text>
            <text x="760" y="525" fill="#38BDF8" fontSize="8.5" fontFamily="monospace" fillOpacity="0.6">
              GRAPH_HASH: 0x9F41E8 // ZERO_TRUST_VERIFIED
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════
              SECURITY ZONES / RECTANGULAR REGIONS (NON-OVERLAPPING)
          ═════════════════════════════════════════════════════════════════ */}
          <g className="zones">
            {/* Zone 1: EDGE / PERIMETER (x: 30 -> 250) */}
            <g>
              <rect
                x="30"
                y="38"
                width="220"
                height="445"
                rx="12"
                fill="#070D22"
                fillOpacity="0.85"
                stroke="#3B82F6"
                strokeWidth="1.2"
                strokeDasharray="5 4"
                strokeOpacity="0.5"
              />
              <path d="M 30 52 L 30 38 L 44 38" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
              <path d="M 236 483 L 250 483 L 250 469" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
              <text x="44" y="62" fill="#38BDF8" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                ZONE: EDGE / PERIMETER
              </text>
              <text x="44" y="74" fill="#64748B" fontSize="8.5" fontFamily="monospace">
                GATEWAY INGRESS // 10.0.1.0/24
              </text>
            </g>

            {/* Zone 2: DMZ (x: 270 -> 450) */}
            <g>
              <rect
                x="270"
                y="38"
                width="180"
                height="445"
                rx="12"
                fill="#051D33"
                fillOpacity="0.85"
                stroke="#00F0FF"
                strokeWidth="1.2"
                strokeDasharray="5 4"
                strokeOpacity="0.6"
              />
              <rect x="270" y="38" width="180" height="445" rx="12" fill="url(#warning-hatch)" />
              <path d="M 270 52 L 270 38 L 284 38" fill="none" stroke="#00F0FF" strokeWidth="2.5" />
              <path d="M 436 483 L 450 483 L 450 469" fill="none" stroke="#00F0FF" strokeWidth="2.5" />
              <text x="284" y="52" fill="#00F0FF" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                ZONE: DMZ [EXPOSED]
              </text>
              <text x="284" y="63" fill="#0284C7" fontSize="8.5" fontFamily="monospace">
                PUBLIC FACING // 10.0.1.0/24
              </text>
            </g>

            {/* Zone 3: INTERNAL TRUSTED (x: 470 -> 800) */}
            <g>
              <rect
                x="470"
                y="38"
                width="330"
                height="445"
                rx="12"
                fill="#120E2C"
                fillOpacity="0.85"
                stroke="#A855F7"
                strokeWidth="1.2"
                strokeDasharray="5 4"
                strokeOpacity="0.5"
              />
              <path d="M 470 52 L 470 38 L 484 38" fill="none" stroke="#A855F7" strokeWidth="2.5" />
              <path d="M 786 483 L 800 483 L 800 469" fill="none" stroke="#A855F7" strokeWidth="2.5" />
              <text x="484" y="52" fill="#C084FC" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                ZONE: INTERNAL TRUSTED
              </text>
              <text x="484" y="63" fill="#7C3AED" fontSize="8.5" fontFamily="monospace">
                PRIVATE SERVICES & BASTION // 10.0.2.0/24
              </text>
            </g>

            {/* Zone 4: DATA TIER (x: 820 -> 990) */}
            <g>
              <rect
                x="820"
                y="38"
                width="170"
                height="445"
                rx="12"
                fill="#240714"
                fillOpacity="0.85"
                stroke="#FF2E5B"
                strokeWidth="1.2"
                strokeDasharray="5 4"
                strokeOpacity="0.6"
              />
              <path d="M 820 52 L 820 38 L 834 38" fill="none" stroke="#FF2E5B" strokeWidth="2.5" />
              <path d="M 976 483 L 990 483 L 990 469" fill="none" stroke="#FF2E5B" strokeWidth="2.5" />
              <text x="834" y="52" fill="#FF4D79" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                ZONE: DATA [SECURE]
              </text>
              <text x="834" y="63" fill="#E11D48" fontSize="8.5" fontFamily="monospace">
                ISOLATED VAULT // 10.0.3.0/24
              </text>
            </g>
          </g>

          {/* ═════════════════════════════════════════════════════════════════
              CONNECTIONS & SUSPICIOUS GHOST ROUTE EDGES
          ═════════════════════════════════════════════════════════════════ */}
          <g className="edges">
            {edges.map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const isSuspicious = edge.isSuspicious;
              const isSelected = selectedEdgeId === edge.id;
              const isConnectedToSelected =
                connectedEdgeIds.has(edge.id) ||
                edge.source === selectedNodeId ||
                edge.target === selectedNodeId;
              const isHovered = hoveredEdgeId === edge.id;

              // Arc Calculation:
              // Suspicious Ghost Route arches smoothly OVER app-server-01 (y=180) via cubic Bezier
              const cx = (sourceNode.x + targetNode.x) / 2;
              const cy = (sourceNode.y + targetNode.y) / 2;
              const pathData = isSuspicious
                ? `M ${sourceNode.x} ${sourceNode.y} C 450 70, 580 70, ${targetNode.x} ${targetNode.y}`
                : `M ${sourceNode.x} ${sourceNode.y} Q ${cx} ${cy} ${targetNode.x} ${targetNode.y}`;

              // Position TCP Threat Badge on the right side of app-server-01 along the path to fw-core
              const badgeX = isSuspicious ? 660 : cx;
              const badgeY = isSuspicious ? 180 : cy + 14;

              return (
                <g
                  key={edge.id}
                  onClick={() => onSelectEdge(edge)}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  className="cursor-pointer group"
                >
                  {/* Thick invisible hit area */}
                  <path d={pathData} fill="none" stroke="transparent" strokeWidth="26" />

                  {/* ──────────────── Normal Connection ──────────────── */}
                  {!isSuspicious && (
                    <>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={
                          isConnectedToSelected || isSelected
                            ? '#00F0FF'
                            : isHovered
                            ? '#38BDF8'
                            : '#20325A'
                        }
                        strokeWidth={isConnectedToSelected || isSelected || isHovered ? 2.8 : 2}
                        strokeOpacity={isConnectedToSelected || isSelected ? 1 : isHovered ? 0.95 : 0.75}
                        markerEnd="url(#arrow-normal)"
                      />
                      {/* Flowing packet pulse along active connection */}
                      {(isConnectedToSelected || isSelected || isHovered) && (
                        <circle r="3.5" fill="#00F0FF" filter="url(#cyan-glow)">
                          <animateMotion path={pathData} dur="2.2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </>
                  )}

                  {/* ────────────── Suspicious Ghost Route Arc ────────────── */}
                  {isSuspicious && (
                    <>
                      {/* Deep crimson underglow */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FF2E5B"
                        strokeWidth="8"
                        strokeOpacity="0.35"
                        filter="url(#suspicious-glow)"
                      />
                      {/* Pulsing dashed laser arc */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FF2E5B"
                        strokeWidth="3.2"
                        strokeDasharray="6 4"
                        className="animate-suspicious-path"
                        markerEnd="url(#arrow-suspicious)"
                      />

                      {/* Unified Cyber Threat Pill shifted to the right side (between app-server and fw-core) */}
                      <g transform={`translate(${badgeX}, ${badgeY})`}>
                        {/* High-contrast solid dark backdrop to isolate completely */}
                        <rect
                          x="-45"
                          y="-13"
                          width="90"
                          height="26"
                          rx="6"
                          fill="#1A050B"
                          stroke="#FF2E5B"
                          strokeWidth="1.6"
                          filter="url(#suspicious-glow)"
                        />
                        <rect
                          x="-43"
                          y="-11"
                          width="86"
                          height="22"
                          rx="5"
                          fill="#290710"
                          stroke="#FF2E5B"
                          strokeWidth="0.8"
                        />
                        {/* Warning Alert Icon */}
                        <foreignObject x="-38" y="-7" width="14" height="14" className="pointer-events-none">
                          <div className="w-full h-full flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#FF2E5B] animate-pulse" />
                          </div>
                        </foreignObject>
                        {/* Protocol Text Badge */}
                        <text
                          x="9"
                          y="4"
                          textAnchor="middle"
                          fill="#FFA3B4"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                          letterSpacing="0.06em"
                        >
                          TCP:5432
                        </text>
                      </g>

                      {/* Rapid red particle packet surging along the ghost route (rendered on top so it sweeps cleanly over) */}
                      <circle r="4.5" fill="#FFFFFF" stroke="#FF2E5B" strokeWidth="2" filter="url(#suspicious-glow)">
                        <animateMotion path={pathData} dur="1.4s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}

                  {/* Hover readout for normal edge */}
                  {!isSuspicious && (isHovered || isSelected) && (
                    <g transform={`translate(${cx}, ${cy + 14})`}>
                      <rect
                        x="-26"
                        y="-9"
                        width="52"
                        height="18"
                        rx="4"
                        fill="#070D22"
                        stroke="#38BDF8"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {edge.protocol || 'TCP'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* ═════════════════════════════════════════════════════════════════
              NODES LAYER WITH HIGH-CONTRAST SUPER-CLEAR IP BADGES
          ═════════════════════════════════════════════════════════════════ */}
          <g className="nodes">
            {nodes.map((node) => {
              const isVisible = isNodeVisible(node);
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isSuspicious = node.isSuspicious;

              // Visual Theme Palette per Node
              const strokeColor = isSelected
                ? '#00F0FF'
                : isSuspicious
                ? '#FF2E5B'
                : node.type === 'firewall'
                ? '#A855F7'
                : node.type === 'database'
                ? '#FF2E5B'
                : '#38BDF8';

              const fillColor = isSelected
                ? '#082F49'
                : isSuspicious
                ? '#290611'
                : '#070D22';

              const ipTextColor = isSuspicious
                ? '#FFA3B4'
                : isSelected
                ? '#67E8F9'
                : node.type === 'firewall'
                ? '#E9D5FF'
                : '#67E8F9';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`cursor-pointer group transition-opacity duration-200 ${
                    isVisible ? 'opacity-100' : 'opacity-25'
                  }`}
                >
                  {/* Outer selection / alert radar ring */}
                  {(isSelected || isSuspicious) && (
                    <circle
                      r="34"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1.6"
                      strokeDasharray={isSelected ? '5 3' : undefined}
                      opacity={isSuspicious ? 0.6 : 0.9}
                      className={isSuspicious ? 'animate-ping' : ''}
                    />
                  )}

                  {/* Node Main Circle Base */}
                  <circle
                    r="25"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.8 : 2.2}
                    filter={isSelected ? 'url(#cyan-glow)' : isSuspicious ? 'url(#suspicious-glow)' : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Node Icon inside SVG foreignObject */}
                  <foreignObject x="-13" y="-13" width="26" height="26" className="pointer-events-none">
                    <div className="w-full h-full flex items-center justify-center">
                      <RenderNodeIcon
                        type={node.type}
                        className={`w-5 h-5 ${
                          isSuspicious
                            ? 'text-[#FF2E5B]'
                            : isSelected
                            ? 'text-[#00F0FF]'
                            : node.type === 'firewall'
                            ? 'text-[#C084FC]'
                            : 'text-[#38BDF8]'
                        }`}
                      />
                    </div>
                  </foreignObject>

                  {/* Red alert notification beacon on suspicious node */}
                  {isSuspicious && (
                    <circle cx="17" cy="-17" r="5.5" fill="#FF2E5B" stroke="#040818" strokeWidth="1.5" />
                  )}

                  {/* Node Name Label (Clean, bold, non-overlapping) */}
                  <text
                    x="0"
                    y="39"
                    textAnchor="middle"
                    fill={isSelected ? '#67E8F9' : isSuspicious ? '#FDA4AF' : '#F8FAFC'}
                    fontSize="11.5"
                    fontFamily="Inter, sans-serif"
                    fontWeight="700"
                    stroke="#040818"
                    strokeWidth="3.5"
                    paintOrder="stroke fill"
                    strokeLinejoin="round"
                    className="pointer-events-none select-none"
                  >
                    {node.name}
                  </text>

                  {/* ─────────────────────────────────────────────────────────
                      HIGH-CONTRAST DEDICATED CYBER IP BADGE / HUD PILL
                      (Ensures 100% crystal-clear visibility from any distance)
                  ───────────────────────────────────────────────────────── */}
                  <g transform="translate(0, 48)">
                    {/* Dark contrast pill backdrop */}
                    <rect
                      x="-44"
                      y="0"
                      width="88"
                      height="19"
                      rx="5"
                      fill="#030712"
                      stroke={strokeColor}
                      strokeWidth="1.3"
                      strokeOpacity="0.9"
                      className="shadow-lg"
                    />
                    {/* Inner subtle glow highlight */}
                    <rect
                      x="-42"
                      y="2"
                      width="84"
                      height="15"
                      rx="3"
                      fill={strokeColor}
                      fillOpacity="0.12"
                    />
                    {/* Crisp monospace IP text */}
                    <text
                      x="0"
                      y="13.5"
                      textAnchor="middle"
                      fill={ipTextColor}
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="700"
                      letterSpacing="0.04em"
                      className="pointer-events-none select-none"
                    >
                      {node.ip}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ─────────────────────────────────────────────────────────────
            3. FLOATING BOTTOM ALERT & TELEMETRY BANNER
        ───────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-[#94A3B8] bg-[#070D20]/95 p-3 rounded-lg border border-[#202D50] backdrop-blur-md pointer-events-none shadow-2xl">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF365D] animate-ping" />
            <span className="text-[#FF365D] font-bold tracking-wide">BYPASS IDENTIFIED:</span>
            <span className="text-[#F1F5F9] font-medium">
              DMZ Web Server (<span className="text-[#00F0FF] font-bold">10.0.1.10</span>) ➔ Production DB (<span className="text-[#FF365D] font-bold">10.0.3.50</span>) without Internal Firewall transit
            </span>
          </div>
          <span className="text-[#64748B] hidden lg:inline text-[11px] font-mono">
            Click any node or route to inspect telemetry
          </span>
        </div>
      </div>
    </div>
  );
};
