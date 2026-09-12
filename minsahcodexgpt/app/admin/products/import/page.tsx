'use client';






import { useToast } from '@/components/ui/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useCategories } from '@/contexts/CategoriesContext';
import ProductFaqSection, { FaqItem } from '@/components/admin/ProductFaqSection';
import { adminFetchJson } from '@/lib/adminFetch';
import { DEFAULT_SITE_URL } from '@/lib/seo';
import {
  ArrowLeft,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  Upload,
  Save,
  X,
  Loader2,
  Tag,
  Package,
  Search,
  TruckIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  HelpCircle,
  FileJson,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';

// CHANGE THIS ONLY IF YOUR LIVE PRODUCT URL BASE IS DIFFERENT.
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const DEFAULT_PRODUCT_BASE_URL = `${SITE_URL}/products`;

type JsonRecord = Record<string, unknown>;
type DeliveryOfferType = 'DEFAULT' | 'FREE' | 'FIXED';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportVariant {
  size: string;
  color: string;
  shade: string;
  price: string;
  stock: string;
  sku: string;
  attributes?: JsonRecord;
}

interface ImportImage {
  url: string;
  alt?: string;
  title?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

interface ImportData {
  // Basic
  name: string;
  category: string;
  subcategory: string;
  item: string;
  brand: string;
  originCountry: string;
  status: 'active' | 'inactive';
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  featured: boolean;
  description: string;
  weight: string;
  ingredients: string;
  skinType: string[];
  shelfLife: string;
  gtin: string;
  barcode: string;
  variants: ImportVariant[];
  images: ImportImage[];

  // Classic SEO
  metaTitle: string;
  metaDescription: string;
  bengaliProductName: string;
  bengaliMetaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  bengaliFocusKeyword: string;
  bengaliSecondaryKeywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  urlSlug: string;
  tags: string;

  // Semantic SEO
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

  // Full SEO 1-22 fields
  pageH1: string;
  seoIntro: string;
  faqSchemaNote: string;
  authenticityNote: string;
  ingredientVerificationStatus: string;
  seoValidationChecklist: string[];
  variantPriceTable: unknown[];
  variantComparisonTable: unknown[];
  internalLinks: unknown[];
  structuredDataJsonLd: JsonRecord | null;
  productGroupJsonLd: JsonRecord | null;
  merchantListingJsonLd: JsonRecord | null;
  breadcrumbJsonLd: JsonRecord | null;
  sitemapIndexing: JsonRecord | null;
  variantUrlStrategy: JsonRecord | null;

  // Product structured content
  productSpecs: JsonRecord | null;
  productAttributes: JsonRecord | null;
  shadeOptions: Array<JsonRecord>;
  usageInstructions: string[];
  imageAltTexts: string[];
  descriptionSections: Array<{ heading: string; points: string[] }>;
  faqSchemaReady: boolean;
  gender: string;

  // Shipping
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

  // Options
  flashSaleEligible: boolean;
  lowStockThreshold: string;
  returnEligible: boolean;
  codAvailable: boolean;
  preOrderOption: boolean;
  marketPriceNote: string;
  faqs: FaqItem[];

  // Owner fill / guide fields. These are review-only and are not saved directly.
  ownerFillRequired: string[];
  ownerFillRequiredByPath: JsonRecord | null;
  ownerComments: string[];
}

interface ParseResult {
  data: ImportData | null;
  error: string | null;
}

const skinTypes = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal', 'All Skin Types', 'All Hair Types'];
const countries = [
  'Bangladesh (Local)',
  'USA',
  'France',
  'UK',
  'Japan',
  'South Korea',
  'Germany',
  'Italy',
  'Thailand',
  'India',
  'China',
];

const defaultSeoValidationChecklist = [
  'Run Google Rich Results Test after replacing all placeholders',
  'Check canonical URL returns 200 status',
  'Check product image URLs are crawlable',
  'Check visible price and schema price match',
  'Check visible stock and schema availability match',
  'Check Search Console URL Inspection after publish',
];

// ─── Parse IMPORT_DATA / raw JSON / full final SEO JSON ───────────────────────
function parseImportData(raw: string): ParseResult {
  try {
    const match = raw.match(/\[IMPORT_DATA\]([\s\S]*?)\[\/IMPORT_DATA\]/i);
    const sourceText = match ? match[1] : raw;
    const cleaned = stripJsonCodeFence(sourceText.trim());

    if (!cleaned.startsWith('{')) {
      return {
        data: null,
        error: 'No [IMPORT_DATA] block or valid JSON was found. Paste an [IMPORT_DATA]...[/IMPORT_DATA] block or raw JSON.',
      };
    }

    const parsed = JSON.parse(cleaned) as JsonRecord;
    const importSource = resolveImportSource(parsed);

    return { data: normalizeImportData(importSource), error: null };
  } catch (e) {
    return {
      data: null,
      error: `JSON parse error: ${e instanceof Error ? e.message : 'Invalid format'}`,
    };
  }
}

function stripJsonCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function resolveImportSource(parsed: JsonRecord): JsonRecord {
  if (isLikelyProductPayload(parsed)) return parsed;

  // If the JSON is wrapped under one root key, unwrap it.
  const objectValues = Object.values(parsed).filter(
    (value): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  );

  for (const value of objectValues) {
    if (isLikelyProductPayload(value)) return value;
  }

  return parsed;
}

function isLikelyProductPayload(value: JsonRecord): boolean {
  return Boolean(
    value.name ||
    value.productCore ||
    value.prismaImportData ||
    value.seoFieldsForMinsahProductModel ||
    value.variantsForMinsahProductVariantModel
  );
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  return [];
}


function normalizeDeliveryOfferType(value: unknown): DeliveryOfferType {
  const normalized = asString(value).trim().toUpperCase();
  if (normalized === 'FREE' || normalized === 'FIXED') return normalized;
  return 'DEFAULT';
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
  }
  return fallback;
}

function numericText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed && Number.isFinite(Number(trimmed)) ? trimmed : undefined;
}

function priceText(value: unknown, fallback: unknown = ''): string {
  const resolvedValue = value == null || value === '' ? fallback : value;
  const numericValue = Number(String(resolvedValue).replace(/[^\d.]/g, ''));

  return Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : '';
}

function readPath(source: JsonRecord, paths: string[]): unknown {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== 'object' || Array.isArray(acc)) return undefined;
      return (acc as JsonRecord)[key];
    }, source);

    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
}

function firstRecordFromGraph(graph: unknown, type: string): JsonRecord | null {
  if (!Array.isArray(graph)) return null;
  const found = graph.find((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const entryType = (entry as JsonRecord)['@type'];
    return entryType === type || (Array.isArray(entryType) && entryType.includes(type));
  });

  return asRecord(found);
}

