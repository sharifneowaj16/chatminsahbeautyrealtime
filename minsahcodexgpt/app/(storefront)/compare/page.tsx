import React from 'react';
import { Metadata } from 'next';
import ProductComparisonMobileView from '@/components/compare/ProductComparisonMobileView';

export const metadata: Metadata = {
  title: 'Compare Formulations | Minsah Beauty',
  description:
    'Compare authentic Korean skincare formulations side by side. Key actives, skin match, and Dhaka climate testing.',
};

export default function ComparePage() {
  return (
    <div className="w-full">
      {/* Mobile Form Factor (Screens 28 & 30) */}
      <div className="lg:hidden">
        <ProductComparisonMobileView />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block max-w-5xl mx-auto py-8 px-4">
        <ProductComparisonMobileView />
      </div>
    </div>
  );
}
