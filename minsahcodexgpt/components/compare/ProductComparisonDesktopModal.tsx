'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    window.addEventListener('minsah:open-product-comparison', handleOpen);
    return () => window.removeEventListener('minsah:open-product-comparison', handleOpen);
  }, [handleOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      badge={
        <>
          <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>Formulation Matrix</span>
        </>
      }
      title="Compare Formulations & Actives"
      description="Direct ingredient verification & Dhaka climate performance"
      closeLabel="Close comparison modal"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="min-w-0">
            <span className="block text-xs font-bold uppercase text-[#4b6723]">
              Routine Pair Bundle
            </span>
            <span className="block truncate font-bold text-[#062402] font-price">
              ৳3,790 (Save ৳200)
            </span>
          </div>
          <button
            type="button"
            onClick={() => alert('Bundle added to bag!')}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98]"
          >
            <Layers className="h-4 w-4 text-[#D4F6A2]" />
            <span>Add Pair Bundle</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
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
      <SpecsGlanceSection productA={productA} productB={productB} />
      <SpecsActivesSection productA={productA} productB={productB} />
      <SpecsClimateSection productA={productA} productB={productB} />
      <SpecsPackagingSection productA={productA} productB={productB} />
    </Modal>
  );
}
