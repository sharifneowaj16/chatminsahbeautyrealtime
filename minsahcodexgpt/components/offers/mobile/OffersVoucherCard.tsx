'use client';

import { useState } from 'react';
import { Gift, Sun, Copy, Check } from 'lucide-react';
import { VoucherCode } from './types';

interface OffersVoucherCardProps {
  voucher: VoucherCode;
  onCopyPromo: (code: string) => void;
}

export function OffersVoucherCard({ voucher, onCopyPromo }: OffersVoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    onCopyPromo(voucher.code);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    if (voucher.category === 'sun-care') {
      return <Sun className="w-5 h-5 text-[#062402]" />;
    }
    return <Gift className="w-5 h-5 text-[#062402]" />;
  };

  return (
    <div className="bg-white rounded-[24px] p-4 shadow-sm border border-[#E2DED8]/60 flex flex-col gap-3 justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="self-start px-2.5 py-0.5 rounded-full bg-[#F2F6F0] text-[#5A615D] text-[10px] font-bold tracking-wide uppercase">
            {voucher.categoryLabel}
          </span>
          <h4 className="text-lg leading-snug text-[#062402] font-bold">
            {voucher.title}
          </h4>
          <p className="text-xs text-[#5A615D] leading-relaxed">
            {voucher.description}
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-[#E8F0E5] flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
      </div>

      <div className="bg-[#F8FAF7] rounded-xl px-3 py-2 flex items-center justify-between border border-[#E2DED8]/40">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase text-[#5A615D] tracking-wider font-bold">
            Code
          </span>
          <span className="text-xs text-[#062402] tracking-widest font-bold font-mono">
            {voucher.code}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-3.5 py-1.5 rounded-full bg-[#062402] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
