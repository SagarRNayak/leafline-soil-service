import React from 'react';

export const Logo = ({ className = "h-8 w-8", textClassName = "text-xl", showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-forest-900 to-forest-700 p-2 shadow-sm text-white ${className}`}>
        {/* Custom SVG logo: sunflower stylized with soil seedling & leaf */}
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Sunflower petal ring */}
          <circle cx="20" cy="20" r="17" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          {/* Earth/Soil mound */}
          <path d="M8 30C12 26 28 26 32 30" stroke="#a38258" strokeWidth="2.5" strokeLinecap="round" />
          {/* Sprouting leaf stalk */}
          <path d="M20 30V15" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          {/* Left leaf */}
          <path d="M20 22C15 21 13 17 14 14C17 14 20 18 20 22Z" fill="#22c55e" />
          {/* Right sunflower petal */}
          <path d="M20 18C25 17 27 13 26 10C23 10 20 14 20 18Z" fill="#eab308" />
          {/* Golden Core */}
          <circle cx="20" cy="14" r="2.5" fill="#f59e0b" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight text-forest-950 font-sans leading-none ${textClassName}`}>
            LEAFLINE
          </span>
          <span className="text-[10px] tracking-widest font-semibold uppercase text-leaf-600 mt-0.5">
            Soil & Nutrient Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
export default Logo;
