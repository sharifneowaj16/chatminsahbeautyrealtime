import React from 'react';
import { Metadata } from 'next';
import WarrantyHistoryView from '@/components/warranty/WarrantyHistoryView';

export const metadata: Metadata = {
  title: 'Warranty & Authenticity Claims | Minsah Beauty Account',
  description:
    'Track live warranty claims, doorstep replacement dispatch status, and past resolution history in your account.',
};

export default function AccountWarrantyPage() {
  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <WarrantyHistoryView />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <WarrantyHistoryView />
      </div>
    </div>
  );
}
