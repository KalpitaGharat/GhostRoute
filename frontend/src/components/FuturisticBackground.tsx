import React from 'react';

export const FuturisticBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Large atmospheric radial glows in electric violet and network blue */}
      <div className="absolute -top-32 right-1/4 w-[850px] h-[850px] rounded-full bg-gradient-to-br from-[#7C3AED]/22 to-[#3B82F6]/14 blur-[150px]" />
      <div className="absolute top-1/4 -left-20 w-[700px] h-[700px] rounded-full bg-[#3B82F6]/14 blur-[160px]" />
      <div className="absolute bottom-0 right-10 w-[750px] h-[750px] rounded-full bg-[#7C3AED]/18 blur-[160px]" />
      <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] rounded-full bg-[#10B981]/8 blur-[160px]" />

      {/* 2. Low-opacity global grid */}
      <div className="absolute inset-0 bg-tech-grid opacity-30" />

      {/* 3. PROMINENT Dotted Digital Globe in the Upper-Right Background */}
      <div className="absolute top-2 right-4 sm:right-16 lg:right-28 w-[440px] h-[440px] opacity-75">
        <svg viewBox="0 0 440 440" className="w-full h-full">
          <defs>
            <radialGradient id="globeCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#22D3EE" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#050817" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="orbitalRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.1" />
            </linearGradient>
            <filter id="dotGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Core sphere radial atmosphere */}
          <circle cx="220" cy="220" r="170" fill="url(#globeCoreGlow)" />

          {/* Dotted globe wireframe contours */}
          <circle cx="220" cy="220" r="160" fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.5" />
          <ellipse cx="220" cy="220" rx="160" ry="85" fill="none" stroke="#202D50" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
          <ellipse cx="220" cy="220" rx="160" ry="40" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="2 5" opacity="0.5" />
          <ellipse cx="220" cy="220" rx="110" ry="160" fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
          <ellipse cx="220" cy="220" rx="60" ry="160" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
          <line x1="60" y1="220" x2="380" y2="220" stroke="#22D3EE" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

          {/* Dynamic tilted planetary orbit ring */}
          <ellipse
            cx="220"
            cy="220"
            rx="195"
            ry="68"
            fill="none"
            stroke="url(#orbitalRingGradient)"
            strokeWidth="1.8"
            transform="rotate(-26 220 220)"
          />
          <ellipse
            cx="220"
            cy="220"
            rx="185"
            ry="55"
            fill="none"
            stroke="#A855F7"
            strokeWidth="0.8"
            strokeDasharray="4 6"
            transform="rotate(38 220 220)"
            opacity="0.5"
          />

          {/* High-density Matrix of Digital Dotted Coordinates */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i / 72) * Math.PI * 2;
            const tier = i % 5;
            const rx = tier === 0 ? 155 : tier === 1 ? 120 : tier === 2 ? 80 : tier === 3 ? 140 : 100;
            const ry = tier === 0 ? 65 : tier === 1 ? 120 : tier === 2 ? 155 : tier === 3 ? 90 : 135;
            const px = 220 + rx * Math.cos(angle);
            const py = 220 + ry * Math.sin(angle) * 0.72;
            const color = i % 3 === 0 ? '#22D3EE' : i % 2 === 0 ? '#A855F7' : '#38BDF8';
            const r = i % 4 === 0 ? 2.4 : 1.5;
            return (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={r}
                fill={color}
                opacity={0.5 + (i % 5) * 0.12}
                filter={i % 6 === 0 ? 'url(#dotGlow)' : undefined}
              />
            );
          })}

          {/* Pulsing satellite beacons along orbit */}
          <circle cx="370" cy="155" r="4" fill="#22D3EE" filter="url(#dotGlow)" />
          <circle cx="370" cy="155" r="9" fill="none" stroke="#22D3EE" strokeWidth="1" opacity="0.6" className="animate-ping" style={{ transformOrigin: '370px 155px' }} />

          <circle cx="95" cy="275" r="3" fill="#A855F7" filter="url(#dotGlow)" />
          <circle cx="95" cy="275" r="7" fill="none" stroke="#A855F7" strokeWidth="0.8" opacity="0.5" className="animate-ping" style={{ transformOrigin: '95px 275px' }} />
        </svg>
      </div>

      {/* 4. Connected circuit vector traces around page borders */}
      <svg className="absolute inset-0 w-full h-full opacity-35">
        {/* Top-left circuit trace */}
        <polyline points="20,70 110,70 150,32 300,32" fill="none" stroke="#3B82F6" strokeWidth="1.2" />
        <circle cx="300" cy="32" r="3" fill="#7C3AED" />
        <circle cx="20" cy="70" r="2.5" fill="#22D3EE" />

        {/* Bottom-left circuit trace */}
        <polyline points="30,820 140,820 185,870 340,870" fill="none" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="6 3" />
        <circle cx="340" cy="870" r="2.5" fill="#22D3EE" />

        {/* Top-right circuit trace */}
        <polyline points="1350,35 1460,35 1500,75 1620,75" fill="none" stroke="#22D3EE" strokeWidth="1.2" />
        <circle cx="1350" cy="35" r="2.5" fill="#A855F7" />

        {/* Bottom-right circuit trace */}
        <polyline points="1300,910 1440,910 1480,865 1600,865" fill="none" stroke="#202D50" strokeWidth="1.4" />
        <circle cx="1480" cy="865" r="3" fill="#3B82F6" />
      </svg>

      {/* 5. Glowing cyber particles */}
      <div className="absolute top-[18%] left-[20%] w-2 h-2 rounded-full bg-cyan-400 particle-pulse shadow-[0_0_8px_#22D3EE]" />
      <div className="absolute top-[62%] left-[45%] w-2 h-2 rounded-full bg-violet-400 particle-pulse shadow-[0_0_8px_#A855F7]" style={{ animationDelay: '1.6s' }} />
      <div className="absolute top-[32%] right-[32%] w-2 h-2 rounded-full bg-blue-400 particle-pulse shadow-[0_0_8px_#3B82F6]" style={{ animationDelay: '2.8s' }} />
    </div>
  );
};
