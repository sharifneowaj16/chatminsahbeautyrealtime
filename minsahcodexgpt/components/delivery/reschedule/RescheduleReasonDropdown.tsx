'use client';

import { HelpCircle, ChevronDown } from 'lucide-react';

export const RESCHEDULE_REASONS = [
  { value: 'Not home', label: 'Not at home or office' },
  { value: 'Want different date', label: 'Prefer different delivery date or time' },
  { value: 'Wrong address', label: 'Need delivery address update' },
  { value: 'Cash preparation', label: 'Need more time for Cash on Delivery payment' },
  { value: 'Other', label: 'Other reason' },
];

interface RescheduleReasonDropdownProps {
  selectedReason: string;
  onSelectReason: (val: string) => void;
}

export function RescheduleReasonDropdown({
  selectedReason,
  onSelectReason,
}: RescheduleReasonDropdownProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="reschedule-reason-select"
        className="text-xs uppercase tracking-wider font-bold text-[#2D1F18] flex items-center gap-1.5"
      >
        <HelpCircle className="w-4 h-4 text-emerald-800" />
        <span>Reason for Rescheduling</span>
      </label>

      <div className="relative">
        <select
          id="reschedule-reason-select"
          value={selectedReason}
          onChange={(e) => onSelectReason(e.target.value)}
          className="w-full bg-white border border-[#EADFD5] focus:border-emerald-700 text-[#2D1F18] text-xs rounded-2xl p-3.5 pr-10 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-700 transition cursor-pointer shadow-xs"
        >
          {RESCHEDULE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A6E65] flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
