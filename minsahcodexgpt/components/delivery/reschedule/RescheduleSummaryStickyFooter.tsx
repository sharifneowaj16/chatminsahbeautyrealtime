'use client';

import { CalendarCheck, Loader2 } from 'lucide-react';

interface RescheduleSummaryStickyFooterProps {
  dateStr: string;
  timeStr: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
}

export function RescheduleSummaryStickyFooter({
  dateStr,
  timeStr,
  isSubmitting,
  onConfirm,
}: RescheduleSummaryStickyFooterProps) {
  return (
    <div className="px-5 py-3.5 bg-white border-t border-[#EADFD5] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] relative z-20">
      <div className="text-left w-full sm:w-auto">
        <span className="text-[10px] uppercase text-[#7A6E65] font-bold tracking-wider">
          Reschedule Summary
        </span>
        <p className="text-xs font-bold text-[#2D1F18] flex items-center gap-1.5 mt-0.5">
          <span className="text-emerald-800 font-extrabold">{dateStr}</span>
          <span>•</span>
          <span>{timeStr}</span>
        </p>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onConfirm}
        className="w-full sm:w-auto flex-1 max-w-sm bg-[#1c3a13] hover:bg-[#28531c] text-[#D4F6A2] font-extrabold text-sm py-3 px-6 rounded-full flex items-center justify-center gap-2 tracking-wide uppercase transition hover:brightness-105 active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#D4F6A2]" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CalendarCheck className="w-4 h-4 text-[#D4F6A2]" />
            <span>Confirm Reschedule</span>
          </>
        )}
      </button>
    </div>
  );
}
