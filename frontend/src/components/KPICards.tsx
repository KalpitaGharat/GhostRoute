import React, { useId, useState, useRef } from 'react';
import { Shield, AlertTriangle, Database, Wrench, Activity, Radio, Cpu, Sparkles } from 'lucide-react';

interface CrazyKPIGraphProps {
  data: number[];
  color: 'violet' | 'red' | 'cyan' | 'amber';
  height?: number;
  width?: number;
  unit?: string;
  badgeText?: string;
}

// Converts data points into smooth Catmull-Rom cubic bezier SVG path
function getCurvedPath(pts: { x: number; y: number }[], height: number): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    cp1y = Math.max(3, Math.min(height - 3, cp1y));
    cp2y = Math.max(3, Math.min(height - 3, cp2y));

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export const CrazyKPIGraph: React.FC<CrazyKPIGraphProps> = ({
  data,
  color,
  height = 54,
  width = 150,
  unit = '',
  badgeText,
}) => {
  const reactId = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padLeft = 4;
  const padRight = 8;
  const padTop = 6;
  const padBottom = 6;

  const pts = data.map((val, idx) => {
    const x = padLeft + (idx / (data.length - 1)) * (width - padLeft - padRight);
    const y = height - padBottom - ((val - min) / range) * (height - padTop - padBottom);
    return { x, y, val };
  });

  // Secondary offset harmonic wave points for dual-wave cyber depth
  const harmonicPts = pts.map((p, idx) => {
    const offset = Math.sin((idx / (pts.length - 1)) * Math.PI * 2) * 4;
    return {
      x: p.x,
      y: Math.max(3, Math.min(height - 3, p.y + offset + (color === 'red' ? 3 : -2))),
    };
  });

  const theme = {
    violet: {
      primary: '#C084FC',
      secondary: '#9333EA',
      glow: '#A855F7',
      bgGrad: 'rgba(168, 85, 247, 0.35)',
      radarGrad: 'rgba(192, 132, 252, 0.15)',
      laser: '#E879F9',
    },
    red: {
      primary: '#FF2E5B',
      secondary: '#E11D48',
      glow: '#FF0055',
      bgGrad: 'rgba(255, 46, 91, 0.42)',
      radarGrad: 'rgba(255, 0, 85, 0.18)',
      laser: '#FF6B8B',
    },
    cyan: {
      primary: '#00F0FF',
      secondary: '#0284C7',
      glow: '#38BDF8',
      bgGrad: 'rgba(0, 240, 255, 0.35)',
      radarGrad: 'rgba(56, 189, 248, 0.15)',
      laser: '#7DD3FC',
    },
    amber: {
      primary: '#F59E0B',
      secondary: '#D97706',
      glow: '#FBBF24',
      bgGrad: 'rgba(245, 158, 11, 0.35)',
      radarGrad: 'rgba(251, 191, 36, 0.15)',
      laser: '#FCD34D',
    },
  }[color];

  const curvePath = getCurvedPath(pts, height);
  const harmonicPath = getCurvedPath(harmonicPts, height);
  const firstPt = pts[0];
  const lastPt = pts[pts.length - 1];
  const areaPath = `${curvePath} L ${lastPt.x.toFixed(1)},${height} L ${firstPt.x.toFixed(1)},${height} Z`;

  // Compute equalizer background bar columns
  const barCount = 14;
  const barSpacing = (width - 12) / barCount;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const x = 6 + i * barSpacing;
    const progress = i / (barCount - 1);
    const dataIdx = progress * (data.length - 1);
    const low = Math.floor(dataIdx);
    const high = Math.min(data.length - 1, Math.ceil(dataIdx));
    const factor = dataIdx - low;
    const interpVal = data[low] * (1 - factor) + data[high] * factor;
    const barNorm = (interpVal - min) / range;
    const barH = Math.max(4, barNorm * (height - 14));
    return { x, y: height - barH - 2, h: barH };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    let closestIdx = 0;
    let closestDist = Infinity;
    pts.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setHoverIdx(closestIdx);
  };

  const activePt = hoverIdx !== null ? pts[hoverIdx] : lastPt;

  return (
    <div className="relative group/graph select-none">
      {/* Top micro HUD bar */}
      <div className="flex items-center justify-between text-[9px] font-mono tracking-wider mb-1 px-0.5 text-slate-400">
        <span className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: theme.primary }}
          />
          <span style={{ color: theme.primary }} className="font-semibold">
            {badgeText || 'LIVE_OSC'}
          </span>
        </span>
        <span className="text-[8.5px] text-slate-400 font-mono">
          {hoverIdx !== null ? `${activePt.val}${unit}` : `PEAK ${max}${unit}`}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible cursor-crosshair drop-shadow-md"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {/* Neon laser line glow filter */}
          <filter id={`neon-glow-${reactId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Area under curve gradient */}
          <linearGradient id={`area-grad-${reactId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity={0.45} />
            <stop offset="45%" stopColor={theme.secondary} stopOpacity={0.18} />
            <stop offset="90%" stopColor={theme.glow} stopOpacity={0.04} />
            <stop offset="100%" stopColor="#0B132B" stopOpacity={0.0} />
          </linearGradient>

          {/* Laser stroke gradient */}
          <linearGradient id={`stroke-grad-${reactId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.secondary} />
            <stop offset="70%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.laser} />
          </linearGradient>

          {/* Laser scan line gradient */}
          <linearGradient id={`scan-grad-${reactId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.primary} stopOpacity={0} />
            <stop offset="50%" stopColor={theme.primary} stopOpacity={0.7} />
            <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
          </linearGradient>

          {/* Cyber bar pattern */}
          <pattern id={`cyber-dots-${reactId}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill={theme.primary} fillOpacity="0.12" />
          </pattern>
        </defs>

        {/* 1. Subtle horizontal HUD telemetry gridlines */}
        <line
          x1={padLeft}
          y1={height * 0.28}
          x2={width - padRight}
          y2={height * 0.28}
          stroke="#1E293B"
          strokeDasharray="2 3"
          strokeWidth="0.8"
        />
        <line
          x1={padLeft}
          y1={height * 0.65}
          x2={width - padRight}
          y2={height * 0.65}
          stroke="#1E293B"
          strokeDasharray="2 3"
          strokeWidth="0.8"
        />

        {/* 2. Cyber dot matrix background */}
        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={height - padTop - padBottom}
          fill={`url(#cyber-dots-${reactId})`}
        />

        {/* 3. Equalizer frequency histogram bars under the wave */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={bar.y}
            width={barSpacing * 0.55}
            height={bar.h}
            rx="1"
            fill={theme.primary}
            fillOpacity={hoverIdx !== null && Math.abs(pts[hoverIdx]?.x - bar.x) < 14 ? 0.35 : 0.08}
            className="transition-all duration-150"
          />
        ))}

        {/* 4. Soft vibrant gradient area fill under the main curve */}
        <path d={areaPath} fill={`url(#area-grad-${reactId})`} />

        {/* 5. Harmonic Ghost Wave (out-of-phase secondary frequency) */}
        <path
          d={harmonicPath}
          fill="none"
          stroke={theme.secondary}
          strokeWidth="1.2"
          strokeDasharray="3 3"
          strokeOpacity="0.38"
          strokeLinecap="round"
        />

        {/* 6. Primary High-Intensity Neon Waveform */}
        <path
          d={curvePath}
          fill="none"
          stroke={`url(#stroke-grad-${reactId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#neon-glow-${reactId})`}
        />

        {/* 7. Animated scanning laser sweep bar across chart */}
        <line
          x1={activePt.x}
          y1={padTop}
          x2={activePt.x}
          y2={height - padBottom}
          stroke={theme.primary}
          strokeWidth="1.2"
          strokeDasharray="2 2"
          strokeOpacity="0.75"
        />

        {/* 8. Data coordinate ticks along the path */}
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x.toFixed(1)}
            cy={pt.y.toFixed(1)}
            r={i === hoverIdx ? 3.5 : 1.6}
            fill={i === hoverIdx ? '#FFFFFF' : theme.primary}
            fillOpacity={i === hoverIdx ? 1 : 0.5}
            stroke={theme.glow}
            strokeWidth={i === hoverIdx ? 1.5 : 0}
            className="transition-all duration-100"
          />
        ))}

        {/* 9. Beacon dot with double expanding radar shockwave rings on active point */}
        <circle
          cx={activePt.x.toFixed(1)}
          cy={activePt.y.toFixed(1)}
          r="8"
          fill={theme.primary}
          fillOpacity="0.18"
          className="animate-ping"
        />
        <circle
          cx={activePt.x.toFixed(1)}
          cy={activePt.y.toFixed(1)}
          r="5"
          fill={theme.primary}
          fillOpacity="0.35"
        />
        <circle
          cx={activePt.x.toFixed(1)}
          cy={activePt.y.toFixed(1)}
          r="2.8"
          fill="#FFFFFF"
          stroke={theme.primary}
          strokeWidth="1.5"
        />

        {/* 10. Cyber Crosshair readout badge on hover */}
        {hoverIdx !== null && (
          <g>
            <rect
              x={Math.max(2, Math.min(width - 44, activePt.x - 22))}
              y={Math.max(2, activePt.y - 18)}
              width="44"
              height="14"
              rx="3"
              fill="#0F172A"
              stroke={theme.primary}
              strokeWidth="0.9"
              fillOpacity="0.92"
            />
            <text
              x={Math.max(2, Math.min(width - 44, activePt.x - 22)) + 22}
              y={Math.max(2, activePt.y - 18) + 10}
              fill="#F8FAFC"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {activePt.val}
              {unit}
            </text>
          </g>
        )}
      </svg>

      {/* Cyberpunk corner bracket accents on the graph */}
      <div
        className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b border-l opacity-60 pointer-events-none"
        style={{ borderColor: theme.primary }}
      />
      <div
        className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b border-r opacity-60 pointer-events-none"
        style={{ borderColor: theme.primary }}
      />
    </div>
  );
};

