import React from 'react';
import { Metadata } from 'next';
import WarrantyClaimWizardView from '@/components/warranty/WarrantyClaimWizardView';

export const metadata: Metadata = {
  title: 'File Warranty Claim | Minsah Beauty Account',
  description:
    'File an instant warranty and authenticity claim with 1-hour express review and Dhaka doorstep swap.',
};

export default function AccountNewWarrantyClaimPage() {
  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <WarrantyClaimWizardView />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <WarrantyClaimWizardView />
      </div>
    </div>
  );
}
