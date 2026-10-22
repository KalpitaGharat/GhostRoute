import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import type { IncidentItem } from '../types';

interface RecentIncidentsPanelProps {
  incidents: IncidentItem[];
  onSelectIncident: (incident: IncidentItem) => void;
  onExplainWithAI: () => void;
  onViewAllIncidents: () => void;
}

export const RecentIncidentsPanel: React.FC<RecentIncidentsPanelProps> = ({
  incidents,
  onSelectIncident,
  onExplainWithAI,
  onViewAllIncidents
}) => {
  return (
    <div className="flex flex-col justify-between gap-3.5 h-full">
      {/* 1. RECENT INCIDENTS CARD */}
      <div className="flex-1 p-4 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-xl flex flex-col justify-between">
        {/* Header with Title and "View All" link */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202D50]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-[#FF365D]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#F1F5F9] font-sans tracking-tight">
              Recent Incidents
            </h3>
          </div>
          <button
            onClick={onViewAllIncidents}
            className="text-xs font-mono text-[#A855F7] hover:text-[#C084FC] hover:underline cursor-pointer transition-colors"
          >
            View All
          </button>
        </div>

        {/* 4 Incident Rows */}
        <div className="space-y-2.5 my-3">
          {incidents.map((inc) => {
            const isCritical = inc.severity === 'Critical';
            const isHigh = inc.severity === 'High';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 rounded-lg transition-all cursor-pointer group ${
                  inc.isHighlighted
                    ? 'bg-[#101B35] border border-rose-500/40 shadow-[0_0_12px_-2px_rgba(255,54,93,0.25)]'
                    : 'bg-[#070D20]/75 hover:bg-[#101B35] border border-[#202D50]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isCritical ? (
                      <AlertOctagon className="w-4 h-4 text-[#FF365D] shrink-0" />
                    ) : isHigh ? (
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />
                    )}
                    <span
                      className={`text-[10.5px] font-mono font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'text-[#FF365D]'
                          : isHigh
                          ? 'text-[#F59E0B]'
                          : 'text-[#3B82F6]'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-[#64748B] text-xs">•</span>
                    <span className="text-xs text-[#F1F5F9] font-medium group-hover:text-white truncate font-sans">
                      {inc.title}
                    </span>
                  </div>

                  <span className="text-[10.5px] font-mono text-[#64748B] shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {inc.timeAgo}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] pl-6">
                  <span className="text-[#22D3EE] font-semibold">{inc.path}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#F1F5F9] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs font-mono text-[#64748B] text-center pt-2 border-t border-[#202D50]">
          Total active anomalous incidents: <strong className="text-[#FF365D]">2</strong>
        </div>
      </div>

      {/* 2. AI FORENSICS COPILOT PANEL */}
      <div className="p-4 rounded-xl bg-gradient-to-b from-[#101B35] via-[#0B142B] to-[#070D20] border border-[#7C3AED]/40 shadow-xl relative overflow-hidden">
        {/* Subtle violet radial glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#7C3AED]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Model Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1F5F9] font-mono">
            <Sparkles className="w-4 h-4 text-[#A855F7] animate-pulse" />
            <span>NVIDIA Nemotron 3.5 Copilot</span>
          </div>
          <span className="flex items-center gap-1 text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NIM LIVE</span>
          </span>
        </div>

        {/* Model ID tag */}
        <div className="text-[10px] font-mono text-[#A855F7] mb-2.5 truncate">
          Model: <span className="text-violet-300 font-semibold">nvidia/nemotron-3.5-lightning-30b-a3b</span>
        </div>

        {/* Forensic synthesis quote */}
        <p className="text-xs text-[#CBD5E1] leading-relaxed font-sans mb-3 bg-[#070D20]/70 p-2.5 rounded-lg border border-[#202D50]">
          “Critical cross-tier bypass detected: <strong className="text-[#22D3EE]">dmz-web-01</strong> reaches production database <strong className="text-[#22D3EE]">db-prod-01</strong> over TCP:5432 via rule <strong className="text-rose-400">FW-CORE-003</strong>, violating boundary isolation.”
        </p>

        {/* Threat tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-600/40 text-rose-300 font-semibold">
            POL-DMZ-DB-ISOLATION
          </span>
          <span className="px-2 py-0.5 rounded bg-violet-950/70 border border-violet-600/40 text-[#A855F7]">
            Confidence: 92%
          </span>
        </div>

        {/* Button */}
        <button
          onClick={onExplainWithAI}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white text-xs font-bold shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all cursor-pointer group"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform" />
          <span>Explain with Nemotron AI</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
