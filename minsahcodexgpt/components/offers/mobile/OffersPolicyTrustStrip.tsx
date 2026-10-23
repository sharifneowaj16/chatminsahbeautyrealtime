'use client';

import { ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export function OffersPolicyTrustStrip() {
  return (
    <div className="bg-[#F8FAF7] border border-[#E2DED8]/70 rounded-[24px] p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center text-white shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#062402]">
            100% Genuine Batch QR Hologram
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Direct sourcing from authorized worldwide brand laboratories.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center text-white shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#062402]">
            Dhaka Same-Day Express Guarantee
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Delivered fresh in climate-controlled temperature seals.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center text-white shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#062402]">
            7-Day Hassle-Free Authenticity Return
          </span>
          <span className="text-[11px] text-[#5A615D]">
            No questions asked return if batch verification seal fails.
          </span>
        </div>
      </div>
    </div>
  );
}
