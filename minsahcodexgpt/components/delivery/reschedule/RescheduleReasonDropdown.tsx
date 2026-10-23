'use client';

import { HelpCircle, ChevronDown } from 'lucide-react';

export const RESCHEDULE_REASONS = [
  { value: 'Not home', label: 'বাসায় উপস্থিত নেই (Not at home / Office)' },
  { value: 'Want different date', label: 'অন্য তারিখে গ্রহণ করতে চাই (Prefer different date/time)' },
  { value: 'Wrong address', label: 'ঠিকানা পরিবর্তন প্রয়োজন (Address modification)' },
  { value: 'Cash preparation', label: 'ক্যাশ অন ডেলিভারি টাকা প্রস্তুত করতে হবে (COD preparation)' },
  { value: 'Other', label: 'অন্যান্য কারণ (Other reason)' },
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
        className="text-xs uppercase tracking-wider font-bold text-[#181C1A] flex items-center gap-1.5"
      >
        <HelpCircle className="w-4 h-4 text-[#1c3a13]" />
        <span>রিশিডিউল করার কারণ (Reason for Rescheduling)</span>
      </label>

      <div className="relative">
        <select
          id="reschedule-reason-select"
          value={selectedReason}
          onChange={(e) => onSelectReason(e.target.value)}
          className="w-full bg-white border border-[#E2DED8] focus:border-[#1c3a13] text-[#181C1A] text-xs rounded-2xl p-3.5 pr-10 appearance-none focus:outline-none focus:ring-1 focus:ring-[#1c3a13] transition cursor-pointer shadow-xs"
        >
          {RESCHEDULE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A615D] flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
