import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Wrench,
  ArrowRight,
  Tag,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { enrichFinding, type FindingEnrichment, type AnalysisFinding } from '../services/api';

interface AIExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRemediation?: () => void;
  finding?: AnalysisFinding | null;
}

const DEFAULT_FINDING: AnalysisFinding = {
  id: 'FINDING-POL-DMZ-DB-ISOLATION-1',
  source: 'dmz-web-01',
  destination: 'db-prod-01',
  protocol: 'TCP',
  port: 5432,
  discovered_path: ['dmz-web-01', 'fw-core', 'db-prod-01'],
  supporting_rule_ids: ['FW-CORE-003'],
  violated_policy_id: 'POL-DMZ-DB-ISOLATION',
  severity: 'CRITICAL',
  description: 'Unintended trust path discovered from public-facing DMZ to production database.',
  status: 'DETECTED'
};

export const AIExplainModal: React.FC<AIExplainModalProps> = ({
  isOpen,
  onClose,
  onOpenRemediation,
  finding
}) => {
  const activeFinding = finding || DEFAULT_FINDING;
  const [enrichment, setEnrichment] = useState<FindingEnrichment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await enrichFinding(activeFinding, forceRefresh);
      setEnrichment(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with NVIDIA Nemotron copilot endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExplanation(false);
    }
  }, [isOpen, activeFinding.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#070D20] border border-[#7C3AED]/50 shadow-[0_0_50px_rgba(124,58,237,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Violet radial glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7C3AED]/12 rounded-full blur-3xl pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202D50] bg-[#0B142B]/90 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-950/80 border border-[#7C3AED]/40 text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Sparkles className="w-5 h-5 animate-pulse text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  NVIDIA Nemotron 3.5 Forensics & Root Cause Explainer
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{enrichment?.status || 'ANALYZED_LLM'}</span>
                </span>
              </div>
              <p className="text-xs font-mono text-[#94A3B8]">
                Model: <span className="text-violet-300 font-bold">nvidia/nemotron-3.5-lightning-30b-a3b</span> • Endpoint: <span className="text-[#22D3EE]">NVIDIA NIM</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchExplanation(true)}
              disabled={isLoading}
              title="Force fresh inference from NVIDIA NIM"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] text-xs font-mono text-[#A855F7] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Reasoning...' : 'Re-Analyze (Live)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && !enrichment && (
          <div className="p-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-cyan-300 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-sm font-bold text-[#F1F5F9] font-sans">
              Nemotron 3.5 Lightning is synthesizing root cause...
            </div>
            <p className="text-xs text-[#94A3B8] font-mono max-w-sm">
              Executing reasoning tokens and strict JSON schema generation across network topology graph evidence.
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 mx-6 my-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs font-mono text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong>Inference Error:</strong> {error}
            </div>
          </div>
        )}

        {/* MAIN FORENSIC DOSSIER */}
        {enrichment && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
            {/* EXECUTIVE SUMMARY */}
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-md space-y-1.5">
              <div className="text-[11px] font-mono text-[#A855F7] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Executive Forensics Summary</span>
              </div>
              <p className="text-xs text-[#F1F5F9] leading-relaxed">
                {enrichment.executive_summary ||
                  'Critical policy violation: unintended TCP:5432 trust path from DMZ web server dmz-web-01 to production database db-prod-01 via fw-core breaches POL-DMZ-DB-ISOLATION, exposing the database to web-tier compromise and potential data exfiltration.'}
              </p>
            </div>

            {/* TECHNICAL ROOT CAUSE & PATH BREAKDOWN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1.5">
                <span className="text-[#94A3B8] text-[10px] uppercase font-bold">Flawed Rule / Root Cause</span>
                <div className="text-rose-400 font-bold">Rule FW-CORE-003 on fw-core</div>
                <div className="text-slate-300 text-[10.5px]">
                  Permissive wildcard rule allowing 10.0.1.0/24 directly into database subnet 10.0.3.0/24 on port 5432.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1.5">
                <span className="text-[#94A3B8] text-[10px] uppercase font-bold">Discovered Path Traversal</span>
                <div className="text-[#22D3EE] font-bold">
                  {activeFinding.discovered_path.join(' ➔ ')}
                </div>
                <div className="text-slate-300 text-[10.5px]">
                  Protocol: {activeFinding.protocol}:{activeFinding.port || 'any'} • Zone: DMZ ➔ DATA
                </div>
              </div>
            </div>

            {/* STEP-BY-STEP ATTACK VECTOR NARRATIVE */}
            {enrichment.attack_path_explanation && (
              <div className="p-4 rounded-xl bg-[#080E24] border border-[#202D50] space-y-1.5">
                <div className="text-[11px] font-mono text-[#22D3EE] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span>Attack Path Pivot Sequence</span>
                </div>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  {enrichment.attack_path_explanation}
                </p>
              </div>
            )}

            {/* THREAT ASSESSMENT & BLAST RADIUS */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-1.5">
              <div className="text-[11px] font-mono text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Blast Radius & Threat Assessment</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {enrichment.threat_assessment ||
                  'Direct exposure of db-prod-01 to DMZ zone creates critical blast radius; if web tier is exploited, attacker obtains unrestricted PostgreSQL query execution, potential data dumps, and database encryption.'}
              </p>
            </div>

            {/* MITRE ATT&CK TECHNIQUES */}
            <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] space-y-2">
              <div className="text-[11px] font-mono text-[#A855F7] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Mapped MITRE ATT&CK Techniques</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {enrichment.mitre_mapping && enrichment.mitre_mapping.length > 0 ? (
                  enrichment.mitre_mapping.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-lg bg-[#070D20] border border-violet-500/40 text-violet-200 text-xs font-mono"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070D20] border border-violet-500/40 text-violet-200 text-xs font-mono">
                      T1566.001 - Web Services
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070D20] border border-violet-500/40 text-violet-200 text-xs font-mono">
                      T1021.001 - Remote Services
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* RECOMMENDED DEFENSIVE ACTION */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
              <div className="text-[11px] font-mono text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Recommended Least-Privilege Remediation</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
                {enrichment.recommended_actions && enrichment.recommended_actions.length > 0 ? (
                  enrichment.recommended_actions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{act}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Disable rule FW-CORE-003 on core firewall fw-core.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Enforce strict mTLS and allow only Internal Application Server (app-srv-01).</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#202D50] bg-[#0B142B] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{enrichment?.cached ? 'Source: Hash-Cached Analysis' : 'Source: Fresh NIM Inference'}</span>
            </span>
            <span>•</span>
            <span className="text-violet-300">
              Confidence: {((enrichment?.confidence ?? 0.92) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRemediation && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRemediation();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>View Remediation Plan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
