'use client';

interface ReturnStepProgressProps {
  currentStep?: number;
  totalSteps?: number;
}

export function ReturnStepProgress({ currentStep = 1, totalSteps = 3 }: ReturnStepProgressProps) {
  const steps = [
    { num: 1, label: 'Reason' },
    { num: 2, label: 'Evidence' },
    { num: 3, label: 'Resolution' },
  ];

  return (
    <div className="bg-white border-b border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {steps[currentStep - 1]?.label || 'Reason'} Selection
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {steps.map((step) => {
          const isActive = step.num === currentStep;
          const isCompleted = step.num < currentStep;

          return (
            <div key={step.num} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-rose-600'
                    : isActive
                    ? 'bg-rose-600'
                    : 'bg-slate-200'
                }`}
              />
              <p
                className={`text-[10px] font-medium text-center ${
                  isActive
                    ? 'text-rose-700 font-semibold'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
