'use client';

import React, { useState } from 'react';
import { Check, Printer } from 'lucide-react';

export function TermsConsentFooter() {
  const [agreed, setAgreed] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sticky bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5EADF] px-4 py-3 shadow-lg flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setAgreed(!agreed)}
        className="flex items-center gap-2 text-left cursor-pointer select-none"
      >
        <span
          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
            agreed
              ? 'bg-[#1c3a13] border-[#1c3a13] text-[#D4F6A2]'
              : 'border-[#B5C4BB] bg-[#FAF9F6]'
          }`}
        >
          {agreed && <Check size={14} />}
        </span>
        <span className="text-xs text-[#181C1A] font-semibold">
          I have read and agree to all terms and conditions
        </span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E5EADF] text-xs font-semibold text-[#181C1A] hover:bg-[#F4F3EF] transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
      >
        <Printer size={14} className="text-emerald-700" />
        <span>Print</span>
      </button>
    </div>
  );
}
