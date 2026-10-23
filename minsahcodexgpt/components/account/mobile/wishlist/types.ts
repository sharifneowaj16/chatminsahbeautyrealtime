export type WishlistFilterType = 'all' | 'instock' | 'pricedrop' | 'suncare' | 'serum';
export type WishlistSortType = 'recent' | 'price-asc' | 'price-desc' | 'rating';

export interface MobileWishlistItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  variant: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number;
  inStock: boolean;
  stockLabel: string;
  rating: number;
  reviewCount: number;
  image: string;
  category: WishlistFilterType;
  isFavorite: boolean;
}
