import React from 'react';
import { AlertOctagon, Flame, Lock, ArrowUpRight, TrendingUp, ShieldCheck } from 'lucide-react';
import type { RiskMetrics } from '../types';

interface RiskCardsProps {
  metrics: RiskMetrics;
  onCardClick?: (cardId: string) => void;
}

// Mini SVG sparkline helper with gradient fill and smooth path
const MiniSparkline: React.FC<{
  data: number[];
  color: 'crimson' | 'amber' | 'cyan';
  height?: number;
}> = ({ data, color, height = 36 }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 110;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor =
    color === 'crimson' ? '#ef4444' : color === 'amber' ? '#f59e0b' : '#06b6d4';
  const fillGradientId = `grad-${color}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={strokeColor}
            stopOpacity={color === 'crimson' ? 0.45 : 0.35}
          />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${fillGradientId})`}
      />
      {/* Sparkline curve */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Glowing current pulse dot at the last point */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="3"
          fill={strokeColor}
          className="animate-ping"
          style={{ transformOrigin: 'center' }}
        />
      )}
    </svg>
  );
};

export const RiskCards: React.FC<RiskCardsProps> = ({ metrics, onCardClick }) => {
  return (
    <div className="flex flex-col gap-3.5 h-full justify-between">
      {/* CARD 1: Threat Score: 78 (Large bold font), multi-color status bar (crimson critical indicator at 78%), telemetry sparkline mini-chart on right */}
      <div
        onClick={() => onCardClick?.('threat-score')}
        className="group relative p-4 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-300 shadow-lg cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Composite Risk Index
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
            <TrendingUp className="w-3 h-3" />
            CRITICAL
          </span>
        </div>

        <div className="flex items-end justify-between my-1">
          <div>
            <div className="text-xs text-slate-400 font-mono mb-0.5">Threat Score:</div>
            <div className="text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
              <span>{metrics.threatScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
              <span className="text-xs font-mono text-rose-400 flex items-center font-semibold">
                +{metrics.threatDelta}%
              </span>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <MiniSparkline data={metrics.threatSparkline} color="crimson" />
          </div>
        </div>

        {/* Multi-color status bar (crimson critical indicator at 78%) */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>Safe (0-40)</span>
            <span>Guarded (41-70)</span>
            <span className="text-rose-400 font-bold">Breach (71-100)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative flex">
            {/* Safe segment */}
            <div className="w-[40%] bg-emerald-500/80 h-full" />
            {/* Guarded segment */}
            <div className="w-[30%] bg-amber-500/80 h-full" />
            {/* Crimson critical indicator */}
            <div className="w-[30%] bg-rose-500 h-full shadow-[0_0_8px_#f43f5e]" />
            {/* Current marker pinpoint */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#ffffff] transition-all duration-500"
              style={{ left: `${Math.min(100, Math.max(0, metrics.threatScore))}%` }}
            />
          </div>
        </div>
      </div>

      {/* CARD 2: Active Anomalies: 14, red-shaded glowing gradient card background, telemetry sparkline depicting anomalous route spikes */}
      <div
        onClick={() => onCardClick?.('active-anomalies')}
        className="group relative p-4 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border border-rose-500/40 hover:border-rose-500/70 shadow-[0_0_25px_-5px_rgba(239,68,68,0.25)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        {/* Subtle glowing ambient aura */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-rose-200 uppercase tracking-wider font-mono">
              Ghost Route Anomalies
            </span>
          </div>
          <span className="text-[11px] font-mono text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 font-bold">
            <ArrowUpRight className="w-3 h-3 text-rose-400" />
            +{metrics.anomaliesDelta} new
          </span>
        </div>

        <div className="flex items-end justify-between my-1">
          <div>
            <div className="text-xs text-rose-300/80 font-mono mb-0.5">Active Anomalies:</div>
            <div className="text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
              <span className="text-rose-100">{metrics.activeAnomalies}</span>
              <span className="text-xs text-rose-300/70 font-mono">detected routes</span>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <MiniSparkline data={metrics.anomaliesSparkline} color="crimson" />
          </div>
        </div>

        <div className="mt-2 text-[11px] text-rose-300/80 font-mono flex items-center justify-between pt-1 border-t border-rose-500/20">
          <span>Unintended trust hops</span>
          <span className="text-rose-400 font-semibold">2 lateral vectors</span>
        </div>
      </div>

      {/* CARD 3: Encrypted Nodes: 432, cyan accent glowing card background, telemetry sparkline with active mTLS coverage indicator */}
      <div
        onClick={() => onCardClick?.('encrypted-nodes')}
        className="group relative p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-950 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_25px_-5px_rgba(6,182,212,0.2)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        {/* Cyan glowing ambient aura */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wider font-mono">
              Cryptographic Mesh Health
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            {metrics.mTLSCoveragePercentage}% mTLS
          </span>
        </div>

        <div className="flex items-end justify-between my-1">
          <div>
            <div className="text-xs text-cyan-300/80 font-mono mb-0.5">Encrypted Nodes:</div>
            <div className="text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
              <span className="text-cyan-100">{metrics.encryptedNodes}</span>
              <span className="text-xs text-slate-400 font-mono">/ {metrics.totalNodes} total</span>
            </div>
          </div>
          <div className="shrink-0 pl-2">
            <MiniSparkline data={metrics.encryptedSparkline} color="cyan" />
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-cyan-500/20">
          <span>SPIFFE/SPIRE mTLS</span>
          <span className="text-cyan-400 font-semibold">18 non-mTLS nodes quarantined</span>
        </div>
      </div>
    </div>
  );
};
