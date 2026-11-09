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
    <div className="w-full overflow-x-hidden">
      <WarrantyClaimWizardView />
    </div>
  );
}