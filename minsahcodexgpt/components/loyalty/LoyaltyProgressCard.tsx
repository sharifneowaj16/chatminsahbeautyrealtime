'use client';

import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { LoyaltyUserStats } from './types';

interface LoyaltyProgressCardProps {
  stats: LoyaltyUserStats;
  onOpenBreakdown?: () => void;
}

export default function LoyaltyProgressCard({
  stats,
  onOpenBreakdown,
}: LoyaltyProgressCardProps) {
  const percentage = Math.min(
    Math.round((stats.glowPoints / stats.tierTargetPoints) * 100),
    100
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#4b6723]" />
          <h3 className="text-[14px] text-[#062402] font-bold">
            Glow Loyalty
          </h3>
          <span className="px-1.5 py-0.2 rounded bg-[#E8F0E5] text-[#062402] text-[9px] font-bold">
            {stats.tierName}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenBreakdown}
          className="text-[11px] text-[#4b6723] font-bold hover:underline cursor-pointer"
        >
          {stats.glowPoints} / {stats.tierTargetPoints} Pts
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="w-full bg-white h-2 rounded-full overflow-hidden p-0.5 border border-[#E2DED8]/60">
          <div
            className="bg-[#062402] h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1 text-[10px] text-[#43483f]">
          <span className="flex items-center gap-0.5 text-[#4b6723] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> {stats.tierName}
          </span>
          <span>
            {stats.pointsToNextTier} pts to {stats.nextTierName} (Free Express)
          </span>
        </div>
      </div>
    </div>
  );
}
