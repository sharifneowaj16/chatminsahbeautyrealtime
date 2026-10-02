'use client';

import React from 'react';
import { Check, Clock, XCircle, PackageCheck, RotateCcw } from 'lucide-react';

export type ReturnStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

export interface ReturnStatusStepperProps {
  currentStatus: ReturnStatus;
  className?: string;
}

export const ReturnStatusStepper: React.FC<ReturnStatusStepperProps> = ({
  currentStatus,
  className = '',
}) => {
  const steps = [
    { id: 'pending', label: 'Requested' },
    { id: 'approved', label: 'Approved' },
    { id: 'processing', label: 'In Transit / Inspection' },
    { id: 'completed', label: 'Restocked & Refunded' },
  ];

  if (currentStatus === 'rejected') {
    return (
      <div className={`p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs font-semibold ${className}`}>
        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Return Request Rejected by Management</span>
      </div>
    );
  }

  const getStepIndex = (status: ReturnStatus) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'approved':
        return 1;
      case 'processing':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-rose-600 text-white ring-4 ring-rose-500/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 text-center font-medium max-w-[80px] leading-tight ${
                    isCurrent ? 'text-white font-bold' : isDone ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${
                    idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ReturnStatusStepper;
