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
          className="text-xs uppercase tracking-wider font-bold text-[#181C1A] flex items-center gap-1.5"
        >
          <Edit3 className="w-4 h-4 text-[#1c3a13]" />
          <span>রাইডারের জন্য বিশেষ নির্দেশনা (Rider Instructions)</span>
        </label>
        <span className="text-[10px] text-[#5A615D] font-medium">
          {notes.length}/120 অক্ষর
        </span>
      </div>

      <textarea
        id="rider-notes-textarea"
        rows={2}
        maxLength={120}
        value={notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        placeholder="যেমন: বাসায় না পেলে ৩য় তলায় দারোয়ানের কাছে দিন বা পৌঁছানোর ১৫ মিনিট আগে কল করবেন..."
        className="w-full bg-white border border-[#E2DED8] focus:border-[#1c3a13] text-[#181C1A] text-xs rounded-2xl p-3 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1c3a13] transition resize-none shadow-xs"
      />

      <div className="bg-[#F2F6F0] border border-[#B5C4BB] rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-[#1c3a13]">
        <ShieldCheck className="w-4 h-4 text-[#28531c] shrink-0" />
        <span className="font-medium">
          সরাসরি সুরক্ষিত ও নিরাপদ প্যাকেজিং অক্ষত থাকবে। (Safe delivery shield guaranteed).
        </span>
      </div>
    </div>
  );
}
