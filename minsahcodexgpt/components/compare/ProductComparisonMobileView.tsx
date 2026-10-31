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

interface ProductComparisonMobileViewProps {
  initialProductA?: ComparisonProduct | null;
  initialProductB?: ComparisonProduct | null;
}

export default function ProductComparisonMobileView({
  initialProductA = null,
  initialProductB = null,
}: ProductComparisonMobileViewProps) {
  const [productA, setProductA] = useState<ComparisonProduct | null>(initialProductA);
  const [productB, setProductB] = useState<ComparisonProduct | null>(initialProductB);
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
        {productA && productB && (
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
        )}
      </div>

      {/* Main Content Matrix Sections or Empty State */}
      {!productA || !productB ? (
        <div className="px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-[#4b6723]">compare</span>
          </div>
          <h3 className="text-base font-bold text-[#062402] mb-1.5">
            Select Two Products to Compare
          </h3>
          <p className="text-xs text-[#5A615D] max-w-xs mb-6">
            Select two products from the shop to compare formulations, actives, and Dhaka climate performance.
          </p>
          <a
            href="/shop"
            className="px-6 py-2.5 rounded-full bg-[#062402] text-[#D4F6A2] font-bold text-xs shadow-md transition hover:bg-[#1c3a13]"
          >
            Browse Skincare Shop
          </a>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
