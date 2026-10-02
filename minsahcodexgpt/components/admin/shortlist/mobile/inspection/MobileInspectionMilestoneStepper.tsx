// components/admin/shortlist/mobile/inspection/MobileInspectionMilestoneStepper.tsx
'use client';

import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

export interface MilestoneStep {
  label: string;
  isDone: boolean;
  isCurrent: boolean;
  time?: string;
}

export interface MobileInspectionMilestoneStepperProps {
  steps?: MilestoneStep[];
  runnerName?: string;
}

export const MobileInspectionMilestoneStepper: React.FC<MobileInspectionMilestoneStepperProps> = ({
  steps,
  runnerName = 'Shakil',
}) => {
  const defaultSteps: MilestoneStep[] = [
    { label: 'Customer Placed', isDone: true, isCurrent: false, time: '11:15 AM' },
    { label: `In Sourcing (${runnerName})`, isDone: false, isCurrent: true, time: 'In Progress' },
    { label: 'Central Hub QA', isDone: false, isCurrent: false, time: '3:30 PM Target' },
    { label: 'Van Dispatched', isDone: false, isCurrent: false },
  ];

  const currentSteps = steps && steps.length > 0 ? steps : defaultSteps;

  return (
    <div className="p-3.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] shadow-md font-mono text-xs select-none">
      <div className="text-xs font-bold text-white mb-2.5 flex items-center justify-between">
        <span>Order Milestones</span>
        <span className="text-[10px] text-emerald-400 font-bold">Step 2 of 4</span>
      </div>

      <div className="flex flex-col gap-2 relative">
        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#172a3e]" />

        {currentSteps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2.5 z-10">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                step.isDone
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : step.isCurrent
                  ? 'bg-indigo-600 text-white animate-pulse ring-2 ring-indigo-400/50'
                  : 'bg-[#122131] border border-[#1c2b3c] text-slate-500'
              }`}
            >
              {step.isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : step.isCurrent ? (
                <Clock className="w-3 h-3" />
              ) : (
                <span className="text-[10px]">{idx + 1}</span>
              )}
            </span>

            <div className="flex-1 flex items-center justify-between">
              <span
                className={`font-semibold font-sans text-xs ${
                  step.isCurrent
                    ? 'text-white'
                    : step.isDone
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
              {step.time && (
                <span className="text-[10px] text-slate-400">{step.time}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default MobileInspectionMilestoneStepper;
