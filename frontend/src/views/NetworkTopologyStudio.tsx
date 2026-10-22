import React, { useState } from 'react';
import {
  Filter,
  Zap,
  Server,
  Lock,
  ShieldAlert,
  Eye
} from 'lucide-react';
import type { TopologyNode, TopologyEdge } from '../types';
import { NetworkTopologyPanel } from '../components/NetworkTopologyPanel';

interface NetworkTopologyStudioProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  selectedNode: TopologyNode | null;
  selectedEdge: TopologyEdge | null;
  onSelectNode: (node: TopologyNode | null) => void;
  onSelectEdge: (edge: TopologyEdge | null) => void;
  onOpenInvestigation: () => void;
}

export const NetworkTopologyStudio: React.FC<NetworkTopologyStudioProps> = ({
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  onOpenInvestigation
}) => {
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodes = nodes.filter((node) => {
    if (zoneFilter !== 'ALL' && node.zone !== zoneFilter) return false;
    if (onlySuspicious && !node.isSuspicious) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.ip.toLowerCase().includes(q) ||
        node.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEdges = edges.filter((edge) => {
    if (onlySuspicious && !edge.isSuspicious) return false;
    return true;
  });

  const suspiciousCount = edges.filter((e) => e.isSuspicious).length;

  return (
    <div className="space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Network Topology <span className="text-[#A855F7]">Studio</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              Full Graph View
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Interactive multi-zone trust boundaries, transit firewalls, and active trust paths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlySuspicious(!onlySuspicious)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              onlySuspicious
                ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                : 'bg-[#0B142B] border-[#202D50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>{onlySuspicious ? 'Showing Suspicious Only' : 'Filter Ghost Routes'}</span>
          </button>

          <button
            onClick={onOpenInvestigation}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white text-xs font-semibold shadow-[0_0_15px_-2px_rgba(124,58,237,0.5)] transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white text-transparent" />
            <span>Investigate Findings</span>
          </button>
        </div>
      </div>

      {/* FILTER & STATS TOOLBAR */}
      <div className="p-3 rounded-xl bg-[#0B142B] border border-[#202D50] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Zone Filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#22D3EE] mr-1" />
          <span className="text-[#94A3B8] font-mono mr-1">Zone:</span>
          {['ALL', 'EDGE', 'DMZ', 'INTERNAL', 'DATA'].map((z) => (
            <button
              key={z}
              onClick={() => setZoneFilter(z)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                zoneFilter === z
                  ? 'bg-violet-600/30 text-[#A855F7] border border-violet-500/60 font-semibold'
                  : 'text-[#64748B] hover:text-[#F1F5F9]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search nodes or IPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 px-3 py-1 rounded-lg bg-[#070D20] border border-[#202D50] text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* TOPOLOGY CANVAS WITH INSPECTOR DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <div className="lg:col-span-8 flex flex-col">
          <NetworkTopologyPanel
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNodeId={selectedNode?.id || null}
            selectedEdgeId={selectedEdge?.id || null}
            onSelectNode={onSelectNode}
            onSelectEdge={onSelectEdge}
          />
        </div>

        {/* SIDE INSPECTOR PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {selectedNode ? (
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] space-y-3">
              <div className="flex items-center justify-between border-b border-[#202D50] pb-2">
                <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#22D3EE]" />
                  <span>Node Inspector</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-300">
                  {selectedNode.type}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Device Name</span>
                  <span className="text-[#F1F5F9] font-bold text-sm">{selectedNode.name}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">IP Address</span>
                  <span className="text-[#22D3EE] font-bold">{selectedNode.ip}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Zone</span>
                  <span className="text-[#A855F7]">{selectedNode.zone}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Status</span>
                  <span className={selectedNode.isSuspicious ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {selectedNode.isSuspicious ? 'FLAGGED ON SHADOW ROUTE' : 'NORMAL / SECURED'}
                  </span>
                </div>
                {selectedNode.os && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Platform OS</span>
                    <span className="text-slate-300">{selectedNode.os}</span>
                  </div>
                )}
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] space-y-3">
              <div className="flex items-center justify-between border-b border-[#202D50] pb-2">
                <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#A855F7]" />
                  <span>Route Inspector</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                  selectedEdge.isSuspicious ? 'bg-rose-900/60 text-rose-200' : 'bg-emerald-900/60 text-emerald-200'
                }`}>
                  {selectedEdge.isSuspicious ? 'SUSPICIOUS' : 'AUTHORIZED'}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Source ➔ Target</span>
                  <span className="text-[#F1F5F9] font-bold">{selectedEdge.source} ➔ {selectedEdge.target}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Protocol / Port</span>
                  <span className="text-[#22D3EE]">{selectedEdge.protocol || 'TCP'}:{selectedEdge.port || '5432'}</span>
                </div>
                {selectedEdge.pathLabel && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Path Label</span>
                    <span className="text-amber-300">{selectedEdge.pathLabel}</span>
                  </div>
                )}
                {selectedEdge.reason && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Policy Impact</span>
                    <span className="text-rose-300 text-[11px]">{selectedEdge.reason}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] text-center py-10 space-y-2">
              <Eye className="w-6 h-6 text-[#64748B] mx-auto" />
              <div className="text-xs font-mono text-[#94A3B8]">
                Select any node or connection link on the graph to inspect interface telemetry and rules.
              </div>
            </div>
          )}

          {/* QUICK TOPOLOGY SUMMARY */}
          <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-2 text-xs font-mono">
            <div className="text-[#94A3B8] font-bold text-[10px] uppercase">Topology Telemetry</div>
            <div className="flex justify-between text-slate-300">
              <span>Total Nodes:</span>
              <span className="font-bold text-[#F1F5F9]">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Interconnections:</span>
              <span className="font-bold text-[#F1F5F9]">{edges.length}</span>
            </div>
            <div className="flex justify-between text-rose-300">
              <span>Suspicious Shadow Paths:</span>
              <span className="font-bold">{suspiciousCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
