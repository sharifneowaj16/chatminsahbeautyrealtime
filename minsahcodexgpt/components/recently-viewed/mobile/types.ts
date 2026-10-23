export interface RecentlyViewedItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  priceDropBadge?: string;
  viewedAgo: string;
  timelineGroup: 'today' | 'yesterday' | 'earlier';
  category: 'sunscreen' | 'serum' | 'toner' | 'lip' | 'all';
  image: string;
  rating: number;
  reviewCount: number;
  formulaNote: string;
  stockStatus: string;
  isLowStock?: boolean;
  hasHologram?: boolean;
}

export type RecentlyViewedCategoryFilter = 'all' | 'sunscreens' | 'serums' | 'toners' | 'lip-care';
