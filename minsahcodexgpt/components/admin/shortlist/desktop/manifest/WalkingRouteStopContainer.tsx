'use client';

import React from 'react';
import { WalkingRouteStep } from '@/app/admin/shortlist/types';
import { WalkingRouteStepHeader } from './WalkingRouteStepHeader';
import { WalkingRouteItemCard } from './WalkingRouteItemCard';

interface WalkingRouteStopContainerProps {
  step: WalkingRouteStep;
  stepIndex: number;
  onAdjustPrice: (stepIdx: number, delta: number) => void;
  onIncrementPicked: (stepIdx: number) => void;
}

export const WalkingRouteStopContainer: React.FC<WalkingRouteStopContainerProps> = ({
  step,
  stepIndex,
  onAdjustPrice,
  onIncrementPicked,
}) => {
  return (
    <div className="p-3 rounded-xl border border-[#16263c] bg-[#081120] mb-3 shadow-xs">
      <WalkingRouteStepHeader
        stepIndex={stepIndex + 1}
        marketName={step.marketName}
        unitsInStep={step.unitsInStep}
        vendorName={step.vendorName}
        stallAddress={step.stallAddress}
        phone={step.phone}
        contactName={step.contactName}
      />

      <WalkingRouteItemCard
        step={step}
        stepIndex={stepIndex}
        onAdjustPrice={onAdjustPrice}
        onIncrementPicked={onIncrementPicked}
      />
    </div>
  );
};
