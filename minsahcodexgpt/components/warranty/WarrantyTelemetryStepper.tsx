'use client';

import React from 'react';
import { Check, Phone, QrCode } from 'lucide-react';

interface WarrantyTelemetryStepperProps {
  currentStep: number;
  riderName?: string;
  hubName?: string;
  scheduledWindow?: string;
}

export default function WarrantyTelemetryStepper({
  currentStep = 3,
  riderName = 'Hasan M.',
  hubName = 'Banani Delivery Hub',
  scheduledWindow = 'today, 4:00 PM – 6:30 PM',
}: WarrantyTelemetryStepperProps) {
  return (
    <div className="mt-4 pt-1 space-y-4">
      <div className="text-xs text-[#062402] font-bold uppercase tracking-wider">
        Claim Telemetry &amp; Milestones
      </div>

      <div className="relative pl-10 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-[#ccee9b]">
        {/* Step 1: Completed */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#4b6723] flex items-center justify-center text-white ring-4 ring-white shadow-sm">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-[#1a1c1a] font-semibold">
              Claim Submitted
            </span>
            <span className="text-[11px] text-[#43483f]">
              Oct 26, 11:30 AM • In-app portal
            </span>
          </div>
        </div>

        {/* Step 2: Completed */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#4b6723] flex items-center justify-center text-white ring-4 ring-white shadow-sm">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-[#1a1c1a] font-semibold">
              Digital Proof &amp; Batch Verified
            </span>
            <span className="text-[11px] text-[#43483f]">
              Oct 26, 02:15 PM • Authenticity Registry Batch #L92-KR
            </span>
          </div>
        </div>

        {/* Step 3: Current Active Step */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#EAF7D8] flex items-center justify-center text-[#516d29] ring-4 ring-white shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4b6723] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-[#062402] font-bold">
                Doorstep Exchange Scheduled
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#ccee9b] text-[#111f00] text-[9px] font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#43483f] mt-0.5">
              Rider pickup scheduled {scheduledWindow}
            </p>

            {/* Rider & Hub Callout Box */}
            <div className="mt-2.5 p-3 rounded-[16px] bg-[#E8F0E5] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-[#1a1c1a] flex items-center gap-1">
                  {hubName}
                </span>
                <span className="text-[11px] text-[#4b6723] font-bold">
                  Assigned: {riderName}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert(`Calling courier ${riderName}...`)}
                  className="flex-1 py-2 rounded-full bg-[#062402] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Courier</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Displaying QR Return Slip')}
                  className="flex-1 py-2 rounded-full bg-white text-[#1a1c1a] text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-xs cursor-pointer border border-[#E2DED8]/60"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#4b6723]" />
                  <span>View QR Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Final Step */}
        <div className="relative pl-1 opacity-60">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#43483f] ring-4 ring-white">
            <span className="w-2 h-2 rounded-full bg-[#B5C4BB]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-[#1a1c1a]">
              Replacement Handover &amp; Quality Close
            </span>
            <span className="text-[11px] text-[#43483f]">
              Instant replacement handover with batch test seal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
