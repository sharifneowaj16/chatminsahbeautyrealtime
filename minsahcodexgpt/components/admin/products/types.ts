import { FaqItem } from '@/components/admin/ProductFaqSection';

export interface ApiProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  brand: string;
  brandId: string;
  brandSlug: string;
  subcategory: string;
  price: number;
  originalPrice: number | null;
  compareAtPrice: number | null;
  salePrice: number | null;
  costPrice: number | null;
  discountPercentage: number | null;
  stock: number;
  quantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  status: 'active' | 'inactive' | 'out_of_stock';
  image: string;
  images: Array<{
    url: string;
    alt: string;
    title: string;
    sortOrder: number;
    isDefault: boolean;
  }>;
  rating: number;
  reviews: number;
  reviewCount: number;
  averageRating: number;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  isFeatured: boolean;
  isNew: boolean;
  codAvailable: boolean;
  returnEligible: boolean;
  preOrderOption: boolean;
  barcode: string;
  condition: string;
  gtin: string;
  flashSaleEligible: boolean;
  offerStartDate: string | null;
  offerEndDate: string | null;
  originCountry: string;
  shippingWeight: string;
  isFragile: boolean;
  deliveryOfferEnabled: boolean;
  deliveryOfferType: 'DEFAULT' | 'FREE' | 'FIXED' | string;
  deliveryOfferAmount: number | null;
  deliveryOfferStartDate: string | null;
  deliveryOfferEndDate: string | null;
  deliveryOfferBadgeText: string;
  relatedProducts: string;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    stock: number;
    quantity: number;
    attributes: unknown;
    image: string;
  }>;
  hasPendingShortlist?: boolean;
}

export interface ProductFilters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminProductsResponse {
  products: ApiProduct[];
  pagination: ProductPagination;
}

export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  price: string;
  stock: string;
  sku: string;
}

export interface ProductImage {
  id: string;
  file?: File;
  preview: string;
  isMain: boolean;
}

export type DeliveryOfferType = 'DEFAULT' | 'FREE' | 'FIXED';

export interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  item: string;
  brand: string;
  originCountry: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  featured: boolean;
  description: string;
  weight: string;
  ingredients: string;
  skinType: string[];
  expiryDate: string;
  shelfLife: string;
  productCondition: 'NEW' | 'USED' | 'REFURBISHED';
  gtin: string;
  averageRating: number;
  reviewCount: number;
  images: ProductImage[];
  variants: ProductVariant[];
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  tags: string;
  bengaliProductName: string;
  bengaliMetaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  bengaliFocusKeyword: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  pageH1: string;
  seoIntro: string;
  faqSchemaNote: string;
  authenticityNote: string;
  ingredientVerificationStatus: string;
  seoValidationChecklist: string[];
  structuredDataJsonLdJson: string;
  productGroupJsonLdJson: string;
  merchantListingJsonLdJson: string;
  breadcrumbJsonLdJson: string;
  sitemapIndexingJson: string;
  variantUrlStrategyJson: string;
  variantPriceTableJson: string;
  variantComparisonTableJson: string;
  internalLinksJson: string;
  bengaliSecondaryKeywords: string[];
  searchIntent: string;
  targetAudience: string;
  primaryConcern: string;
  keyBenefits: string[];
  buyingIntentKeywords: string[];
  searchTags: string[];
  synonyms: string[];
  banglaSearchTerms: string[];
  reviewKeywords: string[];
  entities: string[];
  productSpecsJson: string;
  productAttributesJson: string;
  shadeOptionsJson: string;
  usageInstructions: string[];
  descriptionSectionsJson: string;
  faqSchemaReady: boolean;
  gender: string;
  ogImageFile: File | null;
  ogImagePreview: string;
  imageAltTexts: string[];
  shippingWeight: string;
  dimensions: { length: string; width: string; height: string };
  isFragile: boolean;
  deliveryOfferEnabled: boolean;
  deliveryOfferType: DeliveryOfferType;
  deliveryOfferAmount: string;
  deliveryChargeInsideDhaka: string;
  deliveryChargeOutsideDhaka: string;
  deliveryOfferStartDate: string;
  deliveryOfferEndDate: string;
  deliveryOfferBadgeText: string;
  discountPercentage: string;
  salePrice: string;
  offerStartDate: string;
  offerEndDate: string;
  flashSaleEligible: boolean;
  lowStockThreshold: string;
  barcode: string;
  returnEligible: boolean;
  codAvailable: boolean;
  preOrderOption: boolean;
  relatedProducts: string;
  faqs: FaqItem[];
}
