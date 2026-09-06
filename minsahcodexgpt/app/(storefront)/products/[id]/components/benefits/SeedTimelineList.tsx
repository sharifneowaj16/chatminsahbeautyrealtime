"use client";

import React, { useState, useEffect, useRef } from "react";

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

export const DEFAULT_STAGES: TimelineStage[] = [
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
 * Dual-Mode Architecture:
 * - Desktop/Laptop (>= 1024px): Option B (Bidirectional Scroll-Spy + Sticky Right Column Pinning)
 * - Mobile (< 1024px): Option A (Cumulative Tap / Click Lock)
 */
export function SeedTimelineList({
  stages = DEFAULT_STAGES,
  activeStageId: controlledActiveId,
  onSelectStage,
  className = "",
}: SeedTimelineListProps) {
  // Mobile active index (Option A: Tap/Click Lock)
  const [mobileIndex, setMobileIndex] = useState<number>(0);

  // Desktop scroll-driven index (Option B: Pure Scroll-Spy)
  const [desktopScrollIndex, setDesktopScrollIndex] = useState<number>(0);

  // Viewport mode: Desktop/Laptop (>= 1024px) vs Mobile (< 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // DOM node references for each stage to calculate exact viewport positions
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Detect Desktop vs Mobile Screen Breakpoint
  useEffect(() => {
    const updateViewportMode = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode, { passive: true });
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  // 2. Sync controlled activeStageId if provided externally
  useEffect(() => {
    if (controlledActiveId) {
      const idx = stages.findIndex((s) => s.id === controlledActiveId);
      if (idx !== -1) {
        setMobileIndex(idx);
        setDesktopScrollIndex(idx);
      }
    }
  }, [controlledActiveId, stages]);

  // 3. Desktop Option B: High-Performance Bidirectional Scroll-Spy
  useEffect(() => {
    if (!isDesktop) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Trigger line: 45% down the viewport (optimal human eye-level reading zone)
          const triggerLine = window.innerHeight * 0.45;
          let highestActive = 0; // Baseline: 7 Days (index 0) is ALWAYS alive!

          stageRefs.current.forEach((el, idx) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // As user scrolls down, when a stage's top reaches or passes the triggerLine, it activates
            // As user scrolls back up (bottom-to-top), if it goes below triggerLine, it gracefully deactivates
            if (rect.top <= triggerLine) {
              highestActive = Math.max(highestActive, idx);
            }
          });

          setDesktopScrollIndex(highestActive);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Run once on mount in case the page is already scrolled
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDesktop]);

  // Calculate Effective Unlocked Milestone Level:
  // - Desktop: Purely 100% scroll-driven (Hover and Click disabled on Desktop/Laptop)
  // - Mobile: Driven by touch/click lock
  const effectiveIndex = isDesktop ? desktopScrollIndex : mobileIndex;

  const handleStageClick = (stageId: string, index: number) => {
    if (isDesktop) {
      // Disabled on Desktop / Laptop mode (1:1 with Seed.com pure scroll)
      return;
    }

    // Mobile (Option A): Tapping locks in the stage cumulatively
    setMobileIndex(index);

    if (onSelectStage) {
      onSelectStage(stageId);
    }
  };

  return (
    <div className={`w-full max-w-[580px] flex flex-col space-y-6 sm:space-y-8 ${className}`}>
      {stages.map((stage, index) => {
        // Stage is unlocked if it's within the cumulative progression (index <= effectiveIndex)
        // Stage 0 (7 Days) is ALWAYS unlocked (0 <= effectiveIndex is always true).
        const isUnlocked = index <= effectiveIndex;
        const isCurrentMilestone = index === effectiveIndex;

        return (
          <div
            key={stage.id}
            ref={(el) => {
              stageRefs.current[index] = el;
            }}
            onClick={isDesktop ? undefined : () => handleStageClick(stage.id, index)}
            className={`group transition-all duration-500 ease-out relative pl-7 sm:pl-9 select-none ${
              isDesktop ? "cursor-default" : "cursor-pointer"
            } ${
              isUnlocked ? "opacity-100" : isDesktop ? "opacity-45" : "opacity-45 hover:opacity-80"
            }`}
          >
            {/* Left Vertical Timeline Connector Line & Dot */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
              {/* Milestone Marker Container */}
              <div className="relative flex items-center justify-center mt-[10px] w-4 h-4">
                {/* Glowing Aura Ring for Current/Active Milestone */}
                {isCurrentMilestone && (
                  <span className="absolute w-5 h-5 rounded-full bg-[#1C3A13]/20 animate-ping duration-1000 pointer-events-none" />
                )}

                {/* Milestone Dot */}
                {isUnlocked ? (
                  <div
                    className={`rounded-full bg-[#1C3A13] transition-all duration-500 ease-out z-10 ${
                      isCurrentMilestone
                        ? "w-3 h-3 ring-4 ring-[#1C3A13]/25 shadow-sm scale-110"
                        : "w-2.5 h-2.5 ring-2 ring-[#1C3A13]/20"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 border-[#1C3A13]/35 bg-[#F4F3EE] transition-all duration-500 ease-out z-10 ${
                      isDesktop ? "" : "group-hover:border-[#1C3A13]/70 group-hover:scale-110"
                    }`}
                  />
                )}
              </div>

              {/* Connector Line (except for last item) */}
              {index < stages.length - 1 && (
                <div className="relative w-[2px] flex-1 bg-[#1C3A13]/15 mt-2 overflow-hidden rounded-full">
                  {/* Animated Active Progress Fill: 700ms Silky Liquid Flow */}
                  <div
                    className={`absolute top-0 left-0 w-full bg-[#1C3A13] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-full ${
                      index < effectiveIndex ? "h-full" : "h-0"
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Stage Header Row: [Pill Badge] + [Headline] */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
              {/* Pill Badge: 450ms smooth crossfade */}
              <span
                className={`inline-flex items-center justify-center h-[30px] px-[12px] rounded-[32px] text-[14px] font-medium tracking-[0.56px] leading-[14px] whitespace-nowrap antialiased transition-all duration-450 ease-out ${
                  isUnlocked
                    ? isCurrentMilestone
                      ? "bg-[#1C3A13] text-[#FCFCF7] shadow-sm ring-2 ring-[#1C3A13]/20"
                      : "bg-[#1C3A13] text-[#FCFCF7] shadow-xs"
                    : isDesktop
                      ? "bg-[#1C3A13]/10 text-[#1C3A13]"
                      : "bg-[#1C3A13]/10 text-[#1C3A13] group-hover:bg-[#1C3A13]/20"
                }`}
              >
                {stage.pillLabel}
              </span>

              {/* Headline */}
              <span
                className={`text-[16px] leading-[24px] tracking-normal antialiased transition-colors duration-400 ease-out ${
                  isUnlocked
                    ? "text-[#000000] font-medium"
                    : "text-[#1C3A13] font-normal"
                }`}
              >
                {stage.headline}
              </span>

              {/* Micro Indicator Tag on Active Tip */}
              {isCurrentMilestone && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6D20] bg-[#2F6D20]/10 px-2 py-0.5 rounded-full uppercase tracking-wider transition-all duration-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6D20] animate-pulse" />
                  Active Milestone
                </span>
              )}
            </div>

            {/* Stage Benefits Bullet List: 400ms transition */}
            <ul className="pl-3 sm:pl-4 space-y-1.5 mt-2.5">
              {stage.benefits.map((benefit, bIndex) => (
                <li
                  key={bIndex}
                  className={`flex items-start gap-2.5 text-[14.5px] sm:text-[15.5px] leading-[23px] tracking-normal antialiased transition-colors duration-400 ease-out ${
                    isUnlocked ? "text-[#1C3A13]" : "text-[#1C3A13]/60"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 transition-colors duration-400 ease-out ${
                      isUnlocked ? "bg-[#1C3A13]" : "bg-[#1C3A13]/30"
                    }`}
                  />
                  <span>{benefit}</span>
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

