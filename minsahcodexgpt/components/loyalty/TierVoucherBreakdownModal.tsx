"use client";

import React, { useState, useEffect } from "react";

interface TierVoucherBreakdownModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenRedeem?: () => void;
}

export function TierVoucherBreakdownModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpenRedeem,
}: TierVoucherBreakdownModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  useEffect(() => {
    const handleOpen = () => setInternalOpen(true);
    const handleClose = () => setInternalOpen(false);

    window.addEventListener("minsah:open-tier-breakdown", handleOpen);
    window.addEventListener("minsah:close-tier-breakdown", handleClose);

    return () => {
      window.removeEventListener("minsah:open-tier-breakdown", handleOpen);
      window.removeEventListener("minsah:close-tier-breakdown", handleClose);
    };
  }, []);

  const handleCloseModal = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSwitchToRedeem = () => {
    handleCloseModal();
    if (onOpenRedeem) {
      onOpenRedeem();
    } else {
      window.dispatchEvent(new CustomEvent("minsah:open-loyalty-modal"));
    }
  };

  if (!isModalOpen) return null;

  return (
    <div
      id="tier-voucher-breakdown-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleCloseModal}
      />

      {/* Modal Surface */}
      <div className="relative bg-[#faf9f6] rounded-t-[32px] sm:rounded-[28px] w-full max-w-lg p-5 sm:p-6 shadow-[0_20px_50px_rgba(6,36,2,0.28)] border border-[#E2DED8] z-10 space-y-3.5 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-[#E2DED8] rounded-full mx-auto sm:hidden -mt-1 mb-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1c3a13] text-[#ccee9b] flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">account_tree</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-title-lg text-[16px] text-[#062402] font-bold tracking-tight truncate">
                Tier Points vs. Voucher Points
              </h3>
              <p className="font-body-md text-[11px] text-[#43483f] truncate">
                Points &amp; Tier Balance Breakdown
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#43483f] hover:text-[#062402] hover:bg-[#E8F0E5] transition-colors border border-[#E2DED8] active:scale-95 shrink-0 ml-2"
            onClick={handleCloseModal}
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>

        {/* Bento Card A: Tier Qualifying Points */}
        <div className="rounded-2xl p-4 bg-[#1c3a13] text-white relative overflow-hidden shadow-lg border border-[#ccee9b]/25">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#ccee9b]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-[#ccee9b]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-[#ccee9b]">
                  shield_with_heart
                </span>
              </div>
              <span className="font-label-md text-[11px] font-bold text-[#ccee9b] tracking-wide uppercase">
                Bento Card A
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 font-label-md text-[10px] font-medium border border-white/15">
              Status Progress
            </span>
          </div>

          <div className="relative z-10 flex items-baseline justify-between mb-1">
            <h4 className="font-title-lg text-[15px] font-bold text-white">
              Tier Qualifying Points
            </h4>
            <span className="font-title-lg text-[18px] text-[#ccee9b] font-bold">
              1,450 <span className="text-[11px] font-normal text-white/80">Lifetime</span>
            </span>
          </div>

          <p className="relative z-10 font-body-md text-[11px] text-white/80 leading-relaxed mb-3">
            Points counting toward maintaining{" "}
            <strong className="text-[#ccee9b]">Minsah VIP • Tier II</strong> and progressing to
            Emerald VIP. Points never decrease when vouchers are claimed.
          </p>

          <div className="relative z-10 p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-label-md">
              <span className="text-white/90 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[#ccee9b]">
                  trending_up
                </span>{" "}
                Next Status Goal
              </span>
              <span className="text-[#ccee9b] font-bold">850 / 1,200 Pts</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ccee9b] rounded-full"
                style={{ width: "71%" }}
              />
            </div>
            <p className="font-body-md text-[10px] text-white/70 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-[#ccee9b]">
                lock_open
              </span>{" "}
              350 pts to Emerald Tier (Unlocks Free Express Delivery)
            </p>
          </div>
        </div>

        {/* Bento Card B: Redeemable Voucher Points */}
        <div className="rounded-2xl p-4 bg-[#F2F6F0] border border-[#E2DED8] shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">redeem</span>
              </div>
              <span className="font-label-md text-[11px] font-bold text-[#4b6723] tracking-wide uppercase">
                Bento Card B
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-label-md text-[10px] font-bold border border-[#4b6723]/20">
              Spendable Balance
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <h4 className="font-title-lg text-[15px] font-bold text-[#062402]">
              Redeemable Voucher Points
            </h4>
            <div className="text-right">
              <span className="font-title-lg text-[18px] text-[#4b6723] font-bold">850</span>
              <span className="text-[11px] text-[#43483f] font-semibold ml-1">Pts</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E2DED8] text-[#1c3a13] font-label-md text-[11px] font-bold mb-2">
            <span className="material-symbols-outlined text-[13px] text-[#4b6723]">
              payments
            </span>{" "}
            Instant Value ৳425
          </div>

          <p className="font-body-md text-[11px] text-[#43483f] leading-relaxed mb-3">
            Convertible into instant discount vouchers, deluxe beauty gifts, and shipping subsidies.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white border border-[#E2DED8] text-center">
              <span className="material-symbols-outlined text-[16px] text-[#4b6723] block mx-auto mb-0.5">
                confirmation_number
              </span>
              <span className="font-title-md text-[11px] text-[#062402] font-bold block">
                ৳200 OFF
              </span>
              <span className="font-label-md text-[9px] text-[#43483f]">400 Pts</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-[#E2DED8] text-center">
              <span className="material-symbols-outlined text-[16px] text-[#4b6723] block mx-auto mb-0.5">
                package_2
              </span>
              <span className="font-title-md text-[11px] text-[#062402] font-bold block">
                Laneige Mini
              </span>
              <span className="font-label-md text-[9px] text-[#43483f]">600 Pts</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-[#E2DED8] text-center">
              <span className="material-symbols-outlined text-[16px] text-[#4b6723] block mx-auto mb-0.5">
                local_shipping
              </span>
              <span className="font-title-md text-[11px] text-[#062402] font-bold block">
                Dhaka Express
              </span>
              <span className="font-label-md text-[9px] text-[#43483f]">300 Pts</span>
            </div>
          </div>
        </div>

        {/* Comparison & Policy Rule */}
        <div className="rounded-2xl p-3.5 bg-[#EAF7D8]/80 border border-[#4b6723]/25 shadow-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[#4b6723] shrink-0 mt-0.5">
            info
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-title-md text-[11px] text-[#062402] font-bold leading-tight">
              Comparison &amp; Policy Rule
            </p>
            <p className="font-body-md text-[10px] text-[#1c3a13] leading-relaxed">
              Tier points keep your VIP status even after redeeming vouchers! Expiry policy: Voucher
              points expire in 12 months, Tier status locks for 1 calendar year.
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={handleSwitchToRedeem}
            className="w-full py-3 px-4 rounded-full bg-[#1c3a13] hover:bg-[#062402] text-[#ccee9b] font-label-md text-[12px] font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-[#ccee9b]">
              loyalty
            </span>
            Redeem Vouchers Now
          </button>
          <button
            type="button"
            onClick={() =>
              alert(
                "Minsah VIP Tier II Perks:\n• 2x Glow Points Multiplier\n• Priority Banani Hub Dispatch\n• Free Birthday Gift Deluxe Mini\n• Dedicated WhatsApp Skincare Concierge"
              )
            }
            className="w-full py-2.5 px-4 rounded-full bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#1c3a13] font-label-md text-[12px] font-semibold transition-colors flex items-center justify-center gap-1 active:scale-[0.98] border border-[#E2DED8]"
          >
            <span className="material-symbols-outlined text-[15px]">stars</span> View Tier Benefits
          </button>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-full py-2 px-4 rounded-full bg-transparent hover:bg-black/5 text-[#43483f] font-label-md text-[11px] font-medium transition-colors flex items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
