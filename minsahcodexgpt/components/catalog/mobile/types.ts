export type PLPLayoutView = 'grid' | 'list';

export type PLPSortOption =
  | 'Popularity'
  | 'Price: Low to High'
  | 'Price: High to Low'
  | 'Customer Rating'
  | 'Newest Arrivals';

export interface PLPProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  subtitle?: string;
  rating: number;
  reviewCount: number;
  price: number;
  regularPrice?: number;
  discountPercent?: number;
  image: string;
  hubBadge?: string;
  category?: string;
}

export interface PLPFilterState {
  priceRange: string | null;
  brands: string[];
  hubs: string[];
}
