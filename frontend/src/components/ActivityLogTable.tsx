import React, { useState } from 'react';
import {
  ScrollText,
  Radio,
  ExternalLink
} from 'lucide-react';
import type { ActivityLog } from '../types';

interface ActivityLogTableProps {
  logs: ActivityLog[];
  onSelectLog?: (log: ActivityLog) => void;
}

export const ActivityLogTable: React.FC<ActivityLogTableProps> = ({ logs, onSelectLog }) => {
  const [severityFilter, setSeverityFilter] = useState<'All Severity' | 'CRITICAL' | 'WARN' | 'INFO'>('All Severity');
  const [timeFilter, setTimeFilter] = useState<'2 hours ago' | 'Last 15m' | 'Last 24h'>('2 hours ago');

  const filteredLogs = logs.filter((log) => {
    if (severityFilter !== 'All Severity' && log.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  // Render color-coded dot
  const renderStatusDot = (dotColor: ActivityLog['dotColor']) => {
    switch (dotColor) {
      case 'crimson':
        return (
          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
          </span>
        );
      case 'purple':
        return (
          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500 shadow-[0_0_8px_#a855f7]" />
          </span>
        );
      case 'cyan':
        return (
          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </span>
        );
      case 'green':
      default:
        return (
          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </span>
        );
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/85 border border-slate-800 shadow-xl flex flex-col justify-between backdrop-blur-sm h-full">
      {/* CARD HEADER: Activity Logs & Filter Dropdowns */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                Activity Logs
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Audited Telemetry & Security Findings
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Filter Dropdowns ("All Severity", "2 hours ago") */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="All Severity">All Severity</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARN">Warnings Only</option>
            <option value="INFO">Info Logs</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="2 hours ago">2 hours ago</option>
            <option value="Last 15m">Last 15m</option>
            <option value="Last 24h">Last 24h</option>
          </select>
        </div>
      </div>

      {/* REAL-TIME LIST ITEMS with color-coded dot status */}
      <div className="flex-1 h-56 overflow-y-auto space-y-2 pr-1">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => onSelectLog?.(log)}
            className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group flex items-start gap-3"
          >
            {/* Color-Coded Dot Status */}
            {renderStatusDot(log.dotColor)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
                  {log.category}:
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {log.timestamp} ({log.timeAgo})
                </span>
              </div>

              <p className="text-xs text-slate-200 font-medium group-hover:text-white transition-colors leading-snug">
                {log.message}
              </p>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span className="truncate text-cyan-400/90 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {log.targetAsset}
                </span>
                {log.user && (
                  <span className="text-slate-500">by {log.user}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          SecOps Stream Ingestion
        </span>
        <span className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
          Full Audit Log
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
