'use client';

import React, { useState, useMemo } from 'react';
import type { OrderStatusFilter, MobileOrderRecord } from './types';
import OrderHistoryHeader from './OrderHistoryHeader';
import OrderHistorySearchBar from './OrderHistorySearchBar';
import OrderHistoryFilterTabs from './OrderHistoryFilterTabs';
import OrderHistoryActiveOrderCard from './OrderHistoryActiveOrderCard';
import OrderHistoryDeliveredCard from './OrderHistoryDeliveredCard';
import OrderHistoryEmptyState from './OrderHistoryEmptyState';
import OrderHistoryGuarantees from './OrderHistoryGuarantees';
import OrderHistoryLiveTrackingModal from './OrderHistoryLiveTrackingModal';
import OrderHistoryHologramModal from './OrderHistoryHologramModal';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

interface OrderHistoryMobileViewProps {
  initialOrders?: MobileOrderRecord[];
}

const DEFAULT_STITCH_ORDERS: MobileOrderRecord[] = [
  {
    id: 'mb-88294',
    orderNumber: '#MB-88294',
    status: 'transit',
    statusLabel: 'Out for Delivery (Banani Hub)',
    statusBadgeVariant: 'secondary',
    timestampLabel: 'Steadfast & Pathao Express • Dispatched Today',
    totalAmount: 4450,
    paymentMethod: 'bKash Paid',
    products: [
      {
        id: 'p1',
        name: 'Laneige Lip Sleeping Mask (Berry)',
        details: '20g • Vitamin C Berry Fruit Complex™',
        quantity: 1,
        price: 1750,
        image:
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p2',
        name: 'Arisol Soothing Sun Relief SPF50+',
        details: '50ml • Centella Asiatica & Green Tea',
        quantity: 2,
        price: 2700,
        image:
          'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
      },
    ],
    transitProgress: {
      riderName: 'Shakil M.',
      hubName: 'Banani Hub',
      etaMinutes: 45,
      progressPercentage: 82,
      destinationAddress: 'House 14, Banani',
    },
  },
  {
    id: 'mb-77102',
    orderNumber: '#MB-77102',
    status: 'delivered',
    statusLabel: 'Delivered & Inspected',
    statusBadgeVariant: 'surface',
    timestampLabel: 'Delivered on Oct 12, 2024 • Banani Hub',
    totalAmount: 3200,
    paymentMethod: 'COD Verified',
    batchSeal: {
      code: '#KR-AN-9941',
      notes: 'Tamper-evident hologram intact',
    },
    products: [
      {
        id: 'p3',
        name: 'Anua Heartleaf 77% Soothing Toner',
        details: '250ml • Sub-acidic pH Calming Formula',
        quantity: 1,
        price: 1650,
        image:
          'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p4',
        name: 'Elixir Vital Glass Skin Hydrating Serum',
        details: '30ml • Quad-Hyaluronic Acid Complex',
        quantity: 1,
        price: 1550,
        image:
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
  {
    id: 'mb-65910',
    orderNumber: '#MB-65910',
    status: 'delivered',
    statusLabel: 'Delivered',
    statusBadgeVariant: 'surface',
    timestampLabel: 'Delivered on Sep 28, 2024 • Dhaka Express',
    totalAmount: 1720,
    paymentMethod: 'Card Paid',
    canReview: true,
    products: [
      {
        id: 'p5',
        name: 'Laneige Lip Sleeping Mask Berry (20g)',
        details: 'Batch #LN-4801 • Authentic Amorepacific',
        quantity: 1,
        price: 1720,
        image:
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
];

export default function OrderHistoryMobileView({
  initialOrders = DEFAULT_STITCH_ORDERS,
}: OrderHistoryMobileViewProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<OrderStatusFilter>('all');
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  const [selectedOrderForCert, setSelectedOrderForCert] = useState<string | null>(null);

  const orders = useMemo(() => {
    return initialOrders && initialOrders.length > 0 ? initialOrders : DEFAULT_STITCH_ORDERS;
  }, [initialOrders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      transit: orders.filter((o) => o.status === 'transit').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      const matchFilter = currentFilter === 'all' || o.status === currentFilter;
      if (!matchFilter) return false;
      if (!q) return true;

      const matchId = o.orderNumber.toLowerCase().includes(q);
      const matchProduct = o.products.some((p) => p.name.toLowerCase().includes(q));
      return matchId || matchProduct;
    });
  }, [orders, currentFilter, searchTerm]);

  const handleReorder = async (order: MobileOrderRecord) => {
    try {
      const drawerIntentId = registerAddIntent();
      const cartItems: CartItem[] = order.products.map((p) => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        image: p.image,
      }));

      for (const item of cartItems) {
        await addItem(item);
      }
      if (cartItems[0]) {
        openForSuccessfulAdd(drawerIntentId, cartItems[0], cartItems[0].quantity);
      }
    } catch {
      // Graceful fallback
    }
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#1a1c1a] flex flex-col font-sans pb-24">
      {/* 1. Header with stats */}
      <OrderHistoryHeader
        activeCount={counts.transit}
        deliveredCount={counts.delivered}
        onToggleFilterSearch={() => setIsSearchVisible((prev) => !prev)}
        onOpenVault={() => setSelectedOrderForCert('#MB-77102')}
      />

      {/* 2. Search Bar */}
      <OrderHistorySearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        onClear={() => setSearchTerm('')}
        isVisible={isSearchVisible || searchTerm.length > 0}
      />

      {/* 3. Filter Tabs */}
      <OrderHistoryFilterTabs
        currentFilter={currentFilter}
        counts={counts}
        onSelectFilter={setCurrentFilter}
      />

      {/* 4. Main Order Cards List */}
      <main className="px-4 flex flex-col gap-4 pb-6">
        {filteredOrders.length === 0 ? (
          <OrderHistoryEmptyState
            onResetSearch={() => {
              setSearchTerm('');
              setCurrentFilter('all');
            }}
          />
        ) : (
          filteredOrders.map((order) => {
            if (order.status === 'transit') {
              return (
                <OrderHistoryActiveOrderCard
                  key={order.id}
                  order={order}
                  onOpenLiveTracking={(num) => setSelectedOrderForTracking(num)}
                />
              );
            }
            return (
              <OrderHistoryDeliveredCard
                key={order.id}
                order={order}
                onOpenCertModal={(num) => setSelectedOrderForCert(num)}
                onReorder={handleReorder}
              />
            );
          })
        )}

        {/* 5. Authenticity Guarantees & Concierge */}
        <OrderHistoryGuarantees />
      </main>

      {/* 6. Live Tracking Modal */}
      <OrderHistoryLiveTrackingModal
        isOpen={Boolean(selectedOrderForTracking)}
        orderNumber={selectedOrderForTracking || ''}
        onClose={() => setSelectedOrderForTracking(null)}
      />

      {/* 7. Hologram Authenticity Modal */}
      <OrderHistoryHologramModal
        isOpen={Boolean(selectedOrderForCert)}
        orderNumber={selectedOrderForCert || ''}
        onClose={() => setSelectedOrderForCert(null)}
      />
    </div>
  );
}
