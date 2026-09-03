'use client';

import React, { useState } from 'react';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import SeedHowToApplyDrawer, { HowToApplyData } from './SeedHowToApplyDrawer';
import SeedIngredientsDrawer from './SeedIngredientsDrawer';

export interface SeedHeroAccordionsProps {
  productId: string;
  productName: string;
  keyBenefits?: string[];
  specs?: {
    volume?: string;
    skinType?: string;
    shelfLife?: string;
    originCountry?: string;
  };
  ingredients?: string;
  howToApplyData?: HowToApplyData;
  className?: string;
}

export default function SeedHeroAccordions({
  productId,
  productName,
  keyBenefits = [],
  specs = {
    volume: '30*2 ml / 80*2 ml (Double Sealed Container)',
    skinType: 'Suitable for All Skin Types (Sensitive Safe)',
    shelfLife: '24–36 Months from Manufacturing Date',
    originCountry: 'Direct Authorized Channel',
  },
  ingredients = 'Centella Asiatica, Niacinamide, Hyaluronic Acid, Ceramide NP, Madecassoside',
  howToApplyData,
  className = '',
}: SeedHeroAccordionsProps) {
  // Accordion 1: Benefits* (Open by default)
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(true);
  // Accordion 2: Details & Authenticity (Closed by default)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Drawer Modals State
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [isIngredientsDrawerOpen, setIsIngredientsDrawerOpen] = useState(false);

  // Fallback Benefits
  const defaultBenefits = [
    'Deep Moisture Lock: Barrier formula prevents trans-epidermal hydration loss.',
    'Instant Glass Glow: Radiant finish without pore-clogging grease.',
    'Barrier Fortification: Strengthens skin resilience against environmental pollutants.',
  ];
  const activeBenefits = keyBenefits.length > 0 ? keyBenefits : defaultBenefits;

  return (
    <section className={`w-full border-t border-[#E2E8F0] dark:border-white/12 ${className}`} aria-label="Product Benefits and Specifications">
      
      {/* ========================================================================= */}
      {/* ACCORDION 1: BENEFITS* (Seed Style)                                       */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E2E8F0] dark:border-white/12">
        <button
          type="button"
          onClick={() => setIsBenefitsOpen((prev) => !prev)}
          aria-expanded={isBenefitsOpen}
          className="w-full py-3.5 lg:py-4 flex items-center justify-between text-left text-[15px] lg:text-base font-semibold text-[#163020] dark:text-white transition-colors"
        >
          <span>Benefits*</span>
          <span className="text-[#163020] dark:text-white shrink-0 ml-2">
            {isBenefitsOpen ? <Minus size={16} /> : <Plus size={16} />}
          </span>
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            isBenefitsOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
          }`}
        >
          <div className="overflow-hidden space-y-3 text-xs md:text-sm leading-[1.55] text-[#163020] dark:text-stone-300">
            <ul className="space-y-2 list-none pl-0">
              {activeBenefits.map((benefit, index) => (
                <li key={`benefit-item-${index}`} className="flex items-start gap-2">
                  <span className="font-bold text-[#163020] dark:text-emerald-400 select-none">•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* How to Apply Drawer Trigger Link */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setIsApplyDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163020] dark:text-emerald-300 underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                <span>How to Apply</span>
                <ArrowRight size={13} className="mt-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACCORDION 2: DETAILS & AUTHENTICITY                                       */}
      {/* ========================================================================= */}
      <div className="border-b border-[#E2E8F0] dark:border-white/12">
        <button
          type="button"
          onClick={() => setIsDetailsOpen((prev) => !prev)}
          aria-expanded={isDetailsOpen}
          className="w-full py-3.5 lg:py-4 flex items-center justify-between text-left text-[15px] lg:text-base font-semibold text-[#163020] dark:text-white transition-colors"
        >
          <span>Details & Authenticity</span>
          <span className="text-[#163020] dark:text-white shrink-0 ml-2">
            {isDetailsOpen ? <Minus size={16} /> : <Plus size={16} />}
          </span>
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            isDetailsOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
          }`}
        >
          <div className="overflow-hidden space-y-3 text-xs md:text-sm leading-[1.55] text-[#163020] dark:text-stone-300">
            <ul className="space-y-2 list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#163020] dark:text-emerald-400 select-none">•</span>
                <span><strong>Net Volume:</strong> {specs.volume || '30*2 ml / 80*2 ml (Double Sealed Container)'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#163020] dark:text-emerald-400 select-none">•</span>
                <span><strong>Skin Type:</strong> {specs.skinType || 'Suitable for All Skin Types (Sensitive Safe)'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#163020] dark:text-emerald-400 select-none">•</span>
                <span><strong>Shelf Life:</strong> {specs.shelfLife || '24–36 Months from Manufacturing Date'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#163020] dark:text-emerald-400 select-none">•</span>
                <span><strong>Quality Check:</strong> 100% Original Sourced • Seal Inspected</span>
              </li>
            </ul>

            {/* Ingredients Drawer Trigger Link */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setIsIngredientsDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163020] dark:text-emerald-300 underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                <span>Full Ingredients Breakdown</span>
                <ArrowRight size={13} className="mt-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEDICATED SLIDE-OVER DRAWERS                                              */}
      {/* ========================================================================= */}
      <SeedHowToApplyDrawer
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        productName={productName}
        usageData={howToApplyData}
      />

      <SeedIngredientsDrawer
        isOpen={isIngredientsDrawerOpen}
        onClose={() => setIsIngredientsDrawerOpen(false)}
        productName={productName}
        ingredients={ingredients}
        skinType={specs.skinType}
        shelfLife={specs.shelfLife}
        originCountry={specs.originCountry}
      />

    </section>
  );
}
