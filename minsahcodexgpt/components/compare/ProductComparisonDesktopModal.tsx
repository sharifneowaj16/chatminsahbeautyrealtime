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

const defaultPlaceholderImage = '/images/categories/Skincare.png';

export default function ProductComparisonDesktopModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [productA, setProductA] = useState<ComparisonProduct | null>(null);
  const [productB, setProductB] = useState<ComparisonProduct | null>(null);

  const handleOpen = useCallback((event: Event) => {
    const customEvt = event as CustomEvent<{ productA?: ComparisonProduct; productB?: ComparisonProduct }>;
    if (customEvt.detail) {
      if (customEvt.detail.productA) setProductA(customEvt.detail.productA);
      if (customEvt.detail.productB) setProductB(customEvt.detail.productB);
    }
    setIsOpen(true);
  }, []);
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
        productA && productB ? (
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <span className="block text-xs font-bold uppercase text-[#4b6723]">
                Routine Pair Bundle
              </span>
              <span className="block truncate font-bold text-[#062402] font-price">
                ৳{(productA.price + productB.price - 200).toLocaleString()} (Save ৳200)
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
        ) : undefined
      }
    >
      {!productA || !productB ? (
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center mb-3">
            <Layers className="w-7 h-7 text-[#4b6723]" />
          </div>
          <h4 className="text-base font-bold text-[#062402] mb-1">
            Compare Formulations
          </h4>
          <p className="text-xs text-[#5A615D] max-w-sm">
            Select two products from the shop to compare formulations, actives, and Dhaka climate performance.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </Modal>
  );
}
