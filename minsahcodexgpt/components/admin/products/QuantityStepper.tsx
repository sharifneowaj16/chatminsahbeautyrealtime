'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 9999,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const isSm = size === 'sm';

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || value <= min) return;
    onChange(value - 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || value >= max) return;
    onChange(value + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw)) {
      onChange(min);
      return;
    }
    const clamped = Math.max(min, Math.min(max, raw));
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (value < max) onChange(value + 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (value > min) onChange(value - 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-slate-700 bg-slate-950 overflow-hidden ${
        isSm ? 'h-7' : 'h-8'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        className={`flex items-center justify-center transition-colors ${
          isSm ? 'w-6 h-full' : 'w-7 h-full'
        } ${
          value <= min
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Decrease quantity"
      >
        <Minus className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`text-center font-semibold text-slate-100 bg-transparent focus:outline-none tabular-nums ${
          isSm ? 'w-8 text-xs' : 'w-10 text-xs'
        }`}
      />

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        className={`flex items-center justify-center transition-colors ${
          isSm ? 'w-6 h-full' : 'w-7 h-full'
        } ${
          value >= max
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Increase quantity"
      >
        <Plus className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  );
};

export default QuantityStepper;
