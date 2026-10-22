import React from 'react';
import {
  X,
  Wrench,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileCode
} from 'lucide-react';

interface RemediationPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullWorkflow?: () => void;
}

export const RemediationPlanModal: React.FC<RemediationPlanModalProps> = ({
  isOpen,
  onClose,
  onOpenFullWorkflow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#070D20] border border-[#202D50] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202D50] bg-[#0B142B]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  Least-Privilege Remediation Specification
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-[#F59E0B] border border-amber-800/60 uppercase">
                  Proposal: PROP-FIX-DMZ-1
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Deterministic firewall rule patch designed to isolate unauthorized trust paths
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

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          {/* TARGET SPECIFICATION CARD */}
          <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] space-y-3">
            <div className="text-[11px] font-mono text-[#A855F7] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              <span>Target Rule Specification</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11.5px]">
              <div className="p-2 rounded bg-[#070D20] border border-[#202D50]">
                <span className="text-[#94A3B8] block text-[10px]">Target Device</span>
                <span className="text-[#F1F5F9] font-bold">fw-core</span>
              </div>
              <div className="p-2 rounded bg-[#070D20] border border-[#202D50]">
                <span className="text-[#94A3B8] block text-[10px]">Rule ID</span>
                <span className="text-[#22D3EE] font-bold">FW-CORE-003</span>
              </div>
              <div className="p-2 rounded bg-[#070D20] border border-[#202D50]">
                <span className="text-[#94A3B8] block text-[10px]">Operation</span>
                <span className="text-rose-400 font-bold">DISABLE_RULE</span>
              </div>
              <div className="p-2 rounded bg-[#070D20] border border-[#202D50]">
                <span className="text-[#94A3B8] block text-[10px]">Impact</span>
                <span className="text-emerald-400 font-bold">Zero Production Loss</span>
              </div>
            </div>
          </div>

          {/* BEFORE / AFTER DIFF */}
          <div className="p-4 rounded-xl bg-[#080E24] border border-[#202D50] space-y-2 font-mono">
            <div className="text-[11px] text-[#94A3B8] font-bold uppercase">Configuration Diff</div>
            <div className="p-3 rounded-lg bg-[#050817] border border-slate-800 text-[11.5px] space-y-1">
              <div className="text-rose-400">
                - rule FW-CORE-003: from 10.0.1.0/24 to 10.0.3.10 port 5432 action ALLOW [ACTIVE]
              </div>
              <div className="text-emerald-400">
                + rule FW-CORE-003: [DISABLED by GhostRoute Remediation Engine]
              </div>
              <div className="text-slate-400">
                &nbsp;&nbsp;rule FW-CORE-001: from 10.0.2.20 to 10.0.3.10 port 5432 action ALLOW [UNCHANGED]
              </div>
            </div>
          </div>

          {/* SIMULATION VERDICT */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold font-mono text-emerald-300">
                Deterministic Simulation Verdict: PASS
              </div>
              <p className="text-[11.5px] text-[#CBD5E1]">
                NetworkX verification confirmed that disabling rule FW-CORE-003 resolves the POL-DMZ-DB-ISOLATION violation with 100% precision. Legitimate application tier connections (app-srv-01 ➔ db-prod-01) and administrative jump box routes remain fully functional.
              </p>
            </div>
          </div>

          {/* SIMULATION-ONLY SAFETY NOTICE */}
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/40 flex items-center gap-2.5 text-[11px] font-mono text-violet-200">
            <Lock className="w-4 h-4 text-[#A855F7] shrink-0" />
            <span>
              Simulation-First Architecture: Physical firewall modifications require authorized enterprise deployment orchestrator approval.
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#202D50] bg-[#0B142B] flex items-center justify-between text-xs font-mono">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Plan
          </button>
          {onOpenFullWorkflow && (
            <button
              onClick={() => {
                onClose();
                onOpenFullWorkflow();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
            >
              <span>Open AI Investigation Workflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