function normalizeImportData(raw: JsonRecord): ImportData {
  const productCore = asRecord(raw.productCore) || {};
  const seo = asRecord(raw.seoFieldsForMinsahProductModel) || {};
  const prismaImport = asRecord(raw.prismaImportData) || {};
  const prismaProduct = asRecord(prismaImport.productCreatePayloadForPrisma) || {};
  const structuredData = asRecord(raw.structuredDataJsonLd) || asRecord(prismaProduct.structuredDataJsonLd) || asRecord(raw.structuredData) || null;
  const graph = asArray(structuredData?.['@graph']);
  const productGroupFromGraph = firstRecordFromGraph(graph, 'ProductGroup');
  const breadcrumbFromGraph = firstRecordFromGraph(graph, 'BreadcrumbList');

  const slug = asString(readPath(raw, ['urlSlug', 'slug', 'productCore.slug', 'prismaImportData.productCreatePayloadForPrisma.slug']));
  const rawCanonicalUrl = asString(
    readPath(raw, [
      'canonicalUrl',
      'seoFieldsForMinsahProductModel.canonicalUrl',
      'prismaImportData.productCreatePayloadForPrisma.canonicalUrl',
      'sitemapIndexing.canonicalUrl',
    ])
  );
  const canonicalUrl = rawCanonicalUrl && !rawCanonicalUrl.includes('ADD_')
    ? rawCanonicalUrl
    : (slug ? `${DEFAULT_PRODUCT_BASE_URL}/${slug}` : '');

  const imageAltTexts = asStringArray(readPath(raw, ['imageAltTexts', 'prismaImportData.productCreatePayloadForPrisma.imageAltTexts']));
  const images = asImportImages(
    readPath(raw, ['images', 'imageUrls', 'productImages', 'prismaImportData.productImagesCreatePayloadForPrisma']),
    imageAltTexts
  );
  const rawOgImageUrl = asString(readPath(raw, ['ogImageUrl', 'seoFieldsForMinsahProductModel.ogImageUrl', 'prismaImportData.productCreatePayloadForPrisma.ogImageUrl']));
  const ogImageUrl = rawOgImageUrl && !rawOgImageUrl.includes('ADD_')
    ? rawOgImageUrl
    : (images.find((image) => image.isDefault)?.url || images[0]?.url || '');
  const variants = normalizeVariants(raw, prismaImport, productCore);

  const generatedVariantPriceTable = variants.map((variant) => ({
    variant: [variant.color || variant.shade, variant.size].filter(Boolean).join(' '),
    size: variant.size,
    price: variant.price ? `৳${variant.price}` : '',
    stock: variant.stock,
    sku: variant.sku,
  }));

  const seoValidationChecklist = asStringArray(readPath(raw, ['seoValidationChecklist']));
  const normalizedDeliveryOfferType = normalizeDeliveryOfferType(
    readPath(raw, ['deliveryOfferType', 'deliveryOffer.type', 'shippingAndDelivery.deliveryOfferType', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferType'])
  );
  const deliveryOfferEnabled =
    asBoolean(readPath(raw, ['deliveryOfferEnabled', 'deliveryOffer.enabled', 'shippingAndDelivery.deliveryOfferEnabled', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferEnabled']), false) ||
    normalizedDeliveryOfferType !== 'DEFAULT';

  const rawStatus = asString(readPath(raw, ['status', 'productCore.status'])).toLowerCase();
  const status: 'active' | 'inactive' = rawStatus === 'inactive' ? 'inactive' : 'active';
  const rawCondition = asString(readPath(raw, ['condition', 'productCondition'])).toUpperCase();
  const condition: 'NEW' | 'USED' | 'REFURBISHED' = ['NEW', 'USED', 'REFURBISHED'].includes(rawCondition)
    ? (rawCondition as 'NEW' | 'USED' | 'REFURBISHED')
    : 'NEW';

  const deliveryOfferAmount = asString(readPath(raw, ['deliveryOfferAmount', 'deliveryOffer.amount', 'shippingAndDelivery.deliveryOfferAmount', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferAmount']));
  const deliveryChargeInsideDhaka = asString(readPath(raw, ['deliveryChargeInsideDhaka', 'deliveryOffer.deliveryChargeInsideDhaka', 'shippingAndDelivery.deliveryChargeInsideDhaka']), deliveryOfferAmount);
  const deliveryChargeOutsideDhaka = asString(readPath(raw, ['deliveryChargeOutsideDhaka', 'deliveryOffer.deliveryChargeOutsideDhaka', 'shippingAndDelivery.deliveryChargeOutsideDhaka']), deliveryOfferAmount);

  return {
    name: asString(readPath(raw, ['name', 'productCore.name', 'prismaImportData.productCreatePayloadForPrisma.name'])),
    category: asString(readPath(raw, ['category', 'productCore.category', 'prismaImportData.productCreatePayloadForPrisma.category']), 'Hair care'),
    subcategory: asString(readPath(raw, ['subcategory', 'productCore.subcategory', 'prismaImportData.productCreatePayloadForPrisma.subcategory'])),
    item: asString(readPath(raw, ['item', 'productCore.productType'])),
    brand: asString(readPath(raw, ['brand', 'productCore.brand', 'prismaImportData.productCreatePayloadForPrisma.brand'])),
    originCountry: asString(readPath(raw, ['originCountry', 'productCore.originCountry', 'productSpecs.Country of Origin']), 'Bangladesh (Local)'),
    status,
    condition,
    featured: asBoolean(readPath(raw, ['featured', 'isFeatured', 'productCore.isFeatured']), false),
    description: asString(readPath(raw, ['description', 'prismaImportData.productCreatePayloadForPrisma.description'])).replace(/\\n/g, '\n'),
    weight: asString(readPath(raw, ['weight', 'prismaImportData.productCreatePayloadForPrisma.weight'])),
    ingredients: normalizeIngredients(raw, prismaProduct),
    skinType: asStringArray(readPath(raw, ['skinType', 'prismaImportData.productCreatePayloadForPrisma.skinType'])),
    shelfLife: asString(readPath(raw, ['shelfLife', 'productSpecs.Shelf Life', 'prismaImportData.productCreatePayloadForPrisma.shelfLife'])),
    gtin: asString(readPath(raw, ['gtin', 'prismaImportData.productCreatePayloadForPrisma.gtin'])),
    barcode: asString(readPath(raw, ['barcode', 'prismaImportData.productCreatePayloadForPrisma.barcode'])),
    variants,
    images,

    metaTitle: asString(readPath(raw, ['metaTitle', 'seoFieldsForMinsahProductModel.metaTitle', 'prismaImportData.productCreatePayloadForPrisma.metaTitle'])),
    metaDescription: asString(readPath(raw, ['metaDescription', 'seoFieldsForMinsahProductModel.metaDescription', 'prismaImportData.productCreatePayloadForPrisma.metaDescription'])),
    bengaliProductName: asString(readPath(raw, ['bengaliProductName', 'bengaliName', 'productCore.bengaliName', 'prismaImportData.productCreatePayloadForPrisma.bengaliName'])),
    bengaliMetaDescription: asString(readPath(raw, ['bengaliMetaDescription', 'bengaliDescription', 'prismaImportData.productCreatePayloadForPrisma.bengaliDescription'])),
    focusKeyword: asString(readPath(raw, ['focusKeyword', 'seoFieldsForMinsahProductModel.focusKeyword', 'prismaImportData.productCreatePayloadForPrisma.focusKeyword'])),
    secondaryKeywords: asStringArray(readPath(raw, ['secondaryKeywords', 'seoFieldsForMinsahProductModel.secondaryKeywords', 'prismaImportData.productCreatePayloadForPrisma.secondaryKeywords'])),
    bengaliFocusKeyword: asString(readPath(raw, ['bengaliFocusKeyword', 'seoFieldsForMinsahProductModel.bengaliFocusKeyword', 'prismaImportData.productCreatePayloadForPrisma.bengaliFocusKeyword'])),
    bengaliSecondaryKeywords: asStringArray(readPath(raw, ['bengaliSecondaryKeywords', 'seoFieldsForMinsahProductModel.bengaliSecondaryKeywords', 'prismaImportData.productCreatePayloadForPrisma.bengaliSecondaryKeywords'])),
    ogTitle: asString(readPath(raw, ['ogTitle', 'seoFieldsForMinsahProductModel.ogTitle', 'prismaImportData.productCreatePayloadForPrisma.ogTitle'])),
    ogDescription: asString(readPath(raw, ['ogDescription', 'seoFieldsForMinsahProductModel.ogDescription', 'prismaImportData.productCreatePayloadForPrisma.ogDescription'])),
    ogImageUrl,
    canonicalUrl,
    urlSlug: slug,
    tags: asString(readPath(raw, ['tags', 'metaKeywords', 'seoFieldsForMinsahProductModel.metaKeywords', 'prismaImportData.productCreatePayloadForPrisma.tags'])),

    searchIntent: asString(readPath(raw, ['searchIntent', 'seoFieldsForMinsahProductModel.searchIntent', 'prismaImportData.productCreatePayloadForPrisma.searchIntent'])),
    targetAudience: asString(readPath(raw, ['targetAudience', 'seoFieldsForMinsahProductModel.targetAudience', 'prismaImportData.productCreatePayloadForPrisma.targetAudience'])),
    primaryConcern: asString(readPath(raw, ['primaryConcern', 'seoFieldsForMinsahProductModel.primaryConcern', 'prismaImportData.productCreatePayloadForPrisma.primaryConcern'])),
    keyBenefits: asStringArray(readPath(raw, ['keyBenefits', 'prismaImportData.productCreatePayloadForPrisma.keyBenefits'])),
    buyingIntentKeywords: asStringArray(readPath(raw, ['buyingIntentKeywords', 'seoFieldsForMinsahProductModel.buyingIntentKeywords', 'prismaImportData.productCreatePayloadForPrisma.buyingIntentKeywords'])),
    searchTags: asStringArray(readPath(raw, ['searchTags', 'seoFieldsForMinsahProductModel.searchTags', 'prismaImportData.productCreatePayloadForPrisma.searchTags'])),
    synonyms: asStringArray(readPath(raw, ['synonyms', 'seoFieldsForMinsahProductModel.synonyms', 'prismaImportData.productCreatePayloadForPrisma.synonyms'])),
    banglaSearchTerms: asStringArray(readPath(raw, ['banglaSearchTerms', 'seoFieldsForMinsahProductModel.banglaSearchTerms', 'prismaImportData.productCreatePayloadForPrisma.banglaSearchTerms'])),
    reviewKeywords: asStringArray(readPath(raw, ['reviewKeywords', 'seoFieldsForMinsahProductModel.reviewKeywords', 'prismaImportData.productCreatePayloadForPrisma.reviewKeywords'])),
    entities: asStringArray(readPath(raw, ['entities', 'seoFieldsForMinsahProductModel.entities', 'prismaImportData.productCreatePayloadForPrisma.entities'])),

    pageH1: asString(readPath(raw, ['pageH1', 'prismaImportData.productCreatePayloadForPrisma.pageH1']), makePageH1(raw, productCore)),
    seoIntro: asString(readPath(raw, ['seoIntro', 'shortDescription', 'prismaImportData.productCreatePayloadForPrisma.seoIntro'])),
    faqSchemaNote: asString(readPath(raw, ['faqSchemaNote', 'prismaImportData.productCreatePayloadForPrisma.faqSchemaNote']), 'FAQ content is for customer support. Product schema and merchant listing are SEO priority.'),
    authenticityNote: asString(readPath(raw, ['authenticityNote', 'authenticitySection.title', 'prismaImportData.productCreatePayloadForPrisma.authenticityNote'])),
    ingredientVerificationStatus: asString(readPath(raw, ['ingredientVerificationStatus', 'prismaImportData.productCreatePayloadForPrisma.ingredientVerificationStatus']), 'Pending physical packaging verification'),
    seoValidationChecklist: seoValidationChecklist.length > 0 ? seoValidationChecklist : defaultSeoValidationChecklist,
    variantPriceTable: normalizeJsonArray(readPath(raw, ['variantPriceTable', 'prismaImportData.productCreatePayloadForPrisma.variantPriceTable']), generatedVariantPriceTable),
    variantComparisonTable: normalizeJsonArray(readPath(raw, ['variantComparisonTable', 'prismaImportData.productCreatePayloadForPrisma.variantComparisonTable']), generateVariantComparison(raw)),
    internalLinks: normalizeJsonArray(readPath(raw, ['internalLinks', 'internalLinkingSuggestions', 'prismaImportData.productCreatePayloadForPrisma.internalLinks']), []),
    structuredDataJsonLd: structuredData,
    productGroupJsonLd: asRecord(readPath(raw, ['productGroupJsonLd', 'prismaImportData.productCreatePayloadForPrisma.productGroupJsonLd'])) || productGroupFromGraph,
    merchantListingJsonLd: asRecord(readPath(raw, ['merchantListingJsonLd', 'prismaImportData.productCreatePayloadForPrisma.merchantListingJsonLd'])) || null,
    breadcrumbJsonLd: asRecord(readPath(raw, ['breadcrumbJsonLd', 'prismaImportData.productCreatePayloadForPrisma.breadcrumbJsonLd'])) || breadcrumbFromGraph,
    sitemapIndexing: asRecord(readPath(raw, ['sitemapIndexing', 'prismaImportData.productCreatePayloadForPrisma.sitemapIndexing'])) || {
      includeInSitemap: true,
      canonicalUrl,
      robots: 'index,follow',
    },
    variantUrlStrategy: asRecord(readPath(raw, ['variantUrlStrategy', 'prismaImportData.productCreatePayloadForPrisma.variantUrlStrategy'])) || {
      strategy: 'single_product_page_with_variant_query_or_selector',
      ownerComment: 'Confirm whether variant query URLs are indexable. If not, keep canonical on the main product URL.',
    },

    productSpecs: asRecord(readPath(raw, ['productSpecs', 'product_specs', 'prismaImportData.productCreatePayloadForPrisma.productSpecs'])),
    productAttributes: asRecord(readPath(raw, ['productAttributes', 'attributes', 'prismaImportData.productCreatePayloadForPrisma.productAttributes'])),
    shadeOptions: normalizeRecordArray(readPath(raw, ['shadeOptions', 'prismaImportData.productCreatePayloadForPrisma.shadeOptions'])),
    usageInstructions: asStringArray(readPath(raw, ['usageInstructions', 'prismaImportData.productCreatePayloadForPrisma.usageInstructions'])),
    imageAltTexts,
    descriptionSections: normalizeDescriptionSections(readPath(raw, ['descriptionSections', 'prismaImportData.productCreatePayloadForPrisma.descriptionSections'])),
    faqSchemaReady: asBoolean(readPath(raw, ['faqSchemaReady', 'prismaImportData.productCreatePayloadForPrisma.faqSchemaReady']), false),
    gender: asString(readPath(raw, ['gender', 'productCore.gender', 'prismaImportData.productCreatePayloadForPrisma.gender'])),

    shippingWeight: asString(readPath(raw, ['shippingWeight', 'shippingAndDelivery.shippingWeight.250ml', 'prismaImportData.productCreatePayloadForPrisma.shippingWeight'])),
    dimensions: {
      length: asString(readPath(raw, ['dimensions.length', 'prismaImportData.productCreatePayloadForPrisma.dimensions.length'])),
      width: asString(readPath(raw, ['dimensions.width', 'prismaImportData.productCreatePayloadForPrisma.dimensions.width'])),
      height: asString(readPath(raw, ['dimensions.height', 'prismaImportData.productCreatePayloadForPrisma.dimensions.height'])),
    },
    isFragile: asBoolean(readPath(raw, ['isFragile', 'shippingAndDelivery.isFragile', 'prismaImportData.productCreatePayloadForPrisma.isFragile']), false),
    deliveryOfferEnabled,
    deliveryOfferType: normalizedDeliveryOfferType,
    deliveryOfferAmount,
    deliveryChargeInsideDhaka,
    deliveryChargeOutsideDhaka,
    deliveryOfferStartDate: asString(readPath(raw, ['deliveryOfferStartDate', 'deliveryOffer.startDate', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferStartDate'])),
    deliveryOfferEndDate: asString(readPath(raw, ['deliveryOfferEndDate', 'deliveryOffer.endDate', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferEndDate'])),
    deliveryOfferBadgeText: asString(readPath(raw, ['deliveryOfferBadgeText', 'deliveryOffer.badgeText', 'shippingAndDelivery.deliveryOfferBadgeText', 'prismaImportData.productCreatePayloadForPrisma.deliveryOfferBadgeText'])),

    flashSaleEligible: asBoolean(readPath(raw, ['flashSaleEligible', 'prismaImportData.productCreatePayloadForPrisma.flashSaleEligible']), false),
    lowStockThreshold: asString(readPath(raw, ['lowStockThreshold', 'prismaImportData.productCreatePayloadForPrisma.lowStockThreshold']), '10'),
    returnEligible: asBoolean(readPath(raw, ['returnEligible', 'productCore.returnEligible', 'prismaImportData.productCreatePayloadForPrisma.returnEligible']), true),
    codAvailable: asBoolean(readPath(raw, ['codAvailable', 'productCore.codAvailable', 'prismaImportData.productCreatePayloadForPrisma.codAvailable']), true),
    preOrderOption: asBoolean(readPath(raw, ['preOrderOption', 'prismaImportData.productCreatePayloadForPrisma.preOrderOption']), false),
    marketPriceNote: asString(readPath(raw, ['marketPriceNote', 'productCore.priceNote'])),
    faqs: normalizeFaqs(readPath(raw, ['faqs', 'prismaImportData.productCreatePayloadForPrisma.faqs'])),

    ownerFillRequired: normalizeOwnerFill(raw),
    ownerFillRequiredByPath: asRecord(readPath(raw, ['ownerFillRequiredByPath', 'fillByOwner', 'ownerFillByPath'])),
    ownerComments: normalizeOwnerComments(raw),
  };
}

function normalizeVariants(raw: JsonRecord, prismaImport: JsonRecord, productCore: JsonRecord): ImportVariant[] {
  const source = asArray(
    readPath(raw, [
      'variants',
      'variantsForMinsahProductVariantModel',
      'prismaImportData.variantsCreatePayloadForPrisma',
    ])
  );

  if (source.length === 0) {
    return [{ size: '', color: '', shade: '', price: priceText(productCore.price), stock: '0', sku: '' }];
  }

  return source.map((entry, index) => {
    const variant = asRecord(entry) || {};
    const attributes = asRecord(variant.attributes) || {};
    const color = asString(variant.color || attributes.color || attributes.variant || attributes.shade);
    const size = asString(variant.size || attributes.size);
    const stock = asString(variant.stock ?? variant.quantity ?? '0');

    return {
      size,
      color,
      shade: asString(variant.shade || attributes.shade || color),
      price: priceText(variant.price ?? variant.salePrice, productCore.price),
      stock,
      sku: asString(variant.sku || `MSH-VAR-${index + 1}`),
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    };
  });
}

function normalizeIngredients(raw: JsonRecord, prismaProduct: JsonRecord): string {
  const direct = readPath(raw, ['ingredientsTextForProductField', 'ingredientsText', 'ingredients', 'prismaImportData.productCreatePayloadForPrisma.ingredients']);
  if (typeof direct === 'string') return direct;

  if (direct && typeof direct === 'object') {
    return JSON.stringify(direct, null, 2);
  }

  const packageIngredients = raw.ingredients;
  if (packageIngredients && typeof packageIngredients === 'object') {
    return JSON.stringify(packageIngredients, null, 2);
  }

  return asString(prismaProduct.ingredients);
}

function normalizeJsonArray(value: unknown, fallback: unknown[] = []): unknown[] {
  return Array.isArray(value) ? value : fallback;
}

function normalizeRecordArray(value: unknown): Array<JsonRecord> {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry));
}

function normalizeDescriptionSections(value: unknown): Array<{ heading: string; points: string[] }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((section) => {
      const record = asRecord(section) || {};
      const body = asString(record.body || record.text || '');
      const points = asStringArray(record.points);

      return {
        heading: asString(record.heading || record.title),
        points: points.length > 0 ? points : body ? [body] : [],
      };
    })
    .filter((section) => section.heading || section.points.length > 0);
}

function normalizeFaqs(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((faq, index) => {
      const record = asRecord(faq) || {};
      return {
        id: asString(record.id || `faq-import-${Date.now()}-${index}`),
        question: asString(record.question || record.name),
        answer: asString(record.answer || record.text || asRecord(record.acceptedAnswer)?.text),
      };
    })
    .filter((faq) => faq.question || faq.answer);
}

function normalizeOwnerFill(raw: JsonRecord): string[] {
  const direct = readPath(raw, ['ownerFillRequired_1_to_22', 'ownerFillRequired', 'publishChecklist']);
  const list = asStringArray(direct);
  if (list.length > 0) return list;

  return [
    'Replace ADD_FINAL_PRODUCT_PAGE_URL with the real live product URL',
    'Replace ADD_OG_IMAGE_URL with real OG image URL',
    'Replace all ADD_IMAGE_URL_* values with real product image URLs',
    'Update variant stock quantity before publishing',
    'Confirm Strong Lengths vs Stronger Lengths from physical packaging',
    'Verify ingredient list from physical product packaging',
  ];
}

function normalizeOwnerComments(raw: JsonRecord): string[] {
  const candidates = [raw.ownerComment, raw.OwnerComment, raw.ownerComments, raw.owner_comment].filter(Boolean);
  return candidates.flatMap(asStringArray);
}

function asImportImages(value: unknown, imageAltTexts: string[]): ImportImage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index): ImportImage[] => {
    if (typeof entry === 'string') {
      const url = entry.trim();
      return url ? [{ url, alt: imageAltTexts[index], sortOrder: index }] : [];
    }

    const image = asRecord(entry);
    if (!image) return [];

    const url = asString(image.url || image.src || image.image).trim();
    if (!url || url.startsWith('ADD_')) return [];

    return [
      {
        url,
        alt: asString(image.alt || image.altText || imageAltTexts[index]).trim() || undefined,
        title: asString(image.title || image.alt || image.altText || imageAltTexts[index]).trim() || undefined,
        sortOrder: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index,
        isDefault: asBoolean(image.isDefault, index === 0),
      },
    ];
  });
}

function makePageH1(raw: JsonRecord, productCore: JsonRecord): string {
  const name = asString(readPath(raw, ['name', 'productCore.name', 'prismaImportData.productCreatePayloadForPrisma.name']));
  const category = asString(productCore.category || raw.category);
  if (!name) return '';
  if (/bangladesh/i.test(name)) return name;
  if (/hair/i.test(category)) return `${name} Price in Bangladesh`;
  return name;
}

function generateVariantComparison(raw: JsonRecord): unknown[] {
  const guide = asRecord(raw.variantGuide);
  if (!guide) return [];

  return Object.entries(guide).map(([variant, value]) => {
    const record = asRecord(value) || {};
    return {
      variant,
      bestFor: record.bestFor || '',
      keyActives: Array.isArray(record.keyActives) ? record.keyActives.join(', ') : asString(record.keyActives),
      benefitSummary: record.benefitSummary || '',
    };
  });
}

function jsonString(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback, null, 2);
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImportProductPage() {
  const { pushToast } = useToast();
  const router = useRouter();
  const { hasPermission } = useAdminAuth();
  const { getActiveCategories } = useCategories();

  const categoriesData = useMemo(
    () => getActiveCategories().map((cat) => ({ name: cat.name, subcategories: cat.subcategories })),
    [getActiveCategories]
  );

  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState('');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [step, setStep] = useState<'paste' | 'review'>('paste');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    owner: true,
    basic: true,
    variants: true,
    seo: true,
    semantic: false,
    content: false,
    techSeo: false,
    shipping: false,
    deliveryOffer: false,
    options: false,
    faqs: false,
  });

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
          <p className="text-rose-300">You don&apos;t have permission to create products.</p>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleParse = () => {
    if (!pasteText.trim()) {
      setParseError('Paste the Claude or ChatGPT output.');
      return;
    }

    const result = parseImportData(pasteText);
    if (result.error) {
      setParseError(result.error);
      setImportData(null);
    } else {
      setParseError('');
      setImportData(result.data);
      setStep('review');
    }
  };

  const updateField = <K extends keyof ImportData>(field: K, value: ImportData[K]) => {
    setImportData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateVariant = (index: number, field: keyof ImportVariant, value: string) => {
    setImportData((prev) => {
      if (!prev) return prev;
      const variants = prev.variants.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant));
      return { ...prev, variants };
    });
  };

  const handleAddVariant = () => {
    setImportData((prev) => {
      if (!prev) return prev;
      const newIndex = prev.variants.length + 1;
      const newVariant: ImportVariant = {
        size: '',
        color: '',
        shade: '',
        price: prev.variants[0]?.price || '',
        stock: '10',
        sku: `MSH-VAR-${Date.now().toString(36).toUpperCase()}-${newIndex}`,
      };
      return { ...prev, variants: [...prev.variants, newVariant] };
    });
  };

  const handleRemoveVariant = (index: number) => {
    setImportData((prev) => {
      if (!prev) return prev;
      if (prev.variants.length <= 1) {
        pushToast({ tone: 'danger', description: 'At least one variant is required' });
        return prev;
      }
      return { ...prev, variants: prev.variants.filter((_, i) => i !== index) };
    });
  };

  const updateDimension = (field: 'length' | 'width' | 'height', value: string) => {
    setImportData((prev) => (prev ? { ...prev, dimensions: { ...prev.dimensions, [field]: value } } : prev));
  };

  const handleStringArrayChange = (field: keyof ImportData, value: string) => {
    updateField(field, value.split(',').map((entry) => entry.trim()).filter(Boolean) as never);
  };

  const updateJsonField = <K extends keyof ImportData>(field: K, value: string, fallback: ImportData[K]) => {
    updateField(field, safeJsonParse(value, fallback));
  };

  const toggleSkinType = (type: string) => {
    setImportData((prev) => {
      if (!prev) return prev;
      const skinType = prev.skinType.includes(type)
        ? prev.skinType.filter((entry) => entry !== type)
        : [...prev.skinType, type];
      return { ...prev, skinType };
    });
  };

  const validate = (): string[] => {
    if (!importData) return ['No data'];
    const errors: string[] = [];

    if (!importData.name.trim()) errors.push('Product name required');
    if (!importData.brand.trim()) errors.push('Brand required');
    if (!importData.description.trim()) errors.push('Description required');
    if (!importData.category.trim()) errors.push('Category required');

    importData.variants.forEach((variant, index) => {
      if (!variant.price || parseFloat(variant.price) <= 0) errors.push(`Variant ${index + 1}: price required`);
      if (!variant.sku.trim()) errors.push(`Variant ${index + 1}: SKU required`);
    });

    if (importData.deliveryOfferEnabled && importData.deliveryOfferType === 'FIXED') {
      const inside = Number(importData.deliveryChargeInsideDhaka || importData.deliveryOfferAmount);
      const outside = Number(importData.deliveryChargeOutsideDhaka || importData.deliveryOfferAmount);
      if ((!importData.deliveryChargeInsideDhaka.trim() && !importData.deliveryOfferAmount.trim()) || !Number.isFinite(inside) || inside < 0) {
        errors.push('Fixed delivery offer amount (Inside Dhaka) must be 0 or greater');
      }
      if (importData.deliveryChargeOutsideDhaka.trim() && (!Number.isFinite(outside) || outside < 0)) {
        errors.push('Outside Dhaka delivery charge must be 0 or greater');
      }
    }
    if (importData.deliveryOfferStartDate && importData.deliveryOfferEndDate) {
      const start = new Date(importData.deliveryOfferStartDate);
      const end = new Date(importData.deliveryOfferEndDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
        errors.push('Delivery offer end date must be after start date');
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!importData) return;

    const errors = validate();
    if (errors.length > 0) {
      pushToast({ tone: 'danger', description: 'Fix these before saving:\n• ' + errors.join('\n• ') });
      return;
    }

    setIsSubmitting(true);
    try {
      const basePrice = parseFloat(importData.variants[0]?.price || '0') || 0;
      const cleanCanonical = importData.canonicalUrl && !importData.canonicalUrl.includes('ADD_') ? importData.canonicalUrl : undefined;
      const finalCanonicalUrl = cleanCanonical || (importData.urlSlug ? `${DEFAULT_PRODUCT_BASE_URL}/${importData.urlSlug}` : undefined);
      const cleanOgImage = importData.ogImageUrl && !importData.ogImageUrl.includes('ADD_') ? importData.ogImageUrl : undefined;
      const finalOgImageUrl = cleanOgImage || importData.images.find((image) => image.isDefault)?.url || importData.images[0]?.url;

      await adminFetchJson<{ success: boolean }>('/api/admin/products', {
        method: 'POST',
        json: {
          // Basic
          name: importData.name,
          category: importData.category,
          subcategory: importData.subcategory || undefined,
          item: importData.item || undefined,
          brand: importData.brand,
          originCountry: importData.originCountry,
          status: importData.status,
          featured: importData.featured,
          description: importData.description,
          weight: numericText(importData.weight),
          ingredients: importData.ingredients || undefined,
          skinType: importData.skinType.length > 0 ? importData.skinType : undefined,
          shelfLife: importData.shelfLife || undefined,
          images: importData.images.map((image, index) => ({
            url: image.url,
            alt: image.alt || importData.imageAltTexts[index] || importData.name,
            title: image.title || image.alt || importData.imageAltTexts[index] || importData.name,
            sortOrder: image.sortOrder ?? index,
            isDefault: image.isDefault ?? index === 0,
          })),
          variants: importData.variants.map((variant) => ({
            size: variant.size,
            color: variant.color,
            shade: variant.shade,
            price: parseFloat(variant.price) || basePrice,
            stock: parseInt(variant.stock, 10) || 0,
            sku: variant.sku,
            attributes: variant.attributes || {
              size: variant.size,
              color: variant.color,
              shade: variant.shade,
            },
          })),

          // SEO classic
          metaTitle: importData.metaTitle || undefined,
          metaDescription: importData.metaDescription || undefined,
          urlSlug: importData.urlSlug || undefined,
          tags: importData.tags || undefined,
          bengaliName: importData.bengaliProductName || undefined,
          bengaliDescription: importData.bengaliMetaDescription || undefined,
          focusKeyword: importData.focusKeyword || undefined,
          secondaryKeywords: importData.secondaryKeywords.length > 0 ? importData.secondaryKeywords : undefined,
          bengaliFocusKeyword: importData.bengaliFocusKeyword || undefined,
          bengaliSecondaryKeywords: importData.bengaliSecondaryKeywords.length > 0 ? importData.bengaliSecondaryKeywords : undefined,
          ogTitle: importData.ogTitle || importData.metaTitle || undefined,
          ogDescription: importData.ogDescription || undefined,
          ogImageUrl: finalOgImageUrl || undefined,
          canonicalUrl: finalCanonicalUrl,

          // Semantic SEO
          searchIntent: importData.searchIntent || undefined,
          targetAudience: importData.targetAudience || undefined,
          primaryConcern: importData.primaryConcern || undefined,
          keyBenefits: importData.keyBenefits.length > 0 ? importData.keyBenefits : undefined,
          buyingIntentKeywords: importData.buyingIntentKeywords.length > 0 ? importData.buyingIntentKeywords : undefined,
          searchTags: importData.searchTags.length > 0 ? importData.searchTags : undefined,
          synonyms: importData.synonyms.length > 0 ? importData.synonyms : undefined,
          banglaSearchTerms: importData.banglaSearchTerms.length > 0 ? importData.banglaSearchTerms : undefined,
          reviewKeywords: importData.reviewKeywords.length > 0 ? importData.reviewKeywords : undefined,
          entities: importData.entities.length > 0 ? importData.entities : undefined,

          // Full SEO 1-22 schema fields
          pageH1: importData.pageH1 || undefined,
          seoIntro: importData.seoIntro || undefined,
          faqSchemaNote: importData.faqSchemaNote || undefined,
          authenticityNote: importData.authenticityNote || undefined,
          ingredientVerificationStatus: importData.ingredientVerificationStatus || undefined,
          seoValidationChecklist: importData.seoValidationChecklist.length > 0 ? importData.seoValidationChecklist : undefined,
          structuredDataJsonLd: importData.structuredDataJsonLd || undefined,
          productGroupJsonLd: importData.productGroupJsonLd || undefined,
          merchantListingJsonLd: importData.merchantListingJsonLd || undefined,
          breadcrumbJsonLd: importData.breadcrumbJsonLd || undefined,
          sitemapIndexing: importData.sitemapIndexing || undefined,
          variantUrlStrategy: importData.variantUrlStrategy || undefined,
          variantPriceTable: importData.variantPriceTable.length > 0 ? importData.variantPriceTable : undefined,
          variantComparisonTable: importData.variantComparisonTable.length > 0 ? importData.variantComparisonTable : undefined,
          internalLinks: importData.internalLinks.length > 0 ? importData.internalLinks : undefined,

          // Product structured content
          productSpecs: importData.productSpecs || undefined,
          productAttributes: importData.productAttributes || undefined,
          shadeOptions: importData.shadeOptions.length > 0 ? importData.shadeOptions : undefined,
          usageInstructions: importData.usageInstructions.length > 0 ? importData.usageInstructions : undefined,
          imageAltTexts: importData.imageAltTexts.length > 0 ? importData.imageAltTexts : undefined,
          descriptionSections: importData.descriptionSections.length > 0 ? importData.descriptionSections : undefined,
          faqSchemaReady: importData.faqSchemaReady,
          gender: importData.gender || undefined,

          // Defaults / shipping / options
          condition: importData.condition || 'NEW',
          gtin: importData.gtin || undefined,
          barcode: importData.barcode || undefined,
          averageRating: 0,
          reviewCount: 0,
          shippingWeight: importData.shippingWeight || undefined,
          dimensions:
            importData.dimensions.length || importData.dimensions.width || importData.dimensions.height
              ? importData.dimensions
              : undefined,
          isFragile: importData.isFragile,
          deliveryOfferEnabled: importData.deliveryOfferEnabled && importData.deliveryOfferType !== 'DEFAULT',
          deliveryOfferType: importData.deliveryOfferEnabled ? importData.deliveryOfferType : 'DEFAULT',
          deliveryOfferAmount: importData.deliveryOfferEnabled && importData.deliveryOfferType === 'FIXED' ? (importData.deliveryChargeInsideDhaka || importData.deliveryOfferAmount || undefined) : undefined,
          deliveryChargeInsideDhaka: importData.deliveryOfferEnabled && importData.deliveryOfferType === 'FIXED' ? (importData.deliveryChargeInsideDhaka || importData.deliveryOfferAmount || undefined) : (importData.deliveryOfferType === 'FREE' ? '0' : undefined),
          deliveryChargeOutsideDhaka: importData.deliveryOfferEnabled && importData.deliveryOfferType === 'FIXED' ? (importData.deliveryChargeOutsideDhaka || importData.deliveryOfferAmount || undefined) : (importData.deliveryOfferType === 'FREE' ? '0' : undefined),
          deliveryOfferStartDate: importData.deliveryOfferEnabled ? importData.deliveryOfferStartDate || undefined : undefined,
          deliveryOfferEndDate: importData.deliveryOfferEnabled ? importData.deliveryOfferEndDate || undefined : undefined,
          deliveryOfferBadgeText: importData.deliveryOfferEnabled ? importData.deliveryOfferBadgeText || undefined : undefined,
          flashSaleEligible: importData.flashSaleEligible,
          lowStockThreshold: importData.lowStockThreshold || undefined,
          returnEligible: importData.returnEligible,
          codAvailable: importData.codAvailable,
          preOrderOption: importData.preOrderOption,
          faqs: importData.faqs.length > 0 ? importData.faqs : undefined,
        },
      });

      router.push('/admin/products?imported=1');
    } catch (err) {
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to create product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-white hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
        <h1 className="text-2xl font-bold text-[#F7F8F8]">Product Import — SEO 1-22 Ready</h1>
        <p className="text-[#8a8f98] text-sm mt-1">
          Paste an [IMPORT_DATA] block, flat JSON, or the complete final SEO JSON to auto-fill the form.
        </p>
      </div>

      <div className="mb-6 bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#5e6ad2] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#f7f8f8] space-y-1">
            <p className="font-semibold">How to use this importer:</p>
            <p>1. Paste the final JSON or <code className="bg-[#5e6ad2]/20 px-1.5 py-0.5 rounded font-mono">[IMPORT_DATA]...[/IMPORT_DATA]</code> block.</p>
            <p>2. Parse it → review the owner-fill section → verify stock, URLs, and images → save.</p>
            <p>3. The backend API route must save the new SEO fields; otherwise those payload fields will be ignored.</p>
          </div>
        </div>
      </div>

      {step === 'paste' && (
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardPaste className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-[#F7F8F8]">Paste import JSON</h2>
          </div>

          <Textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setParseError('');
            }}
            rows={16}
            className="w-full px-4 py-3 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 font-mono text-sm resize-y"
            placeholder={`Paste here:\n\n[IMPORT_DATA]\n{\n  "name": "Sunsilk Power Shot Hair Treatment",\n  "category": "Hair care",\n  "brand": "Sunsilk",\n  "pageH1": "Sunsilk Power Shot Hair Treatment Price in Bangladesh"\n}\n[/IMPORT_DATA]\n\nOr paste the complete final SEO JSON.`}
          />

          {parseError && (
            <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              onClick={handleParse}
              disabled={!pasteText.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg disabled:opacity-50 font-medium"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Parse JSON
            </Button>
            <Button
              type="button"
              onClick={() => setPasteText('')}
              className="inline-flex items-center px-4 py-2.5 border border-[#232636] rounded-lg text-[#8a8f98] hover:bg-[#10121b]"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && importData && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-emerald-300">Data parsed — review it, update owner-fill fields, then save</p>
            </div>
            {importData.marketPriceNote && (
              <p className="text-sm text-emerald-400 ml-7">
                💰 <strong>Market Reference:</strong> {importData.marketPriceNote}
              </p>
            )}
          </div>

          <Section
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
            title="Owner Fill Required / Publish Blockers"
            sectionKey="owner"
            expanded={expandedSections.owner}
            onToggle={() => toggleSection('owner')}
            highlight
          >
            <div className="space-y-4">
              <p className="text-sm text-amber-300">
                Verify or complete these fields before or after import. JSON comments are invalid, so they are shown as separate review fields.
              </p>
              <ul className="list-disc pl-5 text-sm text-[#d0d6e0] space-y-1">
                {importData.ownerFillRequired.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
              {importData.ownerFillRequiredByPath && (
                <JsonEditor
                  label="Owner Fill Required By Path JSON"
                  value={importData.ownerFillRequiredByPath}
                  onBlur={(value) => updateField('ownerFillRequiredByPath', safeJsonParse(value, importData.ownerFillRequiredByPath))}
                  rows={8}
                />
              )}
              {importData.ownerComments.length > 0 && (
                <div className="bg-[#10121b] rounded-lg border border-[#232636] p-3">
                  <p className="text-sm font-medium text-[#d0d6e0] mb-2">Owner Comments</p>
                  <ul className="list-disc pl-5 text-sm text-[#8a8f98]">
                    {importData.ownerComments.map((comment, index) => (
                      <li key={`${comment}-${index}`}>{comment}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          <Section
            icon={<Package className="w-5 h-5 text-white" />}
            title="Basic Information"
            sectionKey="basic"
            expanded={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <div className="space-y-4">
              <TextInput label="Product Name *" value={importData.name} onChange={(value) => updateField('name', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Category *</label>
                  <Select
                    value={importData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20"
                  >
                    <option value="">Select category</option>
                    {categoriesData.map((category) => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                    {importData.category && !categoriesData.some((category) => category.name === importData.category) && (
                      <option value={importData.category}>{importData.category}</option>
                    )}
                  </Select>
                  <p className="text-xs text-[#62666d] mt-1">Category name database-er exact name-er sathe match korte hobe.</p>
                </div>
                <TextInput label="Brand *" value={importData.brand} onChange={(value) => updateField('brand', value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Status *</label>
                  <Select
                    value={importData.status}
                    onChange={(e) => updateField('status', e.target.value as 'active' | 'inactive')}
                    className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20"
                  >
                    <option value="active">Active (Published)</option>
                    <option value="inactive">Draft (Inactive)</option>
                  </Select>
                  <p className="text-xs text-[#62666d] mt-1">ছবি বা তথ্য অসম্পূর্ণ থাকলে Draft হিসেবে সেভ করুন।</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Condition</label>
                  <Select
                    value={importData.condition}
                    onChange={(e) => updateField('condition', e.target.value as 'NEW' | 'USED' | 'REFURBISHED')}
                    className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20"
                  >
                    <option value="NEW">New</option>
                    <option value="USED">Used</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextInput label="Subcategory" value={importData.subcategory} onChange={(value) => updateField('subcategory', value)} />
                <TextInput label="Item / Product Type" value={importData.item} onChange={(value) => updateField('item', value)} />
                <div>
                  <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Origin Country</label>
                  <Select
                    value={importData.originCountry}
                    onChange={(e) => updateField('originCountry', e.target.value)}
                    className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                    {importData.originCountry && !countries.includes(importData.originCountry) && (
                      <option value={importData.originCountry}>{importData.originCountry}</option>
                    )}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="GTIN (Barcode / EAN / UPC)" value={importData.gtin} onChange={(value) => updateField('gtin', value)} placeholder="e.g., 880912345678" />
                <TextInput label="Barcode" value={importData.barcode} onChange={(value) => updateField('barcode', value)} placeholder="Warehouse barcode" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={importData.featured}
                  onChange={(e) => updateField('featured', e.target.checked)}
                  className="w-4 h-4 text-white rounded"
                />
                <span className="text-sm text-[#d0d6e0]">Featured Product</span>
              </label>

              <TextareaInput label="Description *" value={importData.description} rows={8} onChange={(value) => updateField('description', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Weight (numeric)" value={importData.weight} onChange={(value) => updateField('weight', value)} placeholder="e.g., 250" />
                <TextInput label="Shelf Life" value={importData.shelfLife} onChange={(value) => updateField('shelfLife', value)} placeholder="24 months / 12 months after opening" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-2">Skin / Hair Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      onClick={() => toggleSkinType(type)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        importData.skinType.includes(type)
                          ? 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border-admin-primary text-white'
                          : 'bg-[#161824] border-[#232636] text-[#d0d6e0] hover:border-admin-border'
                      }`}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <TextareaInput label="Ingredients" value={importData.ingredients} rows={5} onChange={(value) => updateField('ingredients', value)} />
            </div>
          </Section>

          <Section
            icon={<Tag className="w-5 h-5 text-white" />}
            title={`Variants — Price & Stock (${importData.variants.length})`}
            sectionKey="variants"
            expanded={expandedSections.variants}
            onToggle={() => toggleSection('variants')}
            highlight
          >
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-300 flex-1">
                  Always verify price, stock, and SKU. A stock value of 0 keeps the product schema and storefront status as OutOfStock.
                </div>
                <Button
                  type="button"
                  onClick={handleAddVariant}
                  className="inline-flex items-center self-start sm:self-center px-4 py-2.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white text-xs font-medium rounded-lg shadow whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Variant
                </Button>
              </div>
              {importData.variants.map((variant, index) => (
                <div key={`${variant.sku}-${index}`} className="border border-[#232636] rounded-lg p-4 bg-[#10121b]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#d0d6e0]">Variant #{index + 1}</p>
                    {importData.variants.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded transition-colors"
                        title="Delete variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <TextInput label="Size" value={variant.size} onChange={(value) => updateVariant(index, 'size', value)} small />
                    <TextInput label="Color" value={variant.color} onChange={(value) => updateVariant(index, 'color', value)} small />
                    <TextInput label="Shade" value={variant.shade} onChange={(value) => updateVariant(index, 'shade', value)} small />
                    <TextInput label="Price (BDT) *" value={variant.price} onChange={(value) => updateVariant(index, 'price', value)} small />
                    <TextInput label="Stock *" value={variant.stock} onChange={(value) => updateVariant(index, 'stock', value)} small />
                    <TextInput label="SKU *" value={variant.sku} onChange={(value) => updateVariant(index, 'sku', value)} small />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            icon={<Search className="w-5 h-5 text-white" />}
            title="SEO Core — Title, Meta, Canonical, OG"
            sectionKey="seo"
            expanded={expandedSections.seo}
            onToggle={() => toggleSection('seo')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Meta Title" value={importData.metaTitle} onChange={(value) => updateField('metaTitle', value)} />
                <TextInput label="Page H1" value={importData.pageH1} onChange={(value) => updateField('pageH1', value)} />
              </div>
              <TextareaInput label="Meta Description" value={importData.metaDescription} rows={3} onChange={(value) => updateField('metaDescription', value)} />
              <TextareaInput label="SEO Intro / Top Visible Intro" value={importData.seoIntro} rows={3} onChange={(value) => updateField('seoIntro', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Focus Keyword" value={importData.focusKeyword} onChange={(value) => updateField('focusKeyword', value)} />
                <TextInput label="Bengali Focus Keyword" value={importData.bengaliFocusKeyword} onChange={(value) => updateField('bengaliFocusKeyword', value)} />
              </div>

              <ArrayTextarea
                label="Secondary Keywords"
                value={importData.secondaryKeywords}
                onChange={(value) => handleStringArrayChange('secondaryKeywords', value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="URL Slug" value={importData.urlSlug} onChange={(value) => updateField('urlSlug', value)} />
                <TextInput label="Canonical URL" value={importData.canonicalUrl} onChange={(value) => updateField('canonicalUrl', value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="OG Title" value={importData.ogTitle} onChange={(value) => updateField('ogTitle', value)} />
                <TextInput label="OG Image URL" value={importData.ogImageUrl} onChange={(value) => updateField('ogImageUrl', value)} />
              </div>
              <TextareaInput label="OG Description" value={importData.ogDescription} rows={3} onChange={(value) => updateField('ogDescription', value)} />
              <TextInput label="Tags / Meta Keywords" value={importData.tags} onChange={(value) => updateField('tags', value)} />
            </div>
          </Section>

          <Section
            icon={<Sparkles className="w-5 h-5 text-white" />}
            title="Semantic SEO"
            sectionKey="semantic"
            expanded={expandedSections.semantic}
            onToggle={() => toggleSection('semantic')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextInput label="Search Intent" value={importData.searchIntent} onChange={(value) => updateField('searchIntent', value)} />
                <TextInput label="Primary Concern" value={importData.primaryConcern} onChange={(value) => updateField('primaryConcern', value)} />
                <TextInput label="Gender" value={importData.gender} onChange={(value) => updateField('gender', value)} />
              </div>
              <TextareaInput label="Target Audience" value={importData.targetAudience} rows={2} onChange={(value) => updateField('targetAudience', value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  ['keyBenefits', 'Key Benefits'],
                  ['buyingIntentKeywords', 'Buying Intent Keywords'],
                  ['searchTags', 'Search Tags'],
                  ['synonyms', 'Synonyms'],
                  ['banglaSearchTerms', 'Bangla Search Terms'],
                  ['reviewKeywords', 'Review Keywords'],
                  ['entities', 'Entities'],
                  ['bengaliSecondaryKeywords', 'Bengali Secondary Keywords'],
                ] as Array<[keyof ImportData, string]>).map(([field, label]) => (
                  <ArrayTextarea
                    key={field as string}
                    label={label}
                    value={importData[field] as string[]}
                    onChange={(value) => handleStringArrayChange(field, value)}
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section
            icon={<FileJson className="w-5 h-5 text-white" />}
            title="Structured Content + SEO Tables"
            sectionKey="content"
            expanded={expandedSections.content}
            onToggle={() => toggleSection('content')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ArrayTextarea label="Usage Instructions" value={importData.usageInstructions} onChange={(value) => handleStringArrayChange('usageInstructions', value)} />
                <ArrayTextarea label="Image Alt Texts" value={importData.imageAltTexts} onChange={(value) => handleStringArrayChange('imageAltTexts', value)} />
              </div>

              <TextareaInput label="FAQ Schema Note" value={importData.faqSchemaNote} rows={2} onChange={(value) => updateField('faqSchemaNote', value)} />
              <TextareaInput label="Authenticity Note" value={importData.authenticityNote} rows={2} onChange={(value) => updateField('authenticityNote', value)} />
              <TextInput label="Ingredient Verification Status" value={importData.ingredientVerificationStatus} onChange={(value) => updateField('ingredientVerificationStatus', value)} />
              <ArrayTextarea label="SEO Validation Checklist" value={importData.seoValidationChecklist} onChange={(value) => handleStringArrayChange('seoValidationChecklist', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JsonEditor label="Product Specs JSON" value={importData.productSpecs || {}} onBlur={(value) => updateJsonField('productSpecs', value, importData.productSpecs)} />
                <JsonEditor label="Product Attributes JSON" value={importData.productAttributes || {}} onBlur={(value) => updateJsonField('productAttributes', value, importData.productAttributes)} />
                <JsonEditor label="Shade Options JSON" value={importData.shadeOptions} onBlur={(value) => updateJsonField('shadeOptions', value, importData.shadeOptions)} />
                <JsonEditor label="Description Sections JSON" value={importData.descriptionSections} onBlur={(value) => updateJsonField('descriptionSections', value, importData.descriptionSections)} />
                <JsonEditor label="Variant Price Table JSON" value={importData.variantPriceTable} onBlur={(value) => updateJsonField('variantPriceTable', value, importData.variantPriceTable)} />
                <JsonEditor label="Variant Comparison Table JSON" value={importData.variantComparisonTable} onBlur={(value) => updateJsonField('variantComparisonTable', value, importData.variantComparisonTable)} />
                <JsonEditor label="Internal Links JSON" value={importData.internalLinks} onBlur={(value) => updateJsonField('internalLinks', value, importData.internalLinks)} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={importData.faqSchemaReady}
                  onChange={(e) => updateField('faqSchemaReady', e.target.checked)}
                  className="w-4 h-4 text-white rounded"
                />
                <span className="text-sm text-[#d0d6e0]">FAQ schema ready</span>
              </label>
            </div>
          </Section>

          <Section
            icon={<Link2 className="w-5 h-5 text-white" />}
            title="Technical SEO JSON-LD / Sitemap / Variant URL Strategy"
            sectionKey="techSeo"
            expanded={expandedSections.techSeo}
            onToggle={() => toggleSection('techSeo')}
          >
            <div className="space-y-4">
              <div className="bg-admin-panel border border-admin-border rounded-lg p-3 text-sm text-white">
                These fields are saved to the database. The storefront product page must render them correctly to receive the full SEO benefit.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JsonEditor label="Structured Data JSON-LD" value={importData.structuredDataJsonLd || {}} onBlur={(value) => updateJsonField('structuredDataJsonLd', value, importData.structuredDataJsonLd)} rows={10} />
                <JsonEditor label="ProductGroup JSON-LD" value={importData.productGroupJsonLd || {}} onBlur={(value) => updateJsonField('productGroupJsonLd', value, importData.productGroupJsonLd)} rows={10} />
                <JsonEditor label="Merchant Listing JSON-LD" value={importData.merchantListingJsonLd || {}} onBlur={(value) => updateJsonField('merchantListingJsonLd', value, importData.merchantListingJsonLd)} rows={10} />
                <JsonEditor label="Breadcrumb JSON-LD" value={importData.breadcrumbJsonLd || {}} onBlur={(value) => updateJsonField('breadcrumbJsonLd', value, importData.breadcrumbJsonLd)} rows={10} />
                <JsonEditor label="Sitemap / Indexing JSON" value={importData.sitemapIndexing || {}} onBlur={(value) => updateJsonField('sitemapIndexing', value, importData.sitemapIndexing)} rows={8} />
                <JsonEditor label="Variant URL Strategy JSON" value={importData.variantUrlStrategy || {}} onBlur={(value) => updateJsonField('variantUrlStrategy', value, importData.variantUrlStrategy)} rows={8} />
              </div>
            </div>
          </Section>

          <Section
            icon={<Upload className="w-5 h-5 text-white" />}
            title="Product Images"
            sectionKey="images"
            expanded={expandedSections.images}
            onToggle={() => toggleSection('images')}
          >
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
                Placeholder image URLs were removed automatically. Add real CDN or live image URLs in the JSON editor, or upload images from the edit page after saving.
              </div>
              <JsonEditor label="Images JSON" value={importData.images} onBlur={(value) => updateJsonField('images', value, importData.images)} rows={10} />
            </div>
          </Section>

          <Section
            icon={<TruckIcon className="w-5 h-5 text-white" />}
            title="Shipping"
            sectionKey="shipping"
            expanded={expandedSections.shipping}
            onToggle={() => toggleSection('shipping')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Shipping Weight (grams)" value={importData.shippingWeight} onChange={(value) => updateField('shippingWeight', value)} />
              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Dimensions (L × W × H cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['length', 'width', 'height'] as const).map((dimension) => (
                    <Input
                      key={dimension}
                      type="text"
                      value={importData.dimensions[dimension]}
                      onChange={(e) => updateDimension(dimension, e.target.value)}
                      className="w-full px-3 py-2 border border-[#232636] rounded-lg text-sm focus:ring-2 focus:ring-white/20"
                      placeholder={dimension.charAt(0).toUpperCase()}
                    />
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <Input
                type="checkbox"
                checked={importData.isFragile}
                onChange={(e) => updateField('isFragile', e.target.checked)}
                className="w-4 h-4 text-white rounded"
              />
              <span className="text-sm text-[#d0d6e0]">Fragile Item</span>
            </label>
          </Section>

          <Section
            icon={<TruckIcon className="w-5 h-5 text-emerald-600" />}
            title="Delivery Offer"
            sectionKey="deliveryOffer"
            expanded={expandedSections.deliveryOffer}
            onToggle={() => toggleSection('deliveryOffer')}
          >
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 mb-4">
              Configure a product-specific free or fixed delivery offer. A free-delivery product makes delivery free for the entire order.
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <Input
                type="checkbox"
                checked={importData.deliveryOfferEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateField('deliveryOfferEnabled', checked);
                  if (checked && importData.deliveryOfferType === 'DEFAULT') updateField('deliveryOfferType', 'FREE');
                  if (!checked) {
                    updateField('deliveryOfferType', 'DEFAULT');
                    updateField('deliveryOfferAmount', '');
                    updateField('deliveryChargeInsideDhaka', '');
                    updateField('deliveryChargeOutsideDhaka', '');
                    updateField('deliveryOfferStartDate', '');
                    updateField('deliveryOfferEndDate', '');
                    updateField('deliveryOfferBadgeText', '');
                  }
                }}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="text-sm font-medium text-[#d0d6e0]">Enable delivery offer</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Offer Type</label>
                <Select
                  value={importData.deliveryOfferEnabled ? importData.deliveryOfferType : 'DEFAULT'}
                  onChange={(e) => {
                    const type = e.target.value as DeliveryOfferType;
                    updateField('deliveryOfferType', type);
                    updateField('deliveryOfferEnabled', type !== 'DEFAULT');
                    if (type !== 'FIXED') {
                      updateField('deliveryOfferAmount', '');
                      updateField('deliveryChargeInsideDhaka', '');
                      updateField('deliveryChargeOutsideDhaka', '');
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#232636] rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-[#161824]"
                >
                  <option value="DEFAULT">Courier calculated / No product offer</option>
                  <option value="FREE">Free delivery for full order</option>
                  <option value="FIXED">Fixed delivery charge</option>
                </Select>
              </div>
              <TextInput
                label="Fixed Delivery Base Amount (৳)"
                value={importData.deliveryOfferAmount}
                onChange={(value) => {
                  updateField('deliveryOfferAmount', value);
                  if (!importData.deliveryChargeInsideDhaka) updateField('deliveryChargeInsideDhaka', value);
                }}
                disabled={!importData.deliveryOfferEnabled || importData.deliveryOfferType !== 'FIXED'}
                placeholder="e.g. 60"
              />
              <TextInput
                label="Offer Start"
                type="datetime-local"
                value={importData.deliveryOfferStartDate}
                onChange={(value) => updateField('deliveryOfferStartDate', value)}
                disabled={!importData.deliveryOfferEnabled}
              />
              <TextInput
                label="Offer End"
                type="datetime-local"
                value={importData.deliveryOfferEndDate}
                onChange={(value) => updateField('deliveryOfferEndDate', value)}
                disabled={!importData.deliveryOfferEnabled}
              />
            </div>

            {importData.deliveryOfferEnabled && importData.deliveryOfferType === 'FIXED' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                <TextInput
                  label="Delivery Charge Inside Dhaka (৳) *"
                  value={importData.deliveryChargeInsideDhaka}
                  onChange={(value) => {
                    updateField('deliveryChargeInsideDhaka', value);
                    if (!importData.deliveryOfferAmount) updateField('deliveryOfferAmount', value);
                  }}
                  placeholder="e.g. 60"
                />
                <TextInput
                  label="Delivery Charge Outside Dhaka (৳)"
                  value={importData.deliveryChargeOutsideDhaka}
                  onChange={(value) => updateField('deliveryChargeOutsideDhaka', value)}
                  placeholder="e.g. 120 (ঐচ্ছিক, ফাঁকা থাকলে Inside Dhaka চার্জ প্রযোজ্য)"
                />
              </div>
            )}

            <div className="mt-4">
              <TextInput
                label="Badge Text"
                value={importData.deliveryOfferBadgeText}
                onChange={(value) => updateField('deliveryOfferBadgeText', value)}
                placeholder="এই পণ্যে ফ্রি ডেলিভারি"
                disabled={!importData.deliveryOfferEnabled}
              />
            </div>
          </Section>

          <Section
            icon={<Upload className="w-5 h-5 text-white" />}
            title="Additional Options"
            sectionKey="options"
            expanded={expandedSections.options}
            onToggle={() => toggleSection('options')}
          >
            <div className="flex flex-wrap gap-4">
              {([
                ['returnEligible', 'Return Eligible'],
                ['codAvailable', 'Cash on Delivery'],
                ['flashSaleEligible', 'Flash Sale Eligible'],
                ['preOrderOption', 'Pre-order'],
              ] as Array<[keyof ImportData, string]>).map(([key, label]) => (
                <label key={key as string} className="flex items-center gap-2 p-3 border border-[#232636] rounded-lg cursor-pointer hover:bg-[#10121b]">
                  <Input
                    type="checkbox"
                    checked={Boolean(importData[key])}
                    onChange={(e) => updateField(key, e.target.checked as never)}
                    className="w-4 h-4 text-white rounded"
                  />
                  <span className="text-sm text-[#d0d6e0]">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <TextInput label="Low Stock Threshold" value={importData.lowStockThreshold} onChange={(value) => updateField('lowStockThreshold', value)} small />
            </div>
          </Section>

          <Section
            icon={<HelpCircle className="w-5 h-5 text-white" />}
            title="Product FAQs"
            sectionKey="faqs"
            expanded={expandedSections.faqs}
            onToggle={() => toggleSection('faqs')}
          >
            <p className="text-xs text-[#8a8f98] mb-3">
              Imported {importData.faqs.length} FAQ item{importData.faqs.length === 1 ? '' : 's'}. You can edit or add more.
            </p>
            <ProductFaqSection faqs={importData.faqs} onChange={(faqs) => updateField('faqs', faqs)} />
          </Section>

          <div className="flex items-center justify-between bg-[#161824] rounded-xl border border-[#232636] p-5 shadow-sm sticky bottom-0 z-10">
            <Button
              type="button"
              onClick={() => {
                setStep('paste');
                setImportData(null);
              }}
              className="inline-flex items-center px-5 py-2.5 border-2 border-[#232636] rounded-lg text-[#d0d6e0] hover:bg-[#10121b] font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Paste again
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-2.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg disabled:opacity-50 font-medium shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" /> Save product
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable UI helpers ─────────────────────────────────────────────────────
function Section({
  icon,
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-[#161824] rounded-xl border shadow-sm overflow-hidden ${highlight ? 'border-amber-300' : 'border-[#232636]'}`}>
      <Button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-6 py-4 hover:bg-[#10121b] transition-colors ${highlight ? 'bg-amber-500/10' : ''}`}
        aria-expanded={expanded}
        aria-controls={`section-${sectionKey}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold ${highlight ? 'text-white/80' : 'text-[#F7F8F8]'}`}>{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#62666d]" /> : <ChevronDown className="w-4 h-4 text-[#62666d]" />}
      </Button>
      {expanded && (
        <div id={`section-${sectionKey}`} className="px-6 pb-6 pt-2 border-t border-[#232636]">
          {children}
        </div>
      )}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  small = false,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  small?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#d0d6e0] mb-1">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 disabled:bg-[#10121b] disabled:text-[#62666d] ${small ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#d0d6e0] mb-1">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function ArrayTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#d0d6e0] mb-1">{label}</label>
      <Textarea
        value={value.join(', ')}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-[#232636] rounded-lg focus:ring-2 focus:ring-white/20 text-sm"
        placeholder="Comma separated"
      />
    </div>
  );
}

function JsonEditor({
  label,
  value,
  onBlur,
  rows = 7,
}: {
  label: string;
  value: unknown;
  onBlur: (value: string) => void;
  rows?: number;
}) {
  const [text, setText] = useState(() => jsonString(value, Array.isArray(value) ? [] : {}));
  const [error, setError] = useState<string | null>(null);

  const formattedValue = jsonString(value, Array.isArray(value) ? [] : {});
  useEffect(() => {
    setText((prev) => {
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(JSON.parse(formattedValue))) {
          return prev;
        }
      } catch {
        return prev;
      }
      return formattedValue;
    });
  }, [formattedValue]);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(null);
      onBlur(Array.isArray(value) ? '[]' : '{}');
      return;
    }
    try {
      JSON.parse(trimmed);
      setError(null);
      onBlur(trimmed);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : 'Syntax error'}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-[#d0d6e0]">{label}</label>
        {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
      </div>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        onBlur={handleBlur}
        rows={rows}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-white/20 text-xs font-mono ${
          error ? 'border-rose-500/60 bg-rose-500/5' : 'border-[#232636]'
        }`}
      />
    </div>
  );
}
