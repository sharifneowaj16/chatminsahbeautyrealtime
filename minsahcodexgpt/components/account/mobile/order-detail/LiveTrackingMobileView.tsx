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

const DEFAULT_LIVE_ORDER: LiveTrackingOrderData = {
  orderNumber: 'Order #MB-88294',
  eta: 'Tomorrow, by 6:00 PM',
  etaSubtext: '1 shipment arriving in < 24 hours via Steadfast & Pathao Express',
  courierPartner: 'Pathao & Steadfast Express',
  hub: 'Banani Central Hub',
  trackingAwb: 'BD-EXP-99201481',
  deliveryDestination: 'House 14, Road 7, Block E, Banani Model Town, Dhaka',
  milestones: [
    {
      id: 'm1',
      title: 'Order Placed & Quality Verified',
      time: 'Oct 24, 09:30 AM',
      description: 'Genuine product inspection & batch hologram sealed at Banani Central Hub.',
      status: 'completed',
      iconType: 'check',
    },
    {
      id: 'm2',
      title: 'Dispatched to Courier Hub',
      time: 'Oct 25, 02:15 PM',
      description: 'Transferred to Pathao / Steadfast sorting facility for express dispatch.',
      status: 'completed',
      iconType: 'plane',
    },
    {
      id: 'm3',
      title: 'Arrived at Destination Hub',
      time: 'Oct 26, 08:45 AM',
      description: 'Local district hub received shipment and sorted for delivery route.',
      status: 'completed',
      iconType: 'shield',
    },
    {
      id: 'm4',
      title: 'Out for Delivery (Banani Hub)',
      time: 'Active',
      description: 'Package with courier rider. Rider assigned: Tariqul I.',
      status: 'active',
      iconType: 'bike',
      activeDetails: {
        riderName: 'Tariqul I.',
        riderPhone: '+880 1712-345678',
      },
    },
    {
      id: 'm5',
      title: 'Delivered & Inspected',
      time: 'Expected Oct 27',
      description: 'Doorstep delivery with sealed hologram batch card inspection.',
      status: 'upcoming',
      iconType: 'home',
    },
  ],
  courier: {
    name: 'Tariqul Islam',
    partner: 'Pathao / Steadfast Express',
    rating: '4.9 ★',
    deliveriesCount: 1240,
    phone: '+8801712345678',
    distanceLabel: '1.8 km away',
  },
  items: [
    {
      id: 'i1',
      title: 'Laneige Lip Sleeping Mask',
      variant: 'Berry (20g) • Authentic Batch #MB84',
      price: 1720,
      quantity: 1,
      image:
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
      hologramSealed: true,
    },
    {
      id: 'i2',
      title: 'Arisol Soothing Sun Relief',
      variant: 'SPF50+ PA++++ (50ml) • Centella Infused',
      price: 2730,
      quantity: 2,
      image:
        'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
      hologramSealed: true,
    },
  ],
  payment: {
    subtotal: 4450,
    freight: 'FREE (Free Delivery Offer)',
    total: 4450,
    method: 'bKash Verified',
  },
  previousOrder: {
    orderNumber: 'Order #MB-77102',
    deliveredDate: 'Oct 12, 2024',
    total: 3200,
    itemSummary: '2 items: Anua Heartleaf 77% Toner + COSRX Snail',
  },
};

export default function LiveTrackingMobileView({
  orderData = DEFAULT_LIVE_ORDER,
  onDownloadInvoice,
}: LiveTrackingMobileViewProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const [isHologramOpen, setIsHologramOpen] = useState(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

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
