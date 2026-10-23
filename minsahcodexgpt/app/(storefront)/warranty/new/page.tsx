import React from 'react';
import { Metadata } from 'next';
import WarrantyClaimWizardView from '@/components/warranty/WarrantyClaimWizardView';

export const metadata: Metadata = {
  title: 'File Warranty Claim | Minsah Beauty',
  description:
    'File an instant warranty and authenticity claim with 1-hour express review and Dhaka doorstep swap.',
};

export default function NewWarrantyClaimPage() {
  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <WarrantyClaimWizardView />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block max-w-2xl mx-auto py-8 px-4">
        <WarrantyClaimWizardView />
      </div>
    </div>
  );
}
