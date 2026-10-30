'use client';

import React, { useState } from 'react';
import type { LiveTrackingOrderData } from './types';
import LiveTrackingHeader from './LiveTrackingHeader';
import LiveTrackingHeroCard from './LiveTrackingHeroCard';
import LiveTrackingJourneyStepper from './LiveTrackingJourneyStepper';
import LiveTrackingCourierCard from './LiveTrackingCourierCard';
import LiveTrackingPackageItemsCard from './LiveTrackingPackageItemsCard';
import LiveTrackingQuickActions from './LiveTrackingQuickActions';
import LiveTrackingPreviousOrdersCard from './LiveTrackingPreviousOrdersCard';
import LiveTrackingHologramModal from './LiveTrackingHologramModal';
import LiveTrackingConciergeModal from './LiveTrackingConciergeModal';
import { DeliveryRescheduleModal } from '@/components/delivery/reschedule/DeliveryRescheduleModal';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

interface LiveTrackingMobileViewProps {
  orderData?: LiveTrackingOrderData;
  onDownloadInvoice?: () => void;
}

export default function LiveTrackingMobileView({
  orderData,
  onDownloadInvoice,
}: LiveTrackingMobileViewProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const [isHologramOpen, setIsHologramOpen] = useState(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  if (!orderData) return null;

  const handleReorder = async () => {
    try {
      const drawerIntentId = registerAddIntent();
      const firstItem = orderData.items[0];
      if (firstItem) {
        await addItem({
          id: firstItem.id,
          productId: firstItem.id,
          name: firstItem.title,
          price: firstItem.price,
          quantity: 1,
          image: firstItem.image,
        });
        openForSuccessfulAdd(drawerIntentId, {
          id: firstItem.id,
          name: firstItem.title,
          price: firstItem.price,
          quantity: 1,
          image: firstItem.image,
        }, 1);
      }
    } catch {
      // Graceful fallback
    }
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#1a1c1a] flex flex-col font-sans pb-24">
      {/* 1. Header with back and concierge button */}
      <LiveTrackingHeader
        orderNumber={orderData.orderNumber}
        onOpenConcierge={() => setIsConciergeOpen(true)}
      />

      {/* 2. Shipment Hero Card with ETA, Courier, AWB and Destination */}
      <LiveTrackingHeroCard
        eta={orderData.eta}
        etaSubtext={orderData.etaSubtext}
        courierPartner={orderData.courierPartner}
        hub={orderData.hub}
        trackingAwb={orderData.trackingAwb}
        deliveryDestination={orderData.deliveryDestination}
      />

      {/* 3. Live Dispatch Journey Stepper */}
      <LiveTrackingJourneyStepper milestones={orderData.milestones} />

      {/* 4. Live Courier Action / Map Snippet */}
      <LiveTrackingCourierCard courier={orderData.courier} />

      {/* 5. Items in this Shipment Card */}
      <LiveTrackingPackageItemsCard items={orderData.items} payment={orderData.payment} />

      {/* 6. Quick Actions (Verify Hologram, Invoice, Concierge, Reschedule) */}
      <LiveTrackingQuickActions
        onOpenHologramVerifier={() => setIsHologramOpen(true)}
        onDownloadInvoice={onDownloadInvoice || (() => window.print())}
        onOpenConcierge={() => setIsConciergeOpen(true)}
        onOpenReschedule={() => setIsRescheduleOpen(true)}
      />

      {/* 7. Other Recent Orders Section */}
      <LiveTrackingPreviousOrdersCard
        previousOrder={orderData.previousOrder}
        onReorder={handleReorder}
      />

      {/* Hologram Verifier Modal */}
      <LiveTrackingHologramModal
        isOpen={isHologramOpen}
        onClose={() => setIsHologramOpen(false)}
      />

      {/* Concierge Modal */}
      <LiveTrackingConciergeModal
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
      />

      {/* Delivery Reschedule Modal (Screens 23 & 24) */}
      <DeliveryRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        orderNumber={orderData.orderNumber}
        currentSchedule={{
          date: 'Today, 15 November (Friday)',
          timeSlot: '1pm - 5pm',
        }}
      />
    </div>
  );
}
