import React from 'react';
import {
  FileText,
  ShieldCheck,
  Award,
  ExternalLink
} from 'lucide-react';
import type { TopologyNode, TopologyEdge } from '../types';

interface ReportsViewProps {
  nodes?: TopologyNode[];
  edges?: TopologyEdge[];
  onOpenReportModal: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  nodes: _nodes,
  edges: _edges,
  onOpenReportModal
}) => {
  const complianceStandards = [
    {
      framework: 'Zero Trust Architecture (NIST SP 800-207)',
      status: 'NON-COMPLIANT',
      score: 74,
      issues: 'Direct DMZ-to-Database bypass violates implicit trust boundary denial principle.',
      remediation: 'Apply proposed firewall fix PROP-FIX-DMZ-1 to sever shadow rule.'
    },
    {
      framework: 'PCI-DSS v4.0 Requirement 1 (Network Security Controls)',
      status: 'NEEDS_REMEDIATION',
      score: 68,
      issues: 'Cardholder/production data environment exposed to DMZ tier on PostgreSQL port 5432.',
      remediation: 'Disable rule FW-CORE-003 and enforce stateful inspection on fw-core.'
    },
    {
      framework: 'CIS Controls v8 (Boundary Defense & Network Segmentation)',
      status: 'COMPLIANT_WITH_EXCEPTIONS',
      score: 82,
      issues: 'Core segmentation configured; shadow route remediation pending authorization.',
      remediation: 'Verify and approve least-privilege proposal in governance pipeline.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Audit & <span className="text-[#A855F7]">Compliance Reports</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              SecOps Assessment
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Automated compliance scorecards, NIST/PCI-DSS audit benchmarks, and executive summaries.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white text-xs font-semibold shadow-[0_0_20px_-3px_rgba(124,58,237,0.5)] transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Generate Executive Report</span>
        </button>
      </div>

      {/* COMPLIANCE SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {complianceStandards.map((std) => (
          <div
            key={std.framework}
            className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Award className="w-4 h-4 text-[#A855F7]" />
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  std.status === 'NON-COMPLIANT'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                }`}>
                  {std.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 className="text-xs font-bold text-[#F1F5F9] font-sans leading-snug">
                {std.framework}
              </h3>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                {std.issues}
              </p>
            </div>

            <div className="pt-3 border-t border-[#202D50] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[#22D3EE]">
                <span>Compliance Score:</span>
                <span className="font-bold">{std.score} / 100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                  style={{ width: `${std.score}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Action: {std.remediation}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED EXECUTIVE AUDIT BRIEFING CARD */}
      <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#F1F5F9] font-sans">
            Executive Forensics Briefing
          </div>
          <span className="text-[11px] font-mono text-[#22D3EE]">
            Certified by NetworkX Deterministic Engine
          </span>
        </div>

        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          GhostRoute AI verified that the production database cluster (<code className="text-[#22D3EE]">db-prod-01</code>) has an unmonitored ingress bridge originating from the public-facing DMZ tier (<code className="text-[#22D3EE]">dmz-web-01</code>). The communication crosses boundary firewall <code className="text-[#A855F7]">fw-core</code> over TCP:5432 due to rule <code className="text-rose-400">FW-CORE-003</code>.
        </p>

        <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Deterministic fix simulation verified: 0 collateral regressions</span>
          </div>
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/50 text-[#A855F7] hover:text-white transition-colors cursor-pointer"
          >
            <span>Preview & Download Full Report</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
