'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, Loader2, Check } from 'lucide-react';

interface DesktopClaimButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function DesktopClaimButton({
  href,
  onClick,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className = '',
}: DesktopClaimButtonProps) {
  const content = (
    <div
      className={`w-full py-2 sm:py-2.5 px-3 rounded-full text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all duration-200 cursor-pointer select-none ${
        isSuccess
          ? 'bg-emerald-600 text-white'
          : 'bg-stone-900 hover:bg-black active:scale-[0.98]'
      } ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>Adding to Cart...</span>
        </>
      ) : isSuccess ? (
        <>
          <Check className="w-3.5 h-3.5 text-white" />
          <span>Added to Cart!</span>
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5 fill-current text-white shrink-0" />
          <span>Claim Offer Now</span>
        </>
      )}
    </div>
  );

  if (href && !onClick) {
    return (
      <Link href={href} className="block w-full mt-3 focus:outline-none">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="block w-full mt-3 focus:outline-none cursor-pointer"
    >
      {content}
    </button>
  );
}
