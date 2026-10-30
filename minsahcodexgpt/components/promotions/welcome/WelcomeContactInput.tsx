'use client';

import React from 'react';
import { Phone, Lock } from 'lucide-react';

interface WelcomeContactInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function WelcomeContactInput({
  value,
  onChange,
  disabled,
}: WelcomeContactInputProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2 mb-2.5 sm:mb-3.5">
      <div className="relative flex items-center">
        <Phone className="absolute left-3.5 text-[#5A615D] w-4 h-4" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter your mobile number or email"
          className="w-full bg-white hover:bg-[#FAF9F6] focus:bg-white border border-[#E2DED8] focus:border-[#1c3a13] rounded-full py-2.5 sm:py-3 pl-10 pr-24 text-[12.5px] sm:text-[13px] text-[#181C1A] placeholder-[#8A918C] outline-none transition-all shadow-xs"
        />
        <span className="absolute right-3.5 text-[10px] text-[#1c3a13] font-semibold bg-[#EAF7D8] border border-[#B5C4BB] px-2 py-0.5 rounded-full">
          +880 / BD
        </span>
      </div>
      <p className="text-[10px] text-[#5A615D] text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" />
        <span>Spam-free • Discount code will be sent via SMS immediately</span>
      </p>
    </div>
  );
}
