import React, { useId } from 'react';
import { Shield, AlertTriangle, Database, Wrench } from 'lucide-react';

interface KPISparklineProps {
  data: number[];
  color: 'violet' | 'red' | 'blue' | 'amber';
  height?: number;
  width?: number;
}

function getCurvedPath(pts: { x: number; y: number }[], height: number): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Prevent curve overshoot beyond vertical bounds
    cp1y = Math.max(2, Math.min(height - 2, cp1y));
    cp2y = Math.max(2, Math.min(height - 2, cp2y));

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

const KPISparkline: React.FC<KPISparklineProps> = ({
  data,
  color,
  height = 36,
  width = 96,
}) => {
  const reactId = useId().replace(/:/g, '');
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padLeft = 3;
  const padRight = 6;
  const padTop = 4;
  const padBottom = 4;

  const pts = data.map((val, idx) => {
    const x = padLeft + (idx / (data.length - 1)) * (width - padLeft - padRight);
    const y = height - padBottom - ((val - min) / range) * (height - padTop - padBottom);
    return { x, y };
  });

  const strokeColor =
    color === 'red'
      ? '#FF365D'
      : color === 'blue'
      ? '#3B82F6'
      : color === 'amber'
      ? '#F59E0B'
      : '#A855F7';

  const gradientId = `kpi-grad-${color}-${reactId}`;
  const curvePath = getCurvedPath(pts, height);
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaPath = `${curvePath} L ${lastPt.x.toFixed(1)},${height} L ${firstPt.x.toFixed(1)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.32} />
          <stop offset="80%" stopColor={strokeColor} stopOpacity={0.04} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Soft gradient fill under curve */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Smooth Catmull-Rom Bezier stroke */}
      <path
        d={curvePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing live beacon dot at latest point */}
      <circle
        cx={lastPt.x.toFixed(1)}
        cy={lastPt.y.toFixed(1)}
        r="5.5"
        fill={strokeColor}
        fillOpacity="0.25"
        className="animate-pulse"
      />
      <circle
        cx={lastPt.x.toFixed(1)}
        cy={lastPt.y.toFixed(1)}
        r="2.5"
        fill={strokeColor}
      />
    </svg>
  );
};

export const KPICards: React.FC<{
  onCardClick?: (cardId: string) => void;
}> = ({ onCardClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Network Risk Index */}
      <div
        onClick={() => onCardClick?.('risk-index')}
        className="p-4 rounded-xl bg-gradient-to-b from-[#101B35] to-[#0B142B] border border-[#202D50] hover:border-[#7C3AED]/50 transition-all shadow-md cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94A3B8]">
            Network Risk Index
          </span>
          <div className="p-1.5 rounded-lg bg-violet-950/60 border border-violet-500/30 text-[#A855F7]">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between mt-1">
          <div>
            <div className="text-3xl font-extrabold text-[#F1F5F9] font-mono tracking-tight flex items-baseline gap-1.5">
              <span>72</span>
              <span className="text-xs font-normal text-[#64748B]">/ 100</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono mt-1.5">
              <span className="text-[#FF365D] font-bold">+12%</span>
              <span className="text-[#64748B]">vs last scan</span>
            </div>
          </div>

          <KPISparkline data={[58, 60, 63, 62, 66, 69, 72]} color="violet" />
        </div>
      </div>

      {/* Card 2: Ghost Routes Detected */}
      <div
        onClick={() => onCardClick?.('ghost-routes')}
        className="p-4 rounded-xl bg-gradient-to-b from-[#101B35] to-[#0B142B] border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-md cursor-pointer group flex flex-col justify-between glow-red-subtle"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94A3B8]">
            Ghost Routes Detected
          </span>
          <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[#FF365D]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between mt-1">
          <div>
            <div className="text-3xl font-extrabold text-[#FF365D] font-mono tracking-tight flex items-baseline gap-2">
              <span>2</span>
              <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-[#FF365D] border border-rose-500/30 font-bold">
                +1 new
              </span>
            </div>
            <div className="text-xs font-mono text-[#94A3B8] mt-1.5">
              Unintended trust paths
            </div>
          </div>

          <KPISparkline data={[1.0, 1.0, 1.1, 1.2, 1.4, 1.7, 2.0]} color="red" />
        </div>
      </div>

      {/* Card 3: Monitored Nodes */}
      <div
        onClick={() => onCardClick?.('monitored-nodes')}
        className="p-4 rounded-xl bg-gradient-to-b from-[#101B35] to-[#0B142B] border border-[#202D50] hover:border-blue-500/40 transition-all shadow-md cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94A3B8]">
            Monitored Nodes
          </span>
          <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/30 text-[#3B82F6]">
            <Database className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between mt-1">
          <div>
            <div className="text-3xl font-extrabold text-[#F1F5F9] font-mono tracking-tight">
              18
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono mt-1.5">
              <span className="text-emerald-400 font-bold">▲ 2 zones</span>
            </div>
          </div>

          <KPISparkline data={[14.8, 15.2, 15.8, 16.3, 17.0, 17.5, 18.0]} color="blue" />
        </div>
      </div>

      {/* Card 4: Open Remediations */}
      <div
        onClick={() => onCardClick?.('open-remediations')}
        className="p-4 rounded-xl bg-gradient-to-b from-[#101B35] to-[#0B142B] border border-[#202D50] hover:border-[#7C3AED]/50 transition-all shadow-md cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94A3B8]">
            Open Remediations
          </span>
          <div className="p-1.5 rounded-lg bg-violet-950/60 border border-violet-500/30 text-[#A855F7]">
            <Wrench className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between mt-1">
          <div>
            <div className="text-3xl font-extrabold text-[#F1F5F9] font-mono tracking-tight">
              5
            </div>
            <div className="text-xs font-mono text-[#A855F7] mt-1.5 font-semibold">
              Require attention
            </div>
          </div>

          <KPISparkline data={[6.4, 6.9, 6.6, 6.1, 5.7, 5.3, 5.0]} color="violet" />
        </div>
      </div>
    </div>
  );
};

