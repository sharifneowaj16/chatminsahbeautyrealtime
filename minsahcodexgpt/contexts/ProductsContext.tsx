'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Product {
  id: string;
  sku?: string;
  name: string;
  category: string;
  subcategory?: string;
  item?: string;
  brand: string;
  originCountry: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  createdAt: string;
  featured: boolean;
  isNew?: boolean;
  description?: string;
  weight?: string;
  ingredients?: string;
  skinType?: string[];
  expiryDate?: string;
  shelfLife?: string;
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    price: string;
    stock: string;
    sku: string;
    image?: string;
  }>;
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
  tags?: string;
  shippingWeight?: string;
  dimensions?: { length: string; width: string; height: string };
  isFragile?: boolean;
  freeShippingEligible?: boolean;
  discountPercentage?: string;
  salePrice?: string;
  offerStartDate?: string;
  offerEndDate?: string;
  flashSaleEligible?: boolean;
  lowStockThreshold?: string;
  barcode?: string;
  returnEligible?: boolean;
  codAvailable?: boolean;
  preOrderOption?: boolean;
  relatedProducts?: string;

  // SEO 1-22 fields
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
}

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  saveProducts: (newProducts: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Product) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

type ApiImage = string | {
  url?: string;
};

type ApiVariant = {
  id?: string;
  sku?: string;
  size?: string;
  color?: string;
  price?: string | number | null;
  stock?: string | number | null;
  quantity?: string | number | null;
  image?: string | null;
  attributes?: {
    size?: string;
    color?: string;
  } | null;
};

type ApiProduct = {
  id: string;
  sku?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  item?: string;
  brand?: string;
  originCountry?: string | null;
  price?: string | number | null;
  originalPrice?: string | number | null;
  compareAtPrice?: string | number | null;
  stock?: string | number | null;
  quantity?: string | number | null;
  status?: string;
  featured?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  image?: string | null;
  images?: ApiImage[];
  rating?: string | number | null;
  averageRating?: string | number | null;
  reviews?: string | number | null;
  reviewCount?: string | number | null;
  createdAt?: string;
  description?: string | null;
  tags?: string | null;
  metaKeywords?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string;
  urlSlug?: string;
  skinType?: string[];
  ingredients?: string | null;
  shelfLife?: string | null;
  expiryDate?: string | null;
  weight?: string | number | null;
  shippingWeight?: string | null;
  dimensions?: {
    length?: string | number | null;
    width?: string | number | null;
    height?: string | number | null;
  } | null;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  isFragile?: boolean;
  freeShippingEligible?: boolean;
  discountPercentage?: string | number | null;
  salePrice?: string | number | null;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
  flashSaleEligible?: boolean;
  lowStockThreshold?: string | number | null;
  barcode?: string | null;
  returnEligible?: boolean;
  codAvailable?: boolean;
  preOrderOption?: boolean;
  relatedProducts?: unknown;
  condition?: string | null;
  gtin?: string | null;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  bengaliName?: string | null;
  bengaliDescription?: string | null;
  focusKeyword?: string | null;
  secondaryKeywords?: string[];
  bengaliFocusKeyword?: string | null;
  bengaliSecondaryKeywords?: string[];
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  pageH1?: string | null;
  seoIntro?: string | null;
  faqSchemaNote?: string | null;
  authenticityNote?: string | null;
  ingredientVerificationStatus?: string | null;
  seoValidationChecklist?: string[];
  structuredDataJsonLd?: unknown;
  productGroupJsonLd?: unknown;
  merchantListingJsonLd?: unknown;
  breadcrumbJsonLd?: unknown;
  sitemapIndexing?: unknown;
  variantUrlStrategy?: unknown;
  searchIntent?: string | null;
  targetAudience?: string | null;
  primaryConcern?: string | null;
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
  gender?: string | null;
  variants?: ApiVariant[];
};

