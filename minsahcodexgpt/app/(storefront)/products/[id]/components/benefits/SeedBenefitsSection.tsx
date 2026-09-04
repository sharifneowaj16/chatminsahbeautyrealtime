"use client";

import React, { useMemo } from "react";
import SeedBenefitsHeader from "./SeedBenefitsHeader";
import SeedTimelineList, { TimelineStage } from "./SeedTimelineList";
import SeedMediaMatrix, { BenefitFaqItem } from "./SeedMediaMatrix";
import SeedUsageBox from "./SeedUsageBox";
import { HowToApplyData } from "../hero/SeedHowToApplyDrawer";

export interface SeedBenefitsSectionProps {
  product: {
    id?: string;
    name: string;
    bengaliName?: string;
    description?: string;
    usageInstructions?: string[];
    descriptionSections?: unknown;
    faqs?: BenefitFaqItem[];
  };
  videoUrl?: string | null;
  posterUrl?: string;
  resultsIntro?: string;
  customTimelineStages?: TimelineStage[];
  customFaqs?: BenefitFaqItem[];
  usageData?: HowToApplyData;
  className?: string;
}

/**
 * Phase 5: Master Benefits & Timeline Section Component
 * 
 * Assembles all 4 core sub-modules into Seed's signature 2-column layout:
 * - Top: Phase 1 (SeedBenefitsHeader)
 * - Left: Phase 2 (SeedTimelineList) + Phase 4 (SeedUsageBox)
 * - Right: Phase 3 (SeedMediaMatrix - Video + Capsule FAQ + WhatsApp)
 * 
 * Canvas: #F4F3EE (Off-White Luxury Cream)
 */
export function SeedBenefitsSection({
  product,
  videoUrl,
  posterUrl,
  resultsIntro,
  customTimelineStages,
  customFaqs,
  usageData,
  className = "",
}: SeedBenefitsSectionProps) {
  // Parse timeline stages from product descriptionSections or props
  const resolvedTimelineStages: TimelineStage[] | undefined = useMemo(() => {
    if (customTimelineStages && customTimelineStages.length > 0) {
      return customTimelineStages;
    }

    if (product?.descriptionSections) {
      try {
        let parsed: Record<string, unknown> = {};
        if (typeof product.descriptionSections === "string") {
          parsed = JSON.parse(product.descriptionSections);
        } else if (typeof product.descriptionSections === "object") {
          parsed = product.descriptionSections as Record<string, unknown>;
        }

        if (parsed?.timelineStages && Array.isArray(parsed.timelineStages)) {
          return parsed.timelineStages as TimelineStage[];
        }
        if (parsed?.benefitsTimeline && Array.isArray(parsed.benefitsTimeline)) {
          return parsed.benefitsTimeline as TimelineStage[];
        }
      } catch (e) {
        // Fallback to default in component
      }
    }

    return undefined;
  }, [product?.descriptionSections, customTimelineStages]);

  // Parse FAQs
  const resolvedFaqs: BenefitFaqItem[] | undefined = useMemo(() => {
    if (customFaqs && customFaqs.length > 0) return customFaqs;
    if (product?.faqs && product.faqs.length > 0) return product.faqs;
    return undefined;
  }, [product?.faqs, customFaqs]);

  // Parse Usage Dosage Text
  const resolvedDosageText: string | undefined = useMemo(() => {
    if (product?.usageInstructions && product.usageInstructions.length > 0) {
      return product.usageInstructions.join(" ");
    }
    return undefined;
  }, [product?.usageInstructions]);

  return (
    <section
      aria-label="Benefits that build over time"
      className={`w-full bg-[#F4F3EE] py-14 sm:py-20 lg:py-24 border-y border-[#1C3A13]/8 transition-colors ${className}`}
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Phase 1: Header Fold */}
        <SeedBenefitsHeader
          productName={product?.name || "this formulation"}
          resultsIntro={resultsIntro || "Results you can feel in as little as 7 days.*"}
        />

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Timeline + Dosage Box */}
          <div className="flex flex-col space-y-8 sm:space-y-10 order-2 lg:order-1">
            {/* Phase 2: 4-Stage Timeline */}
            <SeedTimelineList
              stages={resolvedTimelineStages}
            />

            {/* Phase 4: Usage & Ritual Box (Calls How to Apply Drawer) */}
            <SeedUsageBox
              productName={product?.name || "this product"}
              dosageText={resolvedDosageText}
              usageData={usageData}
            />
          </div>

          {/* Right Column: Single Video + Capsule FAQs + WhatsApp Trigger */}
          <div className="flex flex-col order-1 lg:order-2">
            <SeedMediaMatrix
              videoUrl={videoUrl}
              posterUrl={posterUrl}
              faqs={resolvedFaqs}
              productName={product?.name || "this product"}
            />
          </div>

        </div>

      </div>
    </section>
  );
}

export default SeedBenefitsSection;
