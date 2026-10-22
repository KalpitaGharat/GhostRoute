import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Wrench,
  Play,
  RotateCw
} from 'lucide-react';
import type { Node, Edge } from '../types';

interface NodeInspectorModalProps {
  node: Node | null;
  edges: Edge[];
  onClose: () => void;
  onRemediateGhostRoute?: (nodeId: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  edges,
  onClose,
  onRemediateGhostRoute
}) => {
  const [simulationState, setSimulationState] = useState<'idle' | 'simulating' | 'verified'>('idle');

  if (!node) return null;

  // Connected edges
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  const ghostRoutes = connectedEdges.filter((e) => e.isGhostRoute);

  const handleSimulateFix = () => {
    setSimulationState('simulating');
    setTimeout(() => {
      setSimulationState('verified');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 overflow-hidden">
        {/* Glow ambient background based on node threat */}
        <div
          className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            node.threatLevel === 'Critical' ? 'bg-rose-500' : 'bg-cyan-500'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                node.threatLevel === 'Critical'
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-400'
                  : 'bg-cyan-950/50 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">{node.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    node.threatLevel === 'Critical'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : node.threatLevel === 'High'
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  Threat: {node.threatLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Asset ID: <span className="text-slate-300 font-bold">{node.id}</span> | Security Zone: <span className="text-cyan-400 font-semibold">{node.zone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Asset Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">IP Address</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{node.ip}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Subnet CIDR</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{node.cidr || 'N/A'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">mTLS SPIFFE</div>
            <div className="text-sm font-bold font-mono mt-0.5 flex items-center gap-1.5">
              {node.mTLS ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-400">Enforced</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Disabled</span>
                </>
              )}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Active Sessions</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{node.activeSessions || 0}</div>
          </div>
        </div>

        {/* Ghost Route Alert Warning Box */}
        {ghostRoutes.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Flagged Ghost Routes ({ghostRoutes.length})</span>
            </div>
            {ghostRoutes.map((gr) => (
              <div key={gr.id} className="text-xs font-mono text-slate-200 bg-rose-950/60 p-2.5 rounded-lg border border-rose-500/30">
                <div className="text-rose-300 font-bold">{gr.reason}</div>
                <div className="text-[11px] text-slate-400 mt-1">{gr.policyViolation}</div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-rose-500/20 text-[11px]">
                  <span className="text-slate-400">Throughput: {gr.trafficRate}</span>
                  <span className="text-rose-400 font-bold">Risk Score: {gr.riskScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connected Edges & Paths List */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider mb-2">
            Connected Topology Edges ({connectedEdges.length})
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {connectedEdges.map((edge) => (
              <div
                key={edge.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  edge.isGhostRoute
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">{edge.source}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-200 font-bold">{edge.target}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-400">{edge.protocol}</span>
                  <span className="text-cyan-400">{edge.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation & Remediate Actions Bar */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div>
            {simulationState === 'simulating' && (
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 animate-pulse">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Simulating in-memory fix with Nemotron...
              </span>
            )}
            {simulationState === 'verified' && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Verified: Ghost route severed without breaking legitimate traffic
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateFix}
              disabled={simulationState === 'simulating'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Fix</span>
            </button>
            <button
              onClick={() => {
                onRemediateGhostRoute?.(node.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Isolate & Remediate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