function stringifyOptional(value: unknown): string {
  if (value == null) {
    return '';
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function imageToUrl(image: unknown): string {
  if (typeof image === 'string') {
    return image;
  }

  if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
    return image.url;
  }

  return '';
}

function mapApiProduct(product: ApiProduct): Product {
  const images = Array.isArray(product.images)
    ? product.images.map(imageToUrl).filter(Boolean)
    : [];
  const image = product.image || images[0] || '';

  return {
    id: product.id,
    sku: product.sku || '',
    name: product.name || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    item: product.item || '',
    brand: product.brand || '',
    originCountry: product.originCountry || 'Bangladesh (Local)',
    price: Number(product.price ?? 0),
    originalPrice:
      product.originalPrice != null || product.compareAtPrice != null
        ? Number(product.originalPrice ?? product.compareAtPrice)
        : undefined,
    stock: Number(product.stock ?? product.quantity ?? 0),
    status: (product.status || 'active') as Product['status'],
    featured: product.featured ?? product.isFeatured ?? false,
    isNew: product.isNew ?? false,
    image,
    images: images.length ? images : image ? [image] : [],
    rating: Number(product.rating ?? product.averageRating ?? 0),
    reviews: Number(product.reviews ?? product.reviewCount ?? 0),
    createdAt: product.createdAt || new Date().toISOString(),
    description: product.description || '',
    tags: product.tags ?? product.metaKeywords ?? '',
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    urlSlug: product.slug ?? product.urlSlug ?? '',
    skinType: Array.isArray(product.skinType) ? product.skinType : [],
    ingredients: product.ingredients || '',
    shelfLife: product.shelfLife || '',
    expiryDate: product.expiryDate || '',
    weight: product.weight != null ? String(product.weight) : '',
    shippingWeight: product.shippingWeight || '',
    dimensions: product.dimensions
      ? {
          length: product.dimensions.length?.toString() || '',
          width: product.dimensions.width?.toString() || '',
          height: product.dimensions.height?.toString() || '',
        }
      : {
          length: product.length?.toString() || '',
          width: product.width?.toString() || '',
          height: product.height?.toString() || '',
        },
    isFragile: product.isFragile ?? false,
    freeShippingEligible: product.freeShippingEligible ?? true,
    discountPercentage: product.discountPercentage?.toString() || '',
    salePrice: product.salePrice?.toString() || '',
    offerStartDate: product.offerStartDate || '',
    offerEndDate: product.offerEndDate || '',
    flashSaleEligible: product.flashSaleEligible ?? false,
    lowStockThreshold: product.lowStockThreshold?.toString() || '5',
    barcode: product.barcode || '',
    returnEligible: product.returnEligible ?? true,
    codAvailable: product.codAvailable ?? true,
    preOrderOption: product.preOrderOption ?? false,
    relatedProducts: stringifyOptional(product.relatedProducts),
    condition: product.condition || '',
    gtin: product.gtin || '',
    trackInventory: product.trackInventory ?? true,
    allowBackorder: product.allowBackorder ?? false,
    bengaliName: product.bengaliName || '',
    bengaliDescription: product.bengaliDescription || '',
    focusKeyword: product.focusKeyword || '',
    secondaryKeywords: Array.isArray(product.secondaryKeywords) ? product.secondaryKeywords : [],
    bengaliFocusKeyword: product.bengaliFocusKeyword || '',
    bengaliSecondaryKeywords: Array.isArray(product.bengaliSecondaryKeywords) ? product.bengaliSecondaryKeywords : [],
    ogTitle: product.ogTitle || '',
    ogDescription: product.ogDescription || '',
    ogImageUrl: product.ogImageUrl || '',
    canonicalUrl: product.canonicalUrl || '',
    pageH1: product.pageH1 || '',
    seoIntro: product.seoIntro || '',
    faqSchemaNote: product.faqSchemaNote || '',
    authenticityNote: product.authenticityNote || '',
    ingredientVerificationStatus: product.ingredientVerificationStatus || '',
    seoValidationChecklist: Array.isArray(product.seoValidationChecklist) ? product.seoValidationChecklist : [],
    structuredDataJsonLd: product.structuredDataJsonLd ?? null,
    productGroupJsonLd: product.productGroupJsonLd ?? null,
    merchantListingJsonLd: product.merchantListingJsonLd ?? null,
    breadcrumbJsonLd: product.breadcrumbJsonLd ?? null,
    sitemapIndexing: product.sitemapIndexing ?? null,
    variantUrlStrategy: product.variantUrlStrategy ?? null,
    searchIntent: product.searchIntent || '',
    targetAudience: product.targetAudience || '',
    primaryConcern: product.primaryConcern || '',
    keyBenefits: Array.isArray(product.keyBenefits) ? product.keyBenefits : [],
    buyingIntentKeywords: Array.isArray(product.buyingIntentKeywords) ? product.buyingIntentKeywords : [],
    searchTags: Array.isArray(product.searchTags) ? product.searchTags : [],
    synonyms: Array.isArray(product.synonyms) ? product.synonyms : [],
    banglaSearchTerms: Array.isArray(product.banglaSearchTerms) ? product.banglaSearchTerms : [],
    reviewKeywords: Array.isArray(product.reviewKeywords) ? product.reviewKeywords : [],
    entities: Array.isArray(product.entities) ? product.entities : [],
    descriptionSections: product.descriptionSections ?? null,
    productSpecs: product.productSpecs ?? null,
    productAttributes: product.productAttributes ?? null,
    shadeOptions: product.shadeOptions ?? null,
    variantPriceTable: product.variantPriceTable ?? null,
    variantComparisonTable: product.variantComparisonTable ?? null,
    internalLinks: product.internalLinks ?? null,
    usageInstructions: Array.isArray(product.usageInstructions) ? product.usageInstructions : [],
    imageAltTexts: Array.isArray(product.imageAltTexts) ? product.imageAltTexts : [],
    faqSchemaReady: product.faqSchemaReady ?? false,
    faqs: product.faqs ?? null,
    gender: product.gender || '',
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          id: variant.id || '',
          sku: variant.sku || '',
          size: variant.attributes?.size || variant.size || '',
          color: variant.attributes?.color || variant.color || '',
          price: String(variant.price ?? product.price ?? 0),
          stock: String(variant.stock ?? variant.quantity ?? 0),
          image: variant.image || '',
        }))
      : [],
  };
}

