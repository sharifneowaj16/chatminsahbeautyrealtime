"use client";

import React from "react";

export interface SeedBenefitsHeaderProps {
  productName?: string;
  resultsIntro?: string;
  className?: string;
}

/**
 * Phase 1: Seed-Style Benefits Section Header
 * 
 * Exact Computed CSS from Seed.com:
 * 
 * Title:
 * - color: rgb(28, 58, 19) (#1C3A13)
 * - font-size: 48px (Mobile: 28px)
 * - font-weight: 400
 * - line-height: 52.8px (1.1)
 * - letter-spacing: -0.96px
 * - margin-bottom: 24px
 * - max-width: 591px
 * - text-align: center
 * 
 * Subtitle:
 * - color: rgb(28, 58, 19) (#1C3A13)
 * - font-size: 16px
 * - font-weight: 400
 * - line-height: 24px
 * - letter-spacing: normal
 * - max-width: 640px
 * - text-align: center
 */
export function SeedBenefitsHeader({
  productName = "DS-01®",
  resultsIntro = "Results you can feel in as little as 7 days.*",
  className = "",
}: SeedBenefitsHeaderProps) {
  const formattedName = productName.trim();

  return (
    <header className={`text-center mx-auto mb-10 sm:mb-14 px-4 ${className}`}>
      {/* Exact 48px / weight 400 / -0.96px letter-spacing / 52.8px line-height / 591px max-width */}
      <h2 className="text-[28px] sm:text-[38px] lg:text-[48px] font-normal text-[#1C3A13] tracking-[-0.5px] sm:tracking-[-0.96px] leading-[1.15] sm:leading-[52.8px] mb-[24px] max-w-[591px] mx-auto antialiased">
        The {formattedName} difference:<br className="hidden sm:inline" />{" "}
        <span className="inline sm:block">Benefits that build over time</span>
      </h2>

      {/* Exact 16px / weight 400 / 24px line-height / 640px max-width */}
      {resultsIntro && (
        <p className="text-[15px] sm:text-[16px] font-normal text-[#1C3A13] leading-[24px] max-w-[640px] mx-auto text-center antialiased">
          {resultsIntro}
        </p>
      )}
    </header>
  );
}

export default SeedBenefitsHeader;
