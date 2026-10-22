import React, { useState } from 'react';
import {
  Tag,
  Crosshair,
  AlertTriangle,
  ArrowRight,
  Shield,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { IncidentItem } from '../types';

interface ThreatIntelligenceViewProps {
  incidents?: IncidentItem[];
  onOpenInvestigation: () => void;
}

export const ThreatIntelligenceView: React.FC<ThreatIntelligenceViewProps> = ({
  incidents: _incidents,
  onOpenInvestigation
}) => {
  const [selectedThreatId, setSelectedThreatId] = useState('threat-1');

  const threats = [
    {
      id: 'threat-1',
      title: 'DMZ-to-Database Isolation Breach (Ghost Route)',
      severity: 'CRITICAL',
      findingId: 'FINDING-POL-DMZ-DB-ISOLATION-1',
      source: 'dmz-web-01 (10.0.1.10)',
      target: 'db-prod-01 (10.0.3.10)',
      port: 'TCP:5432 (PostgreSQL)',
      via: 'fw-core [Rule: FW-CORE-003]',
      policy: 'POL-DMZ-DB-ISOLATION',
      mitre: ['T1566.001 - Web Services', 'T1021.001 - Remote Services', 'T1046 - Network Service Scanning'],
      blastRadius: 'Direct database exfiltration; unauthenticated database socket exposure from DMZ zone.',
      confidence: 0.92,
      recommendation: 'Disable rule FW-CORE-003 on fw-core to restore least-privilege boundary.'
    },
    {
      id: 'threat-2',
      title: 'Unauthenticated Administrative Jump Route',
      severity: 'HIGH',
      findingId: 'FINDING-AUD-MGMT-002',
      source: 'jumpbox-admin (10.0.2.99)',
      target: 'fw-edge (10.0.0.1)',
      port: 'TCP:22 (SSH)',
      via: 'Direct management subnet',
      policy: 'POL-MGMT-MFA-ENFORCE',
      mitre: ['T1078.004 - Valid Cloud Accounts', 'T1021.004 - SSH Lateral Move'],
      blastRadius: 'Administrative credential stuffing risk across perimeter firewalls.',
      confidence: 0.88,
      recommendation: 'Enforce mTLS and MFA bastion gateway requirements for all SSH ingress.'
    }
  ];

  const activeThreat = threats.find((t) => t.id === selectedThreatId) || threats[0];

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Threat Intelligence & <span className="text-[#A855F7]">Forensics</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              NVIDIA Nemotron 3.5 Copilot
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Active threat vectors, MITRE ATT&CK technique mapping, and AI-driven attack path hypothesis.
          </p>
        </div>

        <button
          onClick={onOpenInvestigation}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white text-xs font-semibold shadow-[0_0_20px_-3px_rgba(124,58,237,0.5)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>Launch AI Forensics Copilot</span>
        </button>
      </div>

      {/* MAIN THREAT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: ACTIVE FINDINGS LIST */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono text-[#94A3B8] uppercase font-bold px-1">
            Active Security Findings ({threats.length})
          </div>

          {threats.map((t) => {
            const isSelected = t.id === selectedThreatId;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedThreatId(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121A38] border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.25)]'
                    : 'bg-[#0B142B] border-[#202D50] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    t.severity === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                  }`}>
                    {t.severity}
                  </span>
                  <span className="text-[10.5px] font-mono text-[#22D3EE]">{t.findingId}</span>
                </div>

                <div className="text-xs font-bold text-[#F1F5F9] mb-1">{t.title}</div>

                <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5 truncate">
                  <span>{t.source}</span>
                  <ArrowRight className="w-3 h-3 text-[#A855F7] shrink-0" />
                  <span>{t.target}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: DEEP THREAT INTELLIGENCE DOSSIER */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-4">
            {/* DOSSIER HEADER */}
            <div className="flex items-start justify-between gap-3 border-b border-[#202D50] pb-3.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                    Threat Dossier
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 text-[#A855F7] border border-violet-800/60">
                    Confidence: {(activeThreat.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-[#F1F5F9] font-sans">
                  {activeThreat.title}
                </h2>
              </div>

              <button
                onClick={onOpenInvestigation}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/50 text-xs font-mono text-[#A855F7] transition-colors cursor-pointer shrink-0"
              >
                <span>Investigate</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* ATTACK PATH DETAIL */}
            <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold">
                Pivot Path Traversal
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-200">
                <span className="px-2 py-1 rounded bg-[#0B142B] border border-[#202D50] text-[#22D3EE]">
                  {activeThreat.source}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#A855F7]" />
                <span className="px-2 py-1 rounded bg-violet-950/60 border border-violet-600/40 text-violet-200">
                  {activeThreat.via}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#A855F7]" />
                <span className="px-2 py-1 rounded bg-[#0B142B] border border-[#202D50] text-rose-300 font-bold">
                  {activeThreat.target}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] mt-1">
                Protocol: <strong className="text-white">{activeThreat.port}</strong> | Policy Breached: <strong className="text-rose-400">{activeThreat.policy}</strong>
              </div>
            </div>

            {/* MITRE ATT&CK TECHNIQUES */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Mapped MITRE ATT&CK Techniques</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeThreat.mitre.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5"
                  >
                    <Tag className="w-3 h-3 text-[#A855F7]" />
                    <span>{tech}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* BLAST RADIUS & IMPACT */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-1">
              <div className="text-[11px] font-mono text-rose-300 font-bold uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Exposure Blast Radius</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {activeThreat.blastRadius}
              </p>
            </div>

            {/* DEFENSIVE ACTION */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-1">
              <div className="text-[11px] font-mono text-emerald-300 font-bold uppercase flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recommended Defensive Action</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {activeThreat.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