interface ProductsProviderProps {
  children: ReactNode;
  initialProducts?: Product[];
  activeOnly?: boolean;
  limit?: number;
}

export function ProductsProvider({
  children,
  initialProducts = [],
  activeOnly = false,
  limit = 500,
}: ProductsProviderProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        activeOnly: String(activeOnly),
        limit: String(limit),
      });
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errorMessage = `HTTP ${res.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.details || errorJson.error || errorMessage;
        } catch {
          if (errorText) errorMessage += `: ${errorText}`;
        }
        throw new Error(`Failed to fetch products (${errorMessage})`);
      }

      const data = await res.json();
      const mapped = (data.products || []).map(mapApiProduct);
      setProducts(mapped);
      setError(null);

      if (data.pagination) {
        const { totalCount, limit } = data.pagination;
        if (totalCount > limit) {
          console.warn(
            `[ProductsContext] Only ${limit} of ${totalCount} total products were returned. ` +
            `Consider pagination or increasing the limit.`
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching products';
      console.error(`[ProductsContext] Fetch failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, message);

      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[ProductsContext] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchProducts(retryCount + 1);
      }

      setError(message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProducts.length > 0) return;
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts.length]);

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
  };

  const addProduct = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
  };

  const updateProduct = (id: string, updatedProduct: Product) => {
    setProducts((prev) => prev.map((product) => (product.id === id ? updatedProduct : product)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const getProductById = (id: string) => {
    return products.find((product) => product.id === id || product.urlSlug === id);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        setProducts,
        saveProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        refreshProducts: fetchProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
