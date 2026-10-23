export interface FilterOption {
  id: string;
  label: string;
  count: number;
  badge?: string;
  colorHex?: string;
  icon?: string;
}

export interface FilterSectionData {
  id: string;
  title: string;
  iconName: string;
  options: FilterOption[];
}

export interface DetailedFilterState {
  minPrice: number;
  maxPrice: number;
  categories: string[];
  brands: string[];
  shades: string[];
  sizes: string[];
  ingredients: string[];
}

export interface PriceRangeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DetailedFilterState;
  onApply: (filters: DetailedFilterState) => void;
  totalResultsCount?: number;
}
