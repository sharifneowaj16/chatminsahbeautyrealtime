// Product and Shop Types

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images: string[];
  sku: string;
  stock: number;
  category: string;
  categorySlug: string;
  subcategory?: string;
  subcategorySlug?: string;
  rating: number;
  reviewCount: number;
  description: string;
  shortDescription: string;

  // SEO 1-22 / public product page fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  bengaliName?: string;
  bengaliDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  bengaliFocusKeyword?: string;
  bengaliSecondaryKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  pageH1?: string;
  seoIntro?: string;
  faqSchemaNote?: string;
  authenticityNote?: string;
  ingredientVerificationStatus?: string;
  seoValidationChecklist?: string[];
  structuredDataJsonLd?: unknown;
  productGroupJsonLd?: unknown;
  merchantListingJsonLd?: unknown;
  breadcrumbJsonLd?: unknown;
  sitemapIndexing?: unknown;
  variantUrlStrategy?: unknown;
  searchIntent?: string;
  targetAudience?: string;
  primaryConcern?: string;
  keyBenefits?: string[];
  buyingIntentKeywords?: string[];
  searchTags?: string[];
  synonyms?: string[];
  banglaSearchTerms?: string[];
  reviewKeywords?: string[];
  entities?: string[];
  descriptionSections?: unknown;
  productSpecs?: unknown;
  productAttributes?: unknown;
  shadeOptions?: unknown;
  variantPriceTable?: unknown;
  variantComparisonTable?: unknown;
  internalLinks?: unknown;
  usageInstructions?: string[];
  imageAltTexts?: string[];
  faqSchemaReady?: boolean;
  faqs?: unknown;
  gender?: string;

  // Badges
  isNew: boolean;
  isBestSeller: boolean;
  isExclusive: boolean;
  isTrending: boolean;

  // Product attributes
  skinType?: ('oily' | 'dry' | 'combination' | 'normal' | 'sensitive')[];
  skinConcerns?: ('acne' | 'aging' | 'dryness' | 'sensitivity' | 'dark-spots' | 'pores')[];
  tags: string[];
  isVegan: boolean;
  isCrueltyFree: boolean;
  isOrganic: boolean;
  isHalalCertified: boolean;
  isBSTIApproved: boolean;
  isImported: boolean;

  // Variants
  hasVariants: boolean;
  variants?: ProductVariant[];

  // Delivery
  isCODAvailable: boolean;
  isSameDayDelivery: boolean;
  freeShippingEligible: boolean;
  deliveryDays: number;

  // Extended inventory / shipping / offer fields
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  shelfLife?: string;
  expiryDate?: string | Date | null;
  originCountry?: string;
  shippingWeight?: string;
  dimensions?: { length?: string | number | null; width?: string | number | null; height?: string | number | null };
  isFragile?: boolean;
  discountPercentage?: number;
  salePrice?: number;
  offerStartDate?: string | Date | null;
  offerEndDate?: string | Date | null;
  flashSaleEligible?: boolean;
  returnEligible?: boolean;
  codAvailable?: boolean;
  preOrderOption?: boolean;
  barcode?: string;
  condition?: string;
  gtin?: string;
  relatedProducts?: string;

  // Payments
  isEMIAvailable: boolean;
  emiMonths?: number[];

  // Meta
  views: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  option: string; // e.g., "Shade" or "Size"
  value: string; // e.g., "Ruby Red" or "50ml"
  price: number;
  originalPrice?: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface FilterOptions {
  categories: CategoryFilter[];
  brands: BrandFilter[];
  priceRange: {
    min: number;
    max: number;
  };
  skinTypes: string[];
  skinConcerns: string[];
  ratings: number[];
  tags: TagFilter[];
}

export interface CategoryFilter {
  id: string;
  name: string;
  slug: string;
  count: number;
  subcategories?: SubcategoryFilter[];
}

export interface SubcategoryFilter {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface BrandFilter {
  id: string;
  name: string;
  slug: string;
  count: number;
  logo?: string;
}

export interface TagFilter {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface ActiveFilter {
  type: 'category' | 'subcategory' | 'brand' | 'price' | 'skinType' | 'skinConcern' | 'rating' | 'tag' | 'availability';
  label: string;
  value: string;
  param: string; // URL parameter key
}

export type SortOption =
  | 'featured'
  | 'newest'
  | 'best-selling'
  | 'price-low-high'
  | 'price-high-low'
  | 'highest-rated'
  | 'biggest-discount'
  | 'a-z'
  | 'z-a';

export interface ShopFilters {
  category?: string | string[];
  subcategory?: string | string[];
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  skinType?: string | string[];
  skinConcern?: string | string[];
  rating?: number;
  tags?: string | string[];
  inStockOnly?: boolean;
  saleOnly?: boolean;
  search?: string;
  sort?: SortOption;
  page?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: FilterOptions;
}

// Quick View Modal
export interface QuickViewProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  shortDescription: string;
  stock: number;
  hasVariants: boolean;
  variants?: ProductVariant[];
  isCODAvailable: boolean;
  freeShippingEligible: boolean;
}

// Wishlist
export interface WishlistItem {
  productId: string;
  addedAt: Date;
}

// Recently Viewed
export interface RecentlyViewed {
  productId: string;
  viewedAt: Date;
}

// Comparison
export interface CompareProduct {
  productId: string;
  addedAt: Date;
}
