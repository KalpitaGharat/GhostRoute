import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  AlertTriangle
} from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteAnalysis?: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  onCompleteAnalysis
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing deterministic graph adapter...');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsCompleted(false);
      return;
    }

    const steps = [
      { p: 20, text: 'Mapping 18 hybrid-cloud network devices & CIDR subnets...' },
      { p: 45, text: 'Evaluating perimeter firewall ACLs & Core ingress matrices...' },
      { p: 70, text: 'Executing NetworkX depth-first reachability search...' },
      { p: 90, text: 'Identifying unintended ghost route candidates...' },
      { p: 100, text: 'Analysis Complete: 2 Unintended trust paths discovered.' }
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < steps.length) {
        setProgress(steps[currentIdx].p);
        setCurrentStep(steps[currentIdx].text);
        if (steps[currentIdx].p === 100) {
          setIsCompleted(true);
        }
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050817]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B142B] border border-[#202D50] shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#202D50]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-950/80 border border-violet-500/30 text-[#A855F7]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F1F5F9] font-sans">
                Network Trust Path Investigation
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Full Topology & Policy Compliance Scan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#94A3B8]">{currentStep}</span>
            <span className="text-[#A855F7] font-bold">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#070D20] border border-[#202D50] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] transition-all duration-300 shadow-[0_0_10px_#A855F7]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {isCompleted && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#FF365D] font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>2 Ghost Routes Confirmed</span>
              </div>
              <p className="text-[#94A3B8] text-[11px]">
                1. DMZ Web Server ➔ Production DB (Risk Score: 92)<br />
                2. Internal App Server ➔ Production DB (Risk Score: 76)
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#202D50] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#101B35] hover:bg-[#202D50] text-[#F1F5F9] text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            {isCompleted ? 'Close' : 'Cancel'}
          </button>
          {isCompleted && (
            <button
              onClick={() => {
                onCompleteAnalysis?.();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(124,58,237,0.4)] cursor-pointer"
            >
              Review Flagged Routes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
