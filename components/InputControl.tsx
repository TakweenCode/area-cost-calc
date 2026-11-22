import React from 'react';
import { sanitizeDecimalInput } from '../utils/calculator';
import { AlertIcon } from './Icons';

interface InputControlProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InputControl: React.FC<InputControlProps> = ({
  id,
  label,
  icon,
  value,
  onChange,
  unit,
  placeholder = '0.00',
  error,
  hint,
  onKeyDown,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeDecimalInput(e.target.value);
    onChange(cleaned);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 dark:text-slate-500">
          {icon}
        </div>
        <input
          type="text"
          inputMode="decimal"
          name={id}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`block w-full min-h-[44px] rounded-lg border bg-white dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-2.5 ps-10 ${
            unit ? 'pe-14' : 'pe-3'
          } text-base font-medium tabular-nums transition-colors duration-150 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-200 dark:border-slate-700 focus:border-teal-700 dark:focus:border-teal-400 focus:ring-teal-700/20 dark:focus:ring-teal-400/20'
          }`}
        />
        {unit && (
          <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {unit}
            </span>
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
};

export default InputControl;
