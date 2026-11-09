'use client';

import React from 'react';
import { WarrantyStep } from './types';

interface WarrantyStepIndicatorProps {
  currentStep: WarrantyStep;
}

export default function WarrantyStepIndicator({ currentStep }: WarrantyStepIndicatorProps) {
  const steps = [
    { num: 1, label: 'Item' },
    { num: 2, label: 'Reason' },
    { num: 3, label: 'Resolution' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((s) => {
        const isActive = s.num === currentStep;
        return (
          <div
            key={s.num}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-xs transition-all ${
              isActive
                ? 'bg-[#5e6ad2] text-white shadow-sm'
                : 'bg-[#141516] border border-[#23252a] text-[#8a8f98]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[#23252a] text-[#8a8f98]'
              }`}
            >
              {s.num}
            </span>
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}