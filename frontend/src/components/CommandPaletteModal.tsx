import React, { useState, useEffect } from 'react';
import { Search, X, Server, CornerDownLeft } from 'lucide-react';
import type { TopologyNode } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TopologyNode[];
  onSelectNode: (node: TopologyNode) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode
}) => {
  const [query, setQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNodes = nodes.filter((n) => {
    const q = query.toLowerCase();
    return (
      n.name.toLowerCase().includes(q) ||
      n.ip.toLowerCase().includes(q) ||
      n.zone.toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-[#050817]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-2xl overflow-hidden">
        {/* Search input header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#202D50] bg-[#070D20]">
          <Search className="w-4 h-4 text-[#22D3EE] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes, IPs, CIDRs, assets, or suspicious routes…"
            className="w-full bg-transparent text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
            Network Topology Assets ({filteredNodes.length})
          </div>

          {filteredNodes.length === 0 ? (
            <div className="p-6 text-center text-[#64748B] font-mono text-xs">
              No matching network assets or routes found for "{query}"
            </div>
          ) : (
            filteredNodes.map((node) => (
              <div
                key={node.id}
                onClick={() => {
                  onSelectNode(node);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#101B35] border border-transparent hover:border-[#202D50] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-md border ${
                      node.isSuspicious
                        ? 'bg-rose-950/80 border-rose-500/40 text-[#FF365D]'
                        : 'bg-[#070D20] border-[#202D50] text-[#22D3EE]'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[#F1F5F9] font-bold group-hover:text-[#22D3EE] transition-colors flex items-center gap-2">
                      {node.name}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#070D20] text-[#94A3B8]">
                        {node.zone}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      IP: {node.ip}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#64748B] group-hover:text-[#22D3EE]">
                  <span className="text-[10px]">Inspect</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#070D20] border-t border-[#202D50] text-[10px] font-mono text-[#64748B]">
          <span>Navigate with arrows, press Enter to inspect</span>
          <span className="px-1.5 py-0.5 rounded bg-[#101B35] text-[#94A3B8]">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
