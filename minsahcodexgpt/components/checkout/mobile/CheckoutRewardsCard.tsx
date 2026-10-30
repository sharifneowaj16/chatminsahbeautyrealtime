'use client';

import React from 'react';

interface CheckoutRewardsCardProps {
  voucherCode?: string;
  voucherDiscount?: number;
  onRemoveVoucher?: () => void;
  onOpenVouchers?: () => void;
  glowPointsActive: boolean;
  onToggleGlowPoints: () => void;
  glowPointsDiscount?: number;
  glowPointsAvailable?: number;
  glowPointsToRedeem?: number;
}

export default function CheckoutRewardsCard({
  voucherCode,
  voucherDiscount = 0,
  onRemoveVoucher,
  onOpenVouchers,
  glowPointsActive,
  onToggleGlowPoints,
  glowPointsDiscount = 40,
  glowPointsAvailable = 1280,
  glowPointsToRedeem = 400,
}: CheckoutRewardsCardProps) {
  return (
    <div className="flex flex-col p-5 rounded-[24px] bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg className="text-[#4b6723]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
        <h2 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
          Privileges & Rewards
        </h2>
      </div>

      {/* Applied Promo Card or Apply Prompt */}
      {voucherCode ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#EAF7D8]/50 border border-[#ccee9b]/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#4b6723] text-white flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-[#1c3a13] uppercase tracking-wider">
                  {voucherCode}
                </span>
                <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="text-[11px] text-[#5A615D] truncate">
                ৳{voucherDiscount} voucher discount applied
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenVouchers && (
              <button
                type="button"
                onClick={onOpenVouchers}
                className="text-[11px] font-bold text-[#4b6723] hover:underline"
              >
                Change
              </button>
            )}
            {onRemoveVoucher && (
              <button
                type="button"
                onClick={onRemoveVoucher}
                className="text-[11px] font-bold text-[#5A615D] hover:text-[#ba1a1a] underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenVouchers}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF7] border border-dashed border-[#4b6723]/40 hover:border-[#4b6723] active:scale-[0.99] transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#062402]">
                Apply Coupons &amp; Promo Codes
              </span>
              <span className="text-[11px] text-[#5A615D]">
                Active vouchers and special offers available
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#4b6723]">View →</span>
        </button>
      )}

      {/* Loyalty Points Toggle Switch */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#E2DED8]/60">
        <div className="flex items-center gap-3">
          <svg className="text-[#4b6723]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#181C1A]">
              Redeem {glowPointsToRedeem} Glow Points
            </span>
            <span className="text-[11px] text-[#5A615D]">
              Instant ৳{glowPointsDiscount} saving (Balance: {glowPointsAvailable.toLocaleString('en-US')} pts)
            </span>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={glowPointsActive}
          onClick={onToggleGlowPoints}
          className={`w-12 h-7 rounded-full flex items-center p-0.5 transition-colors ${
            glowPointsActive ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full shadow-sm transition-transform ${
              glowPointsActive
                ? 'bg-[#ccee9b] transform translate-x-5'
                : 'bg-white transform translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
