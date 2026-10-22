import React, { useState } from 'react';
import {
  Filter,
  ChevronRight
} from 'lucide-react';
import type { TopologyNode } from '../types';

interface AssetInventoryViewProps {
  nodes: TopologyNode[];
  onSelectNode: (node: TopologyNode) => void;
}

export const AssetInventoryView: React.FC<AssetInventoryViewProps> = ({
  nodes,
  onSelectNode
}) => {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const filteredNodes = nodes.filter((node) => {
    if (zoneFilter !== 'ALL' && node.zone !== zoneFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.ip.toLowerCase().includes(q) ||
        node.type.toLowerCase().includes(q) ||
        node.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D50]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
              Assets & <span className="text-[#A855F7]">Device Inventory</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
              {nodes.length} Network Nodes
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
            Monitored servers, border routers, security firewalls, and database clusters.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <input
            type="text"
            placeholder="Search assets, IPs, zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-3 py-1.5 rounded-lg bg-[#0B142B] border border-[#202D50] text-[#F1F5F9] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* ZONE FILTER PILLS */}
      <div className="flex items-center gap-1.5 text-xs font-mono">
        <Filter className="w-3.5 h-3.5 text-[#22D3EE] mr-1" />
        <span className="text-[#94A3B8] mr-1">Zone:</span>
        {['ALL', 'EDGE', 'DMZ', 'INTERNAL', 'DATA'].map((z) => (
          <button
            key={z}
            onClick={() => setZoneFilter(z)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              zoneFilter === z
                ? 'bg-violet-600/30 text-[#A855F7] border border-violet-500/60 font-semibold'
                : 'text-[#64748B] hover:text-[#F1F5F9] bg-[#0B142B] border border-[#202D50]'
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {/* ASSET INVENTORY TABLE */}
      <div className="p-5 rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-xl space-y-3">
        <div className="overflow-x-auto rounded-xl border border-[#202D50]">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-[#070D20] text-[#94A3B8] font-mono border-b border-[#202D50]">
                <th className="py-3 px-4 font-semibold">Device Name</th>
                <th className="py-3 px-4 font-semibold">IP / Subnet</th>
                <th className="py-3 px-4 font-semibold">Zone</th>
                <th className="py-3 px-4 font-semibold">Device Type</th>
                <th className="py-3 px-4 font-semibold">Security Posture</th>
                <th className="py-3 px-4 font-semibold">Platform OS</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202D50]/60">
              {filteredNodes.map((node) => (
                <tr
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className="hover:bg-[#0E1733] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-semibold text-[#F1F5F9] flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                    <span>{node.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#22D3EE]">{node.ip}</td>
                  <td className="py-3 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {node.zone}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono uppercase text-[#A855F7] text-[11px]">
                    {node.type}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {node.isSuspicious ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50">
                        SHADOW ROUTE INVOLVED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
                        ISOLATED & COMPLIANT
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#94A3B8] font-mono text-[11px]">
                    {node.os || 'Linux Kernel 6.8'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="flex items-center gap-1 ml-auto text-xs font-mono text-[#A855F7] group-hover:text-white transition-colors">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
