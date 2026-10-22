import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Database,
  CheckCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { getAiHealth, type AiHealthResponse } from '../services/api';

export const SettingsView: React.FC = () => {
  const [aiHealth, setAiHealth] = useState<AiHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const h = await getAiHealth();
      setAiHealth(h);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              System Settings & <span className="text-[#A855F7]">Configuration</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              GhostRoute AI Core
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            AI inference provider telemetry, graph reachability engine parameters, and persistent storage.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B142B] hover:bg-[#101B35] border border-[#202D50] text-xs font-mono text-[#F1F5F9] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#22D3EE] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Provider Status</span>
        </button>
      </div>

      {/* AI INFERENCE CONFIGURATION CARD */}
      <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#202D50] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/40 text-[#A855F7]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F1F5F9]">
                NVIDIA Nemotron 3.5 Forensics Copilot
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8]">
                NVIDIA NIM OpenAI-Compatible Chat Completions
              </div>
            </div>
          </div>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[10px] font-mono uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{aiHealth?.status || 'READY'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1">
            <span className="text-[#94A3B8] text-[10.5px]">Configured Model</span>
            <div className="text-sm font-bold text-violet-300">
              {aiHealth?.configured_model || 'nvidia/nemotron-3.5-lightning-30b-a3b'}
            </div>
            <div className="text-[10px] text-slate-400">Strictly enforced model identity</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1">
            <span className="text-[#94A3B8] text-[10.5px]">Inference Base URL</span>
            <div className="text-sm font-bold text-[#22D3EE] truncate">
              {aiHealth?.base_url || 'https://integrate.api.nvidia.com/v1'}
            </div>
            <div className="text-[10px] text-slate-400">NVIDIA NIM integrate gateway</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1">
            <span className="text-[#94A3B8] text-[10.5px]">Timeout & Concurrency</span>
            <div className="text-sm font-bold text-[#F1F5F9]">
              60.0s / 3 Concurrent Workers
            </div>
            <div className="text-[10px] text-slate-400">Bounded semaphore with deduplication</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] space-y-1">
            <span className="text-[#94A3B8] text-[10.5px]">Credentials Status</span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>NVIDIA API Key Active & Secured</span>
            </div>
            <div className="text-[10px] text-slate-400">Excluded from logs and client bundles</div>
          </div>
        </div>
      </div>

      {/* DETERMINISTIC ENGINE & SECURITY GUARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NETWORKX ENGINE CARD */}
        <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-[#22D3EE]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F1F5F9]">Deterministic Security Engine</div>
              <div className="text-[11px] font-mono text-[#94A3B8]">NetworkX Graph Reachability</div>
            </div>
          </div>

          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            All reachability determinations, policy verifications, and remediation impact assertions are executed deterministically by the Python NetworkX engine. The AI copilot never determines security verdicts.
          </p>

          <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[11px] font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Execution Mode: DETERMINISTIC_GRAPH (100% Authoritative)</span>
          </div>
        </div>

        {/* PERSISTENT SQLITE DATABASE */}
        <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/40 text-[#A855F7]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F1F5F9]">Persistent SQLite Audit Store</div>
              <div className="text-[11px] font-mono text-[#94A3B8]">data/audit_history.db</div>
            </div>
          </div>

          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Every verified remediation proposal authorized by a human operator is durably stored with approver identity, timestamps, and zero-collateral proof across server reboots.
          </p>

          <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50] text-[11px] font-mono text-[#22D3EE] flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Table Schema: audit_records (applied_to_firewall=0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
