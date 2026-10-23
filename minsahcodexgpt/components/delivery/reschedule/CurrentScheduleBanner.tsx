'use client';

import { Calendar, Clock } from 'lucide-react';

interface CurrentScheduleBannerProps {
  date: string;
  timeSlot: string;
}

export function CurrentScheduleBanner({
  date = 'আজ, ১৫ নভেম্বর (Friday)',
  timeSlot = '1pm - 5pm',
}: CurrentScheduleBannerProps) {
  return (
    <div className="bg-[#F2F6F0] border border-[#B5C4BB] rounded-2xl p-4 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#E2DED8] flex items-center justify-center text-[#1c3a13] shadow-xs">
          <Calendar className="w-5 h-5 text-[#4b6723]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#5A615D] font-bold">
            বর্তমান ডেলিভারি সময় (Current Schedule)
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-bold text-[#181C1A]">
              {date}
            </span>
            <span className="text-xs text-[#1c3a13] bg-[#ccee9b] px-2.5 py-0.5 rounded-full font-bold border border-[#B5C4BB]">
              {timeSlot}
            </span>
          </div>
        </div>
      </div>
      <Clock className="w-5 h-5 text-[#28531c] shrink-0" />
    </div>
  );
}
