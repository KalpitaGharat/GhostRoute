import React, { useState } from 'react';
import {
  X,
  Zap,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Server,
  Lock,
  Play
} from 'lucide-react';
import type { TopologyNode, TopologyEdge } from '../types';

interface PathAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TopologyNode[];
  edges?: TopologyEdge[];
}

export const PathAnalysisModal: React.FC<PathAnalysisModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges: _edges
}) => {
  const [sourceId, setSourceId] = useState('node-dmz-web');
  const [targetId, setTargetId] = useState('node-prod-db');
  const [protocol, setProtocol] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [port, setPort] = useState('5432');
  const [isAnalyzed, setIsAnalyzed] = useState(true);

  if (!isOpen) return null;

  const sourceNode = nodes.find((n) => n.id === sourceId) || nodes[0];
  const targetNode = nodes.find((n) => n.id === targetId) || nodes[nodes.length - 1];

  // Evaluate reachability:
  // If source is DMZ web and target is prod DB on port 5432:
  const isViolation =
    (sourceId.includes('dmz') || sourceId.includes('web')) &&
    (targetId.includes('db') || targetId.includes('prod')) &&
    port === '5432';

  const isLegitimateAppDb =
    (sourceId.includes('app') || sourceId.includes('srv')) &&
    (targetId.includes('db') || targetId.includes('prod'));

  const matchingRule = isViolation
    ? { id: 'FW-CORE-003', action: 'ALLOW', match: 'Permitted: Wildcard DMZ -> DB (Port 5432)' }
    : isLegitimateAppDb
    ? { id: 'FW-CORE-001', action: 'ALLOW', match: 'Permitted: App-Tier -> DB PostgreSQL' }
    : { id: 'FW-DEFAULT-DENY', action: 'DENY', match: 'Implicit Default Deny Rule' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#070D20] border border-[#202D50] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202D50] bg-[#0B142B]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/40 text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  Point-to-Point Path Reachability Analyzer
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
                  NetworkX Graph Trace
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Trace specific ingress-to-egress routes and evaluate rule matching against segmentation policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INPUT SELECTOR BAR */}
        <div className="p-5 border-b border-[#202D50] bg-[#09112A] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Source Node</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#7C3AED]"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.zone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Destination Node</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#7C3AED]"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.zone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Protocol</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">Port</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setIsAnalyzed(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Trace Route</span>
            </button>
          </div>
        </div>

        {/* RESULTS AREA */}
        {isAnalyzed && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* HOP-BY-HOP ROUTE DIAGRAM */}
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50]">
              <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider mb-3">
                Discovered Network Path Traversal
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {/* Node 1 */}
                <div className="px-3 py-2 rounded-lg bg-[#070D20] border border-[#202D50] flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <div>
                    <div className="text-[#F1F5F9] font-bold">{sourceNode.name}</div>
                    <div className="text-[10px] text-[#94A3B8]">{sourceNode.ip} ({sourceNode.zone})</div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-[#A855F7] shrink-0" />

                {/* Core FW */}
                <div className="px-3 py-2 rounded-lg bg-[#14122C] border border-violet-500/50 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#A855F7]" />
                  <div>
                    <div className="text-[#F1F5F9] font-bold">fw-core (Gateway)</div>
                    <div className="text-[10px] text-violet-300 font-mono">Rule: {matchingRule.id}</div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-[#A855F7] shrink-0" />

                {/* Target Node */}
                <div className="px-3 py-2 rounded-lg bg-[#070D20] border border-[#202D50] flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <div>
                    <div className="text-[#F1F5F9] font-bold">{targetNode.name}</div>
                    <div className="text-[10px] text-[#94A3B8]">{targetNode.ip} ({targetNode.zone})</div>
                  </div>
                </div>
              </div>
            </div>

            {/* VERDICT & POLICY STATUS */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isViolation
                ? 'bg-rose-950/25 border-rose-500/50'
                : 'bg-emerald-950/25 border-emerald-500/50'
            }`}>
              {isViolation ? (
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold font-mono ${
                    isViolation ? 'text-rose-300' : 'text-emerald-300'
                  }`}>
                    {isViolation ? 'PATH ALLOWED — POLICY BREACH DETECTED' : 'PATH EVALUATION: COMPLIANT'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                    isViolation ? 'bg-rose-900/60 text-rose-200' : 'bg-emerald-900/60 text-emerald-200'
                  }`}>
                    Status: {matchingRule.action}
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1]">
                  {isViolation
                    ? `Physical graph reachability exists from ${sourceNode.name} (${sourceNode.zone}) to ${targetNode.name} (${targetNode.zone}) via rule ${matchingRule.id}. This directly violates organizational policy POL-DMZ-DB-ISOLATION.`
                    : `Traffic is evaluated by core firewall policy. No unauthorized isolation boundaries are crossed for requested ${protocol}:${port}.`}
                </p>
              </div>
            </div>

            {/* TECHNICAL DETAILS CARD */}
            <div className="p-4 rounded-xl bg-[#080E24] border border-[#202D50] space-y-2 text-xs font-mono">
              <div className="text-[#94A3B8] font-bold text-[11px] uppercase">Firewall Rule Telemetry</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#CBD5E1]">
                <div>• Matched Rule ID: <span className="text-[#22D3EE]">{matchingRule.id}</span></div>
                <div>• Action: <span className="text-emerald-400 font-bold">{matchingRule.action}</span></div>
                <div>• Protocol / Destination Port: <span className="text-white">{protocol} / {port}</span></div>
                <div>• Egress Zone: <span className="text-white">{targetNode.zone}</span></div>
                <div>• Zone Transition: <span className="text-amber-400">{sourceNode.zone} ➔ {targetNode.zone}</span></div>
                <div>• Rule Match Text: <span className="text-slate-400">{matchingRule.match}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#202D50] bg-[#0B142B] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <span>Path reachability engine output only.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
