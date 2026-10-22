import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceArea,
  CartesianGrid
} from 'recharts';
import {
  Activity,
  Flame
} from 'lucide-react';
import type {
  TelemetryDataPoint,
  AnomalyTimelinePoint,
  ScatterPoint
} from '../types';

interface TelemetryChartsProps {
  packetFlowData: TelemetryDataPoint[];
  anomalyTimelineData: AnomalyTimelinePoint[];
  scatterData: ScatterPoint[];
}

// Custom Tooltip for Packet Flow
const CustomPacketTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-800 shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="text-slate-400 mb-1 border-b border-slate-800 pb-1">
          Time: <span className="text-white font-bold">{label}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-cyan-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              NoK Gateways:
            </span>
            <span className="font-bold">{payload[0]?.value} MB/s</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-purple-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              API Gateways:
            </span>
            <span className="font-bold">{payload[1]?.value} MB/s</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-indigo-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Custom Subnets:
            </span>
            <span className="font-bold">{payload[2]?.value} MB/s</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Anomaly Timeline
const CustomAnomalyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AnomalyTimelinePoint;
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-800 shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 text-slate-400 mb-1 border-b border-slate-800 pb-1">
          <span>Timestamp: {data.timeLabel}</span>
          {data.inBreachWindow && (
            <span className="text-rose-400 font-bold bg-rose-950/80 px-1 rounded border border-rose-500/40">
              BREACH WINDOW
            </span>
          )}
        </div>
        <div className="text-rose-400 font-bold">
          Anomaly Score: {data.anomalyScore} / 100
        </div>
        <div className="text-amber-400">
          Alert Volume: {data.alertVolume} events
        </div>
        <div className="text-slate-400 text-[10px]">
          Baseline: {data.baseline} score
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Scatter
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as ScatterPoint;
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-800 shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="text-cyan-300 font-bold mb-1">{item.label}</div>
        <div className="text-slate-400">Node ID: {item.nodeId}</div>
        <div className="flex items-center justify-between gap-3 mt-1">
          <span className="text-slate-400">Cluster:</span>
          <span
            className={`font-bold ${
              item.cluster === 'Critical Spike'
                ? 'text-rose-400'
                : item.cluster === 'Suspicious'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {item.cluster}
          </span>
        </div>
        <div className="text-slate-400 text-[10px] mt-1">
          Latency: {item.x}ms | Anomaly Ratio: {item.y}
        </div>
      </div>
    );
  }
  return null;
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  packetFlowData,
  anomalyTimelineData,
  scatterData
}) => {
  const [activeFlowView, setActiveFlowView] = useState<'stream' | 'scatter'>('stream');
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'alert'>('all');

  return (
    <>
      {/* BOTTOM LEFT CARD: "Real-Time Packet Flow" */}
      <div className="p-4 rounded-xl bg-slate-900/85 border border-slate-800 shadow-xl flex flex-col justify-between backdrop-blur-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                Real-Time Packet Flow
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Throughput Across NoK vs API Gateways
              </p>
            </div>
          </div>

          {/* Toggle between Stream Chart and 2D Scatter Plot */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveFlowView('stream')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFlowView === 'stream'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stream Flow
            </button>
            <button
              onClick={() => setActiveFlowView('scatter')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFlowView === 'scatter'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D Cluster Scatter
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-56 w-full pt-1">
          {activeFlowView === 'stream' ? (
            /* Multi-line stream chart showing live traffic throughput across "NoK Gateways", "API Gateways", and custom subnets (Cyan vs Purple area lines) */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="flowCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="flowPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="flowSubnet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                {/* Time-axis markers (10:00, 12:00, 14:00, 16:00, 18:00) */}
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomPacketTooltip />} />
                <Area
                  type="monotone"
                  dataKey="nokGateway"
                  name="NoK Gateways"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#flowCyan)"
                />
                <Area
                  type="monotone"
                  dataKey="apiGateway"
                  name="API Gateways"
                  stroke="#a855f7"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#flowPurple)"
                />
                <Area
                  type="monotone"
                  dataKey="customSubnets"
                  name="Custom Subnets"
                  stroke="#818cf8"
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#flowSubnet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            /* Adjacent 2D scatter plot visualization representing cluster anomaly distributions */
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Latency"
                  unit="ms"
                  stroke="#64748b"
                  fontSize={10}
                  fontFamily="monospace"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Anomaly Ratio"
                  stroke="#64748b"
                  fontSize={10}
                  fontFamily="monospace"
                />
                <ZAxis type="number" dataKey="z" range={[60, 240]} />
                <Tooltip content={<CustomScatterTooltip />} />
                {/* Normal nodes */}
                <Scatter
                  name="Normal"
                  data={scatterData.filter((d) => d.cluster === 'Normal')}
                  fill="#06b6d4"
                />
                {/* Suspicious nodes */}
                <Scatter
                  name="Suspicious"
                  data={scatterData.filter((d) => d.cluster === 'Suspicious')}
                  fill="#f59e0b"
                />
                {/* Critical Spike nodes */}
                <Scatter
                  name="Critical Spike"
                  data={scatterData.filter((d) => d.cluster === 'Critical Spike')}
                  fill="#ef4444"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stream Legend footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              NoK Gateways
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              API Gateways
            </span>
            <span className="flex items-center gap-1 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Subnets
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Live 4s Sampling</span>
        </div>
      </div>

      {/* BOTTOM CENTER CARD: "Anomaly Incidents Over Time" */}
      <div className="p-4 rounded-xl bg-slate-900/85 border border-slate-800 shadow-xl flex flex-col justify-between backdrop-blur-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                Anomaly Incidents Over Time
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Breach Window Threshold Analysis
              </p>
            </div>
          </div>

          {/* Time range filters ("All Anomaly", "Alert") */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setAnomalyFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                anomalyFilter === 'all'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Anomaly
            </button>
            <button
              onClick={() => setAnomalyFilter('alert')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                anomalyFilter === 'alert'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alert
            </button>
          </div>
        </div>

        {/* Multi-spline area chart with shaded crimson threshold zone indicating breach window (timestamps 400s - 500s) */}
        <div className="h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={anomalyTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
                domain={[0, 110]}
              />
              <Tooltip content={<CustomAnomalyTooltip />} />

              {/* Shaded crimson threshold zone indicating breach window (timestamps 400s - 500s) */}
              <ReferenceArea
                x1="400s"
                x2="500s"
                stroke="#ef4444"
                strokeOpacity={0.5}
                fill="#ef4444"
                fillOpacity={0.16}
                label={{
                  value: '⚠️ Breach Window (400s-500s)',
                  fill: '#f87171',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  position: 'insideTop'
                }}
              />

              {anomalyFilter === 'all' && (
                <Area
                  type="monotone"
                  dataKey="anomalyScore"
                  name="Anomaly Score"
                  stroke="#ef4444"
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill="url(#anomalyGradient)"
                />
              )}

              <Area
                type="monotone"
                dataKey="alertVolume"
                name="Alert Volume"
                stroke="#f59e0b"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#alertGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-400 font-bold">Peak Risk: 96 / 100</span>
            <span className="text-slate-500">(at 450s window)</span>
          </div>
          <span className="text-rose-400/90 font-mono text-[10px] bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30">
            Lateral Hop Detected
          </span>
        </div>
      </div>
    </>
  );
};
