'use client';

import React, { useState } from 'react';
import CompareNavSubheader from './CompareNavSubheader';
import CompareFilterChips from './CompareFilterChips';
import DualSearchSelectors from './DualSearchSelectors';
import CompareProductHeaderCard from './CompareProductHeaderCard';
import AuthenticityTrustBanner from './AuthenticityTrustBanner';
import SpecsGlanceSection from './SpecsGlanceSection';
import SpecsActivesSection from './SpecsActivesSection';
import SpecsClimateSection from './SpecsClimateSection';
import SpecsPackagingSection from './SpecsPackagingSection';
import StickyBundleConversionBar from './StickyBundleConversionBar';
import { ComparisonProduct, CompareFilterCategory } from './types';

const sampleProductA: ComparisonProduct = {
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

const sampleProductB: ComparisonProduct = {
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

export default function ProductComparisonMobileView() {
  const [productA, setProductA] = useState<ComparisonProduct>(sampleProductA);
  const [productB, setProductB] = useState<ComparisonProduct>(sampleProductB);
  const [activeCategory, setActiveCategory] = useState<CompareFilterCategory>('all');
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');

  const handleSwap = () => {
    setProductA(productB);
    setProductB(productA);
  };

  const handleAddBundle = () => {
    alert('Both products successfully added to bag with special ৳200 Routine Bundle discount!');
  };

  return (
    <div className="w-full flex flex-col bg-[#faf9f6] min-h-screen pb-32">
      {/* Sticky Sub-Header and Controls */}
      <div className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md shadow-sm border-b border-[#E2DED8]/40">
        <CompareNavSubheader onSwap={handleSwap} />
        <CompareFilterChips
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
        <DualSearchSelectors
          leftQuery={leftSearch}
          rightQuery={rightSearch}
          onLeftChange={setLeftSearch}
          onRightChange={setRightSearch}
        />
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <CompareProductHeaderCard
            product={productA}
            onAddToCart={() => alert(`Added ${productA.name} to bag!`)}
          />
          <CompareProductHeaderCard
            product={productB}
            onAddToCart={() => alert(`Added ${productB.name} to bag!`)}
          />
        </div>
      </div>

      {/* Main Content Matrix Sections */}
      <div className="px-4 pt-4 space-y-4">
        <AuthenticityTrustBanner />

        {(activeCategory === 'all' || activeCategory === 'skin') && (
          <SpecsGlanceSection productA={productA} productB={productB} />
        )}

        {(activeCategory === 'all' || activeCategory === 'actives') && (
          <SpecsActivesSection productA={productA} productB={productB} />
        )}

        {(activeCategory === 'all' || activeCategory === 'climate') && (
          <SpecsClimateSection productA={productA} productB={productB} />
        )}

        {activeCategory === 'all' && (
          <SpecsPackagingSection productA={productA} productB={productB} />
        )}
      </div>

      {/* Sticky Bottom Bundle Conversion Bar */}
      <StickyBundleConversionBar
        productA={productA}
        productB={productB}
        onAddBundle={handleAddBundle}
      />
    </div>
  );
}
