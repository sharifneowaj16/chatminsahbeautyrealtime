"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  ShieldCheck,
  TrendingUp,
  Gift,
  Ticket,
  Package,
  Truck,
  Info,
  Sparkles,
} from "lucide-react";

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
      className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-x-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleCloseModal}
      />

      {/* Unified Responsive Modal Surface */}
      <div className="relative bg-[#0f1011] text-[#f7f8f8] rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-[520px] p-5 sm:p-6 shadow-2xl border border-[#23252a] z-10 space-y-3.5 max-h-[88dvh] sm:max-h-[85dvh] overflow-y-auto overflow-x-hidden no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Mobile Grab Handle Bar */}
        <div className="w-12 h-1.5 bg-[#23252a] rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#23252a]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#141516] text-[#828fff] flex items-center justify-center shrink-0 border border-[#23252a]">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#f7f8f8] truncate">
                Tier Points vs. Spendable Points
              </h3>
              <p className="text-[11px] text-[#8a8f98] mt-0.5 truncate">
                Points qualification and voucher breakdown
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg bg-[#141516] hover:bg-[#18191a] flex items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8] transition-colors border border-[#23252a] shrink-0 ml-2 cursor-pointer"
            onClick={handleCloseModal}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bento Card A: Tier Qualifying Points */}
        <div className="rounded-xl p-4 bg-[#141516] text-white relative overflow-hidden border border-[#5e6ad2]/30 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#828fff]" />
              <span className="text-[11px] font-semibold text-[#828fff] tracking-wide uppercase">
                Tier Status
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#5e6ad2]/15 text-[#828fff] text-[10px] font-medium border border-[#5e6ad2]/30">
              Permanent Progress
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <h4 className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">
              Tier Qualifying Points
            </h4>
            <span className="text-sm font-bold text-[#828fff] font-mono">
              1,450 <span className="text-[10px] font-normal text-[#8a8f98]">Lifetime</span>
            </span>
          </div>

          <p className="text-[11px] text-[#8a8f98] leading-relaxed mb-3">
            Points counting toward maintaining <strong className="text-[#f7f8f8]">VIP Tier II</strong> and progressing to Emerald VIP. Points never decrease when discount vouchers are redeemed.
          </p>

          <div className="p-2.5 rounded-xl bg-[#0f1011] border border-[#23252a] space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8a8f98]">
              <span className="flex items-center gap-1 text-[#f7f8f8]">
                <TrendingUp className="w-3.5 h-3.5 text-[#27a644]" />
                Next Goal
              </span>
              <span className="text-[#828fff]">850 / 1,200 Pts</span>
            </div>
            <div className="w-full h-1.5 bg-[#18191a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#27a644] rounded-full"
                style={{ width: "71%" }}
              />
            </div>
            <p className="text-[10px] text-[#8a8f98]">
              350 pts to Emerald Tier (Unlocks Free Express Delivery)
            </p>
          </div>
        </div>

        {/* Bento Card B: Redeemable Voucher Points */}
        <div className="rounded-xl p-4 bg-[#141516] border border-[#23252a] shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#27a644]" />
              <span className="text-[11px] font-semibold text-[#27a644] tracking-wide uppercase">
                Spendable Balance
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#27a644]/15 text-[#27a644] text-[10px] font-semibold border border-[#27a644]/30 font-mono">
              850 Pts Available
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <h4 className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">
              Redeemable Voucher Points
            </h4>
            <span className="text-sm font-bold text-[#27a644] font-mono">
              ৳425 Value
            </span>
          </div>

          <p className="text-[11px] text-[#8a8f98] leading-relaxed mb-3">
            Convertible into instant checkout discount codes, deluxe gifts, and delivery subsidies.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-[#0f1011] border border-[#23252a] text-center">
              <Ticket className="w-3.5 h-3.5 text-[#828fff] mx-auto mb-1" />
              <span className="text-xs font-semibold text-[#f7f8f8] block font-mono">৳200 OFF</span>
              <span className="text-[10px] text-[#8a8f98] font-mono">400 Pts</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0f1011] border border-[#23252a] text-center">
              <Package className="w-3.5 h-3.5 text-[#828fff] mx-auto mb-1" />
              <span className="text-xs font-semibold text-[#f7f8f8] block truncate">Deluxe Mini</span>
              <span className="text-[10px] text-[#8a8f98] font-mono">600 Pts</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0f1011] border border-[#23252a] text-center">
              <Truck className="w-3.5 h-3.5 text-[#27a644] mx-auto mb-1" />
              <span className="text-xs font-semibold text-[#f7f8f8] block">Free Courier</span>
              <span className="text-[10px] text-[#8a8f98] font-mono">300 Pts</span>
            </div>
          </div>
        </div>

        {/* Policy Rule */}
        <div className="rounded-xl p-3 bg-[#141516] border border-[#23252a] flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-[#828fff] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[11px] text-[#f7f8f8]">Policy Rule</p>
            <p className="text-[11px] text-[#8a8f98] leading-relaxed">
              Tier points keep your VIP status locked for 1 calendar year even after redeeming vouchers!
            </p>
          </div>
        </div>

        {/* Modal Action Buttons (Uniform Standard Buttons) */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleSwitchToRedeem}
            className="w-full h-11 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Redeem Vouchers Now</span>
          </button>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-full h-11 rounded-xl bg-[#141516] hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium border border-[#23252a] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
