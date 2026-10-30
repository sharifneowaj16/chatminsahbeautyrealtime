'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  PaymentMethodType,
  MobileCheckoutAddress,
  MobileCheckoutItem,
  MobileCheckoutGift,
  MobileCheckoutPricing,
} from './types';
import CheckoutMobileHeader from './CheckoutMobileHeader';
import CheckoutStepProgress from './CheckoutStepProgress';
import CheckoutDispatchCard from './CheckoutDispatchCard';
import CheckoutItemsAccordion from './CheckoutItemsAccordion';
import CheckoutPaymentSelector from './CheckoutPaymentSelector';
import CheckoutRewardsCard from './CheckoutRewardsCard';
import CheckoutBillBreakdown from './CheckoutBillBreakdown';
import CheckoutTrustBadges from './CheckoutTrustBadges';
import CheckoutMobileStickyBar from './CheckoutMobileStickyBar';
import { CouponApplyModal } from './promo-modal/CouponApplyModal';
import type { CouponItem } from './promo-modal/types';

interface CheckoutMobileViewProps {
  address: MobileCheckoutAddress;
  items: MobileCheckoutItem[];
  gift?: MobileCheckoutGift | null;
  initialPricing: MobileCheckoutPricing;
  onChangeAddress?: () => void;
  onPlaceOrder?: (method: PaymentMethodType, finalTotal: number) => void;
  isSubmitting?: boolean;
}

export default function CheckoutMobileView({
  address,
  items,
  gift,
  initialPricing,
  onChangeAddress,
  onPlaceOrder,
  isSubmitting = false,
}: CheckoutMobileViewProps) {
  const router = useRouter();

  // State machine for checkout
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bkash');
  const [voucherCode, setVoucherCode] = useState<string | undefined>(
    initialPricing.voucherCode
  );
  const [voucherDiscount, setVoucherDiscount] = useState<number>(
    initialPricing.voucherDiscount || 0
  );
  const [glowPointsActive, setGlowPointsActive] = useState<boolean>(true);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);

  const glowPointsDiscount = glowPointsActive ? (initialPricing.glowPointsDiscount || 40) : 0;
  const currentVoucherDiscount = voucherCode ? voucherDiscount : 0;
  const computedTotal = Math.max(
    0,
    initialPricing.subtotal +
      (initialPricing.shippingDiscount > 0 ? 0 : initialPricing.shipping) -
      currentVoucherDiscount -
      glowPointsDiscount
  );

  const computedSaved =
    (initialPricing.shippingDiscount > 0 ? initialPricing.shipping : 0) +
    currentVoucherDiscount +
    glowPointsDiscount;

  const currentPricing: MobileCheckoutPricing = {
    ...initialPricing,
    voucherCode,
    voucherDiscount: currentVoucherDiscount,
    glowPointsDiscount,
    total: computedTotal,
    totalSaved: computedSaved,
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/');
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode(undefined);
    setVoucherDiscount(0);
  };

  const handleToggleGlowPoints = () => {
    setGlowPointsActive((prev) => !prev);
  };

  const handlePlaceOrder = () => {
    if (onPlaceOrder) {
      onPlaceOrder(paymentMethod, computedTotal);
    }
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col font-sans">
      {/* 1. Header */}
      <CheckoutMobileHeader onBack={handleBack} />

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 pt-24 pb-36 gap-5 max-w-lg mx-auto w-full">
        {/* Step Progress */}
        <CheckoutStepProgress />

        {/* Dispatch Address Recap */}
        <CheckoutDispatchCard
          address={address}
          onChangeAddress={onChangeAddress || (() => router.push('/checkout/select-address'))}
        />

        {/* Order Items Accordion */}
        <CheckoutItemsAccordion
          items={items}
          gift={gift}
          subtotal={initialPricing.subtotal}
        />

        {/* Payment Method Selector */}
        <CheckoutPaymentSelector
          selectedMethod={paymentMethod}
          onSelectMethod={setPaymentMethod}
          bkashSavedAmount={50}
        />

        {/* Privileges & Rewards */}
        <CheckoutRewardsCard
          voucherCode={voucherCode}
          voucherDiscount={voucherDiscount}
          onRemoveVoucher={handleRemoveVoucher}
          onOpenVouchers={() => setIsCouponModalOpen(true)}
          glowPointsActive={glowPointsActive}
          onToggleGlowPoints={handleToggleGlowPoints}
          glowPointsDiscount={40}
          glowPointsAvailable={1280}
          glowPointsToRedeem={400}
        />

        {/* Order Bill Breakdown */}
        <CheckoutBillBreakdown pricing={currentPricing} />

        {/* Trust Badges & Policies */}
        <CheckoutTrustBadges />
      </main>

      {/* 3. Sticky Bottom Bar */}
      <CheckoutMobileStickyBar
        total={computedTotal}
        paymentMethod={paymentMethod}
        isSubmitting={isSubmitting}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* 4. Coupon & Promo Modal (Stitch Screen 17) */}
      <CouponApplyModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        subtotal={initialPricing.subtotal}
        appliedCoupon={
          voucherCode
            ? {
                code: voucherCode,
                discountText: `৳${voucherDiscount} Discount`,
                savingsAmount: voucherDiscount,
                campaignTitle: 'Minsah Promo Voucher',
              }
            : null
        }
        onApplyCoupon={(coupon: CouponItem) => {
          setVoucherCode(coupon.code);
          if (coupon.discountType === 'flat' || coupon.discountType === 'welcome') {
            setVoucherDiscount(coupon.discountValue);
          } else if (coupon.discountType === 'percentage') {
            setVoucherDiscount(Math.round((initialPricing.subtotal * coupon.discountValue) / 100));
          } else {
            setVoucherDiscount(120);
          }
          setIsCouponModalOpen(false);
        }}
        onRemoveCoupon={handleRemoveVoucher}
      />
    </div>
  );
}
