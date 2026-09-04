"use client";

import React, { useState } from "react";

export interface TimelineStage {
  id: string;
  pillLabel: string; // e.g. "7 Days", "2 Weeks", "4 Weeks", "3 Months"
  headline: string;  // e.g. "Immediate Barrier Soothing & Redness Relief"
  benefits: string[]; // e.g. ["Rapidly calms reactive redness and micro-inflammation", "Quenches parched dermal layers with deep moisture replenishment"]
}

export interface SeedTimelineListProps {
  stages?: TimelineStage[];
  activeStageId?: string;
  onSelectStage?: (stageId: string) => void;
  className?: string;
}

const DEFAULT_STAGES: TimelineStage[] = [
  {
    id: "stage-7-days",
    pillLabel: "7 Days",
    headline: "Immediate Barrier Soothing & Redness Relief",
    benefits: [
      "Rapidly calms reactive redness and micro-inflammation",
      "Quenches parched dermal layers with deep moisture replenishment",
      "Restores immediate surface comfort and prevents trans-epidermal water loss*",
    ],
  },
  {
    id: "stage-2-weeks",
    pillLabel: "2 Weeks",
    headline: "Pore Clarification & Sebum Balance",
    benefits: [
      "Normalizes excess sebum production without stripping skin",
      "Unclogs congested micro-pores and refines uneven skin texture",
      "Promotes a clarified, balanced skin barrier equilibrium*",
    ],
  },
  {
    id: "stage-4-weeks",
    pillLabel: "4 Weeks",
    headline: "Cellular Renewal & Glass-Skin Radiance",
    benefits: [
      "Accelerates epidermal turnover for visible light-reflective glass-skin glow",
      "Visibly softens appearance of fine dry lines and surface dullness",
      "Improves overall tone uniformity and post-blemish clarity*",
    ],
  },
  {
    id: "stage-3-months",
    pillLabel: "3 Months",
    headline: "Long-Term Dermal Barrier Fortification",
    benefits: [
      "Builds permanent cellular barrier resilience against daily oxidative stress",
      "Enhances deep collagen elasticity and structural dermal firmness",
      "Sustains continuous, long-term age-defying skin health*",
    ],
  },
];

/**
 * Phase 2: Seed-Style 4-Stage Progressive Benefits Timeline
 * 
 * Exact 1:1 Computed CSS from Seed.com:
 * 
 * Headline:
 * - color: rgb(0, 0, 0)
 * - font-size: 16px
 * - font-weight: 400
 * - line-height: 24px
 * - letter-spacing: normal
 * 
 * Pill Badge:
 * - background-color: rgb(28, 58, 19) (Active) / rgba(28, 58, 19, 0.08) (Inactive)
 * - color: rgb(252, 252, 247) (Active) / rgb(28, 58, 19) (Inactive)
 * - border-radius: 32px
 * - font-size: 14px
 * - font-weight: 400
 * - height: 30px
 * - letter-spacing: 0.56px
 * - line-height: 14px
 * - padding: 0 12px
 * - white-space: nowrap
 * 
 * Bullet Items:
 * - color: rgb(28, 58, 19) (Active) / rgba(28, 58, 19, 0.45) (Inactive)
 * - font-size: 16px
 * - font-weight: 400
 * - line-height: 24px
 * - list-style-type: disc
 * - list-style-position: outside
 */
export function SeedTimelineList({
  stages = DEFAULT_STAGES,
  activeStageId: controlledActiveId,
  onSelectStage,
  className = "",
}: SeedTimelineListProps) {
  const [internalActiveId, setInternalActiveId] = useState<string>(stages[0]?.id || "stage-7-days");
  
  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;

  const handleStageClick = (stageId: string) => {
    setInternalActiveId(stageId);
    if (onSelectStage) {
      onSelectStage(stageId);
    }
  };

  return (
    <div className={`w-full max-w-[580px] flex flex-col space-y-6 sm:space-y-8 ${className}`}>
      {stages.map((stage, index) => {
        const isActive = stage.id === activeId;

        return (
          <div
            key={stage.id}
            onClick={() => handleStageClick(stage.id)}
            className={`group cursor-pointer transition-all duration-300 relative pl-6 sm:pl-8 select-none ${
              isActive ? "opacity-100" : "opacity-45 hover:opacity-75"
            }`}
          >
            {/* Left Vertical Timeline Connector Line & Dot */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
              {/* Milestone Dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 mt-[10px] ${
                  isActive
                    ? "bg-[#1C3A13] ring-4 ring-[#1C3A13]/20 scale-110"
                    : "bg-[#1C3A13]/30 group-hover:bg-[#1C3A13]/60"
                }`}
              />
              {/* Connector Line (except for last item) */}
              {index < stages.length - 1 && (
                <div className="w-[1.5px] flex-1 bg-[#1C3A13]/15 mt-2" />
              )}
            </div>

            {/* Stage Header Row: [Pill Badge] + [Headline] */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
              {/* Exact Pill Badge: 14px, weight 400, height 30px, tracking 0.56px, rounded 32px */}
              <span
                className={`inline-flex items-center justify-center h-[30px] px-[12px] rounded-[32px] text-[14px] font-normal tracking-[0.56px] leading-[14px] whitespace-nowrap antialiased transition-all duration-300 ${
                  isActive
                    ? "bg-[#1C3A13] text-[#FCFCF7] shadow-sm"
                    : "bg-[#1C3A13]/10 text-[#1C3A13]"
                }`}
              >
                {stage.pillLabel}
              </span>

              {/* Exact Headline: color rgb(0,0,0), 16px, weight 400, leading 24px */}
              <span
                className={`text-[16px] font-normal leading-[24px] tracking-normal antialiased transition-colors duration-200 ${
                  isActive ? "text-[#000000]" : "text-[#1C3A13]"
                }`}
              >
                {stage.headline}
              </span>
            </div>

            {/* Stage Benefits Bullet List: 16px, weight 400, color rgb(28,58,19), list-disc */}
            <ul className="pl-6 space-y-1 mt-2 list-disc list-outside">
              {stage.benefits.map((benefit, bIndex) => (
                <li
                  key={bIndex}
                  className="text-[15px] sm:text-[16px] font-normal text-[#1C3A13] leading-[24px] tracking-normal antialiased"
                >
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default SeedTimelineList;
