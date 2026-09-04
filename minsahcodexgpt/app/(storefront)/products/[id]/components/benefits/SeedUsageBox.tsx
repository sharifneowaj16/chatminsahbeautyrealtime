"use client";

import React, { useState } from "react";
import { ArrowRight, ChevronRight, Droplet, Sparkles, BookOpen } from "lucide-react";
import SeedHowToApplyDrawer, { HowToApplyData } from "../hero/SeedHowToApplyDrawer";

export interface SeedUsageBoxProps {
  productName?: string;
  title?: string;
  dosageText?: string;
  proTip?: string;
  usageData?: HowToApplyData;
  onOpenHowToApply?: () => void;
  className?: string;
}

/**
 * Phase 4: Seed-Style Daily Ritual & Dosage Card
 * 
 * Features:
 * - Luxury cream background (#EEEDE6) with 16px/20px radius.
 * - Dropper / container icon with quick dosage summary.
 * - Right Arrow trigger button calling the 4-Bento SeedHowToApplyDrawer.
 * - 100% dynamic support for 300+ multi-brand beauty products.
 */
export function SeedUsageBox({
  productName = "this formulation",
  title = "How to Use: Daily Application Ritual",
  dosageText = "Apply 2–3 drops morning and night onto freshly cleansed, slightly damp skin before heavier creams.",
  proTip = "Pro-Tip: Consistency is key to unlocking compounding cellular barrier results.",
  usageData,
  onOpenHowToApply,
  className = "",
}: SeedUsageBoxProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = () => {
    if (onOpenHowToApply) {
      onOpenHowToApply();
    } else {
      setIsDrawerOpen(true);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      <div
        className={`w-full max-w-[580px] bg-[#EEEDE6] rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 border border-[#1C3A13]/10 shadow-xs flex flex-col space-y-4 ${className}`}
      >
        {/* Top Info Row */}
        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Dropper / Bottle Icon Box */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-white border border-[#1C3A13]/12 flex items-center justify-center text-[#1C3A13] shrink-0 shadow-xs">
            <Droplet className="w-5 h-5 fill-[#1C3A13]/10" />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[14.5px] sm:text-[15.5px] font-bold text-[#1C3A13] tracking-tight mb-1">
              {title}
            </h4>
            <p className="text-[13px] sm:text-[13.5px] text-[#163020]/80 leading-relaxed">
              {dosageText}
            </p>
          </div>
        </div>

        {/* Pro-Tip Pill */}
        {proTip && (
          <div className="bg-white/60 border border-[#1C3A13]/8 px-3.5 py-2 rounded-xl text-[12px] text-[#2F6D20] font-medium flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#2F6D20] shrink-0" />
            <span className="truncate">{proTip}</span>
          </div>
        )}

        {/* Call "How to Apply" Drawer Trigger Link with Right Arrow */}
        <div className="pt-1 border-t border-[#1C3A13]/10">
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="w-full flex items-center justify-between py-2 text-left text-[13px] sm:text-[14px] font-bold text-[#1C3A13] hover:text-[#2F6D20] transition-colors group"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1C3A13]/70 group-hover:text-[#2F6D20]" />
              <span>How to Apply: View Step-by-Step Ritual</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12.5px] font-extrabold group-hover:translate-x-1.5 transition-transform duration-200">
              <span>View Guide</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {/* 4-Bento Ritual Matrix Drawer */}
      <SeedHowToApplyDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        productName={productName}
        usageData={usageData}
      />
    </>
  );
}

export default SeedUsageBox;
