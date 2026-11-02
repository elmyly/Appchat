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
      {/* Official Interwoven Ribbon Logo */}
      <img
        src="/assets/aistudio/Interwoven_Purple_Blue_Ribbon_Logo_baa92702.png"
        alt="Aura Logo"
        width={size}
        height={size}
        className="shrink-0 object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
        style={{ width: `${size}px`, height: `${size}px` }}
        loading="eager"
      />

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
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-md">
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
