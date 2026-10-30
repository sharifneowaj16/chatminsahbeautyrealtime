'use client';

import React from 'react';
import { ShieldCheck, Edit3 } from 'lucide-react';
import type { AccountUserProfile } from './types';

interface AccountProfileHeaderCardProps {
  profile: AccountUserProfile;
  onEditProfile?: () => void;
}

export default function AccountProfileHeaderCard({
  profile,
  onEditProfile,
}: AccountProfileHeaderCardProps) {
  return (
    <section className="w-full bg-[#F2F6F0] rounded-3xl p-5 shadow-xs relative overflow-hidden border border-[#E2DED8]/60">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#c7edb5] flex items-center justify-center shadow-inner border-2 border-white">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-[#062402]">
                  {profile.name?.slice(0, 1).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            {profile.isKycVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#D4F6A2] text-[#1c3a13] rounded-full p-0.5 shadow-xs flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 fill-[#1c3a13] text-[#D4F6A2]" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base text-[#062402] font-bold tracking-tight truncate">
                {profile.name}
              </h2>
              <span className="bg-[#ccee9b] text-[#1c3a13] text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider font-bold">
                {profile.vipTier}
              </span>
            </div>
            <p className="text-xs text-[#5A615D] truncate mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-[#5A615D]">{profile.phone}</span>
              {profile.isKycVerified && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#B5C4BB]" />
                  <span className="text-[10px] text-[#4b6723] font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
                    KYC Verified
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Edit Profile"
          onClick={onEditProfile}
          className="shrink-0 h-9 px-3.5 rounded-full bg-white text-[#062402] text-xs font-bold hover:bg-[#E8F0E5] transition-colors shadow-2xs flex items-center gap-1 active:scale-95 border border-[#E2DED8]"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      </div>

      {/* Quick Stats Bento Strip */}
      <div className="grid grid-cols-3 gap-2 mt-4 bg-[#F8FAF7] rounded-2xl p-3 border border-[#E2DED8]/40">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-[#062402] leading-none">
            {profile.stats.glowPoints}
          </span>
          <span className="text-[10px] text-[#5A615D] mt-1 uppercase tracking-wide font-semibold">
            Glow Points
          </span>
        </div>
        <div className="flex flex-col items-center justify-center text-center border-x border-[#E2DED8]/60">
          <span className="text-lg font-bold text-[#062402] leading-none">
            {profile.stats.ordersCount}
          </span>
          <span className="text-[10px] text-[#5A615D] mt-1 uppercase tracking-wide font-semibold">
            Orders
          </span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-[#062402] leading-none">
            ৳{profile.stats.walletBalance}
          </span>
          <span className="text-[10px] text-[#5A615D] mt-1 uppercase tracking-wide font-semibold">
            Wallet
          </span>
        </div>
      </div>
    </section>
  );
}
