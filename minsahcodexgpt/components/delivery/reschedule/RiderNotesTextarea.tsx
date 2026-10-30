'use client';

import { Edit3, ShieldCheck } from 'lucide-react';

interface RiderNotesTextareaProps {
  notes: string;
  onChangeNotes: (val: string) => void;
}

export function RiderNotesTextarea({
  notes,
  onChangeNotes,
}: RiderNotesTextareaProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label
          htmlFor="rider-notes-textarea"
          className="text-xs uppercase tracking-wider font-bold text-[#2D1F18] flex items-center gap-1.5"
        >
          <Edit3 className="w-4 h-4 text-emerald-800" />
          <span>Special Instructions for Rider</span>
        </label>
        <span className="text-[10px] text-[#7A6E65] font-medium">
          {notes.length}/120 characters
        </span>
      </div>

      <textarea
        id="rider-notes-textarea"
        rows={2}
        maxLength={120}
        value={notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        placeholder="e.g. Leave with security guard on 3rd floor if not home, or call 15 mins before arrival..."
        className="w-full bg-white border border-[#EADFD5] focus:border-emerald-700 text-[#2D1F18] text-xs rounded-2xl p-3 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 transition resize-none shadow-xs"
      />

      <div className="bg-[#FAF6F2] border border-[#EADFD5] rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-900">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span className="font-medium">
          Original packaging and safety seal guaranteed throughout transit.
        </span>
      </div>
    </div>
  );
}
