import React, { useMemo } from 'react';
import {
  ShieldCheck,
  Activity,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { TelemetryCharts } from '../components/TelemetryCharts';
import type {
  TelemetryDataPoint,
  AnomalyTimelinePoint,
  ScatterPoint,
  RiskyAsset
} from '../types';

interface RiskAnalyticsViewProps {
  riskyAssets?: RiskyAsset[];
}

export const RiskAnalyticsView: React.FC<RiskAnalyticsViewProps> = ({ riskyAssets: _riskyAssets }) => {
  // Generate realistic packet flow throughput telemetry
  const packetFlowData: TelemetryDataPoint[] = useMemo(() => {
    const points: TelemetryDataPoint[] = [];
    const times = ['10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00'];
    times.forEach((t, i) => {
      points.push({
        time: t,
        timestamp: Date.now() - (times.length - i) * 15 * 60 * 1000,
        nokGateway: Math.floor(280 + Math.sin(i * 0.8) * 80 + (i === 8 ? 240 : 0)), // Spike at 12:00
        apiGateway: Math.floor(180 + Math.cos(i * 0.7) * 45),
        customSubnets: Math.floor(95 + Math.sin(i * 0.5) * 25),
        totalThroughput: 550 + i * 15,
        latency: 1.4 + (i === 8 ? 4.8 : 0.2),
        anomaliesDetected: i === 8 ? 3 : 0
      });
    });
    return points;
  }, []);

  // Generate timeline breach points
  const anomalyTimelineData: AnomalyTimelinePoint[] = useMemo(() => {
    return [
      { timestampSeconds: 0, timeLabel: '10:00', anomalyScore: 12, alertVolume: 4, baseline: 10, inBreachWindow: false },
      { timestampSeconds: 900, timeLabel: '10:15', anomalyScore: 15, alertVolume: 5, baseline: 12, inBreachWindow: false },
      { timestampSeconds: 1800, timeLabel: '10:30', anomalyScore: 18, alertVolume: 6, baseline: 12, inBreachWindow: false },
      { timestampSeconds: 2700, timeLabel: '10:45', anomalyScore: 24, alertVolume: 8, baseline: 14, inBreachWindow: false },
      { timestampSeconds: 3600, timeLabel: '11:00', anomalyScore: 32, alertVolume: 12, baseline: 15, inBreachWindow: false },
      { timestampSeconds: 4500, timeLabel: '11:15', anomalyScore: 28, alertVolume: 10, baseline: 15, inBreachWindow: false },
      { timestampSeconds: 5400, timeLabel: '11:30', anomalyScore: 45, alertVolume: 16, baseline: 16, inBreachWindow: false },
      { timestampSeconds: 6300, timeLabel: '11:45', anomalyScore: 88, alertVolume: 34, baseline: 18, inBreachWindow: true }, // Breach
      { timestampSeconds: 7200, timeLabel: '12:00', anomalyScore: 94, alertVolume: 42, baseline: 20, inBreachWindow: true }, // Breach
      { timestampSeconds: 8100, timeLabel: '12:15', anomalyScore: 65, alertVolume: 22, baseline: 18, inBreachWindow: true },
      { timestampSeconds: 9000, timeLabel: '12:30', anomalyScore: 35, alertVolume: 12, baseline: 16, inBreachWindow: false },
      { timestampSeconds: 9900, timeLabel: '12:45', anomalyScore: 22, alertVolume: 7, baseline: 15, inBreachWindow: false },
    ];
  }, []);

  // Generate 3D scatter cluster points
  const scatterData: ScatterPoint[] = useMemo(() => {
    return [
      { x: 14, y: 22, z: 12, cluster: 'Normal', label: 'edge-fw', nodeId: 'edge-fw' },
      { x: 22, y: 35, z: 18, cluster: 'Normal', label: 'app-srv-01', nodeId: 'app-srv-01' },
      { x: 30, y: 40, z: 20, cluster: 'Normal', label: 'jump-host', nodeId: 'jump-host' },
      { x: 55, y: 72, z: 45, cluster: 'Suspicious', label: 'dmz-web-01', nodeId: 'dmz-web-01' },
      { x: 88, y: 92, z: 85, cluster: 'Critical Spike', label: 'db-prod-01 (Target)', nodeId: 'db-prod-01' },
      { x: 42, y: 58, z: 32, cluster: 'Suspicious', label: 'fw-core', nodeId: 'fw-core' },
    ];
  }, []);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Risk Analytics & <span className="text-[#A855F7]">Telemetry</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              Deep Telemetry
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Volumetric packet throughput, anomaly window baselines, and multi-dimensional cluster risk.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#0B142B] border border-[#202D50] text-[#94A3B8] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry Ingestion: <strong>4.2 keps</strong></span>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-md space-y-1">
          <div className="text-[10px] text-[#94A3B8] uppercase font-mono flex items-center justify-between">
            <span>Composite Threat Score</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">84.2 <span className="text-xs text-rose-300">/ 100</span></div>
          <div className="text-[10.5px] text-[#94A3B8]">Elevated by DMZ database bridge</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-md space-y-1">
          <div className="text-[10px] text-[#94A3B8] uppercase font-mono flex items-center justify-between">
            <span>Peak Flow Throughput</span>
            <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#22D3EE]">615 <span className="text-xs text-cyan-300">MB/s</span></div>
          <div className="text-[10.5px] text-[#94A3B8]">Spike detected during breach window</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-md space-y-1">
          <div className="text-[10px] text-[#94A3B8] uppercase font-mono flex items-center justify-between">
            <span>Active Breaches</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">1 Window</div>
          <div className="text-[10.5px] text-[#94A3B8]">Duration: 45 min anomaly surge</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-md space-y-1">
          <div className="text-[10px] text-[#94A3B8] uppercase font-mono flex items-center justify-between">
            <span>mTLS Encryption Ratio</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">71.4%</div>
          <div className="text-[10.5px] text-[#94A3B8]">5 of 7 internal links secured</div>
        </div>
      </div>

      {/* TELEMETRY CHARTS SECTION */}
      <TelemetryCharts
        packetFlowData={packetFlowData}
        anomalyTimelineData={anomalyTimelineData}
        scatterData={scatterData}
      />
    </div>
  );
};
