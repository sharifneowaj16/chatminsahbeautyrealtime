'use client';

import React from 'react';
import MobilePriceAmount from './MobilePriceAmount';
import MobileComparePrice from './MobileComparePrice';
import MobileSaleBadge from './MobileSaleBadge';
import MobileSaleCountdown from './MobileSaleCountdown';
import MobileStockBadge from './MobileStockBadge';
import MobileAvailabilityNote from './MobileAvailabilityNote';
import MobileVariantPriceChip from './MobileVariantPriceChip';
import MobileBuyButton from './MobileBuyButton';
import MobileRatingSummary from './MobileRatingSummary';
import MobileDeliveryNote from './MobileDeliveryNote';

export interface MobilePriceBlockProps {
  onAddToCart?: (quantity: number) => void;
  className?: string;
}

export function MobilePriceBlock({ onAddToCart, className = '' }: MobilePriceBlockProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Rating & Reviews Header */}
      <MobileRatingSummary />

      {/* 2. Main Price, Sale Badge, Stock Badge & Compare Price */}
      <div className="flex items-center flex-wrap gap-2">
        <MobilePriceAmount />
        <MobileSaleBadge />
        <MobileStockBadge />
        <MobileComparePrice />
      </div>

      {/* 3. Limited-time Sale Countdown Timer (if sale is active with expiry) */}
      <MobileSaleCountdown />

      {/* 4. Variant Selection Price Chips (if multi-variant product) */}
      <MobileVariantPriceChip />

      {/* 5. Inventory Availability Note (e.g. low stock, preorder date) */}
      <MobileAvailabilityNote />

      {/* 6. Bangladesh Fast Zone & Outside Delivery Promise Note */}
      <MobileDeliveryNote />

      {/* 7. Action Button with Quantity Stepper */}
      <MobileBuyButton onAddToCart={onAddToCart} />
    </div>
  );
}

export default MobilePriceBlock;
