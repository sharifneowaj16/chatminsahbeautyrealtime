'use client';

import { Sun, Sunset, Moon, Clock } from 'lucide-react';
import { TimeSlotOption } from './types';

export const TIME_SLOTS: TimeSlotOption[] = [
  {
    id: 'morning',
    labelBangla: 'Morning',
    labelEnglish: 'Morning',
    timeRange: '10:00 AM – 01:00 PM',
  },
  {
    id: 'afternoon',
    labelBangla: 'Afternoon',
    labelEnglish: 'Afternoon',
    timeRange: '01:00 PM – 05:00 PM',
    isPopular: true,
  },
  {
    id: 'evening',
    labelBangla: 'Evening',
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
        return <Sunset className="w-5 h-5 text-emerald-700" />;
      default:
        return <Moon className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider font-bold text-[#2D1F18] flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-emerald-800" />
        <span>Preferred Time Slot</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`p-3.5 rounded-2xl flex items-center justify-between transition text-left shadow-xs cursor-pointer ${
                isSelected
                  ? 'bg-[#FAF6F2] border-2 border-emerald-800'
                  : 'bg-white border border-[#EADFD5] hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {getIcon(slot.id)}
                <div>
                  <div
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isSelected ? 'text-emerald-900' : 'text-[#2D1F18]'
                    }`}
                  >
                    <span>{slot.labelEnglish}</span>
                    {slot.isPopular && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-extrabold border border-emerald-200">
                        Popular
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] ${
                      isSelected ? 'text-emerald-800 font-semibold' : 'text-[#7A6E65]'
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
                    ? 'bg-emerald-800 border-emerald-800'
                    : 'border-[#EADFD5]'
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
