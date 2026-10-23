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
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full font-bold text-xs shadow-sm transition-all ${
              isActive
                ? 'bg-[#062402] text-white'
                : 'bg-[#efeeeb] text-[#43483f]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isActive
                  ? 'bg-[#D4F6A2] text-[#062402]'
                  : 'bg-[#e3e2e0] text-[#1a1c1a]'
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
