import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 32,
  showText = false,
  textClassName = '',
  subtitle,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric SVG Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <linearGradient id="auraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="auraGlow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C7D2FE" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer squircle base */}
        <rect width="40" height="40" rx="12" fill="url(#auraGradient)" />

        {/* Dynamic secure signal orbit arc */}
        <path
          d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20"
          stroke="url(#auraGlow)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />

        {/* Inner concentric focus ring */}
        <circle cx="20" cy="20" r="5" stroke="#FFFFFF" strokeWidth="2.25" strokeOpacity="0.95" />

        {/* Central sovereign nucleus dot */}
        <circle cx="20" cy="20" r="2.25" fill="#FFFFFF" />

        {/* Subtle cryptographic key notch */}
        <path
          d="M20 25.5V28M17.5 28H22.5"
          stroke="#EEF2FF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-slate-900 leading-none ${
                textClassName || 'text-lg'
              }`}
            >
              Aura
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded-md">
              E2EE
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-500 font-medium tracking-normal mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
