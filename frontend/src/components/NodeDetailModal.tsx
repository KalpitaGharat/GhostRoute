import React from 'react';
import {
  X,
  Server,
  Database,
  Globe,
  Shield,
  Layers,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import type { TopologyNode, TopologyEdge, NodeType } from '../types';

interface NodeDetailModalProps {
  node: TopologyNode | null;
  edges: TopologyEdge[];
  onClose: () => void;
  onRemediateNode?: (nodeId: string) => void;
}

const RenderIcon: React.FC<{ type: NodeType; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  if (type === 'internet') return <Globe className={className} />;
  if (type === 'firewall') return <Shield className={className} />;
  if (type === 'database') return <Database className={className} />;
  if (type === 'app') return <Layers className={className} />;
  if (type === 'host') return <Terminal className={className} />;
  return <Server className={className} />;
};

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  edges,
  onClose,
  onRemediateNode
}) => {
  if (!node) return null;

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  const ghostRoutes = connectedEdges.filter((e) => e.isSuspicious);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050817]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div
          className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            node.isSuspicious ? 'bg-[#FF365D]' : 'bg-[#7C3AED]'
          }`}
        />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[#202D50]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                node.isSuspicious
                  ? 'bg-rose-950/80 border-rose-500/40 text-[#FF365D]'
                  : 'bg-violet-950/80 border-violet-500/40 text-[#A855F7]'
              }`}
            >
              <RenderIcon type={node.type} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F1F5F9] font-sans">
                  {node.name}
                </h3>
                <span
                  className={`text-[9px] font-mono px-2 py-0.2 rounded-full border font-bold ${
                    node.isSuspicious
                      ? 'bg-rose-950 text-[#FF365D] border-rose-500/40'
                      : 'bg-blue-950 text-[#3B82F6] border-blue-500/40'
                  }`}
                >
                  Zone: {node.zone}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                IP: <span className="text-[#22D3EE] font-bold">{node.ip}</span> • ID: {node.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-2.5 my-4 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50]">
            <div className="text-[9px] text-[#64748B] uppercase">OS / Engine</div>
            <div className="text-[#F1F5F9] font-medium truncate mt-0.5">{node.os || 'Linux'}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50]">
            <div className="text-[9px] text-[#64748B] uppercase">Active Sessions</div>
            <div className="text-[#F1F5F9] font-bold mt-0.5">{node.activeSessions || 1}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50]">
            <div className="text-[9px] text-[#64748B] uppercase">Connected Paths</div>
            <div className="text-[#F1F5F9] font-bold mt-0.5">{connectedEdges.length}</div>
          </div>
        </div>

        {/* Suspicious Ghost Route Warnings */}
        {ghostRoutes.length > 0 && (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 mb-3 space-y-1.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#FF365D] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flagged Suspicious Route Participant</span>
            </div>
            {ghostRoutes.map((gr) => (
              <div key={gr.id} className="text-[11px] text-[#94A3B8] bg-[#070D20] p-2 rounded border border-rose-500/20">
                <span className="text-[#FF365D] font-bold">{gr.pathLabel}</span>: {gr.reason}
              </div>
            ))}
          </div>
        )}

        {/* Connected Edges */}
        <div className="space-y-1.5 mb-4">
          <div className="text-[10px] uppercase font-mono text-[#64748B] font-bold">
            Connected Topology Connections ({connectedEdges.length})
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-xs pr-1">
            {connectedEdges.map((e) => (
              <div
                key={e.id}
                className={`p-2 rounded-lg flex items-center justify-between border ${
                  e.isSuspicious
                    ? 'bg-rose-950/20 border-rose-500/30 text-[#FDA4AF]'
                    : 'bg-[#070D20] border-[#202D50] text-[#94A3B8]'
                }`}
              >
                <span>{e.source} ➔ {e.target}</span>
                <span className="text-[10px] text-[#22D3EE]">{e.protocol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#202D50] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#101B35] hover:bg-[#202D50] text-[#F1F5F9] text-xs font-mono transition-colors cursor-pointer"
          >
            Close
          </button>
          {node.isSuspicious && (
            <button
              onClick={() => {
                onRemediateNode?.(node.id);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#FF365D] hover:bg-[#E11D48] text-white text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(255,54,93,0.4)] cursor-pointer"
            >
              Isolate Suspicious Node
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
