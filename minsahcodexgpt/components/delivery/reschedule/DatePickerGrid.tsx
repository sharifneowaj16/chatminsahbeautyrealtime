'use client';

import { CalendarDays } from 'lucide-react';
import { DateSlotOption } from './types';

export const NEXT_7_DAYS: DateSlotOption[] = [
  {
    dateStr: 'Thursday, Nov 14',
    dayLabel: 'Thu',
    dayNumber: 14,
    status: 'past',
    statusLabel: 'Past',
  },
  {
    dateStr: 'Today, Nov 15',
    dayLabel: 'Fri',
    dayNumber: 15,
    status: 'current',
    statusLabel: 'Today',
  },
  {
    dateStr: 'Saturday, Nov 16 (Tomorrow)',
    dayLabel: 'Sat',
    dayNumber: 16,
    status: 'fast',
    statusLabel: 'Tomorrow',
  },
  {
    dateStr: 'Sunday, Nov 17',
    dayLabel: 'Sun',
    dayNumber: 17,
    status: 'available',
    statusLabel: 'Available',
  },
  {
    dateStr: 'Monday, Nov 18',
    dayLabel: 'Mon',
    dayNumber: 18,
    status: 'available',
    statusLabel: 'Available',
  },
  {
    dateStr: 'Tuesday, Nov 19',
    dayLabel: 'Tue',
    dayNumber: 19,
    status: 'available',
    statusLabel: 'Available',
  },
  {
    dateStr: 'Wednesday, Nov 20',
    dayLabel: 'Wed',
    dayNumber: 20,
    status: 'full',
    statusLabel: 'Full',
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
        <label className="text-xs uppercase tracking-wider font-bold text-[#2D1F18] flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-emerald-800" />
          <span>Select New Date</span>
        </label>
        <span className="text-[11px] text-[#7A6E65] font-medium">
          Next 7 days available
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
                className="opacity-40 cursor-not-allowed bg-[#FAF6F2] border border-[#EADFD5] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center"
              >
                <span className="text-[11px] text-gray-400 font-medium">{slot.dayLabel}</span>
                <span className="text-base font-bold text-gray-400 mt-0.5">{slot.dayNumber}</span>
                <span className="text-[9px] text-rose-700 mt-1 font-semibold">{slot.statusLabel}</span>
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
              className="bg-white border border-[#EADFD5] hover:border-[#1c3a13] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition shadow-xs active:scale-95"
            >
              <span className="text-[11px] text-[#7A6E65] font-medium">{slot.dayLabel}</span>
              <span className="text-base font-bold text-[#2D1F18] mt-0.5">{slot.dayNumber}</span>
              <span className="text-[9px] text-emerald-800 font-bold mt-1">{slot.statusLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
