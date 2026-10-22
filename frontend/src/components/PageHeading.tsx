import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Calendar } from 'lucide-react';

interface PageHeadingProps {
  onRunAnalysis: () => void;
  isAnalyzing?: boolean;
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  onRunAnalysis,
  isAnalyzing = false
}) => {
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      };
      setCurrentDateTime(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3.5 border-b border-[#202D50]">
      <div>
        {/* Label: DASHBOARD */}
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#A855F7] mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#A855F7] shadow-[0_0_6px_#A855F7]" />
          DASHBOARD
        </div>

        {/* Main heading: Trust Path Investigator with violet emphasis on "Investigator" */}
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F1F5F9] tracking-tight">
          Trust Path <span className="text-[#A855F7]">Investigator</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs lg:text-sm text-[#94A3B8] font-sans mt-1 max-w-2xl">
          Discover what your network allows that your security policy never intended.
        </p>
      </div>

      {/* Date/time indicator on the right & Violet primary button: Run New Analysis */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B142B] border border-[#202D50] text-[#94A3B8] text-xs font-mono">
          <Calendar className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>{currentDateTime || 'Oct 22, 2026 • 13:07:30 UTC'}</span>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white text-xs font-semibold shadow-[0_0_20px_-3px_rgba(124,58,237,0.5)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Network...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white text-transparent" />
              <span>Run New Analysis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
