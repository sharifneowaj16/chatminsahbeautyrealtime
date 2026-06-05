// lib/types/shortlist.ts

export type PurchasePriority = 'URGENT' | 'NORMAL' | 'LOW_PRIORITY';

export interface PurchaseShortlistItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt?: string | null;
  priority: PurchasePriority;
  notes?: string | null;
  adminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithShortlist {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  items: PurchaseShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  totalProfit: number;
  progress: number; // 0-100
  isCompleted: boolean; // All products purchased
  completedAt?: string | null;
}

export interface ShortlistStats {
  pendingOrders: number;
  completedOrders: number;
  productsRemaining: number;
  productsPurchased: number;
  totalPotentialRevenue: number;
  expectedProfit: number;
  completionRate: number; // 0-100
}

export interface ShortlistFilters {
  status?: 'pending' | 'completed';
  priority?: PurchasePriority | 'ALL';
  dateRange?: 'today' | 'week' | 'all';
  searchQuery?: string;
  sortBy?: 'recent' | 'urgent' | 'progress';
}

export interface ShortlistAPIResponse {
  success: boolean;
  data?: OrderWithShortlist[] | ShortlistStats;
  error?: string;
  message?: string;
}

export interface UpdateShortlistPayload {
  itemId: string;
  purchased: boolean;
  purchasedAt?: string;
}
