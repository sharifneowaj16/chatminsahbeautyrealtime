'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Layers } from 'lucide-react';
import CompareProductHeaderCard from './CompareProductHeaderCard';
import SpecsGlanceSection from './SpecsGlanceSection';
import SpecsActivesSection from './SpecsActivesSection';
import SpecsClimateSection from './SpecsClimateSection';
import SpecsPackagingSection from './SpecsPackagingSection';
import AuthenticityTrustBanner from './AuthenticityTrustBanner';
import { ComparisonProduct } from './types';

const defaultA: ComparisonProduct = {
  id: 'elixir-vital-serum',
  name: 'Glass Skin Serum',
  subtitle: 'Rejuvenating K-Beauty Hydration',
  brand: 'Elixir Vital',
  image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80',
  size: '30ml Amber Dropper',
  price: 1890,
  originalPrice: 2650,
  discountPercentage: 28,
  rating: 4.9,
  reviewCount: 340,
  routineStep: 'Step 03 · Serum',
  bestFor: 'Intense Hydration & Dewy Glass Glow',
  targetSkinTypes: ['Dry', 'Dehydrated', 'Normal'],
  targetSkinNote: 'Restores tight, parched lipid barriers and moisture sheen.',
  coreBenefit: 'Deep micro-hyaluronic moisture reservoir plumpness.',
  heroActiveName: 'Quad-Hyaluronic',
  heroActiveDesc: '4 molecular weights + 2% Niacinamide & Centella Asiatica.',
  cleanBadges: ['100% Clean', 'Hypoallergenic'],
  cleanDesc: 'Fragrance, Alcohol & Essential Oil Free.',
  comedogenicRating: '0 / 5 (Zero Clog)',
  textureName: 'Silky Essence Dew',
  textureDesc: 'Bouncy drop texture. Dries into smooth lit-from-within moisture sheen.',
  humidityScore: 9.2,
  humidityNote: 'Ideal for AC / Night Routine',
  pillingNote: 'Zero Pilling under Sunscreen',
  bottleType: '30ml Amber Glass Dropper',
  bottleDesc: 'Travel friendly, luxury UV-protected finish.',
};

const defaultB: ComparisonProduct = {
  id: 'anua-heartleaf-toner',
  name: 'Heartleaf 77% Toner',
  subtitle: 'Acne-Safe Calming Prep',
  brand: 'Anua',
  image: 'https://images.unsplash.com/photo-1608248597359-450419266730?w=400&auto=format&fit=crop&q=80',
  size: '250ml Sealed Bottle',
  price: 2100,
  originalPrice: 2700,
  discountPercentage: 22,
  rating: 4.8,
  reviewCount: 215,
  routineStep: 'Step 01 · Toner Prep',
  bestFor: 'Redness Calming & Acne Soothing',
  targetSkinTypes: ['Sensitive', 'Acne-Prone', 'Oily'],
  targetSkinNote: 'Pacifies flares, micro-bumps, irritation & rosacea.',
  coreBenefit: 'Rapid redness reduction, heat dissipation & pH 5.5 balance.',
  heroActiveName: '77% Heartleaf',
  heroActiveDesc: 'Houttuynia Cordata extract + Panthenol & Betaine calming blend.',
  cleanBadges: ['100% Clean', 'EWG Green'],
  cleanDesc: 'Hypoallergenic & EWG Green Grade Actives.',
  comedogenicRating: '0 / 5 (Zero Clog)',
  textureName: 'Ultra-Light Water',
  textureDesc: 'Absorbs instantly. 0% greasiness or tacky feel even in humid room air.',
  humidityScore: 9.8,
  humidityNote: 'Flawless in Peak Heat & Sweat',
  pillingNote: 'Zero Pilling under Sunscreen',
  bottleType: '250ml High-Cap Sealed Bottle',
  bottleDesc: 'Generous 3-4 months daily morning and evening use.',
};

export default function ProductComparisonDesktopModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [productA] = useState<ComparisonProduct>(defaultA);
  const [productB] = useState<ComparisonProduct>(defaultB);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('minsah:open-product-comparison', handleOpen);
    return () => {
      window.removeEventListener('minsah:open-product-comparison', handleOpen);
    };
  }, [handleOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="hidden lg:flex fixed inset-0 z-50 items-center justify-center p-6 select-none"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#FAF9F6] rounded-[28px] border border-[#E2DED8] shadow-2xl p-6 overflow-y-auto flex flex-col gap-5 z-10">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2DED8]">
          <div>
            <h2 className="text-xl font-bold text-[#062402] tracking-tight">
              Compare Formulations &amp; Actives
            </h2>
            <p className="text-xs text-[#5A615D]">
              Direct formulation verification matrix &amp; Dhaka climate performance
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#5A615D] hover:text-[#062402] active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Product Headers */}
        <div className="grid grid-cols-2 gap-4">
          <CompareProductHeaderCard
            product={productA}
            onAddToCart={() => alert(`Added ${productA.name} to bag!`)}
          />
          <CompareProductHeaderCard
            product={productB}
            onAddToCart={() => alert(`Added ${productB.name} to bag!`)}
          />
        </div>

        <AuthenticityTrustBanner />

        {/* Matrix Specs */}
        <div className="space-y-4">
          <SpecsGlanceSection productA={productA} productB={productB} />
          <SpecsActivesSection productA={productA} productB={productB} />
          <SpecsClimateSection productA={productA} productB={productB} />
          <SpecsPackagingSection productA={productA} productB={productB} />
        </div>

        {/* Bottom Bundle CTA */}
        <div className="p-4 rounded-2xl bg-[#EAF7D8]/60 border border-[#4b6723]/30 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-[#4b6723]">
              Routine Recommendation
            </span>
            <div className="text-base font-bold text-[#062402]">
              Toner (Preps) + Serum (Glows) Bundle · ৳3,790 (Save ৳200)
            </div>
          </div>
          <button
            type="button"
            onClick={() => alert('Bundle added to bag!')}
            className="px-6 py-2.5 rounded-full bg-[#062402] text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-[#1c3a13] active:scale-95 transition-all shadow-sm"
          >
            <Layers className="w-4 h-4" />
            <span>Add Pair Bundle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
