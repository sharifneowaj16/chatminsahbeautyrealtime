'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import WarrantyClaimHeroBanner from './WarrantyClaimHeroBanner';
import WarrantyStepIndicator from './WarrantyStepIndicator';
import WarrantyProductSelector from './WarrantyProductSelector';
import WarrantyReasonSelector from './WarrantyReasonSelector';
import WarrantyPhotoUploader from './WarrantyPhotoUploader';
import WarrantyResolutionPicker from './WarrantyResolutionPicker';
import WarrantyPickupAddressBar from './WarrantyPickupAddressBar';
import WarrantyClaimSubmitFooter from './WarrantyClaimSubmitFooter';
import { WarrantyEligibleProduct, WarrantyReasonId, WarrantyResolutionType, WarrantyStep } from './types';

const defaultEligibleProducts: WarrantyEligibleProduct[] = [
  {
    id: 'elixir',
    name: 'Elixir Vital Glass Skin Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=80',
    size: '30ml',
    orderNumber: 'MB-KR',
    daysRemaining: 13,
  },
  {
    id: 'laneige',
    name: 'Laneige Lip Sleeping Mask',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=80',
    size: 'Berry 20g',
    orderNumber: 'MB-KR',
    daysRemaining: 13,
  },
];

export default function WarrantyClaimWizardView() {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState('elixir');
  const [selectedReason, setSelectedReason] = useState<WarrantyReasonId>('broken_dropper');
  const [note, setNote] = useState('');
  const [hasPhoto, setHasPhoto] = useState(true);
  const [selectedResolution, setSelectedResolution] = useState<WarrantyResolutionType>('replacement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dynamic step indicator
  let currentStep: WarrantyStep = 1;
  if (selectedProductId && selectedReason) currentStep = 2;
  if (selectedProductId && selectedReason && selectedResolution) currentStep = 3;

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/account/warranty');
      }, 1500);
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col bg-[#faf9f6] min-h-screen pb-32">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between border-b border-[#E2DED8]/60 bg-[#faf9f6]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/account/warranty"
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#062402] active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[18px] text-[#062402] tracking-tight font-bold leading-tight">
              Warranty &amp; Authenticity Claim
            </h1>
            <p className="text-xs text-[#43483f] font-medium">
              Order #MB-88294 • Banani Hub
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
          Dhaka
        </span>
      </div>

      {/* Main Form Body */}
      <div className="px-4 flex flex-col gap-4 pt-3">
        <WarrantyClaimHeroBanner />
        <WarrantyStepIndicator currentStep={currentStep} />
        <WarrantyProductSelector
          products={defaultEligibleProducts}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
        />
        <WarrantyReasonSelector
          selectedReason={selectedReason}
          onSelectReason={setSelectedReason}
          note={note}
          onNoteChange={setNote}
        />
        <WarrantyPhotoUploader
          hasUploadedPhoto={hasPhoto}
          onRemovePhoto={() => setHasPhoto(false)}
          onAddPhoto={() => setHasPhoto(true)}
        />
        <WarrantyResolutionPicker
          selectedResolution={selectedResolution}
          onSelect={setSelectedResolution}
        />
        <WarrantyPickupAddressBar
          addressLabel="House 14, Banani (Default)"
          onChangeLocation={() => {
            window.dispatchEvent(new CustomEvent('minsah:open-location-modal'));
          }}
        />
      </div>

      {/* Sticky Bottom Action Footer */}
      <WarrantyClaimSubmitFooter
        isSubmitting={isSubmitting}
        isSuccess={isSuccess}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
