'use client';

import React from 'react';
import Link from 'next/link';

interface PLPMobileHeaderProps {
  title?: string;
  cartCount?: number;
  onOpenSearch?: () => void;
  onOpenCart?: () => void;
}

export default function PLPMobileHeader({
  title = 'Categories',
  cartCount = 2,
  onOpenSearch,
  onOpenCart,
}: PLPMobileHeaderProps) {
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#faf9f6]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(6,36,2,0.04)] border-b border-[#E2DED8]/40">
      <div className="h-16 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            aria-label="Go back"
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#181C1A] hover:bg-[#F2F6F0] active:scale-95 transition-all -ml-1"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="text-[19px] font-bold text-[#181C1A] truncate tracking-tight font-sans">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Search Button */}
          <button
            type="button"
            aria-label="Search catalog"
            onClick={onOpenSearch || (() => { window.location.href = '/shop'; })}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#181C1A] hover:bg-[#F2F6F0] active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Cart Bag Button */}
          <button
            type="button"
            aria-label="Shopping bag"
            onClick={onOpenCart || (() => { window.location.href = '/checkout'; })}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#181C1A] relative hover:bg-[#F2F6F0] active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#1c3a13] text-[#D4F6A2] rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* Profile Circle */}
          <Link
            href="/account"
            aria-label="User Account"
            className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center ml-1 shadow-sm active:scale-95 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
