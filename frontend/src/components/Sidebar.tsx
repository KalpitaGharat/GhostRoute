import React from 'react';
import {
  LayoutDashboard,
  Network,
  BarChart3,
  ShieldAlert,
  Wrench,
  Boxes,
  FileText,
  Settings,
  Sparkles,
  Shield,
  ArrowRight
} from 'lucide-react';

export type SidebarTab =
  | 'dashboard'
  | 'topology'
  | 'analytics'
  | 'threats'
  | 'remediations'
  | 'assets'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  onOpenAIAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAIAssistant
}) => {
  const menuItems = [
    { id: 'dashboard' as SidebarTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'topology' as SidebarTab, label: 'Network Topology', icon: Network },
    { id: 'analytics' as SidebarTab, label: 'Risk Analytics', icon: BarChart3 },
    { id: 'threats' as SidebarTab, label: 'Threat Intelligence', icon: ShieldAlert },
    {
      id: 'remediations' as SidebarTab,
      label: 'Remediations',
      icon: Wrench,
      badge: 2
    },
    { id: 'assets' as SidebarTab, label: 'Assets & Inventory', icon: Boxes },
    { id: 'reports' as SidebarTab, label: 'Reports', icon: FileText },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: Settings }
  ];

  return (
    <aside
      className="w-[215px] shrink-0 bg-[#070D20] border-r border-[#202D50] flex flex-col justify-between select-none relative z-20 min-h-[calc(100vh-56px)]"
      style={{
        backgroundImage: `radial-gradient(ellipse at 10% 25%, rgba(124, 58, 237, 0.08) 0%, transparent 60%)`
      }}
    >
      {/* Faint curved orbital line decoration in sidebar */}
      <svg className="absolute top-0 right-0 w-36 h-72 pointer-events-none opacity-20 overflow-visible">
        <path
          d="M 120 0 Q 30 140 120 280"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <circle cx="75" cy="140" r="3" fill="#A855F7" />
      </svg>

      {/* TOP SECTION: Brand Header & Navigation List */}
      <div className="p-3.5 space-y-4">
        {/* Brand Header */}
        <div className="pb-3 border-b border-[#202D50]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] via-[#A855F7] to-[#22D3EE] p-[1.5px] shadow-[0_0_15px_-2px_rgba(124,58,237,0.5)]">
              <div className="w-full h-full bg-[#070D20] rounded-[7px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#A855F7] fill-[#7C3AED]/30" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#F1F5F9] tracking-tight">
                  GhostRoute <span className="text-[#A855F7]">AI</span>
                </span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-purple-950/80 text-[#A855F7] border border-purple-600/40 font-semibold tracking-wider">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] font-mono tracking-tight leading-none mt-0.5">
                Trust Path Investigator
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-950/80 via-purple-950/40 to-transparent text-[#F1F5F9] border border-violet-600/40 shadow-[0_0_15px_-3px_rgba(124,58,237,0.35)]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#0B142B]/80 border border-transparent'
                }`}
              >
                {/* Active narrow purple left indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#A855F7] rounded-r-full shadow-[0_0_8px_#A855F7]" />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#A855F7]' : 'text-[#64748B] group-hover:text-[#94A3B8]'
                  }`}
                />

                <span className="truncate tracking-wide flex-1 text-left font-sans">
                  {item.label}
                </span>

                {/* Badge (e.g. 2 on Remediations) */}
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-purple-950/90 text-[#A855F7] border border-purple-500/40 font-mono shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION: AI Assistant Card */}
      <div className="p-3 border-t border-[#202D50] bg-[#070D20]/90">
        <div
          onClick={onOpenAIAssistant}
          className="group p-2.5 rounded-xl bg-gradient-to-b from-[#101B35] to-[#0B142B] border border-[#202D50] hover:border-[#7C3AED]/60 transition-all cursor-pointer shadow-lg hover:shadow-[0_0_18px_-3px_rgba(124,58,237,0.3)] relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F1F5F9]">
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7] animate-pulse" />
              <span>AI Assistant</span>
            </div>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-violet-950/90 text-[#22D3EE] border border-cyan-500/30 font-bold">
              BETA
            </span>
          </div>

          <p className="text-[11px] text-[#94A3B8] leading-tight group-hover:text-[#F1F5F9] transition-colors">
            Ask about routes, risks, or policies…
          </p>

          <div className="mt-2 flex items-center justify-between text-[10px] text-[#A855F7] font-mono pt-1 border-t border-[#202D50]/60">
            <span>Query Nemotron</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </aside>
  );
};
