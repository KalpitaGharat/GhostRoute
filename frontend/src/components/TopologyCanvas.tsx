import React, { useState, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Layers,
  Server,
  Database,
  Shield,
  Cpu,
  Terminal,
  Activity
} from 'lucide-react';
import type { Node, Edge, NodeType } from '../types';

interface TopologyCanvasProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (node: Node) => void;
  trustPathsCount?: string; // "20 / 20"
}

// Node Icon Renderer based on node type
const NodeIcon: React.FC<{ type: NodeType; className?: string }> = ({ type, className = 'w-4 h-4' }) => {
  switch (type) {
    case 'gateway':
      return <Cpu className={className} />;
    case 'firewall':
      return <Shield className={className} />;
    case 'subnet':
      return <Layers className={className} />;
    case 'server':
      return <Server className={className} />;
    case 'database':
      return <Database className={className} />;
    case 'host':
    default:
      return <Terminal className={className} />;
  }
};

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  trustPathsCount = '20 / 20'
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterGhostOnly, setFilterGhostOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Export topology as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ nodes, edges, exportedAt: new Date().toISOString() }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ghostroute_topology_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Find node coordinate map
  const nodeMap = new Map<string, Node>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Determine which edges to highlight based on selectedNodeId
  const connectedEdgeIds = new Set<string>();
  if (selectedNodeId) {
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        connectedEdgeIds.add(edge.id);
      }
    });
  }

  // Filter edges if filterGhostOnly is active
  const visibleEdges = filterGhostOnly ? edges.filter((e) => e.isGhostRoute) : edges;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full rounded-xl bg-slate-900/85 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-slate-950 p-4' : ''
      }`}
    >
      {/* CARD HEADER: "Interactive Network Topology Graph" with right-aligned metadata toggle: "Trust paths: 20 / 20" and fullscreen/export icon buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
              Interactive Network Topology Graph
              <span className="text-[10px] text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30 font-semibold animate-pulse">
                2 Ghost Routes Flagged
              </span>
            </h2>
          </div>
        </div>

        {/* Right-aligned metadata toggle: "Trust paths: 20 / 20" and fullscreen/export icon buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Trust paths toggle pill */}
          <button
            onClick={() => setFilterGhostOnly(!filterGhostOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              filterGhostOnly
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
            title="Click to toggle: Show Ghost Routes Only vs All Trust Paths"
          >
            <span className="text-[11px] text-slate-400">Trust paths:</span>
            <span className="font-bold text-cyan-400">{trustPathsCount}</span>
            {filterGhostOnly && (
              <span className="text-[9px] text-rose-400 uppercase font-bold">(Violations Only)</span>
            )}
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={() => {
              setZoomLevel(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJSON}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
            title="Export Topology Graph JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Graph'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* CANVAS / SVG GRAPH AREA */}
      <div className="relative flex-1 w-full h-[320px] sm:h-[360px] lg:h-full cyber-grid overflow-hidden cursor-crosshair">
        {/* Floating Zone Legend Overlays */}
        <div className="absolute top-3 left-4 flex flex-wrap gap-2 text-[10px] font-mono pointer-events-none z-10">
          <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400">
            Zone: <strong className="text-cyan-400">DMZ (10.0.1.x)</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400">
            Zone: <strong className="text-purple-400">INTERNAL (10.0.2.x)</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400">
            Zone: <strong className="text-rose-400">DATA (10.0.3.x)</strong>
          </span>
        </div>

        {/* Floating Lateral Movement Banner Alert */}
        <div className="absolute bottom-3 left-4 right-4 sm:right-auto z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.35)] backdrop-blur-md">
          <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
          <div className="text-xs font-mono text-rose-200">
            <span className="font-bold text-rose-300">GHOST ROUTE INTRUSION:</span> dmz-web-01 bypassed Edge Firewall ➔ Core Firewall ➔ db-prod-01
          </div>
        </div>

        {/* MAIN INTERACTIVE SVG */}
        <svg
          viewBox="0 0 1000 400"
          className="w-full h-full select-none"
          style={{
            transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <defs>
            {/* Marker arrow for normal connection */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="20"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
            </marker>

            {/* Marker arrow for crimson ghost route */}
            <marker
              id="arrow-ghost"
              viewBox="0 0 10 10"
              refX="20"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>

            {/* Glowing filter for crimson ghost edges */}
            <filter id="crimson-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glowing filter for selected cyan node */}
            <filter id="cyan-node-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ZONE BOUNDARY LABELS / BACKDROP RECTS */}
          <g className="zones opacity-20 pointer-events-none">
            {/* DMZ Zone box */}
            <rect x="70" y="50" width="310" height="310" rx="16" fill="#082f49" stroke="#0284c7" strokeDasharray="4 4" />
            <text x="85" y="75" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE: DMZ / EDGE</text>

            {/* INTERNAL Zone box */}
            <rect x="420" y="50" width="350" height="310" rx="16" fill="#1e1b4b" stroke="#6366f1" strokeDasharray="4 4" />
            <text x="435" y="75" fill="#818cf8" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE: INTERNAL TRUSTED</text>

            {/* DATA Zone box */}
            <rect x="810" y="50" width="150" height="310" rx="16" fill="#4c0519" stroke="#f43f5e" strokeDasharray="4 4" />
            <text x="825" y="75" fill="#fb7185" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE: DATA</text>
          </g>

          {/* EDGES (Normal semi-transparent cyan/slate-700 & Flagged Crimson Ghost Routes) */}
          <g className="edges">
            {visibleEdges.map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const isGhost = edge.isGhostRoute;
              const isConnectedToSelected =
                connectedEdgeIds.has(edge.id) ||
                edge.source === selectedNodeId ||
                edge.target === selectedNodeId;
              const isHovered = hoveredEdgeId === edge.id;

              // Quadratic curve offset for clarity and aesthetic appeal
              const cx = (sourceNode.x + targetNode.x) / 2;
              // If it's a ghost route, give it an elevated curve to pop out
              const cy = (sourceNode.y + targetNode.y) / 2 + (isGhost ? -45 : 0);

              const pathData = `M ${sourceNode.x} ${sourceNode.y} Q ${cx} ${cy} ${targetNode.x} ${targetNode.y}`;

              return (
                <g
                  key={edge.id}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                >
                  {/* Invisible thicker hit-box path for easier hovering */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                  />

                  {/* Normal connection edges drawn as subtle semi-transparent cyan/slate-700 lines */}
                  {!isGhost && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={
                        isConnectedToSelected
                          ? '#22d3ee'
                          : isHovered
                          ? '#38bdf8'
                          : '#334155'
                      }
                      strokeWidth={isConnectedToSelected || isHovered ? 2.5 : 1.6}
                      strokeOpacity={isConnectedToSelected ? 0.95 : isHovered ? 0.8 : 0.45}
                      strokeDasharray={isConnectedToSelected ? '4 3' : undefined}
                      markerEnd="url(#arrow-normal)"
                    />
                  )}

                  {/* Flagged Ghost Routes / Suspicious Paths highlighted in vibrant glowing CRIMSON RED lines with pulsing animation */}
                  {isGhost && (
                    <>
                      {/* Under-glow crimson beam */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="7"
                        strokeOpacity="0.4"
                        filter="url(#crimson-glow)"
                      />
                      {/* Pulsing vibrant crimson line */}
                      <path
                        d={pathData}
                        fill="none"
                        className="pulsing-edge"
                        stroke="#ef4444"
                        strokeWidth="3.2"
                        strokeDasharray="6 3"
                        markerEnd="url(#arrow-ghost)"
                      />
                    </>
                  )}

                  {/* Edge Midpoint Protocol Label */}
                  <g transform={`translate(${cx}, ${cy})`}>
                    <rect
                      x="-26"
                      y="-10"
                      width="52"
                      height="18"
                      rx="4"
                      fill={isGhost ? '#450a0a' : '#0f172a'}
                      stroke={isGhost ? '#ef4444' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill={isGhost ? '#fca5a5' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {edge.protocol}
                    </text>
                  </g>

                  {/* Floating Tooltips over compromised paths showing: "Suspicious Route DETECTED" and lateral movement warnings */}
                  {isGhost && (
                    <g transform={`translate(${cx}, ${cy - 24})`} className="pointer-events-none">
                      <rect
                        x="-110"
                        y="-26"
                        width="220"
                        height="32"
                        rx="6"
                        fill="#1c070b"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        filter="drop-shadow(0 0 10px rgba(239, 68, 68, 0.6))"
                      />
                      <text
                        x="0"
                        y="-14"
                        textAnchor="middle"
                        fill="#f87171"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ⚠️ Suspicious Route DETECTED
                      </text>
                      <text
                        x="0"
                        y="-2"
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        Lateral Movement Bypassing Edge Tier
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* NODES (Distributed nodes: Gateway, Core Firewall, Subnet VPC, Endpoints, Database servers) */}
          <g className="nodes">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isCritical = node.threatLevel === 'Critical';
              const isHigh = node.threatLevel === 'High';

              // Node color styling
              const strokeColor = isSelected
                ? '#22d3ee'
                : isCritical
                ? '#ef4444'
                : isHigh
                ? '#f59e0b'
                : '#06b6d4';

              const fillColor = isSelected
                ? '#083344'
                : isCritical
                ? '#450a0a'
                : '#0f172a';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer group"
                >
                  {/* Selection / Warning halo ring */}
                  {(isSelected || isCritical) && (
                    <circle
                      r="28"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      strokeDasharray={isSelected ? '4 2' : undefined}
                      className={isCritical ? 'animate-ping' : ''}
                      opacity={isCritical ? 0.35 : 0.6}
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r="20"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                    filter={isSelected ? 'url(#cyan-node-glow)' : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Node icon inside SVG foreignObject */}
                  <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none">
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <NodeIcon
                        type={node.type}
                        className={`w-4 h-4 ${
                          isCritical
                            ? 'text-rose-400'
                            : isSelected
                            ? 'text-cyan-300'
                            : 'text-slate-300'
                        }`}
                      />
                    </div>
                  </foreignObject>

                  {/* Cryptographic mTLS Shield indicator badge */}
                  {node.mTLS && (
                    <circle
                      cx="14"
                      cy="-14"
                      r="5"
                      fill="#06b6d4"
                      stroke="#020617"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Node Label & IP Subtitle (JetBrains Mono / SF Pro Mono) */}
                  <text
                    x="0"
                    y="34"
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : isCritical ? '#fca5a5' : '#f1f5f9'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.name}
                  </text>
                  <text
                    x="0"
                    y="46"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    className="pointer-events-none"
                  >
                    {node.ip}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
