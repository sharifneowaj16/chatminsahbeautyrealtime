"use client";

import React, { useMemo } from "react";
import { Star } from "lucide-react";

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface SeedMemberReviewsHeaderProps {
  title?: string;
  averageRating?: number;
  totalReviews?: number;
  distribution?: RatingDistribution | Record<number, number>;
  className?: string;
}

const DEFAULT_DISTRIBUTION: RatingDistribution = {
  5: 13486,
  4: 1256,
  3: 338,
  2: 102,
  1: 125,
};

/**
 * Phase 1: Seed.com Member Reviews Header & Rating Breakdown Matrix
 * 
 * Exact 1:1 Computed CSS from Seed DevTools:
 * - Title: "Member \n Reviews" (48px, font-weight 400, line-height 52.8px, letter-spacing -0.96px, color #1C3A13)
 * - Score: 56px font-weight 500 color #1C3A13
 * - Amber Stars: #D18E34
 * - Rating Bar: Track #E5E4DC, Fill #1C3A13, Height 8px, Radius 4px
 * - Count Numbers: 13px #1C3A13
 */
export function SeedMemberReviewsHeader({
  title = "Member\nReviews",
  averageRating = 4.8,
  totalReviews = 15307,
  distribution = DEFAULT_DISTRIBUTION,
  className = "",
}: SeedMemberReviewsHeaderProps) {
  // Calculate distribution percentages safely
  const { totalCount, calculatedPercentages } = useMemo(() => {
    const d = distribution || DEFAULT_DISTRIBUTION;
    const count5 = Number(d[5] || 0);
    const count4 = Number(d[4] || 0);
    const count3 = Number(d[3] || 0);
    const count2 = Number(d[2] || 0);
    const count1 = Number(d[1] || 0);

    const sum = count5 + count4 + count3 + count2 + count1 || totalReviews || 1;

    return {
      totalCount: sum,
      calculatedPercentages: {
        5: Math.round((count5 / sum) * 100),
        4: Math.round((count4 / sum) * 100),
        3: Math.round((count3 / sum) * 100),
        2: Math.round((count2 / sum) * 100),
        1: Math.round((count1 / sum) * 100),
      },
    };
  }, [distribution, totalReviews]);

  const displayTotal = totalReviews || totalCount;

  return (
    <div className={`w-full max-w-[880px] mx-auto text-center mb-10 sm:mb-14 ${className}`}>
      
      {/* 1. Main Title: Exact 48px, weight 400, line-height 52.8px, letter-spacing -0.96px */}
      <h2 className="text-[34px] sm:text-[42px] lg:text-[48px] font-normal text-[#1C3A13] leading-[1.12] sm:leading-[52.8px] tracking-[-0.6px] sm:tracking-[-0.96px] mb-8 sm:mb-10 whitespace-pre-line antialiased">
        {title}
      </h2>

      {/* 2. Rating Breakdown Matrix: 2-Column Split */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 lg:gap-16">
        
        {/* Left Column: Big Score + 5 Gold Stars + Total Count */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Big Score Number: 56px */}
          <span className="text-[48px] sm:text-[56px] font-medium text-[#1C3A13] leading-none tracking-tight">
            {averageRating.toFixed(1)}
          </span>

          <div className="flex flex-col items-start text-left">
            {/* 5 Amber Stars: #D18E34 */}
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-4 h-4 sm:w-5 sm:h-5 fill-[#D18E34] text-[#D18E34]"
                />
              ))}
            </div>

            {/* Total Reviews Label: 14px */}
            <span className="text-[13px] sm:text-[14px] font-normal text-[#1C3A13]/85 leading-snug">
              Based on {displayTotal.toLocaleString()} reviews
            </span>
          </div>
        </div>

        {/* Center Vertical Divider (Desktop) */}
        <div className="hidden sm:block w-[1px] h-28 bg-[#D8D7CF]" />

        {/* Right Column: 5-Star Distribution Progress Bars */}
        <div className="w-full sm:w-auto flex flex-col space-y-2 min-w-[260px] sm:min-w-[280px]">
          {([5, 4, 3, 2, 1] as const).map((starNum) => {
            const count = (distribution as any)?.[starNum] ?? 0;
            const pct = calculatedPercentages[starNum] || 0;

            return (
              <div
                key={starNum}
                className="flex items-center justify-between sm:justify-start gap-3 text-xs sm:text-[13px] font-normal text-[#1C3A13]"
              >
                {/* Star Number Label + Mini Star */}
                <div className="flex items-center gap-1 w-7 text-right justify-end shrink-0">
                  <span>{starNum}</span>
                  <Star className="w-3 h-3 fill-[#D18E34] text-[#D18E34] shrink-0" />
                </div>

                {/* Progress Bar Track: #E5E4DC (180px Desktop / Flexible Mobile) */}
                <div className="flex-1 sm:w-[180px] h-[8px] bg-[#E5E4DC] rounded-[4px] overflow-hidden">
                  <div
                    className="h-full bg-[#1C3A13] rounded-[4px] transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Count Number */}
                <span className="w-12 sm:w-14 text-right text-[12px] sm:text-[13px] text-[#1C3A13]/80 font-normal shrink-0">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

export default SeedMemberReviewsHeader;
