// app/admin/shortlist/ShortlistContext.tsx

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt?: string | null;
  priority: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  items: ShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  unpurchasedProducts: number;
  progress: number;
  isCompleted: boolean;
  totalProfit: number;
  completedAt?: string | null;
}

interface ShortlistStats {
  pendingOrders: number;
  completedOrders: number;
  productsRemaining: number;
  productsPurchased: number;
  totalPotentialRevenue: number;
  expectedProfit: number;
  completionRate: number;
}

interface ShortlistContextType {
  orders: Order[];
  stats: ShortlistStats | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: 'pending' | 'completed';
    priority: string;
    dateRange: 'today' | 'week' | 'all';
    searchQuery: string;
    sortBy: 'recent' | 'urgent' | 'progress';
  };
  
  fetchOrders: () => Promise<void>;
  updateItemStatus: (itemId: string, purchased: boolean) => Promise<void>;
  setFilters: (filters: Partial<ShortlistContextType['filters']>) => void;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

const ShortlistContext = createContext<ShortlistContextType | undefined>(undefined);

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<ShortlistStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ShortlistContextType['filters']>({
    status: 'pending',
    priority: 'ALL',
    dateRange: 'all',
    searchQuery: '',
    sortBy: 'recent',
  });

  // ===== FETCH ORDERS =====
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: filters.status,
        priority: filters.priority,
        dateRange: filters.dateRange,
        search: filters.searchQuery,
        sort: filters.sortBy,
      });

      const response = await fetch(`/api/admin/shortlist?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shortlist data');
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders);
        setStats(data.data.stats);
      } else {
        setError(data.error || 'Failed to load data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Shortlist fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ===== UPDATE ITEM STATUS =====
  const updateItemStatus = useCallback(
    async (itemId: string, purchased: boolean) => {
      try {
        setError(null);

        const response = await fetch(`/api/admin/shortlist/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            purchased,
            purchasedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update item');
        }

        const data = await response.json();

        if (data.success) {
          // Optimistic update - update local state
          setOrders((prevOrders) =>
            prevOrders.map((order) => {
              if (order.id === data.data.order.id) {
                return data.data.order;
              }
              return order;
            })
          );

          // Update stats
          await fetchOrders();
        } else {
          setError(data.error || 'Failed to update');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Update error:', err);
      }
    },
    [fetchOrders]
  );

  // ===== SET FILTERS =====
  const setFilters = useCallback(
    (newFilters: Partial<ShortlistContextType['filters']>) => {
      setFiltersState((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  // ===== CLEAR ERROR =====
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== REFRESH DATA =====
  const refreshData = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  const value: ShortlistContextType = {
    orders,
    stats,
    isLoading,
    error,
    filters,
    fetchOrders,
    updateItemStatus,
    setFilters,
    clearError,
    refreshData,
  };

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const context = useContext(ShortlistContext);
  if (context === undefined) {
    throw new Error('useShortlist must be used within ShortlistProvider');
  }
  return context;
}
