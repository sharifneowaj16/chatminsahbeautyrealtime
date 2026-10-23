'use client';

import React from 'react';
import type { OrderSuccessDetails } from './types';
import OrderSuccessHeader from './OrderSuccessHeader';
import OrderCelebrationCard from './OrderCelebrationCard';
import OrderHologramSealCard from './OrderHologramSealCard';
import OrderTransitTimeline from './OrderTransitTimeline';
import OrderPurchasedItemsCard from './OrderPurchasedItemsCard';
import OrderActionButtons from './OrderActionButtons';

interface OrderSuccessMobileViewProps {
  order: OrderSuccessDetails;
  whatsappUrl?: string;
  onViewInvoice?: () => void;
  onDownloadGuarantee?: () => void;
}

export default function OrderSuccessMobileView({
  order,
  whatsappUrl,
  onViewInvoice,
  onDownloadGuarantee,
}: OrderSuccessMobileViewProps) {
  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col font-sans">
      {/* 1. Header */}
      <OrderSuccessHeader />

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 flex flex-col px-4 pt-20 pb-28 gap-6 max-w-lg mx-auto w-full">
        {/* Celebration & Confirmed Header Card */}
        <OrderCelebrationCard
          orderNumber={order.orderNumber}
          customerName={order.customerName}
        />

        {/* Authenticity Hologram Verification & Security Shield Card */}
        <OrderHologramSealCard
          authCode={order.authCode}
          onDownloadGuarantee={onDownloadGuarantee}
        />

        {/* Live Dispatch & Express Courier Timeline */}
        <OrderTransitTimeline
          estimatedDelivery={order.estimatedDelivery}
          deliveryAddress={order.deliveryAddress}
          temperature={order.temperatureControl}
        />

        {/* Order Items & Breakdown */}
        <OrderPurchasedItemsCard
          items={order.items}
          freeGift={order.freeGift}
          pricing={order.pricing}
          paymentMethod={order.paymentMethod}
        />

        {/* Interactive Action CTAs */}
        <OrderActionButtons
          orderNumber={order.orderNumber}
          whatsappUrl={whatsappUrl}
          onViewInvoice={onViewInvoice}
        />
      </main>
    </div>
  );
}
