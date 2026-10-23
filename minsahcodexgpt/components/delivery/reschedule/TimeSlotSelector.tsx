'use client';

import { Sun, Sunset, Moon, Clock } from 'lucide-react';
import { TimeSlotOption } from './types';

export const TIME_SLOTS: TimeSlotOption[] = [
  {
    id: 'morning',
    labelBangla: 'সকাল (Morning)',
    labelEnglish: 'Morning',
    timeRange: '10:00 AM – 01:00 PM',
  },
  {
    id: 'afternoon',
    labelBangla: 'দুপুর (Afternoon)',
    labelEnglish: 'Afternoon',
    timeRange: '01:00 PM – 05:00 PM',
    isPopular: true,
  },
  {
    id: 'evening',
    labelBangla: 'সন্ধ্যা (Evening)',
    labelEnglish: 'Evening',
    timeRange: '05:00 PM – 09:00 PM',
  },
];

interface TimeSlotSelectorProps {
  selectedSlotId: string;
  onSelectSlot: (slot: TimeSlotOption) => void;
}

export function TimeSlotSelector({
  selectedSlotId,
  onSelectSlot,
}: TimeSlotSelectorProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case 'morning':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'afternoon':
        return <Sunset className="w-5 h-5 text-[#1c3a13]" />;
      default:
        return <Moon className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider font-bold text-[#181C1A] flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-[#1c3a13]" />
        <span>পছন্দের ডেলিভারি শিফট (Preferred Time Slot)</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`p-3.5 rounded-2xl flex items-center justify-between transition text-left shadow-xs ${
                isSelected
                  ? 'bg-[#F2F6F0] border-2 border-[#1c3a13]'
                  : 'bg-white border border-[#E2DED8] hover:border-[#1c3a13]'
              }`}
            >
              <div className="flex items-center gap-3">
                {getIcon(slot.id)}
                <div>
                  <div
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isSelected ? 'text-[#1c3a13]' : 'text-[#181C1A]'
                    }`}
                  >
                    <span>{slot.labelBangla}</span>
                    {slot.isPopular && (
                      <span className="text-[9px] bg-[#ccee9b] text-[#1c3a13] px-1.5 py-0.2 rounded font-extrabold border border-[#B5C4BB]">
                        Popular
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] ${
                      isSelected ? 'text-[#1c3a13] font-semibold' : 'text-[#5A615D]'
                    }`}
                  >
                    {slot.timeRange}
                  </div>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                  isSelected
                    ? 'bg-[#1c3a13] border-[#1c3a13]'
                    : 'border-[#B5C4BB]'
                }`}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 bg-[#D4F6A2] rounded-full" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
