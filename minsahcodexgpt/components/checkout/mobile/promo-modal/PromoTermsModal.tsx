'use client';

import { X, ShieldCheck } from 'lucide-react';
import { CouponItem } from './types';

interface PromoTermsModalProps {
  coupon: CouponItem | null;
  onClose: () => void;
}

export function PromoTermsModal({ coupon, onClose }: PromoTermsModalProps) {
  if (!coupon) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-[24px] p-5 shadow-2xl border border-[#E2DED8] flex flex-col gap-4 overflow-x-hidden no-scrollbar">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4b6723] uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Coupon Terms &amp; Conditions</span>
            </div>
            <h3 className="font-bold text-base text-[#062402] mt-0.5">
              {coupon.code} — {coupon.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#5A615D] hover:text-[#062402]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="flex flex-col gap-2 text-xs text-[#5A615D]">
          {coupon.terms.map((term, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723] mt-1.5 shrink-0" />
              <span>{term}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-[#062402] text-white font-bold text-xs hover:bg-[#28531c] transition-all"
        >
          Understood
        </button>
      </div>
    </div>
  );
}
