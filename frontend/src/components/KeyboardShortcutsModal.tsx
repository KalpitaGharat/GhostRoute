import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ / Ctrl + K', description: 'Open Command Palette & Asset Search' },
    { key: 'Space', description: 'Pause / Resume Real-Time 4s Telemetry Polling' },
    { key: 'Esc', description: 'Close active modal / Deselect active topology node' },
    { key: '1 - 7', description: 'Quick jump across SecOps sidebar modules' },
    { key: 'T', description: 'Toggle Ghost Routes Only filter on Topology Graph' },
    { key: 'E', description: 'Export Topology Graph JSON dataset' },
    { key: 'F', description: 'Toggle Fullscreen Mode on Topology Graph' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              SecOps Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80 my-3 font-mono text-xs">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <span className="text-slate-300">{sc.description}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-bold shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[11px] font-mono text-slate-500">
          Designed for high-velocity SecOps incident triage & forensics
        </div>
      </div>
    </div>
  );
};
