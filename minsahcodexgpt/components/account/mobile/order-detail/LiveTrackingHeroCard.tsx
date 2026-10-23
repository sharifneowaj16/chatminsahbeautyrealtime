'use client';

import React, { useState } from 'react';
import { ShieldCheck, Truck, Copy, Check, MapPin } from 'lucide-react';

interface LiveTrackingHeroCardProps {
  eta: string;
  etaSubtext: string;
  courierPartner: string;
  hub: string;
  trackingAwb: string;
  deliveryDestination: string;
}

export default function LiveTrackingHeroCard({
  eta,
  etaSubtext,
  courierPartner,
  hub,
  trackingAwb,
  deliveryDestination,
}: LiveTrackingHeroCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingAwb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 mb-4">
      <div className="p-5 rounded-[28px] bg-[#062402] text-white shadow-xl relative overflow-hidden flex flex-col gap-4">
        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#28531c]/40 pointer-events-none blur-2xl" />
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Truck className="w-24 h-24 text-white" />
        </div>

        {/* Guarantee Tag & ETA */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e3e2e0] text-[#062402] w-fit shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#062402]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Steadfast &amp; Pathao Express Guarantee
            </span>
          </div>

          <div className="flex flex-col pt-1">
            <span className="text-[#82a573] text-[11px] uppercase font-bold tracking-wide">
              Estimated Arrival
            </span>
            <h2 className="text-[26px] font-bold text-white leading-tight font-sans">
              {eta}
            </h2>
            <p className="text-xs text-[#e9e8e5]/90 mt-0.5 leading-relaxed">{etaSubtext}</p>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <div className="p-3 rounded-2xl bg-[#28531c]/60 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#82a573] font-semibold">
              Courier Partner
            </span>
            <span className="text-xs font-bold text-white truncate">{courierPartner}</span>
            <span className="text-[10px] text-[#ccee9b]">{hub}</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#28531c]/60 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#82a573] font-semibold">
              Tracking AWB
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white tracking-tight">
                {trackingAwb}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy tracking code"
                className="text-[#e3e2e0] hover:text-white active:scale-90 transition-transform p-0.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#c7edb5]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[9px] text-[#e9e8e5]">{copied ? 'Copied to clipboard!' : 'Banani Hub Verified'}</span>
          </div>
        </div>

        {/* Destination Summary Pill */}
        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm flex items-start gap-2.5 relative z-10">
          <MapPin className="w-4 h-4 text-[#e3e2e0] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-white block">Delivery Destination</span>
            <p className="text-[11px] text-[#e9e8e5] truncate">{deliveryDestination}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
