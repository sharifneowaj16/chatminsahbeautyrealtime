'use client';

import { Sparkles, CheckCircle2, Phone } from 'lucide-react';

export function ConciergeSpecialistCard() {
  return (
    <div className="bg-[#F8FAF7] rounded-2xl p-4 shadow-sm relative overflow-hidden border border-[#E2DED8]/60">
      {/* Live Presence Indicator */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4b6723] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4b6723]" />
        </span>
        <span className="text-[11px] font-bold tracking-wide">
          Dhaka Specialist Online • Avg reply &lt; 2 mins
        </span>
      </div>

      {/* Specialist Identity Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e9e8e5] border-2 border-white shadow-sm flex items-center justify-center">
              {/* Specialist Image */}
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                alt="Farhana K. Senior Concierge"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#062402] text-[#ccee9b] flex items-center justify-center shadow">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[16px] text-[#062402] truncate">
                Farhana K.
              </h3>
              <span className="text-[#25D366] inline-flex items-center" title="WhatsApp Business Verified">
                <CheckCircle2 className="w-4 h-4 fill-current text-white stroke-[#25D366] stroke-[2.5]" />
              </span>
            </div>
            <p className="text-[12px] text-[#5A615D] truncate">
              Senior Skincare Concierge • Gulshan Hub
            </p>
            <div className="inline-flex items-center gap-1 mt-0.5 text-[#4b6723] text-[11px] font-semibold">
              <Phone className="w-3 h-3" />
              <span>+880 1700-MINSAH</span>
              <span className="text-[#5A615D]/70 text-[10px]">(646724)</span>
            </div>
          </div>
        </div>

        {/* Desktop Hub Tag */}
        <div className="hidden sm:flex flex-col items-end text-right shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Location
          </span>
          <span className="text-[12px] text-[#062402] font-semibold">
            Gulshan-2 Desk
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Central Dhaka
          </span>
        </div>
      </div>
    </div>
  );
}
