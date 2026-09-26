// app/admin/shortlist/types.ts
// Strict type contracts matching Stitch Ground Truth (Screen ID: 39286148a6704e6995ed026438f698cf)

export type SourcingPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt?: string | null;
  priority: SourcingPriority;
  supplierName: string;
  supplierPhone?: string;
  verifiedBy?: string | null;
  customerNote?: string | null;
}

export interface ShortlistCustomer {
  name: string;
  phone: string;
  address: string;
  area: string;
}

export interface ShortlistOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  relativeTime: string;
  priority: SourcingPriority;
  source: string;
  customer: ShortlistCustomer;
  items: ShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  unpurchasedProducts: number;
  progress: number;
  isCompleted: boolean;
  totalBuyCost: number;
  totalCustomerBill: number;
  totalProfit: number;
}

export interface ShortlistStats {
  pendingOrders: number;
  productsRemaining: number;
  productsTotal: number;
  acquiredProducts: number;
  acquiredPercentage: number;
  expectedProfit: number;
  grossMarginPercent: number;
  avgProfitPerOrder: number;
  totalOrderRevenue: number;
  wholesaleCost: number;
  roiPercent: number;
}

export type ShortlistStatusTab = 'ALL' | 'PENDING' | 'URGENT' | 'COMPLETED';

export interface ShortlistFilterState {
  tab: ShortlistStatusTab;
  searchQuery: string;
  dateFilter: string;
  sortBy: 'urgent' | 'recent' | 'progress';
  multiSelectMode: boolean;
}
