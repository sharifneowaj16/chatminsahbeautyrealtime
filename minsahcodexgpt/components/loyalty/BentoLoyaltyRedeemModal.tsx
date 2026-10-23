"use client";

import React, { useState, useEffect } from "react";

interface BentoLoyaltyRedeemModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenBreakdown?: () => void;
}

type FilterType = "all" | "earned" | "spent" | "vouchers";

export function BentoLoyaltyRedeemModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpenBreakdown,
}: BentoLoyaltyRedeemModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  useEffect(() => {
    const handleOpen = () => setInternalOpen(true);
    const handleClose = () => setInternalOpen(false);

    window.addEventListener("minsah:open-loyalty-modal", handleOpen);
    window.addEventListener("minsah:close-loyalty-modal", handleClose);

    return () => {
      window.removeEventListener("minsah:open-loyalty-modal", handleOpen);
      window.removeEventListener("minsah:close-loyalty-modal", handleClose);
    };
  }, []);

  const handleCloseModal = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSwitchToBreakdown = () => {
    handleCloseModal();
    if (onOpenBreakdown) {
      onOpenBreakdown();
    } else {
      window.dispatchEvent(new CustomEvent("minsah:open-tier-breakdown"));
    }
  };

  if (!isModalOpen) return null;

  return (
    <div
      id="reward-claim-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleCloseModal}
      />

      {/* Modal Surface */}
      <div className="relative bg-[#faf9f6] rounded-t-[32px] sm:rounded-[28px] w-full max-w-lg p-5 sm:p-6 shadow-[0_20px_50px_rgba(6,36,2,0.28)] border border-[#E2DED8] z-10 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-[#E2DED8] rounded-full mx-auto sm:hidden -mt-1 mb-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F6F0] border border-[#E2DED8]/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center shrink-0 border border-[#4b6723]/20 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-title-lg text-[16px] text-[#062402] font-bold tracking-tight leading-tight truncate">
                  Points Activity &amp; History
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#4b6723] font-label-md text-[10px] font-bold shadow-xs border border-[#E2DED8] shrink-0">
                  Live 850 Pts
                </span>
              </div>
              <p className="font-body-md text-[11px] text-[#43483f] mt-0.5 truncate">
                Loyalty transaction log &amp; perks
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#43483f] hover:text-[#062402] hover:bg-[#E8F0E5] transition-colors border border-[#E2DED8] active:scale-95 shrink-0 ml-2"
            onClick={handleCloseModal}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Loyalty VIP Card Banner */}
        <div className="space-y-3">
          <div className="bg-[#1c3a13] text-white rounded-2xl p-4 shadow-xl relative overflow-hidden border border-[#ccee9b]/20">
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#ccee9b]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-28 h-28 bg-[#ccee9b]/10 rounded-full blur-xl pointer-events-none" />

            {/* Header row inside card */}
            <div className="relative z-10 flex items-center justify-between gap-2 mb-3.5">
              <div className="rounded-full bg-[#ccee9b]/20 border border-[#ccee9b]/40 text-[#ccee9b] px-3 py-1 font-label-md text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                <span className="material-symbols-outlined text-[14px] text-[#ccee9b]">
                  auto_awesome
                </span>
                <span>Minsah VIP • Tier II</span>
              </div>
              <button
                type="button"
                onClick={handleSwitchToBreakdown}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-[11px] px-3 py-1 font-label-md font-medium transition-all border border-white/15 flex items-center gap-1 active:scale-95"
              >
                <span>Tier Perks</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>

            {/* Points Balance */}
            <div className="relative z-10 space-y-2 mb-3.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[36px] font-bold text-white tracking-tight leading-none">
                  850
                </span>
                <span className="text-[#ccee9b] text-[18px] font-bold">Pts</span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/80 font-label-md font-medium border border-white/10">
                  ৳425 Instant Value
                </span>
                <span className="rounded-full bg-[#ccee9b] text-[#1c3a13] px-2 py-0.5 text-[9px] font-label-md font-bold uppercase tracking-wider ml-auto">
                  Ready to Redeem
                </span>
              </div>
            </div>

            {/* Status Progress */}
            <div className="relative z-10 space-y-1.5 mb-3.5 pt-3 border-t border-white/15">
              <div className="flex items-center justify-between text-[11px] font-label-md">
                <span className="text-white/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-[#ccee9b]">
                    trending_up
                  </span>{" "}
                  350 pts to Emerald Tier
                </span>
                <span className="text-[#ccee9b] font-bold">850 / 1,200 Pts</span>
              </div>
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden p-0">
                <div
                  className="h-full bg-gradient-to-br from-[#ccee9b] to-[#ccee9b]/80 rounded-full transition-all duration-500"
                  style={{ width: "71%" }}
                />
              </div>
              <p className="text-[10px] text-white/70 font-body-md flex items-center gap-1 mt-1">
                <span>🎁 Unlocks Free Express Delivery &amp; 2x Multiplier</span>
              </p>
            </div>

            {/* Lifetime stats pills */}
            <div className="relative z-10 space-y-2 pt-2.5 border-t border-white/15">
              <div className="space-y-2 w-full">
                <div className="w-full bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#ccee9b]/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-[#ccee9b]">
                        stars
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-white/90 font-label-md">
                      Lifetime Earned
                    </span>
                  </div>
                  <span className="text-[13px] font-bold text-[#ccee9b] font-label-md tracking-tight">
                    +1,450 Pts
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-white/70">
                        confirmation_number
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-white/90 font-label-md">
                      Vouchers Claimed
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold text-white/80 font-label-md tracking-tight">
                    -600 Pts (3)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-[11px] font-bold shadow-xs whitespace-nowrap active:scale-95 transition-all flex items-center gap-1 ${
                activeFilter === "all"
                  ? "bg-[#1c3a13] text-[#ccee9b]"
                  : "bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#43483f] border border-[#E2DED8]"
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#ccee9b]/20 text-[#ccee9b] text-[9px]">
                12
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("earned")}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-[11px] font-semibold border whitespace-nowrap active:scale-95 transition-all flex items-center gap-1 ${
                activeFilter === "earned"
                  ? "bg-[#1c3a13] text-[#ccee9b] border-transparent font-bold"
                  : "bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#43483f] border-[#E2DED8]"
              }`}
            >
              <span>Earned (+)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#EAF7D8] text-[#4b6723] text-[9px]">
                +350
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("spent")}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-[11px] font-semibold border whitespace-nowrap active:scale-95 transition-all flex items-center gap-1 ${
                activeFilter === "spent"
                  ? "bg-[#1c3a13] text-[#ccee9b] border-transparent font-bold"
                  : "bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#43483f] border-[#E2DED8]"
              }`}
            >
              <span>Spent (-)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#380f26]/10 text-[#380f26] text-[9px]">
                -400
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("vouchers")}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-[11px] font-semibold border whitespace-nowrap active:scale-95 transition-all flex items-center gap-1 ${
                activeFilter === "vouchers"
                  ? "bg-[#1c3a13] text-[#ccee9b] border-transparent font-bold"
                  : "bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#43483f] border-[#E2DED8]"
              }`}
            >
              <span>Vouchers</span>
            </button>
          </div>

          {/* Transaction Activity List */}
          <div className="space-y-2">
            {(activeFilter === "all" || activeFilter === "earned") && (
              <div className="rounded-2xl p-3 bg-[#F2F6F0] border border-[#E2DED8] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#4b6723] flex items-center justify-center shrink-0 border border-[#E2DED8]">
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-title-md text-[12px] text-[#062402] font-bold truncate">
                      Anua Heartleaf Toner Order
                    </h4>
                    <p className="font-body-md text-[10px] text-[#43483f] truncate">
                      #MB-77102 • Banani Express • Yesterday
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-title-lg text-[14px] text-[#4b6723] font-bold block">
                    +180 Pts
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-label-md text-[9px] font-bold">
                    Credited
                  </span>
                </div>
              </div>
            )}

            {(activeFilter === "all" ||
              activeFilter === "spent" ||
              activeFilter === "vouchers") && (
              <div className="rounded-2xl p-3 bg-white border border-[#E2DED8] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F2F6F0] text-[#380f26] flex items-center justify-center shrink-0 border border-[#E2DED8]">
                    <span className="material-symbols-outlined text-[18px]">
                      confirmation_number
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-title-md text-[12px] text-[#062402] font-bold truncate">
                      Redeemed ৳200 OFF Voucher
                    </h4>
                    <p className="font-body-md text-[10px] text-[#43483f] truncate">
                      Cart Applied • 24 Oct 2024
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-title-lg text-[14px] text-[#380f26] font-bold block">
                    -400 Pts
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-[#F2F6F0] text-[#43483f] font-label-md text-[9px] font-bold border border-[#E2DED8]">
                    Used
                  </span>
                </div>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "earned") && (
              <div className="rounded-2xl p-3 bg-[#F2F6F0] border border-[#E2DED8] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#4b6723] flex items-center justify-center shrink-0 border border-[#E2DED8]">
                    <span className="material-symbols-outlined text-[18px]">rate_review</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-title-md text-[12px] text-[#062402] font-bold truncate">
                      Written Review &amp; Photo Upload
                    </h4>
                    <p className="font-body-md text-[10px] text-[#43483f] truncate">
                      Laneige Berry Lip • Verified Buyer
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-title-lg text-[14px] text-[#4b6723] font-bold block">
                    +120 Pts
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-label-md text-[9px] font-bold">
                    Verified
                  </span>
                </div>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "earned") && (
              <div className="rounded-2xl p-3 bg-white border border-[#E2DED8] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center shrink-0 border border-[#4b6723]/20">
                    <span className="material-symbols-outlined text-[18px]">celebration</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-title-md text-[12px] text-[#062402] font-bold truncate">
                      Welcome Bonus &amp; Profile Sync
                    </h4>
                    <p className="font-body-md text-[10px] text-[#43483f] truncate">
                      Skin profile quiz completed
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-title-lg text-[14px] text-[#4b6723] font-bold block">
                    +50 Pts
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-label-md text-[9px] font-bold">
                    Granted
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Refer a Skincare Friend */}
          <div className="rounded-2xl p-3 bg-[#EAF7D8]/70 border border-[#4b6723]/25 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#062402] text-[#ccee9b] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">group_add</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-title-md text-[12px] text-[#062402] font-bold truncate">
                  Refer a Skincare Friend
                </h4>
                <p className="font-body-md text-[10px] text-[#1c3a13] truncate">
                  Give ৳150, Earn +200 Glow Pts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + "?ref=MINSAH-TASNEEM");
                alert("Referral link copied! Share with friends to earn +200 Glow Points.");
              }}
              className="shrink-0 py-1.5 px-3 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-[#ccee9b] font-label-md text-[11px] font-bold active:scale-95 transition-all shadow-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">share</span> Refer
            </button>
          </div>
        </div>

        {/* Modal Action Footers */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={() => alert("Points statement and invoice generated! Downloading PDF...")}
            className="w-full py-3 px-4 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-[#ccee9b] font-label-md text-[12px] font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[17px] text-[#ccee9b]">
              download
            </span>
            Download Points Statement
          </button>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-full py-2.5 px-4 rounded-full bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#43483f] hover:text-[#062402] font-label-md text-[12px] font-semibold transition-colors flex items-center justify-center active:scale-[0.98] border border-[#E2DED8]"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
