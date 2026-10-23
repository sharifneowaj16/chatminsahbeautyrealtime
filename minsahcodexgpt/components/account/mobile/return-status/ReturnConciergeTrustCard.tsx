'use client';

import { MessageSquare, ShieldCheck } from 'lucide-react';

export function ReturnConciergeTrustCard() {
  return (
    <section className="w-full bg-white rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#062402] flex items-center justify-center text-white shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-[#1a1c1a]">
            Skincare Concierge Dhaka
          </span>
          <span className="text-xs text-[#43483f]">
            Live beauty specialists available (9 AM – 11 PM)
          </span>
        </div>
      </div>

      <a
        href="https://wa.me/8801712345678?text=Hi%20Minsah%20Beauty,%20I%20have%20an%20inquiry%20regarding%20my%20return%20pickup"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 px-4 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#062402] text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 border border-[#E2DED8]/40"
      >
        <MessageSquare className="w-4 h-4 text-emerald-600" />
        <span>Chat with Beauty Concierge</span>
      </a>

      <div className="pt-2 flex items-center justify-center gap-2 text-center text-[#43483f]">
        <ShieldCheck className="w-4 h-4 text-[#4b6723] flex-shrink-0" />
        <span className="text-[11px] font-medium">
          Consumer Protection Act (BD No. 26) Compliant • 10x Authenticity Guarantee
        </span>
      </div>
    </section>
  );
}
