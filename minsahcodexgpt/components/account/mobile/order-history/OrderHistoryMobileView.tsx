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

export default function OrderHistoryMobileView({
  initialOrders = [],
}: OrderHistoryMobileViewProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<OrderStatusFilter>('all');
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  const [selectedOrderForCert, setSelectedOrderForCert] = useState<string | null>(null);

  const orders = useMemo(() => {
    return initialOrders || [];
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
