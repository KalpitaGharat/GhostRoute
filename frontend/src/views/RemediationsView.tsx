import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Lock,
  Clock,
  UserCheck,
  RefreshCw,
  FileCode
} from 'lucide-react';
import { getAuditHistory, type AuditRecord } from '../services/api';

interface RemediationsViewProps {
  onOpenInvestigation?: () => void;
}

export const RemediationsView: React.FC<RemediationsViewProps> = ({ onOpenInvestigation: _onOpenInvestigation }) => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditRecords = async () => {
    setIsLoading(true);
    try {
      const records = await getAuditHistory(20);
      setAuditRecords(records);
    } catch {
      // Fallback if backend offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditRecords();
  }, []);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Remediation & <span className="text-[#A855F7]">Governance</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              5-State Safety Lifecycle
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Simulation-verified firewall rule modifications and immutable SQLite human authorization logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditRecords}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B142B] hover:bg-[#101B35] border border-[#202D50] text-xs font-mono text-[#F1F5F9] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#22D3EE] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit History</span>
          </button>
        </div>
      </div>

      {/* 5-STAGE REMEDIATION LIFECYCLE TRACKER */}
      <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] space-y-3">
        <div className="text-[10px] font-mono text-[#94A3B8] uppercase font-bold tracking-wider">
          GhostRoute AI Remediation Lifecycle Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#070D20] border border-emerald-500/40 text-emerald-400 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span>Stage 1</span>
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white">PROPOSED</div>
            <div className="text-[10px] text-[#94A3B8]">Least-privilege rule spec drafted</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D20] border border-emerald-500/40 text-emerald-400 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span>Stage 2</span>
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white">SIMULATED</div>
            <div className="text-[10px] text-[#94A3B8]">NetworkX deep copy mutated</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D20] border border-emerald-500/40 text-emerald-400 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span>Stage 3</span>
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white">VERIFIED</div>
            <div className="text-[10px] text-emerald-400 font-bold">Independent Verdict: PASS</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070D20] border border-violet-500/60 text-[#A855F7] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span>Stage 4</span>
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-white">APPROVED</div>
            <div className="text-[10px] text-[#94A3B8]">Human SecOps sign-off stored</div>
          </div>

          <div className="p-3 rounded-lg bg-[#140B1D] border border-slate-700 text-slate-400 space-y-1 opacity-80">
            <div className="flex items-center justify-between text-[10px]">
              <span>Stage 5</span>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="font-bold text-slate-300">APPLIED</div>
            <div className="text-[10px] text-rose-400">Locked (Simulation Mode)</div>
          </div>
        </div>
      </div>

      {/* ACTIVE REMEDIATION PROPOSAL CARD */}
      <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#202D50] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/40 text-[#A855F7]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F1F5F9]">
                Active Proposal: Disable Wildcard Core Firewall Rule (FW-CORE-003)
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8]">
                Device: <strong className="text-white">fw-core</strong> | Operation: <strong className="text-rose-400">DISABLE_RULE</strong>
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[10px] font-mono uppercase font-bold">
            Verified & Authorized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#070D20] border border-[#202D50]">
            <span className="text-[#94A3B8] block text-[10px]">Violation Resolution</span>
            <span className="text-emerald-400 font-bold">100% Shadow Path Severed</span>
            <span className="text-[10px] text-[#94A3B8] block mt-1">dmz-web-01 ➔ db-prod-01 isolated</span>
          </div>

          <div className="p-3 rounded-xl bg-[#070D20] border border-[#202D50]">
            <span className="text-[#94A3B8] block text-[10px]">Legitimate Traffic Preserved</span>
            <span className="text-emerald-400 font-bold">All 3 Business Routes Intact</span>
            <span className="text-[10px] text-[#94A3B8] block mt-1">app-srv-01 ➔ db-prod-01 active</span>
          </div>

          <div className="p-3 rounded-xl bg-[#070D20] border border-[#202D50]">
            <span className="text-[#94A3B8] block text-[10px]">Collateral Violations</span>
            <span className="text-emerald-400 font-bold">0 New Violations</span>
            <span className="text-[10px] text-[#94A3B8] block mt-1">Independent reachability verified</span>
          </div>
        </div>

        {/* FIREWALL PROTECTION WARNING BANNER */}
        <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/40 flex items-start gap-3 text-xs">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 font-sans">
            <span className="font-bold text-amber-300">
              Hardware Execution Safeguard Active (HTTP 403 Forbidden)
            </span>
            <p className="text-[#CBD5E1] text-[11.5px]">
              GhostRoute AI strictly operates in simulation-first mode. Physical firewall modifications are blocked from automated web execution to prevent production network disruptions without an enterprise orchestrator.
            </p>
          </div>
        </div>
      </div>

      {/* SQLITE PERSISTENT AUDIT TRAIL TABLE */}
      <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-sm font-bold text-[#F1F5F9]">
              Persistent SQLite Audit Trail (data/audit_history.db)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8]">
            {auditRecords.length} Persisted Approvals
          </span>
        </div>

        {auditRecords.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#070D20] border border-[#202D50] text-center text-xs font-mono text-[#94A3B8]">
            {isLoading ? 'Loading durable audit history from SQLite...' : 'No audit records in database yet. Authorize a remediation proposal in the AI modal to generate a record.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#202D50]">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-[#070D20] text-[#94A3B8] font-mono border-b border-[#202D50]">
                  <th className="py-2.5 px-4 font-semibold">Audit ID</th>
                  <th className="py-2.5 px-4 font-semibold">Proposal ID</th>
                  <th className="py-2.5 px-4 font-semibold">Target Rule</th>
                  <th className="py-2.5 px-4 font-semibold">Approver Identity</th>
                  <th className="py-2.5 px-4 font-semibold">Verdict</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Physical Firewall</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202D50]/60 font-mono text-[11px]">
                {auditRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#0E1733] transition-colors">
                    <td className="py-2.5 px-4 font-bold text-[#22D3EE]">#{rec.id}</td>
                    <td className="py-2.5 px-4 text-[#F1F5F9]">{rec.proposal_id}</td>
                    <td className="py-2.5 px-4 text-violet-300">{rec.target_rule_id || 'N/A'}</td>
                    <td className="py-2.5 px-4 text-slate-200">{rec.approver}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-emerald-400 font-bold">{rec.verification_verdict}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-violet-950 text-[#A855F7] border border-violet-800">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-rose-400">
                      {rec.applied_to_firewall ? 'True' : 'False (Protected)'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#94A3B8]">
                      {rec.timestamp ? rec.timestamp.slice(0, 19).replace('T', ' ') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
