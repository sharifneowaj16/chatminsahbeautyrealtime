'use client';

import React from 'react';
import { MessageCircle, ShieldCheck, Loader2 } from 'lucide-react';

interface WarrantyClaimSubmitFooterProps {
  isSubmitting: boolean;
  isSuccess: boolean;
  onSubmit: () => void;
}

export default function WarrantyClaimSubmitFooter({
  isSubmitting,
  isSuccess,
  onSubmit,
}: WarrantyClaimSubmitFooterProps) {
  return (
    <div className="fixed bottom-16 inset-x-0 z-40 bg-white/95 backdrop-blur-xl p-4 shadow-[0_-4px_16px_rgba(6,36,2,0.06)] flex flex-col gap-2 border-t border-[#E2DED8]/60">
      <div className="flex items-center justify-between px-1 text-xs">
        <a
          href="https://wa.me/8801700000000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-[#4b6723] hover:text-[#062402]"
        >
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span>Need help? Chat on WhatsApp</span>
        </a>
        <span className="text-[11px] text-[#43483f] flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
          <span>1-hr claim resolution</span>
        </span>
      </div>

      <button
        type="button"
        disabled={isSubmitting || isSuccess}
        onClick={onSubmit}
        className={`w-full py-3.5 rounded-full text-white text-[15px] font-bold active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
          isSuccess
            ? 'bg-[#28531c]'
            : 'bg-[#062402] hover:bg-[#28531c]'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#D4F6A2]" />
            <span>Generating Ticket #MB-TK-902...</span>
          </>
        ) : isSuccess ? (
          <>
            <ShieldCheck className="w-4 h-4 text-[#D4F6A2]" />
            <span>Ticket Registered! Courier Assigned</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-[#D4F6A2]" />
            <span>Submit Claim (1-Hr Review)</span>
          </>
        )}
      </button>
    </div>
  );
}
