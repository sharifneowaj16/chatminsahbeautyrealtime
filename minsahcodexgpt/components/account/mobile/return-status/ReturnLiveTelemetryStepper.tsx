'use client';

import {
  Check,
  QrCode,
  Bike,
  Package,
  BadgePercent,
  Activity,
} from 'lucide-react';

interface TelemetryStep {
  title: string;
  time?: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
  distance?: string;
  riderName?: string;
  eta?: string;
}

interface ReturnLiveTelemetryStepperProps {
  steps?: TelemetryStep[];
}

const DEFAULT_STEPS: TelemetryStep[] = [
  {
    title: 'Return Approved',
    time: 'Oct 27, 10:14 AM',
    description: 'Reason: Received Wrong Variant. Validated under 14-Day Free Exchange Policy.',
    status: 'completed',
  },
  {
    title: 'Authenticity Hologram Confirmed',
    time: 'Oct 27, 10:25 AM',
    description: 'Genuine export holographic seal authenticated via automated visual scan.',
    status: 'completed',
  },
  {
    title: 'Courier Rider Dispatched',
    description: 'Steadfast / Pathao courier rider is heading to your doorstep.',
    status: 'active',
    distance: '1.4 km away',
    riderName: 'Courier Agent',
    eta: '~14 mins',
  },
  {
    title: 'Doorstep Seal Verification',
    description: 'Rider scans outer package barcode and inspects intact tamper-evident seal.',
    status: 'upcoming',
  },
  {
    title: 'Instant Wallet Settlement',
    description: 'bKash transfer automatically triggered upon barcode confirmation.',
    status: 'upcoming',
  },
];

export function ReturnLiveTelemetryStepper({
  steps = DEFAULT_STEPS,
}: ReturnLiveTelemetryStepperProps) {
  return (
    <section className="w-full bg-white rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#1c3a13]/10 flex items-center justify-center text-[#062402]">
            <Activity className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-[#1a1c1a]">
            Return Telemetry
          </h2>
        </div>
        <span className="text-[10px] font-bold text-[#4b6723] uppercase tracking-wider bg-[#ccee9b]/40 px-2.5 py-0.5 rounded-full">
          Live Feed
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[#efeeeb]">
        {steps.map((step, index) => {
          if (step.status === 'completed') {
            return (
              <div key={index} className="relative">
                <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#4b6723] text-white flex items-center justify-center shadow-sm">
                  {index === 1 ? <QrCode className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a1c1a]">
                      {step.title}
                    </span>
                    {step.time && (
                      <span className="text-[10px] text-[#43483f]">
                        {step.time}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#43483f] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          }

          if (step.status === 'active') {
            return (
              <div key={index} className="relative">
                <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#D4F6A2] text-[#062402] flex items-center justify-center ring-4 ring-[#ccee9b]/50 shadow-sm animate-pulse">
                  <Bike className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col space-y-2 bg-[#f4f3f1] p-3.5 rounded-[22px] border border-[#E2DED8]/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#062402]">
                      {step.title}
                    </span>
                    {step.distance && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ccee9b] text-[#516d29] text-[9px] font-bold uppercase tracking-wider">
                        {step.distance}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#43483f] leading-relaxed">
                    {step.description}
                  </p>

                  {/* En route tracker bar */}
                  <div className="w-full bg-[#062402] text-white rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[11px] font-medium">
                        En route via Kemal Ataturk Ave
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#D4F6A2]">
                      {step.eta || '~14 mins'}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Upcoming step
          return (
            <div key={index} className="relative opacity-60">
              <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#efeeeb] text-[#43483f] flex items-center justify-center">
                {index === 3 ? <Package className="w-3.5 h-3.5" /> : <BadgePercent className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1a1c1a]">
                    {step.title}
                  </span>
                  <span className="text-[10px] text-[#43483f]">
                    {index === steps.length - 1 ? 'Final Step' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-[#43483f] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
