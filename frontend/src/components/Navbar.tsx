import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  AlertTriangle,
  User,
  Sliders,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenCommandPalette: () => void;
  unreadCount?: number;
  /** null = still checking, true = reachable, false = offline */
  backendOnline?: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCommandPalette,
  unreadCount = 3,
  backendOnline = null,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-[#070D20] border-b border-[#202D50] sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-4 select-none">
      {/* LEFT: Search Bar */}
      <div className="flex-1 max-w-xl">
        <div
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0B142B] hover:bg-[#101B35] border border-[#202D50] hover:border-[#7C3AED]/50 text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer transition-all group"
        >
          <Search className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#22D3EE] transition-colors shrink-0" />
          <span className="text-xs text-[#94A3B8] group-hover:text-[#F1F5F9] truncate select-none">
            Search nodes, IPs, CIDRs, assets, or suspicious routes…
          </span>
          <div className="ml-auto hidden sm:flex items-center gap-1 font-mono text-[10px] text-[#94A3B8] bg-[#070D20] border border-[#202D50] px-1.5 py-0.5 rounded shrink-0">
            <span>Ctrl + K</span>
          </div>
        </div>
      </div>

      {/* RIGHT: System Online indicator, Notification Bell, User Avatar (Neev Savla) */}
      <div className="flex items-center gap-3.5 shrink-0">
        {/* Backend connectivity indicator */}
        {backendOnline === null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
            <span className="text-[11px] font-medium">Connecting…</span>
          </div>
        )}
        {backendOnline === true && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono" title="Backend API reachable at localhost:8000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
            </span>
            <span className="text-[11px] font-medium text-[#F1F5F9]">Backend Online</span>
          </div>
        )}
        {backendOnline === false && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-[#F59E0B] text-xs font-mono" title="Cannot reach localhost:8000 — running on mock data">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[11px] font-medium">Backend Offline</span>
          </div>
        )}

        {/* Notification bell with small red badge showing 3 */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-1.5 rounded-lg bg-[#0B142B] hover:bg-[#101B35] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#202D50] hover:border-[#7C3AED]/40 transition-colors cursor-pointer"
            title="Recent Alerts (3)"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF365D] text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center ring-2 ring-[#070D20] shadow-[0_0_6px_#FF365D]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#202D50] mb-2">
                <span className="text-xs font-bold text-[#F1F5F9] font-mono">
                  Active Alerts ({unreadCount})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Live</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                  <div className="font-bold text-[#FF365D] text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Critical: Suspicious Route Active
                  </div>
                  <p className="text-[#94A3B8] text-[10px] mt-0.5">
                    DMZ Web Server bypassed Edge Firewall to Production DB
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30">
                  <div className="font-bold text-[#F59E0B] text-[11px]">
                    High: Unintended Access Path
                  </div>
                  <p className="text-[#94A3B8] text-[10px] mt-0.5">
                    App Server → Database unscheduled hop detected
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile: Circular avatar with initials NS, Neev Savla, SecOps Analyst */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#0B142B] transition-colors cursor-pointer"
          >
            {/* Circular user avatar with initials NS */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white font-mono font-bold text-xs ring-1 ring-[#7C3AED]/60">
              NS
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#F1F5F9] leading-tight">
                Neev Savla
              </div>
              <div className="text-[10px] font-mono text-[#94A3B8] leading-tight">
                SecOps Analyst
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0B142B] border border-[#202D50] shadow-2xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#202D50]">
                <div className="font-bold text-[#F1F5F9]">Neev Savla</div>
                <div className="text-[10px] text-[#94A3B8] font-mono">neev@ghostroute.ai</div>
                <div className="mt-1 text-[10px] text-[#22D3EE] font-mono">Role: SecOps Analyst</div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#101B35]"
                >
                  <User className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span>Security Profile</span>
                </button>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#101B35]"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Preferences</span>
                </button>
              </div>
              <div className="pt-1 border-t border-[#202D50]">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#FF365D] hover:bg-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
