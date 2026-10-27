'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, Check } from 'lucide-react';

interface MobileClaimButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MobileClaimButton({
  href,
  onClick,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className = '',
}: MobileClaimButtonProps) {
  const content = (
    <div
      className={`px-3 py-1.5 rounded-full text-white text-[11px] font-bold text-center shadow-xs transition-all duration-200 pointer-events-none flex items-center justify-center gap-1 ${
        isSuccess
          ? 'bg-emerald-600 text-white'
          : 'bg-stone-900 hover:bg-black active:scale-95'
      } ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin text-white" />
      ) : isSuccess ? (
        <>
          <Check className="w-3 h-3 text-white" />
          <span>Added!</span>
        </>
      ) : (
        <span>Claim Offer</span>
      )}
    </div>
  );

  if (href && !onClick) {
    return (
      <Link href={href} className="shrink-0 focus:outline-none touch-manipulation">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="shrink-0 focus:outline-none cursor-pointer touch-manipulation relative z-10"
    >
      {content}
    </button>
  );
}
