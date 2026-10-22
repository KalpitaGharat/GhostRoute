import React from 'react';
import {
  X,
  AlertTriangle,
  Sparkles,
  Lock
} from 'lucide-react';
import type { TopologyEdge } from '../types';

interface EdgeDetailModalProps {
  edge: TopologyEdge | null;
  onClose: () => void;
  onRemediateEdge?: (edgeId: string) => void;
  onOpenInvestigation?: () => void;
}

export const EdgeDetailModal: React.FC<EdgeDetailModalProps> = ({
  edge,
  onClose,
  onRemediateEdge,
  onOpenInvestigation,
}) => {
  if (!edge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050817]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div
          className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            edge.isSuspicious ? 'bg-[#FF365D]' : 'bg-[#22D3EE]'
          }`}
        />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[#202D50]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                edge.isSuspicious
                  ? 'bg-rose-950/80 border-rose-500/40 text-[#FF365D]'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-[#22D3EE]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F1F5F9] font-sans">
                  {edge.isSuspicious ? 'Suspicious Trust Path Flagged' : 'Authorized Connection Path'}
                </h3>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                Path: <span className="text-[#22D3EE] font-bold">{edge.source}</span> ➔ <span className="text-[#A855F7] font-bold">{edge.target}</span>
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

        {/* Body */}
        <div className="my-4 space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#070D20] border border-[#202D50] flex items-center justify-between">
            <span className="text-[#64748B]">Protocol / Port</span>
            <span className="text-[#F1F5F9] font-bold">{edge.protocol} {edge.port && `(Port ${edge.port})`}</span>
          </div>

          {edge.isSuspicious ? (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
              <div className="text-[#FF365D] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Security Policy Breach Detected</span>
              </div>
              <p className="text-[#FDA4AF] leading-relaxed text-[11px] font-sans">
                {edge.reason}
              </p>
              <div className="text-[10px] text-[#94A3B8] pt-1.5 border-t border-rose-500/20">
                {edge.policyViolation}
              </div>
              <div className="pt-2 border-t border-rose-500/20 text-[10px] text-[#F59E0B] flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Direct production modification disabled. Run simulation & verification first.</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-[#94A3B8]">
              This is an authorized, policy-verified trust route with active mTLS certificate negotiation.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#202D50] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#101B35] hover:bg-[#202D50] text-[#F1F5F9] text-xs font-mono transition-colors cursor-pointer"
          >
            Close
          </button>
          {edge.isSuspicious && (
            <>
              {onOpenInvestigation && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenInvestigation();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(124,58,237,0.4)] cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Investigate & Verify
                </button>
              )}
              <button
                onClick={() => {
                  onRemediateEdge?.(edge.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-mono transition-all cursor-pointer"
                title="Simulate severing this path in the local browser canvas"
              >
                Simulate Sever (In-Memory)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
