'use client';

import React from 'react';
import { Bike, Phone, ShieldCheck, Star } from 'lucide-react';
import type { ShipmentCourierInfo } from './types';

interface LiveTrackingCourierCardProps {
  courier?: ShipmentCourierInfo | null;
}

export default function LiveTrackingCourierCard({ courier }: LiveTrackingCourierCardProps) {
  if (!courier || !courier.name) return null;

  return (
    <div className="px-4 mb-4">
      <div className="rounded-[28px] bg-[#F8FAF7] overflow-hidden shadow-xs flex flex-col border border-[#E2DED8]/60">
        {/* Courier Details */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#062402] text-[#ccee9b] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Bike className="w-5 h-5 text-[#c7edb5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#062402]">{courier.name}</span>
                  {courier.partner && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
                      {courier.partner}
                    </span>
                  )}
                </div>
                {(courier.rating || courier.deliveriesCount) && (
                  <p className="text-[11px] text-[#43483f] font-medium mt-0.5 flex items-center gap-1">
                    <span>Verified Rider</span>
                    {courier.rating && (
                      <>
                        <span>• {courier.rating}</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
                      </>
                    )}
                    {courier.deliveriesCount ? (
                      <span>({courier.deliveriesCount.toLocaleString()} deliveries)</span>
                    ) : null}
                  </p>
                )}
              </div>
            </div>

            {courier.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${courier.phone}`}
                  aria-label="Call Rider"
                  className="w-10 h-10 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs"
                >
                  <Phone className="w-4 h-4 text-[#4b6723]" />
                </a>
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-[#efeeeb] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4b6723] shrink-0" />
            <span className="text-[11px] text-[#43483f]">
              Tamper-evident packaging intact. Serialized Authenticity QR on package exterior.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
