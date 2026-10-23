'use client';

import React from 'react';
import type { OrderTransitStep } from './types';

interface OrderTransitTimelineProps {
  estimatedDelivery?: string;
  deliveryAddress?: string;
  temperature?: string;
  steps?: OrderTransitStep[];
}

const DEFAULT_STEPS: OrderTransitStep[] = [
  {
    id: 'step-1',
    title: 'Order Placed & Quality Verified',
    time: 'Today, 2:15 PM',
    description: '100% genuine product inspected & authenticated at Banani Central Hub.',
    status: 'completed',
  },
  {
    id: 'step-2',
    title: 'Dispatched via Pathao / Steadfast Courier',
    time: 'Tonight, 11:30 PM',
    description: 'Assigned to verified express courier network for rapid delivery routing.',
    status: 'active',
  },
  {
    id: 'step-3',
    title: 'In Transit to Regional Sorting Hub',
    time: 'Tomorrow, 11:00 AM',
    description: 'Arrived at district delivery hub and assigned to local delivery rider.',
    status: 'upcoming',
  },
  {
    id: 'step-4',
    title: 'Doorstep Delivery & Seal Inspection',
    time: 'Tomorrow, 6:00 PM',
    description: 'Handover at doorstep across 64 districts with tamper-evident seal verification.',
    status: 'upcoming',
  },
];

export default function OrderTransitTimeline({
  estimatedDelivery = 'Tomorrow, by 6:00 PM',
  deliveryAddress = 'Banani Model Town, Dhaka',
  temperature = 'Inspected Sealed',
  steps = DEFAULT_STEPS,
}: OrderTransitTimelineProps) {
  return (
    <section className="rounded-[28px] bg-[#F2F6F0] p-5 shadow-sm flex flex-col border border-[#E2DED8]/60">
      {/* Header with Packaging Control Gauge */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[#E2DED8]/60">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider">
            Express Courier
          </span>
          <h3 className="text-[17px] font-bold text-[#181C1A]">Transit Journey</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-xs border border-[#E2DED8]/40">
          <svg className="text-[#4b6723] animate-spin" style={{ animationDuration: '8s' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
          </svg>
          <span className="text-[11px] font-bold text-[#181C1A]">{temperature}</span>
        </div>
      </div>

      {/* ETA Banner Card */}
      <div className="bg-[#062402] text-white rounded-[22px] p-4 mb-5 flex items-center justify-between gap-3 shadow-md shadow-[#062402]/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#1c3a13] flex items-center justify-center flex-shrink-0 text-[#c7edb5]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-[#c7edb5] uppercase tracking-wider">
              Estimated Delivery
            </span>
            <span className="text-[15px] font-bold text-white truncate">
              {estimatedDelivery}
            </span>
            <span className="text-[12px] text-[#82a573] truncate">
              {deliveryAddress}
            </span>
          </div>
        </div>
        <svg className="text-[#c7edb5] shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      </div>

      {/* Step Tracker Steps */}
      <div className="relative pl-7 space-y-6">
        {/* Continuous tracker vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-[#B5C4BB]" />

        {steps.map((step) => {
          if (step.status === 'completed') {
            return (
              <div key={step.id} className="relative flex flex-col">
                <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-[#062402] text-[#c7edb5] flex items-center justify-center shadow-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[12px] font-bold text-[#181C1A]">{step.title}</span>
                  <span className="text-[10px] font-bold text-[#4b6723]">{step.time}</span>
                </div>
                <p className="text-[11px] text-[#5A615D] mt-0.5 leading-snug">
                  {step.description}
                </p>
              </div>
            );
          }

          if (step.status === 'active') {
            return (
              <div key={step.id} className="relative flex flex-col">
                <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center ring-4 ring-[#F2F6F0]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4b6723] animate-ping" />
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[12px] font-bold text-[#181C1A]">{step.title}</span>
                  <span className="text-[10px] font-semibold text-[#5A615D]">{step.time}</span>
                </div>
                <p className="text-[11px] text-[#5A615D] mt-0.5 leading-snug">
                  {step.description}
                </p>
              </div>
            );
          }

          return (
            <div key={step.id} className="relative flex flex-col opacity-60">
              <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-[#e9e8e5] text-[#5A615D] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#5A615D]" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[12px] font-semibold text-[#181C1A]">{step.title}</span>
                <span className="text-[10px] text-[#5A615D]">{step.time}</span>
              </div>
              <p className="text-[11px] text-[#5A615D] mt-0.5 leading-snug">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
