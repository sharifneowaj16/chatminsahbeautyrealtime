export interface PopularSearchTag {
  id: string;
  label: string;
  icon?: string;
  query: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  brand?: string;
  priceBdt: number;
  originalPriceBdt?: number;
  rating?: number;
  imageUrl: string;
  category?: string;
  slug?: string;
}
