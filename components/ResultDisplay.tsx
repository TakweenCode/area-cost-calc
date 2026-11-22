import React from 'react';

interface ResultDisplayProps {
  label: string;
  subLabel?: string;
  value: string;
  icon?: React.ReactNode;
  isLarge?: boolean;
  tone?: 'default' | 'muted' | 'accent' | 'discount';
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  label,
  subLabel,
  value,
  icon,
  isLarge = false,
  tone = 'default',
}) => {
  const valueToneClass =
    tone === 'discount'
      ? 'text-emerald-300 dark:text-emerald-300'
      : tone === 'muted'
      ? 'text-slate-300'
      : 'text-white';

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {icon && (
          <div
            className={`shrink-0 flex items-center justify-center rounded-lg ${
              isLarge ? 'w-11 h-11 bg-teal-500/20 text-teal-300' : 'w-9 h-9 bg-white/10 text-slate-200'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className={`${isLarge ? 'text-base font-semibold text-white' : 'text-sm text-slate-300'} leading-snug`}>
            {label}
          </p>
          {subLabel && (
            <p className="text-xs text-slate-400 leading-snug mt-0.5">{subLabel}</p>
          )}
        </div>
      </div>
      <p
        className={`font-bold tabular-nums whitespace-nowrap shrink-0 ${valueToneClass} ${
          isLarge ? 'text-xl sm:text-3xl' : 'text-base sm:text-lg'
        }`}
      >
        {value}
      </p>
    </div>
  );
};

export default ResultDisplay;
