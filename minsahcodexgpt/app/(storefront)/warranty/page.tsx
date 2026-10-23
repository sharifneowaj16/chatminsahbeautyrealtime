import React from 'react';
import { Metadata } from 'next';
import WarrantyHistoryView from '@/components/warranty/WarrantyHistoryView';

export const metadata: Metadata = {
  title: 'Warranty & Authenticity Claims | Minsah Beauty',
  description:
    'Track live warranty claims, doorstep replacement dispatch status, and past resolution history.',
};

export default function WarrantyPage() {
  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <WarrantyHistoryView />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block max-w-4xl mx-auto py-8 px-4">
        <WarrantyHistoryView />
      </div>
    </div>
  );
}
