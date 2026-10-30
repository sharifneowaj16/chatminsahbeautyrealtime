'use client';

import { useState } from 'react';
import { Tag, Clipboard, ArrowRight } from 'lucide-react';

interface PromoInputBarProps {
  onApply: (code: string) => void;
  disabled?: boolean;
}

export function PromoInputBar({ onApply, disabled }: PromoInputBarProps) {
  const [code, setCode] = useState('');

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setCode(text.trim().toUpperCase());
          return;
        }
      }
    } catch {
      // Fallback
    }
    setCode('FREESHIP');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;
    onApply(code.trim().toUpperCase());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 rounded-[24px] bg-[#F8FAF7] border border-[#E2DED8]/70 shadow-sm flex flex-col gap-2.5"
    >
      <label
        htmlFor="promo-input"
        className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider flex items-center gap-1.5"
      >
        <Tag className="w-3.5 h-3.5 text-[#4b6723]" />
        Add Promo Voucher
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <span className="absolute left-3.5 text-[#4b6723] pointer-events-none flex items-center">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </span>
          <input
            id="promo-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code (e.g., FREESHIP)"
            disabled={disabled}
            className="w-full pl-10 pr-20 py-3 rounded-full bg-[#faf9f6] text-[#062402] placeholder:text-[#5A615D]/60 text-base sm:text-xs font-semibold uppercase tracking-wider border border-[#E2DED8]/60 focus:outline-none focus:border-[#4b6723] focus:ring-2 focus:ring-[#4b6723]/20 shadow-inner transition-all"
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] hover:bg-[#ccee9b] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
          >
            <Clipboard className="w-3 h-3" />
            <span>Paste</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={disabled || !code.trim()}
          className="px-5 py-3 rounded-full bg-[#062402] text-[#faf9f6] hover:bg-[#28531c] disabled:opacity-50 text-xs font-bold active:scale-95 shadow-md hover:shadow-lg transition-all shrink-0 flex items-center gap-1.5 border border-[#acd19b]/30"
        >
          <span>Apply</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
