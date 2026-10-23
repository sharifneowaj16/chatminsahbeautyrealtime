"use client";

import React, { useState } from "react";
import Link from "next/link";
import VipStatusPill from "./VipStatusPill";
import UserProfileBentoCard from "./UserProfileBentoCard";
import LoyaltyProgressCard from "./LoyaltyProgressCard";
import LoyaltyPerksGrid from "./LoyaltyPerksGrid";
import PointsActivityDrawer from "./PointsActivityDrawer";
import SkinProfileBentoCard from "./SkinProfileBentoCard";
import PaymentWalletsBentoCard from "./PaymentWalletsBentoCard";
import { QuickUtilitiesBentoGrid } from "./QuickUtilitiesBentoGrid";
import { BentoLoyaltyRedeemModal } from "./BentoLoyaltyRedeemModal";
import { TierVoucherBreakdownModal } from "./TierVoucherBreakdownModal";
import { LoyaltyUserStats, LoyaltyPerkItem } from "./types";

const DEFAULT_USER_STATS: LoyaltyUserStats = {
  glowPoints: 850,
  glowValueBdt: 425,
  walletBalanceBdt: 400,
  activeTransitCount: 1,
  transitHub: "Dhaka Hub",
  tierName: "Minsah VIP • Tier II",
  nextTierName: "Emerald",
  pointsToNextTier: 350,
  tierTargetPoints: 1200,
  lifetimeTierPoints: 1450,
};

export function BentoProfileView() {
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  const handleClaimPerk = (_perk: LoyaltyPerkItem) => {
    setIsRedeemModalOpen(true);
  };

  const handleOpenBreakdown = () => {
    setIsBreakdownModalOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#1a1c1a] antialiased">
      {/* Mobile Top Sub-Header */}
      <div className="sticky top-0 z-40 bg-[#faf9f6]/90 backdrop-blur-xl border-b border-[#E2DED8]/60 shadow-[0_1px_8px_rgba(6,36,2,0.04)]">
        <div className="h-14 px-4 flex items-center justify-between max-w-lg mx-auto">
          <h1 className="font-title-lg text-[18px] text-[#062402] font-bold tracking-tight">
            Account Profile
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href="/account/settings"
              aria-label="Settings"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F2F6F0] transition-colors text-[#43483f]"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </Link>
            <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center text-white ml-1 shadow-xs">
              <span className="material-symbols-outlined text-[17px]">person</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bento Scrollable Content */}
      <main className="flex flex-col relative w-full pt-3 pb-24 bg-[#faf9f6]">
        <div className="flex flex-col w-full px-4 gap-3 max-w-lg mx-auto">
          {/* Minsah VIP Status Banner */}
          <VipStatusPill />

          {/* Bento Card 1: User Profile Hero + Quick Stats */}
          <UserProfileBentoCard
            stats={DEFAULT_USER_STATS}
            onOpenBreakdown={handleOpenBreakdown}
          />

          {/* Bento Section 2: Loyalty Club & Instant Perks */}
          <div className="bg-[#F2F6F0] rounded-2xl p-3.5 shadow-xs border border-[#E2DED8]/60 space-y-3">
            {/* Loyalty Progress Card */}
            <LoyaltyProgressCard
              stats={DEFAULT_USER_STATS}
              onOpenBreakdown={handleOpenBreakdown}
            />

            {/* Perks Grid */}
            <LoyaltyPerksGrid onClaimPerk={handleClaimPerk} />

            {/* Points Log Drawer */}
            <PointsActivityDrawer
              onOpenFullModal={() => setIsRedeemModalOpen(true)}
            />
          </div>

          {/* Bento Section 3: Clean Skin Profile & Climate Shield */}
          <SkinProfileBentoCard />

          {/* Bento Section 4: Payment & Wallets */}
          <PaymentWalletsBentoCard />

          {/* Bento Section 5: 2x2 Quick Utilities Grid + Sign Out */}
          <QuickUtilitiesBentoGrid />
        </div>
      </main>

      {/* Screen 34: Bento Loyalty Popup Modal */}
      <BentoLoyaltyRedeemModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        onOpenBreakdown={() => setIsBreakdownModalOpen(true)}
      />

      {/* Screen 35: Tier vs Voucher Points Breakdown Modal */}
      <TierVoucherBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        onOpenRedeem={() => setIsRedeemModalOpen(true)}
      />
    </div>
  );
}
export default BentoProfileView;
