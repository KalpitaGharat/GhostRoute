import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Zap,
  Server,
  Database,
  Layers,
  Terminal,
  FileText,
  Search,
  Wrench
} from 'lucide-react';
import type { RiskyAsset, NodeType } from '../types';
import {
  ghostRoutesHistory7D,
  ghostRoutesHistory30D,
  ghostRoutesHistory90D
} from '../services/dashboardData';

interface BottomAnalyticsSectionProps {
  riskyAssets: RiskyAsset[];
  onSelectAsset?: (asset: RiskyAsset) => void;
  onQuickAction?: (actionId: string) => void;
}

// Asset Icon helper
const RenderAssetIcon: React.FC<{ type: NodeType }> = ({ type }) => {
  switch (type) {
    case 'database':
      return <Database className="w-4 h-4 text-[#FF365D]" />;
    case 'app':
      return <Layers className="w-4 h-4 text-[#A855F7]" />;
    case 'host':
      return <Terminal className="w-4 h-4 text-[#22D3EE]" />;
    case 'server':
    default:
      return <Server className="w-4 h-4 text-[#3B82F6]" />;
  }
};

// Custom Tooltip for Ghost Routes Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2.5 rounded-lg bg-[#070D20] border border-[#202D50] text-xs font-mono shadow-xl">
        <div className="text-[#94A3B8]">{label}</div>
        <div className="text-[#A855F7] font-bold mt-0.5">
          {payload[0].value} Ghost Routes Detected
        </div>
      </div>
    );
  }
  return null;
};

