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
      className={`rounded-xl bg-[#0B142B] border border-[#202D50] flex flex-col justify-between shadow-xl relative overflow-hidden backdrop-blur-md transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#050817] p-5' : 'h-[530px]'
      }`}
    >
      {/* 1. PANEL HEADER & TOOLBAR */}
      <div className="px-4 py-3 border-b border-[#202D50] bg-[#070D20]/90 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#F1F5F9] font-sans tracking-tight">
              Interactive Network Topology
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-[#FF365D] border border-rose-500/40 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF365D]" />
              2 Ghost Routes Detected
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Explore trust paths, detect ghost routes, and analyze potential attack paths.
          </p>
        </div>

        {/* Toolbar: Zone filters, Search, Zoom, Fullscreen */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Zone filter buttons */}
          <div className="flex items-center bg-[#050817] p-0.5 rounded-lg border border-[#202D50]">
            {(['ALL', 'DMZ', 'INTERNAL', 'DATA'] as const).map((zone) => (
              <button
                key={zone}
                onClick={() => setActiveZoneFilter(zone)}
                className={`px-2.5 py-1 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                  activeZoneFilter === zone
                    ? 'bg-[#7C3AED] text-white font-bold shadow-[0_0_8px_rgba(124,58,237,0.4)]'
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
              className="w-32 sm:w-40 bg-[#050817] border border-[#202D50] focus:border-[#7C3AED] text-[#F1F5F9] placeholder-[#64748B] text-xs rounded-lg pl-8 pr-2.5 py-1 focus:outline-none"
            />
          </div>

          {/* Zoom In / Out / Reset / Fullscreen */}
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

      {/* 2. MAIN SVG CANVAS AREA */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#050817] bg-topology-grid">
        {/* Perspective Glow Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,0.18),transparent_70%)]" />

        {/* Legend Overlay at Top-Right */}
        <div className="absolute top-3 right-3 z-10 p-2.5 rounded-lg bg-[#070D20]/95 border border-[#202D50] backdrop-blur-md shadow-lg text-[10.5px] font-mono space-y-1.5 pointer-events-auto">
          <div className="font-bold text-[#F1F5F9] text-[9.5px] uppercase tracking-wider border-b border-[#202D50] pb-1">
            Path Types & Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#22D3EE] inline-block shadow-[0_0_6px_#22D3EE]" />
            <span className="text-[#94A3B8]">Normal Path (Authorized)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-[#FF365D] inline-block shadow-[0_0_6px_#FF365D]" />
            <span className="text-[#FF365D] font-bold">Suspicious Ghost Route</span>
          </div>
          <div className="pt-1 border-t border-[#202D50] flex flex-wrap gap-2 text-[9.5px]">
            <span className="text-[#3B82F6]">● Edge</span>
            <span className="text-[#0284C7]">● DMZ</span>
            <span className="text-[#A855F7]">● Internal</span>
            <span className="text-[#FF365D]">● Data</span>
          </div>
        </div>

        {/* Main SVG Visualization */}
        <svg
          viewBox="0 0 1020 450"
          className="w-full h-full select-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <defs>
            {/* Arrowhead marker: Normal connection */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
            </marker>

            {/* Arrowhead marker: Suspicious connection (adjusted refX so it touches boundary without overlapping) */}
            <marker
              id="arrow-suspicious"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF365D" />
            </marker>

            {/* Red Glow Filter */}
            <filter id="suspicious-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cyan Glow Filter */}
            <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ZONE BACKGROUND RECTANGLES / SECURITY BOUNDARIES */}
          <g className="zones opacity-30 pointer-events-none">
            {/* Zone 1: Edge & Perimeter */}
            <rect x="35" y="45" width="255" height="355" rx="14" fill="#070D20" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 4" />
            <text x="50" y="72" fill="#3B82F6" fontSize="11" fontFamily="monospace" fontWeight="bold">ZONE: EDGE / PERIMETER</text>

            {/* Zone 2: DMZ */}
            <rect x="310" y="45" width="160" height="355" rx="14" fill="#082F49" stroke="#0284C7" strokeWidth="1" strokeDasharray="4 4" />
            <text x="325" y="72" fill="#0284C7" fontSize="11" fontFamily="monospace" fontWeight="bold">ZONE: DMZ</text>

            {/* Zone 3: Internal */}
            <rect x="490" y="45" width="320" height="355" rx="14" fill="#1E1B4B" stroke="#7C3AED" strokeWidth="1" strokeDasharray="4 4" />
            <text x="505" y="72" fill="#A855F7" fontSize="11" fontFamily="monospace" fontWeight="bold">ZONE: INTERNAL TRUSTED</text>

            {/* Zone 4: Data */}
            <rect x="830" y="45" width="160" height="355" rx="14" fill="#4C0519" stroke="#FF365D" strokeWidth="1" strokeDasharray="4 4" />
            <text x="845" y="72" fill="#FF365D" fontSize="11" fontFamily="monospace" fontWeight="bold">ZONE: DATA</text>
          </g>

          {/* CONNECTIONS / EDGES */}
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
              // For suspicious ghost route, arch HIGH ABOVE the nodes (offset -95) so it never touches or crosses app-server-01!
              const cx = (sourceNode.x + targetNode.x) / 2;
              const cy = (sourceNode.y + targetNode.y) / 2 + (isSuspicious ? -95 : 0);
              const pathData = `M ${sourceNode.x} ${sourceNode.y} Q ${cx} ${cy} ${targetNode.x} ${targetNode.y}`;

              return (
                <g
                  key={edge.id}
                  onClick={() => onSelectEdge(edge)}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  className="cursor-pointer group"
                >
                  {/* Thick hit area */}
                  <path d={pathData} fill="none" stroke="transparent" strokeWidth="22" />

                  {/* Normal Connection */}
                  {!isSuspicious && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={
                        isConnectedToSelected || isSelected
                          ? '#22D3EE'
                          : isHovered
                          ? '#38BDF8'
                          : '#202D50'
                      }
                      strokeWidth={isConnectedToSelected || isSelected || isHovered ? 2.6 : 1.8}
                      strokeOpacity={isConnectedToSelected || isSelected ? 1 : isHovered ? 0.9 : 0.65}
                      className={isConnectedToSelected ? 'animate-normal-edge' : ''}
                      markerEnd="url(#arrow-normal)"
                    />
                  )}

                  {/* Suspicious Connection: Red dashed glowing line */}
                  {isSuspicious && (
                    <>
                      {/* Red Underglow */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FF365D"
                        strokeWidth="6"
                        strokeOpacity="0.3"
                        filter="url(#suspicious-glow)"
                      />
                      {/* Pulsing Dashed Path */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FF365D"
                        strokeWidth="3"
                        className="animate-suspicious-path"
                        markerEnd="url(#arrow-suspicious)"
                      />

                      {/* Warning Symbol Positioned along the high arc summit (clear of all nodes) */}
                      <g transform={`translate(${cx}, ${cy - 12})`}>
                        <circle cx="0" cy="0" r="10" fill="#4C0519" stroke="#FF365D" strokeWidth="1.4" />
                        <foreignObject x="-6" y="-6" width="12" height="12" className="pointer-events-none">
                          <div className="w-full h-full flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-[#FF365D]" />
                          </div>
                        </foreignObject>
                      </g>
                    </>
                  )}

                  {/* Protocol Label along the route - positioned above the arc so it never collides with any node */}
                  {isSuspicious && (
                    <g transform={`translate(${cx}, ${cy + 12})`}>
                      <rect
                        x="-24"
                        y="-8"
                        width="48"
                        height="16"
                        rx="4"
                        fill="#4C0519"
                        stroke="#FF365D"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FF8096"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {edge.protocol || 'TCP'}
                      </text>
                    </g>
                  )}

                  {/* Midpoint Label on hover/selection for normal edges: shifted below the line */}
                  {!isSuspicious && (isHovered || isSelected) && (
                    <g transform={`translate(${cx}, ${cy + 16})`}>
                      <rect
                        x="-26"
                        y="-8"
                        width="52"
                        height="16"
                        rx="4"
                        fill="#070D20"
                        stroke="#3B82F6"
                        strokeWidth="0.9"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9"
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

          {/* NODES */}
          <g className="nodes">
            {nodes.map((node) => {
              const isVisible = isNodeVisible(node);
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isSuspicious = node.isSuspicious;

              // Distinct node color palette
              const strokeColor = isSelected
                ? '#22D3EE'
                : isSuspicious
                ? '#FF365D'
                : node.type === 'firewall'
                ? '#7C3AED'
                : node.type === 'internet'
                ? '#22D3EE'
                : '#3B82F6';

              const fillColor = isSelected
                ? '#082F49'
                : isSuspicious
                ? '#2D0A14'
                : '#0B142B';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`cursor-pointer group transition-opacity duration-200 ${
                    isVisible ? 'opacity-100' : 'opacity-20'
                  }`}
                >
                  {/* Outer selection / warning halo ring */}
                  {(isSelected || isSuspicious) && (
                    <circle
                      r="32"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      strokeDasharray={isSelected ? '4 3' : undefined}
                      opacity={isSuspicious ? 0.5 : 0.8}
                    />
                  )}

                  {/* Node Base Circle */}
                  <circle
                    r="24"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.8 : isHovered ? 2.5 : 2}
                    filter={isSelected ? 'url(#cyan-glow)' : isSuspicious ? 'url(#suspicious-glow)' : undefined}
                  />

                  {/* Node Icon inside SVG foreignObject */}
                  <foreignObject x="-13" y="-13" width="26" height="26" className="pointer-events-none">
                    <div className="w-full h-full flex items-center justify-center text-[#F1F5F9]">
                      <RenderNodeIcon
                        type={node.type}
                        className={`w-5 h-5 ${
                          isSuspicious
                            ? 'text-[#FF365D]'
                            : isSelected
                            ? 'text-[#22D3EE]'
                            : node.type === 'firewall'
                            ? '#A855F7'
                            : 'text-[#94A3B8]'
                        }`}
                      />
                    </div>
                  </foreignObject>

                  {/* Red accent dot badge for suspicious route participant */}
                  {isSuspicious && (
                    <circle cx="16" cy="-16" r="5" fill="#FF365D" stroke="#050817" strokeWidth="1.2" />
                  )}

                  {/* 100% VISIBLE TEXT WITH CONTRAST HALO (Solves visibility and line collision) */}
                  <text
                    x="0"
                    y="37"
                    textAnchor="middle"
                    fill={isSelected ? '#22D3EE' : isSuspicious ? '#FDA4AF' : '#F1F5F9'}
                    fontSize="11.5"
                    fontFamily="Inter, sans-serif"
                    fontWeight="600"
                    stroke="#050817"
                    strokeWidth="3.5"
                    paintOrder="stroke fill"
                    strokeLinejoin="round"
                    className="pointer-events-none select-none"
                  >
                    {node.name}
                  </text>
                  <text
                    x="0"
                    y="50"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="600"
                    stroke="#050817"
                    strokeWidth="3"
                    paintOrder="stroke fill"
                    strokeLinejoin="round"
                    className="pointer-events-none select-none"
                  >
                    {node.ip}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Bottom Explanatory Banner */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-xs font-mono text-[#94A3B8] bg-[#070D20]/95 p-2.5 rounded-lg border border-[#202D50] backdrop-blur-sm pointer-events-none shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF365D] animate-ping" />
            <span className="text-[#FF365D] font-bold">BYPASS IDENTIFIED:</span>
            <span className="text-[#F1F5F9]">
              DMZ Web Server (10.0.1.10) ➔ Production DB (10.0.3.50) without Internal Firewall transit
            </span>
          </div>
          <span className="text-[#64748B] hidden md:inline">Click any node or route to inspect telemetry</span>
        </div>
      </div>
    </div>
  );
};
