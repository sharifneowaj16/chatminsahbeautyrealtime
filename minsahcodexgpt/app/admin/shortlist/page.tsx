'use client';

// app/admin/shortlist/page.tsx

import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEffect } from 'react';
import { ShortlistProvider, useShortlist } from './ShortlistContext';
import StatsSection from './components/StatsSection';
import SearchFilterBar from './components/SearchFilterBar';
import OrderCard from './components/OrderCard';

function ShortlistContent() {
  const { orders, stats, isLoading, error, filters, fetchOrders, clearError } = useShortlist();

  // Load data on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [filters, fetchOrders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              📋 Purchase Shortlist
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fetchOrders()}
              aria-label="Refresh shortlist"
              title="Refresh"
            >
              <span aria-hidden="true">🔄</span>
            </Button>
          </div>
          <p className="text-gray-600 text-sm">
            Track products to purchase from suppliers
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearError}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-800"
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
      )}

      {/* Stats Section */}
      {stats && !isLoading && <StatsSection stats={stats} />}

      {/* Search & Filters */}
      <SearchFilterBar />

      {/* Main Content */}
      <div className="p-4 sm:p-6 pb-20">
        {isLoading && !orders.length ? (
          <LoadingState label="Loading shortlist data…" description="Please wait while we fetch your orders" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl" aria-hidden="true">📭</span>}
            title="No Orders to Process"
            description="All orders are fully sourced! You don't have any pending purchases right now."
          />
        ) : (
          <div className="space-y-4">
            {/* Pending Orders Section */}
            {orders.some((o) => !o.isCompleted) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-gray-900">
                    ⏳ Pending Orders
                  </h2>
                  <span className="ml-auto px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                    {orders.filter((o) => !o.isCompleted).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {orders
                    .filter((o) => !o.isCompleted)
                    .map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                </div>
              </div>
            )}

            {/* Completed Orders Section */}
            {orders.some((o) => o.isCompleted) && (
              <div>
                <div className="flex items-center gap-2 mb-3 mt-8">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-gray-900">
                    ✅ Completed Orders
                  </h2>
                  <span className="ml-auto px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    {orders.filter((o) => o.isCompleted).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {orders
                    .filter((o) => o.isCompleted)
                    .map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShortlistPage() {
  return (
    <ShortlistProvider>
      <ShortlistContent />
    </ShortlistProvider>
  );
}
