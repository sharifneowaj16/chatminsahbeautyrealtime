'use client';

import React from 'react';
import DesktopPriceAmount from './DesktopPriceAmount';
import DesktopComparePrice from './DesktopComparePrice';
import DesktopSaleBadge from './DesktopSaleBadge';
import DesktopSaleCountdown from './DesktopSaleCountdown';
import DesktopStockBadge from './DesktopStockBadge';
import DesktopAvailabilityNote from './DesktopAvailabilityNote';
import DesktopVariantPriceRow from './DesktopVariantPriceRow';
import DesktopBuyButton from './DesktopBuyButton';
import DesktopRatingSummary from './DesktopRatingSummary';
import DesktopDeliveryNote from './DesktopDeliveryNote';

export interface DesktopPriceBlockProps {
  onAddToCart?: (quantity: number) => void;
  className?: string;
}

export function DesktopPriceBlock({ onAddToCart, className = '' }: DesktopPriceBlockProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Rating & Reviews Header */}
      <DesktopRatingSummary />

      {/* 2. Main Price, Sale Badge, Stock Badge & Compare Price */}
      <div className="flex items-center flex-wrap gap-2.5">
        <DesktopPriceAmount />
        <DesktopSaleBadge />
        <DesktopStockBadge />
        <DesktopComparePrice />
      </div>

      {/* 3. Limited-time Sale Countdown Timer (if sale is active with expiry) */}
      <DesktopSaleCountdown />

      {/* 4. Variant Selection Price Row (if multi-variant product) */}
      <DesktopVariantPriceRow />

      {/* 5. Inventory Availability Note (e.g. low stock, preorder date) */}
      <DesktopAvailabilityNote />

      {/* 6. Bangladesh Fast Zone & Outside Delivery Promise Note */}
      <DesktopDeliveryNote />

      {/* 7. Action Button with Quantity Stepper */}
      <DesktopBuyButton onAddToCart={onAddToCart} />
    </div>
  );
}

export default DesktopPriceBlock;
