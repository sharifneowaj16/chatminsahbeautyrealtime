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
    <div className="pt-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1 text-xs text-[#8a8f98]">
        <a
          href="https://wa.me/8801700000000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-[#828fff] hover:text-white transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-[#27a644]" />
          <span>Need help? Chat on WhatsApp</span>
        </a>
        <span className="text-[11px] text-[#8a8f98] flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
          <span>1-hr review</span>
        </span>
      </div>

      <button
        type="button"
        disabled={isSubmitting || isSuccess}
        onClick={onSubmit}
        className={`w-full py-3 rounded-xl text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
          isSuccess
            ? 'bg-[#27a644]'
            : 'bg-[#5e6ad2] hover:bg-[#828fff]'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Generating Ticket #MB-TK-902...</span>
          </>
        ) : isSuccess ? (
          <>
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Ticket Registered! Courier Assigned</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Submit Claim (1-Hr Review)</span>
          </>
        )}
      </button>
    </div>
  );
}