// Mini trendline for Risky Asset row
const MiniAssetTrend: React.FC<{ trend: number[]; isHighRisk: boolean }> = ({ trend, isHighRisk }) => {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;
  const width = 50;
  const height = 20;

  const points = trend
    .map((val, idx) => {
      const x = (idx / (trend.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke = isHighRisk ? '#FF365D' : '#A855F7';

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const BottomAnalyticsSection: React.FC<BottomAnalyticsSectionProps> = ({
  riskyAssets,
  onSelectAsset,
  onQuickAction
}) => {
  const [timeFilter, setTimeFilter] = useState<'7D' | '30D' | '90D'>('30D');

  const chartData =
    timeFilter === '7D'
      ? ghostRoutesHistory7D
      : timeFilter === '90D'
      ? ghostRoutesHistory90D
      : ghostRoutesHistory30D;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* PANEL A: Ghost Routes Over Time (approx 4 / 12 cols) */}
      <div className="lg:col-span-4 p-4 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9] font-sans">
              Ghost Routes Over Time
            </h3>
            <p className="text-xs text-[#94A3B8] font-sans">
              Number of unintended trust paths detected
            </p>
          </div>

          {/* Time filters: 7D, 30D, 90D */}
          <div className="flex items-center bg-[#070D20] p-0.5 rounded-lg border border-[#202D50] text-xs font-mono">
            {(['7D', '30D', '90D'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-2.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  timeFilter === filter
                    ? 'bg-[#7C3AED] text-white font-bold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Purple Bar Chart with subtle grid lines */}
        <div className="h-48 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#202D50" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
                allowDecimals={false}
                domain={[0, 4]}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="count"
                fill="url(#purpleBarGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-[#64748B] pt-2 border-t border-[#202D50]">
          <span>Peak: 3 detected (Oct 12)</span>
          <span className="text-[#A855F7] font-semibold">Historical Trend</span>
        </div>
      </div>

      {/* PANEL B: Top Risky Assets (approx 4 / 12 cols) */}
      <div className="lg:col-span-4 p-4 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9] font-sans">
              Top Risky Assets
            </h3>
            <p className="text-xs text-[#94A3B8] font-sans">
              Ranked by policy reachability vulnerability
            </p>
          </div>
          <span className="text-xs font-mono text-[#64748B]">5 Assets</span>
        </div>

        {/* Compact Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#64748B] text-[10px] uppercase border-b border-[#202D50]">
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium text-center">Score</th>
                <th className="pb-2 font-medium text-center">Issues</th>
                <th className="pb-2 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202D50]/60">
              {riskyAssets.map((asset) => {
                const isHigh = asset.riskScore >= 70;
                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset?.(asset)}
                    className="hover:bg-[#101B35] cursor-pointer transition-colors group"
                  >
                    <td className="py-2 flex items-center gap-2.5">
                      <RenderAssetIcon type={asset.type} />
                      <div>
                        <div className="text-[#F1F5F9] group-hover:text-[#22D3EE] font-sans font-medium text-xs leading-none">
                          {asset.name}
                        </div>
                        <div className="text-[10px] text-[#64748B] leading-none mt-1">
                          {asset.ip}
                        </div>
                      </div>
                    </td>

                    <td className="py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          asset.riskScore >= 90
                            ? 'bg-rose-950 text-[#FF365D] border border-rose-500/40'
                            : asset.riskScore >= 70
                            ? 'bg-amber-950 text-[#F59E0B] border border-amber-500/40'
                            : 'bg-blue-950 text-[#3B82F6] border border-blue-500/40'
                        }`}
                      >
                        {asset.riskScore}
                      </span>
                    </td>

                    <td className="py-2 text-center text-[#94A3B8] font-medium">
                      {asset.issues}
                    </td>

                    <td className="py-2 text-right">
                      <MiniAssetTrend trend={asset.trend} isHighRisk={isHigh} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-xs font-mono text-[#64748B] pt-2 border-t border-[#202D50] flex justify-between">
          <span>Target DB score 92 (Critical)</span>
          <span className="text-[#22D3EE] hover:underline cursor-pointer">Details →</span>
        </div>
      </div>

      {/* PANEL C: Quick Actions & System Status Panel (approx 4 / 12 cols) */}
      <div className="lg:col-span-4 flex flex-col justify-between gap-3.5">
        {/* Quick Actions (4 action cards) */}
        <div className="p-4 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-xl flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#F1F5F9] font-sans">
              Quick Actions
            </h3>
            <span className="text-xs font-mono text-[#A855F7]">Automation</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-1">
            {/* Action 1: Run Network Scan */}
            <div
              onClick={() => onQuickAction?.('scan')}
              className="p-2.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] hover:border-[#7C3AED]/60 cursor-pointer transition-all group"
            >
              <div className="p-1 rounded bg-violet-950/80 w-fit text-[#A855F7] mb-1 group-hover:scale-105 transition-transform">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-[#F1F5F9] font-sans group-hover:text-[#A855F7]">
                Run Network Scan
              </div>
              <div className="text-[10.5px] text-[#94A3B8] leading-tight mt-0.5">
                Discover assets and routes
              </div>
            </div>

            {/* Action 2: Analyze Specific Path */}
            <div
              onClick={() => onQuickAction?.('analyze-path')}
              className="p-2.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] hover:border-[#7C3AED]/60 cursor-pointer transition-all group"
            >
              <div className="p-1 rounded bg-violet-950/80 w-fit text-[#A855F7] mb-1 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-[#F1F5F9] font-sans group-hover:text-[#A855F7]">
                Analyze Specific Path
              </div>
              <div className="text-[10.5px] text-[#94A3B8] leading-tight mt-0.5">
                Check a custom route
              </div>
            </div>

            {/* Action 3: View Remediation Plan */}
            <div
              onClick={() => onQuickAction?.('remediation')}
              className="p-2.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] hover:border-[#7C3AED]/60 cursor-pointer transition-all group"
            >
              <div className="p-1 rounded bg-violet-950/80 w-fit text-[#A855F7] mb-1 group-hover:scale-105 transition-transform">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-[#F1F5F9] font-sans group-hover:text-[#A855F7]">
                View Remediation Plan
              </div>
              <div className="text-[10.5px] text-[#94A3B8] leading-tight mt-0.5">
                Get AI recommendations
              </div>
            </div>

            {/* Action 4: Generate Report */}
            <div
              onClick={() => onQuickAction?.('report')}
              className="p-2.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] hover:border-[#7C3AED]/60 cursor-pointer transition-all group"
            >
              <div className="p-1 rounded bg-violet-950/80 w-fit text-[#A855F7] mb-1 group-hover:scale-105 transition-transform">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-[#F1F5F9] font-sans group-hover:text-[#A855F7]">
                Generate Report
              </div>
              <div className="text-[10.5px] text-[#94A3B8] leading-tight mt-0.5">
                Export analysis results
              </div>
            </div>
          </div>
        </div>

        {/* Section 11: System Status Panel */}
        <div className="p-3.5 rounded-xl bg-[#070D20] border border-[#202D50] shadow-md flex items-center justify-between text-xs font-mono">
          <div className="space-y-1.5">
            <div className="text-[10.5px] text-[#64748B] uppercase tracking-wider font-bold">
              System Status
            </div>
            <div className="flex items-center gap-3.5 text-xs">
              <span className="flex items-center gap-1.5 text-[#F1F5F9]">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Network Engine
              </span>
              <span className="flex items-center gap-1.5 text-[#F1F5F9]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                Threat Intel
              </span>
              <span className="flex items-center gap-1.5 text-[#F1F5F9]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                AI Engine
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-[#64748B]">Last Scan</div>
            <div className="text-xs text-[#22D3EE] font-bold">2 min ago</div>
          </div>
        </div>
      </div>
    </div>
  );
};
