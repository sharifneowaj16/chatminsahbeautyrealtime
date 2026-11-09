'use client';

import React from 'react';
import { Check, Phone, QrCode } from 'lucide-react';

interface WarrantyTelemetryStepperProps {
  currentStep?: number;
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
      <div className="text-xs text-[#8a8f98] font-semibold uppercase tracking-wider">
        Claim Telemetry &amp; Milestones
      </div>

      <div className="relative pl-10 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-[#23252a]">
        {/* Step 1: Completed */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#27a644] flex items-center justify-center text-white ring-4 ring-[#0f1011] shadow-sm">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[#f7f8f8] font-semibold">
              Claim Submitted
            </span>
            <span className="text-[11px] text-[#8a8f98] font-mono">
              Oct 26, 11:30 AM • In-app portal
            </span>
          </div>
        </div>

        {/* Step 2: Completed */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#27a644] flex items-center justify-center text-white ring-4 ring-[#0f1011] shadow-sm">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[#f7f8f8] font-semibold">
              Digital Proof &amp; Batch Verified
            </span>
            <span className="text-[11px] text-[#8a8f98] font-mono">
              Oct 26, 02:15 PM • Authenticity Registry Batch #L92-KR
            </span>
          </div>
        </div>

        {/* Step 3: Current Active Step */}
        <div className="relative pl-1">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#5e6ad2]/20 flex items-center justify-center text-[#828fff] ring-4 ring-[#0f1011] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5e6ad2] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm text-[#f7f8f8] font-semibold">
                Doorstep Exchange Scheduled
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#5e6ad2]/20 text-[#828fff] border border-[#5e6ad2]/30 text-[9px] font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              Rider pickup scheduled {scheduledWindow}
            </p>

            {/* Rider & Hub Callout Box */}
            <div className="mt-2.5 p-3.5 rounded-2xl bg-[#141516] border border-[#23252a] flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#f7f8f8] flex items-center gap-1">
                  {hubName}
                </span>
                <span className="text-[11px] text-[#828fff] font-mono">
                  Assigned: {riderName}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert(`Calling courier ${riderName}...`)}
                  className="flex-1 py-2 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Courier</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Displaying QR Return Slip')}
                  className="flex-1 py-2 rounded-xl bg-[#0f1011] hover:bg-[#18191a] text-[#f7f8f8] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer border border-[#23252a]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#828fff]" />
                  <span>View QR Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Final Step */}
        <div className="relative pl-1 opacity-60">
          <div className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#8a8f98] ring-4 ring-[#0f1011]">
            <span className="w-2 h-2 rounded-full bg-[#35373e]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[#8a8f98]">
              Replacement Handover &amp; Quality Close
            </span>
            <span className="text-[11px] text-[#62666d]">
              Instant replacement handover with batch test seal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}