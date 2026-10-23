'use client';

import React from 'react';
import { Route, Check, Plane, ShieldCheck, Bike, Home, Phone } from 'lucide-react';
import type { TrackingMilestone } from './types';

interface LiveTrackingJourneyStepperProps {
  milestones: TrackingMilestone[];
}

export default function LiveTrackingJourneyStepper({
  milestones,
}: LiveTrackingJourneyStepperProps) {
  const getStepIcon = (iconType: TrackingMilestone['iconType']) => {
    switch (iconType) {
      case 'check':
        return <Check className="w-4 h-4 font-bold" />;
      case 'plane':
        return <Plane className="w-4 h-4" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4" />;
      case 'bike':
        return <Bike className="w-4 h-4" />;
      case 'home':
        return <Home className="w-4 h-4" />;
      default:
        return <Check className="w-4 h-4" />;
    }
  };

  return (
    <div className="px-4 mb-4">
      <div className="p-5 rounded-[28px] bg-[#efeeeb] shadow-xs flex flex-col gap-4 border border-[#E2DED8]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#4b6723]" />
            <h3 className="text-base font-bold text-[#062402]">Live Dispatch Journey</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723] animate-ping" />
            Live Updates
          </span>
        </div>

        {/* Stepper list */}
        <div className="flex flex-col relative pl-2">
          {milestones.map((step, idx) => {
            const isLast = idx === milestones.length - 1;
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';

            return (
              <div key={step.id} className={`flex items-start gap-3.5 relative ${isLast ? '' : 'pb-6'}`}>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2 ${
                      isCompleted ? 'bg-[#062402]' : isActive ? 'bg-[#c3c8bc]' : 'bg-[#e3e2e0]'
                    }`}
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-xs ${
                    isCompleted
                      ? 'bg-[#062402] text-white'
                      : isActive
                        ? 'bg-[#EAF7D8] text-[#062402] ring-2 ring-[#4b6723]'
                        : 'bg-[#e9e8e5] text-[#43483f]'
                  }`}
                >
                  {getStepIcon(step.iconType)}
                </div>

                {/* Step Info */}
                <div className="flex flex-col min-w-0 pt-0.5 flex-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span
                      className={`text-xs font-bold ${
                        isActive
                          ? 'text-[#4b6723]'
                          : isCompleted
                            ? 'text-[#062402]'
                            : 'text-[#43483f]'
                      }`}
                    >
                      {step.title}
                    </span>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#e3e2e0] text-[#062402] text-[9px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#43483f] shrink-0">
                        {step.time}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#43483f] mt-0.5 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Rider quick action if active */}
                  {isActive && step.activeDetails && (
                    <div className="mt-2 p-2.5 rounded-2xl bg-[#EAF7D8]/40 border border-[#EAF7D8] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#4b6723]" />
                        <span className="text-xs font-bold text-[#062402]">
                          {step.activeDetails.riderPhone}
                        </span>
                      </div>
                      <a
                        href={`tel:${step.activeDetails.riderPhone}`}
                        className="px-2.5 py-1 rounded-full bg-[#062402] text-white text-[10px] font-bold active:scale-95 transition-all shadow-xs"
                      >
                        Call Rider
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
