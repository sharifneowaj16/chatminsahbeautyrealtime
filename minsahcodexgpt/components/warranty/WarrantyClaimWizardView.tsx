'use client';

import React, { useState, useEffect } from 'react';
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

export default function WarrantyClaimWizardView() {
  const router = useRouter();
  const [products, setProducts] = useState<WarrantyEligibleProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedReason, setSelectedReason] = useState<WarrantyReasonId>('broken_dropper');
  const [note, setNote] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<WarrantyResolutionType>('replacement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          const orders = Array.isArray(data.orders) ? data.orders : (Array.isArray(data) ? data : []);
          const eligible: WarrantyEligibleProduct[] = [];
          for (const order of orders) {
            const items = order.items || order.orderItems || [];
            for (const item of items) {
              eligible.push({
                id: item.id || item.productId || `item-${eligible.length}`,
                name: item.product?.title || item.title || item.name || 'Beauty Product',
                image: item.product?.thumbnail || item.image || '/placeholder-product.png',
                size: item.variant?.title || item.size || 'Standard',
                orderNumber: order.orderNumber || order.id || 'MB',
                daysRemaining: 14,
              });
            }
          }
          setProducts(eligible);
          if (eligible.length > 0) {
            setSelectedProductId(eligible[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load eligible warranty products', err);
      }
    }
    fetchOrders();
  }, []);

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
    <div className="w-full space-y-6 overflow-x-hidden text-[#f7f8f8]">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/account/warranty"
            aria-label="Go back to warranty claims"
            className="w-10 h-10 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#828fff] text-[11px] font-semibold border border-[#5e6ad2]/30 mb-1">
              <ShieldCheck className="w-3 h-3 text-[#828fff]" />
              <span>OFFICIAL WARRANTY ASSURANCE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f7f8f8] tracking-tight leading-tight">
              File Warranty Claim
            </h1>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 text-[11px] font-semibold flex items-center gap-1 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
          Verified Origin
        </span>
      </div>

      {/* ── Main Form Body ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <WarrantyClaimHeroBanner />
        <WarrantyStepIndicator currentStep={currentStep} />
        <WarrantyProductSelector
          products={products}
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
          addressLabel="Banani Delivery Hub / Customer Doorstep"
          onChangeLocation={() => {
            window.dispatchEvent(new CustomEvent('minsah:open-location-modal'));
          }}
        />

        <WarrantyClaimSubmitFooter
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}