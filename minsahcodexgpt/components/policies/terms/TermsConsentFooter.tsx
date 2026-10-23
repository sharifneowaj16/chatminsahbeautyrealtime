"use client";

import React, { useState } from "react";

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
              ? "bg-[#1c3a13] border-[#1c3a13] text-[#D4F6A2]"
              : "border-[#B5C4BB] bg-[#FAF9F6]"
          }`}
        >
          {agreed && <span className="material-symbols-outlined text-[15px]">check</span>}
        </span>
        <span className="text-xs text-[#181C1A] font-semibold">
          আমি সকল শর্তাবলী পড়েছি ও সম্মত (I Accept)
        </span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E5EADF] text-xs font-semibold text-[#181C1A] hover:bg-[#F4F3EF] transition-all flex items-center gap-1 active:scale-95 shrink-0"
      >
        <span className="material-symbols-outlined text-[15px] text-[#4b6723]">print</span>
        প্রিন্ট করুন
      </button>
    </div>
  );
}
