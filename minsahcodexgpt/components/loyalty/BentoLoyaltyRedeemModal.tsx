"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  X,
  History,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Ticket,
  Star,
  Users,
  Download,
} from "lucide-react";

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
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-x-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleCloseModal}
      />

      {/* Unified Responsive Modal Surface */}
      <div className="relative bg-[#0f1011] text-[#f7f8f8] rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-[520px] p-5 sm:p-6 shadow-2xl border border-[#23252a] z-10 space-y-4 max-h-[88dvh] sm:max-h-[85dvh] overflow-y-auto overflow-x-hidden no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Mobile Grab Handle Bar */}
        <div className="w-12 h-1.5 bg-[#23252a] rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141516] border border-[#23252a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#18191a] text-[#828fff] flex items-center justify-center shrink-0 border border-[#23252a]">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#f7f8f8] truncate">
                  Points Activity &amp; History
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#5e6ad2]/15 text-[#828fff] text-[10px] font-semibold border border-[#5e6ad2]/30 shrink-0 font-mono">
                  {mounted ? (user?.loyaltyPoints || 850).toLocaleString() : '850'} Pts
                </span>
              </div>
              <p className="text-[11px] text-[#8a8f98] mt-0.5 truncate">
                Prestige Club transaction ledger
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg bg-[#18191a] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors border border-[#23252a] flex items-center justify-center shrink-0 ml-2 cursor-pointer"
            onClick={handleCloseModal}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loyalty VIP Card Banner */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-[#141516] via-[#0f1011] to-[#0a0a0c] text-white rounded-xl p-4 border border-[#5e6ad2]/30 shadow-lg relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#5e6ad2]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header row inside card */}
            <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
              <div className="rounded-md bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 text-[#828fff] px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Minsah VIP • Tier II</span>
              </div>
              <button
                type="button"
                onClick={handleSwitchToBreakdown}
                className="rounded-lg bg-[#18191a] hover:bg-[#23252a] text-[#828fff] text-[11px] px-2.5 py-1 font-medium transition-all border border-[#23252a] flex items-center gap-1 cursor-pointer"
              >
                <span>Tier Perks</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Points Balance */}
            <div className="relative z-10 space-y-2 mb-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-bold text-[#f7f8f8] font-mono leading-none">
                  {mounted ? (user?.loyaltyPoints || 850).toLocaleString() : '850'}
                </span>
                <span className="text-[#828fff] text-sm font-semibold font-mono">Pts</span>
                <span className="rounded-md bg-[#18191a] px-2 py-0.5 text-[10px] text-[#27a644] font-semibold border border-[#27a644]/30 font-mono">
                  ৳{Math.floor(((user?.loyaltyPoints || 850) / 2)).toLocaleString()} Value
                </span>
                <span className="rounded-md bg-[#27a644]/20 text-[#27a644] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ml-auto">
                  Ready to Redeem
                </span>
              </div>
            </div>

            {/* Status Progress */}
            <div className="relative z-10 space-y-1.5 pt-2.5 border-t border-[#23252a]">
              <div className="flex items-center justify-between text-[11px] text-[#8a8f98] font-mono">
                <span>350 pts to Emerald Tier</span>
                <span className="text-[#828fff]">850 / 1,200 Pts</span>
              </div>
              <div className="w-full h-1.5 bg-[#18191a] rounded-full overflow-hidden p-0">
                <div
                  className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#27a644] rounded-full transition-all duration-500"
                  style={{ width: "71%" }}
                />
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All', count: '12' },
              { id: 'earned', label: 'Earned (+)', count: '+350' },
              { id: 'spent', label: 'Spent (-)', count: '-400' },
              { id: 'vouchers', label: 'Vouchers', count: '' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as FilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  activeFilter === f.id
                    ? 'bg-[#18191a] text-white border border-[#5e6ad2]/50 shadow-sm'
                    : 'bg-[#141516] text-[#8a8f98] border border-[#23252a] hover:text-[#f7f8f8]'
                }`}
              >
                <span>{f.label}</span>
                {f.count && (
                  <span className="px-1.5 py-0.2 rounded bg-[#0f1011] text-[9px] font-mono">
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Transaction Activity List */}
          <div className="space-y-2 text-xs">
            {(activeFilter === "all" || activeFilter === "earned") && (
              <div className="rounded-xl p-3 bg-[#141516] border border-[#23252a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#18191a] text-[#27a644] flex items-center justify-center shrink-0 border border-[#23252a]">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-[#f7f8f8] truncate">
                      Anua Heartleaf Toner Order
                    </h4>
                    <p className="text-[10px] text-[#8a8f98] truncate">
                      #MB-77102 • Banani Express
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[#27a644] font-mono block">
                    +180 Pts
                  </span>
                  <span className="text-[10px] text-[#8a8f98]">Credited</span>
                </div>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "spent" || activeFilter === "vouchers") && (
              <div className="rounded-xl p-3 bg-[#141516] border border-[#23252a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#18191a] text-[#828fff] flex items-center justify-center shrink-0 border border-[#23252a]">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-[#f7f8f8] truncate">
                      Redeemed ৳200 OFF Voucher
                    </h4>
                    <p className="text-[10px] text-[#8a8f98] truncate">
                      Cart Applied • Code: GLOW200
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-rose-400 font-mono block">
                    -400 Pts
                  </span>
                  <span className="text-[10px] text-[#8a8f98]">Applied</span>
                </div>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "earned") && (
              <div className="rounded-xl p-3 bg-[#141516] border border-[#23252a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#18191a] text-[#27a644] flex items-center justify-center shrink-0 border border-[#23252a]">
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-[#f7f8f8] truncate">
                      Verified Review &amp; Photo Swatch
                    </h4>
                    <p className="text-[10px] text-[#8a8f98] truncate">
                      Laneige Lip Glow • Verified Buyer
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[#27a644] font-mono block">
                    +120 Pts
                  </span>
                  <span className="text-[10px] text-[#8a8f98]">Verified</span>
                </div>
              </div>
            )}
          </div>

          {/* Refer a Skincare Friend */}
          <div className="rounded-xl p-3 bg-[#141516] border border-[#5e6ad2]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#18191a] text-[#828fff] flex items-center justify-center shrink-0 border border-[#23252a]">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs text-[#f7f8f8] truncate">
                  Refer a Beauty Enthusiast
                </h4>
                <p className="text-[10px] text-[#8a8f98] truncate">
                  Give ৳150, Earn +200 Glow Pts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const refParam = user?.referralCode ? `?ref=${encodeURIComponent(user.referralCode)}` : "";
                navigator.clipboard?.writeText(window.location.origin + refParam);
                alert("Referral link copied! Share with friends to earn +200 Glow Points.");
              }}
              className="h-9 px-3 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-[11px] font-semibold cursor-pointer active:scale-95 transition-all"
            >
              Share Code
            </button>
          </div>
        </div>

        {/* Modal Action Footers (Uniform Standard Buttons) */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => alert("Points statement and invoice generated! Downloading PDF...")}
            className="w-full h-11 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Points Statement</span>
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
