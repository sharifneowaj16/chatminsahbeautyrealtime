'use client';

import { CalendarDays } from 'lucide-react';
import { DateSlotOption } from './types';

export const NEXT_7_DAYS: DateSlotOption[] = [
  {
    dateStr: 'বৃহস্পতিবার, ১৪ নভে',
    dayLabel: 'Thu',
    dayNumber: 14,
    status: 'past',
    statusLabel: 'অতীত',
  },
  {
    dateStr: 'আজ, ১৫ নভে (Today)',
    dayLabel: 'Fri',
    dayNumber: 15,
    status: 'current',
    statusLabel: 'বর্তমান',
  },
  {
    dateStr: 'শনিবার, ১৬ নভে (Tomorrow)',
    dayLabel: 'Sat',
    dayNumber: 16,
    status: 'fast',
    statusLabel: 'আগামীকাল',
  },
  {
    dateStr: 'রবিবার, ১৭ নভে',
    dayLabel: 'Sun',
    dayNumber: 17,
    status: 'available',
    statusLabel: 'উপলব্ধ',
  },
  {
    dateStr: 'সোমবার, ১৮ নভে',
    dayLabel: 'Mon',
    dayNumber: 18,
    status: 'available',
    statusLabel: 'উপলব্ধ',
  },
  {
    dateStr: 'মঙ্গলবার, ১৯ নভে',
    dayLabel: 'Tue',
    dayNumber: 19,
    status: 'available',
    statusLabel: 'উপলব্ধ',
  },
  {
    dateStr: 'বুধবার, ২০ নভে',
    dayLabel: 'Wed',
    dayNumber: 20,
    status: 'full',
    statusLabel: 'পূর্ণ (Full)',
  },
];

interface DatePickerGridProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export function DatePickerGrid({
  selectedDate,
  onSelectDate,
}: DatePickerGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs uppercase tracking-wider font-bold text-[#181C1A] flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-[#1c3a13]" />
          <span>নতুন তারিখ বেছে নিন (Select New Date)</span>
        </label>
        <span className="text-[11px] text-[#5A615D] font-medium">
          পরবর্তী ৭ দিন উপলব্ধ
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {NEXT_7_DAYS.map((slot) => {
          const isDisabled = slot.status === 'past' || slot.status === 'full';
          const isSelected = selectedDate === slot.dateStr;

          if (isDisabled) {
            return (
              <button
                key={slot.dateStr}
                type="button"
                disabled
                className="opacity-40 cursor-not-allowed bg-[#f4f3f1] border border-[#E2DED8] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center"
              >
                <span className="text-[11px] text-gray-400 font-medium">{slot.dayLabel}</span>
                <span className="text-base font-bold text-gray-400 mt-0.5">{slot.dayNumber}</span>
                <span className="text-[9px] text-[#ba1a1a] mt-1 font-semibold">{slot.statusLabel}</span>
              </button>
            );
          }

          if (isSelected) {
            return (
              <button
                key={slot.dateStr}
                type="button"
                onClick={() => onSelectDate(slot.dateStr)}
                className="relative bg-[#1c3a13] border-2 border-[#1c3a13] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-md transition active:scale-95"
              >
                {slot.status === 'fast' && (
                  <div className="absolute -top-2 bg-[#D4F6A2] text-[#1c3a13] text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase tracking-tighter shadow-xs border border-[#1c3a13]/20">
                    FAST
                  </div>
                )}
                <span className="text-[11px] text-[#D4F6A2] font-bold">{slot.dayLabel}</span>
                <span className="text-base font-extrabold text-white mt-0.5">{slot.dayNumber}</span>
                <span className="text-[9px] text-[#D4F6A2] font-bold mt-1">{slot.statusLabel}</span>
              </button>
            );
          }

          return (
            <button
              key={slot.dateStr}
              type="button"
              onClick={() => onSelectDate(slot.dateStr)}
              className="bg-white border border-[#E2DED8] hover:border-[#1c3a13] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition shadow-xs active:scale-95"
            >
              <span className="text-[11px] text-[#5A615D] font-medium">{slot.dayLabel}</span>
              <span className="text-base font-bold text-[#181C1A] mt-0.5">{slot.dayNumber}</span>
              <span className="text-[9px] text-[#28531c] font-bold mt-1">{slot.statusLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
