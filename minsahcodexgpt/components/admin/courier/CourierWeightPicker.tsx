'use client';

import React from 'react';
import { Scale, Package, FileText } from 'lucide-react';

export interface CourierWeightPickerProps {
  weightKg: number;
  onChange: (weightKg: number) => void;
  itemType?: 'parcel' | 'document';
  onItemTypeChange?: (type: 'parcel' | 'document') => void;
  disabled?: boolean;
  className?: string;
}

export const CourierWeightPicker: React.FC<CourierWeightPickerProps> = ({
  weightKg,
  onChange,
  itemType = 'parcel',
  onItemTypeChange,
  disabled = false,
  className = '',
}) => {
  const PRESETS = [0.5, 1, 2, 3];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    onChange(isNaN(raw) ? 0.5 : Math.max(0.1, raw));
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-rose-400" />
          Parcel Weight & Packaging
        </span>
        <span className="text-[11px] font-mono text-emerald-400 font-bold">
          {weightKg} kg ({(weightKg * 1000).toFixed(0)}g)
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Preset Weight Buttons */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                weightKg === p
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {p} kg
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-[11px] text-slate-500">Custom:</label>
          <div className="relative w-20">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={50}
              disabled={disabled}
              value={weightKg}
              onChange={handleInputChange}
              className="w-full h-8 px-2 pr-6 text-xs font-bold text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 tabular-nums"
            />
            <span className="absolute right-2 top-2 text-[10px] text-slate-500 font-medium">kg</span>
          </div>
        </div>
      </div>

      {/* Package Type Selector if supported */}
      {onItemTypeChange && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400">Parcel Type:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onItemTypeChange('parcel')}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                itemType === 'parcel'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-3 h-3" />
              Standard Parcel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onItemTypeChange('document')}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                itemType === 'document'
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              Document / Flier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierWeightPicker;
