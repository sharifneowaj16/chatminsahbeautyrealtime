'use client';

import React from 'react';
import { Smartphone, MapPin, Sparkles, Wallet, Truck, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoyaltyUserStats } from './types';

interface UserProfileBentoCardProps {
  stats: LoyaltyUserStats;
  onOpenBreakdown?: () => void;
}

export default function UserProfileBentoCard({
  stats,
  onOpenBreakdown,
}: UserProfileBentoCardProps) {
  const { user } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user?.email ? user.email.split('@')[0] : 'Guest Member');
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MB';

  return (
    <div className="bg-[#F2F6F0] rounded-2xl p-3.5 shadow-sm border border-[#E2DED8]/60 relative overflow-hidden">
      <div className="flex items-center gap-3">
        {/* User Avatar Initials Badge */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-[#062402]/20 bg-[#062402] text-[#ccee9b] flex items-center justify-center font-bold text-base select-none">
          {initials}
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4b6723] rounded-full flex items-center justify-center ring-1 ring-white">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[16px] text-[#062402] font-bold tracking-tight truncate">
              {fullName}
            </h2>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#062402] text-white text-[10px] font-bold">
              <Sparkles className="w-2.5 h-2.5 text-[#D4F6A2]" />
              Minsah VIP
            </span>
          </div>
          {user?.phone && (
            <p className="text-[12px] text-[#43483f] flex items-center gap-1 mt-0.5">
              <Smartphone className="w-3.5 h-3.5" />
              {user.phone}
            </p>
          )}
          <p className="text-[11px] text-[#43483f]/80 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Dhaka, Bangladesh
          </p>
        </div>
      </div>

      {/* Quick Stats Bento Sub-row */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {/* Glow Pts */}
        <div
          onClick={onOpenBreakdown}
          className="bg-white rounded-xl p-2.5 flex flex-col justify-between border border-[#E2DED8]/40 shadow-xs cursor-pointer hover:border-[#4b6723] transition-colors"
        >
          <div className="flex items-center justify-between text-[#43483f]">
            <Sparkles className="w-4 h-4 text-[#4b6723]" />
            <span className="text-[10px] text-[#4b6723] font-bold">
              ৳{stats.glowValueBdt} off
            </span>
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] text-[#062402] font-bold block leading-none">
              {stats.glowPoints}
            </span>
            <span className="text-[10px] text-[#43483f] block mt-0.5">
              Glow Pts
            </span>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="bg-white rounded-xl p-2.5 flex flex-col justify-between border border-[#E2DED8]/40 shadow-xs">
          <div className="flex items-center justify-between text-[#43483f]">
            <Wallet className="w-4 h-4 text-[#062402]" />
            <span className="text-[10px] text-[#062402] font-bold">
              Ready
            </span>
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] text-[#062402] font-bold block leading-none">
              ৳{stats.walletBalanceBdt}
            </span>
            <span className="text-[10px] text-[#43483f] block mt-0.5">
              Wallet
            </span>
          </div>
        </div>

        {/* Live Transit */}
        <div className="bg-white rounded-xl p-2.5 flex flex-col justify-between border border-[#E2DED8]/40 shadow-xs">
          <div className="flex items-center justify-between">
            <Truck className="w-4 h-4 text-[#4b6723]" />
            <span className="w-2 h-2 rounded-full bg-[#4b6723] shrink-0 animate-ping" />
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] text-[#062402] font-bold block leading-none">
              {stats.activeTransitCount} Transit
            </span>
            <span className="text-[10px] text-[#4b6723] block mt-0.5 truncate">
              {stats.transitHub}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