export const KPICards: React.FC<{
  onCardClick?: (cardId: string) => void;
}> = ({ onCardClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ─────────────────────────────────────────────────────────────
          CARD 1: Network Risk Index (Violet / Magenta)
      ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => onCardClick?.('risk-index')}
        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-b from-[#111A35]/90 via-[#0B142B]/95 to-[#070D1E] border border-[#23335A] hover:border-violet-500/60 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between hover:shadow-violet-950/40 hover:-translate-y-0.5"
      >
        {/* Top edge glowing laser bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-75 group-hover:opacity-100 group-hover:h-[2.5px] transition-all" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              Network Risk Index
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-violet-950/80 border border-violet-500/40 text-violet-400 group-hover:text-violet-300 group-hover:scale-105 transition-all shadow-sm shadow-violet-900/50">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        {/* Metric and Graph Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:text-violet-200 transition-colors">
                72
              </span>
              <span className="text-xs font-mono font-medium text-slate-400">/ 100</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-500/40 text-rose-400 text-[11px] font-mono font-bold">
              <Activity className="w-3 h-3 text-rose-400" />
              <span>+12%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 -mt-1.5">
            <span>vs last scan</span>
            <span className="text-[10px] text-violet-400 font-semibold flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-violet-400" />
              ELEVATED
            </span>
          </div>

          {/* Crazy Visual Waveform */}
          <div className="pt-1.5 border-t border-slate-800/80">
            <CrazyKPIGraph
              data={[54, 58, 62, 59, 64, 68, 72]}
              color="violet"
              height={52}
              width={160}
              unit=" pts"
              badgeText="THREAT_INDEX"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CARD 2: Ghost Routes Detected (Radiant Crimson / Neon Red)
      ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => onCardClick?.('ghost-routes')}
        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-b from-[#181125]/90 via-[#130B1C]/95 to-[#0D0514] border border-rose-500/40 hover:border-rose-500/80 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between hover:shadow-rose-950/50 hover:-translate-y-0.5"
      >
        {/* Top edge glowing laser bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#FF2E5B] to-transparent opacity-90 group-hover:opacity-100 group-hover:h-[3px] transition-all shadow-[0_0_12px_#FF2E5B]" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              Ghost Routes Detected
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-[#FF2E5B] group-hover:scale-105 transition-all shadow-sm shadow-rose-900/60 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Metric and Graph Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#FF2E5B] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,46,91,0.5)]">
                2
              </span>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-[#FF2E5B] border border-rose-500/50 font-bold tracking-wide">
                +1 new
              </span>
            </div>
            <div className="text-[10px] font-mono text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              CRITICAL
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 -mt-1.5 flex items-center justify-between">
            <span>Unintended trust paths</span>
            <span className="text-[10px] text-rose-400/90 font-mono">DMZ ➔ DB</span>
          </div>

          {/* Crazy Visual Waveform */}
          <div className="pt-1.5 border-t border-rose-950/50">
            <CrazyKPIGraph
              data={[0.8, 1.0, 1.1, 1.2, 1.5, 1.8, 2.0]}
              color="red"
              height={52}
              width={160}
              unit=" paths"
              badgeText="BREACH_VECTOR"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CARD 3: Monitored Nodes (Quantum Cyan / Sky Blue)
      ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => onCardClick?.('monitored-nodes')}
        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-b from-[#0F1E38]/90 via-[#0A162D]/95 to-[#060D1E] border border-[#1E3A66] hover:border-sky-400/60 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between hover:shadow-sky-950/40 hover:-translate-y-0.5"
      >
        {/* Top edge glowing laser bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-75 group-hover:opacity-100 group-hover:h-[2.5px] transition-all" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              Monitored Nodes
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-400/40 text-[#00F0FF] group-hover:text-sky-300 group-hover:scale-105 transition-all shadow-sm shadow-sky-900/50">
            <Database className="w-4 h-4" />
          </div>
        </div>

        {/* Metric and Graph Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:text-sky-200 transition-colors">
              18
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-bold">
              <span>▲ 2 zones</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 -mt-1.5">
            <span>5 zones active</span>
            <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-sky-400" />
              100% HEALTHY
            </span>
          </div>

          {/* Crazy Visual Waveform */}
          <div className="pt-1.5 border-t border-slate-800/80">
            <CrazyKPIGraph
              data={[14, 15, 15, 16, 17, 17, 18]}
              color="cyan"
              height={52}
              width={160}
              unit=" nodes"
              badgeText="TOPOLOGY_SYNC"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CARD 4: Open Remediations (Electric Gold / Amber)
      ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => onCardClick?.('open-remediations')}
        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-b from-[#1C1811]/90 via-[#141009]/95 to-[#0B0904] border border-amber-500/40 hover:border-amber-400/70 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between hover:shadow-amber-950/40 hover:-translate-y-0.5"
      >
        {/* Top edge glowing laser bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-75 group-hover:opacity-100 group-hover:h-[2.5px] transition-all" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              Open Remediations
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-[#F59E0B] group-hover:text-amber-300 group-hover:scale-105 transition-all shadow-sm shadow-amber-900/50">
            <Wrench className="w-4 h-4" />
          </div>
        </div>

        {/* Metric and Graph Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:text-amber-200 transition-colors">
              5
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/40 text-amber-400 text-[11px] font-mono font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Require attention</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 -mt-1.5">
            <span>1 auto-simulated</span>
            <span className="text-[10px] text-amber-400 font-semibold">
              FW-CORE-003
            </span>
          </div>

          {/* Crazy Visual Waveform */}
          <div className="pt-1.5 border-t border-slate-800/80">
            <CrazyKPIGraph
              data={[7, 7, 6, 6, 5, 5, 5]}
              color="amber"
              height={52}
              width={160}
              unit=" pending"
              badgeText="ACTION_QUEUE"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
