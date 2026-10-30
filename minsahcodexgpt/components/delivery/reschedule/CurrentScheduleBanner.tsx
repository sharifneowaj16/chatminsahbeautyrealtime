'use client';

import { Calendar, Clock } from 'lucide-react';

interface CurrentScheduleBannerProps {
  date: string;
  timeSlot: string;
}

export function CurrentScheduleBanner({
  date = 'Today, Nov 15 (Friday)',
  timeSlot = '1:00 PM – 5:00 PM',
}: CurrentScheduleBannerProps) {
  return (
    <div className="bg-[#FAF6F2] border border-[#EADFD5] rounded-2xl p-4 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#EADFD5] flex items-center justify-center text-emerald-800 shadow-xs">
          <Calendar className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7A6E65] font-bold">
            Current Delivery Schedule
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-bold text-[#2D1F18]">
              {date}
            </span>
            <span className="text-xs text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              {timeSlot}
            </span>
          </div>
        </div>
      </div>
      <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
    </div>
  );
}
