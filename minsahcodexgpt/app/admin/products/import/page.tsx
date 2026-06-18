'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useCategories } from '@/contexts/CategoriesContext';
import ProductFaqSection, { FaqItem } from '@/components/admin/ProductFaqSection';
import { adminFetchJson } from '@/lib/adminFetch';
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
} from 'lucide-react';

// CHANGE THIS ONLY IF YOUR LIVE PRODUCT URL BASE IS DIFFERENT.
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://minsahbeauty.cloud').replace(/\/$/, '');
const DEFAULT_PRODUCT_BASE_URL = `${SITE_URL}/products`;

type JsonRecord = Record<string, unknown>;

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
  featured: boolean;
  description: string;
  weight: string;
  ingredients: string;
  skinType: string[];
  shelfLife: string;
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
        error: '[IMPORT_DATA] block অথবা valid JSON পাওয়া যায়নি। [IMPORT_DATA]...[/IMPORT_DATA] block paste করো অথবা raw JSON paste করো।',
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
  const canonicalUrl = asString(
    readPath(raw, [
      'canonicalUrl',
      'seoFieldsForMinsahProductModel.canonicalUrl',
      'prismaImportData.productCreatePayloadForPrisma.canonicalUrl',
      'sitemapIndexing.canonicalUrl',
    ]),
    slug ? `${DEFAULT_PRODUCT_BASE_URL}/${slug}` : ''
  );

  const imageAltTexts = asStringArray(readPath(raw, ['imageAltTexts', 'prismaImportData.productCreatePayloadForPrisma.imageAltTexts']));
  const images = asImportImages(
    readPath(raw, ['images', 'imageUrls', 'productImages', 'prismaImportData.productImagesCreatePayloadForPrisma']),
    imageAltTexts
  );
  const variants = normalizeVariants(raw, prismaImport, productCore);

  const generatedVariantPriceTable = variants.map((variant) => ({
    variant: [variant.color || variant.shade, variant.size].filter(Boolean).join(' '),
    size: variant.size,
    price: variant.price ? `৳${variant.price}` : '',
    stock: variant.stock,
    sku: variant.sku,
  }));

  const seoValidationChecklist = asStringArray(readPath(raw, ['seoValidationChecklist']));

  return {
    name: asString(readPath(raw, ['name', 'productCore.name', 'prismaImportData.productCreatePayloadForPrisma.name'])),
    category: asString(readPath(raw, ['category', 'productCore.category', 'prismaImportData.productCreatePayloadForPrisma.category']), 'Hair care'),
    subcategory: asString(readPath(raw, ['subcategory', 'productCore.subcategory', 'prismaImportData.productCreatePayloadForPrisma.subcategory'])),
    item: asString(readPath(raw, ['item', 'productCore.productType'])),
    brand: asString(readPath(raw, ['brand', 'productCore.brand', 'prismaImportData.productCreatePayloadForPrisma.brand'])),
    originCountry: asString(readPath(raw, ['originCountry', 'productCore.originCountry', 'productSpecs.Country of Origin']), 'Bangladesh (Local)'),
    featured: asBoolean(readPath(raw, ['featured', 'isFeatured', 'productCore.isFeatured']), false),
    description: asString(readPath(raw, ['description', 'prismaImportData.productCreatePayloadForPrisma.description'])).replace(/\\n/g, '\n'),
    weight: asString(readPath(raw, ['weight', 'prismaImportData.productCreatePayloadForPrisma.weight'])),
    ingredients: normalizeIngredients(raw, prismaProduct),
    skinType: asStringArray(readPath(raw, ['skinType', 'prismaImportData.productCreatePayloadForPrisma.skinType'])),
    shelfLife: asString(readPath(raw, ['shelfLife', 'productSpecs.Shelf Life', 'prismaImportData.productCreatePayloadForPrisma.shelfLife'])),
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
    ogImageUrl: asString(readPath(raw, ['ogImageUrl', 'seoFieldsForMinsahProductModel.ogImageUrl', 'prismaImportData.productCreatePayloadForPrisma.ogImageUrl']), images.find((image) => image.isDefault)?.url || images[0]?.url || ''),
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
    options: false,
    faqs: false,
  });

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You don&apos;t have permission to create products.</p>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleParse = () => {
    if (!pasteText.trim()) {
      setParseError('Claude/ChatGPT output paste করো।');
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

    return errors;
  };

  const handleSubmit = async () => {
    if (!importData) return;

    const errors = validate();
    if (errors.length > 0) {
      alert('Fix these before saving:\n• ' + errors.join('\n• '));
      return;
    }

    setIsSubmitting(true);
    try {
      const basePrice = parseFloat(importData.variants[0]?.price || '0') || 0;
      const finalCanonicalUrl = importData.canonicalUrl || (importData.urlSlug ? `${DEFAULT_PRODUCT_BASE_URL}/${importData.urlSlug}` : undefined);
      const finalOgImageUrl = importData.ogImageUrl || importData.images.find((image) => image.isDefault)?.url || importData.images[0]?.url;

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
          status: 'active',
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
          condition: 'NEW',
          averageRating: 0,
          reviewCount: 0,
          shippingWeight: importData.shippingWeight || undefined,
          dimensions:
            importData.dimensions.length || importData.dimensions.width || importData.dimensions.height
              ? importData.dimensions
              : undefined,
          isFragile: importData.isFragile,
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
      alert(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Product Import — SEO 1-22 Ready</h1>
        <p className="text-gray-500 text-sm mt-1">
          [IMPORT_DATA] block, flat JSON, অথবা full final SEO JSON paste করলে form auto-fill হবে।
        </p>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">কীভাবে করবে:</p>
            <p>1. Final JSON অথবা <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">[IMPORT_DATA]...[/IMPORT_DATA]</code> block paste করো।</p>
            <p>2. Parse করো → owner fill section check করো → stock/URL/image verify করো → Save করো।</p>
            <p>3. Backend API route অবশ্যই new SEO fields save করতে হবে; না হলে payload ignore হবে।</p>
          </div>
        </div>
      </div>

      {step === 'paste' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardPaste className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import JSON Paste করো</h2>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setParseError('');
            }}
            rows={16}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-y"
            placeholder={`এখানে paste করো:\n\n[IMPORT_DATA]\n{\n  "name": "Sunsilk Power Shot Hair Treatment",\n  "category": "Hair care",\n  "brand": "Sunsilk",\n  "pageH1": "Sunsilk Power Shot Hair Treatment Price in Bangladesh"\n}\n[/IMPORT_DATA]\n\nঅথবা full final SEO JSON paste করো।`}
          />

          {parseError && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleParse}
              disabled={!pasteText.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Parse করো
            </button>
            <button
              type="button"
              onClick={() => setPasteText('')}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </button>
          </div>
        </div>
      )}

      {step === 'review' && importData && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">Data parse হয়েছে — review করো, owner-fill update করো, তারপর save করো</p>
            </div>
            {importData.marketPriceNote && (
              <p className="text-sm text-green-700 ml-7">
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
              <p className="text-sm text-amber-800">
                এগুলো import করার আগে/পরে তোমার নিজে verify/fill করা দরকার। JSON comment invalid হয়, তাই এগুলো আলাদা review field হিসেবে দেখানো হচ্ছে।
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
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
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Owner Comments</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {importData.ownerComments.map((comment, index) => (
                      <li key={`${comment}-${index}`}>{comment}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          <Section
            icon={<Package className="w-5 h-5 text-purple-600" />}
            title="Basic Information"
            sectionKey="basic"
            expanded={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <div className="space-y-4">
              <TextInput label="Product Name *" value={importData.name} onChange={(value) => updateField('name', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={importData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select category</option>
                    {categoriesData.map((category) => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                    {importData.category && !categoriesData.some((category) => category.name === importData.category) && (
                      <option value={importData.category}>{importData.category}</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Category name database-er exact name-er sathe match korte hobe.</p>
                </div>
                <TextInput label="Brand *" value={importData.brand} onChange={(value) => updateField('brand', value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextInput label="Subcategory" value={importData.subcategory} onChange={(value) => updateField('subcategory', value)} />
                <TextInput label="Item / Product Type" value={importData.item} onChange={(value) => updateField('item', value)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
                  <select
                    value={importData.originCountry}
                    onChange={(e) => updateField('originCountry', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                    {importData.originCountry && !countries.includes(importData.originCountry) && (
                      <option value={importData.originCountry}>{importData.originCountry}</option>
                    )}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importData.featured}
                  onChange={(e) => updateField('featured', e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700">Featured Product</span>
              </label>

              <TextareaInput label="Description *" value={importData.description} rows={8} onChange={(value) => updateField('description', value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Weight (numeric)" value={importData.weight} onChange={(value) => updateField('weight', value)} placeholder="e.g., 250" />
                <TextInput label="Shelf Life" value={importData.shelfLife} onChange={(value) => updateField('shelfLife', value)} placeholder="24 months / 12 months after opening" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skin / Hair Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSkinType(type)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        importData.skinType.includes(type)
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <TextareaInput label="Ingredients" value={importData.ingredients} rows={5} onChange={(value) => updateField('ingredients', value)} />
            </div>
          </Section>

          <Section
            icon={<Tag className="w-5 h-5 text-purple-600" />}
            title="Variants — Price & Stock"
            sectionKey="variants"
            expanded={expandedSections.variants}
            onToggle={() => toggleSection('variants')}
            highlight
          >
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                Price, stock, SKU অবশ্যই check করো। Stock 0 হলে product schema/rendering OutOfStock রাখবে।
              </div>
              {importData.variants.map((variant, index) => (
                <div key={`${variant.sku}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Variant #{index + 1}</p>
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
            icon={<Search className="w-5 h-5 text-purple-600" />}
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
            icon={<Sparkles className="w-5 h-5 text-purple-600" />}
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
            icon={<FileJson className="w-5 h-5 text-purple-600" />}
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
                <input
                  type="checkbox"
                  checked={importData.faqSchemaReady}
                  onChange={(e) => updateField('faqSchemaReady', e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700">FAQ schema ready</span>
              </label>
            </div>
          </Section>

          <Section
            icon={<Link2 className="w-5 h-5 text-purple-600" />}
            title="Technical SEO JSON-LD / Sitemap / Variant URL Strategy"
            sectionKey="techSeo"
            expanded={expandedSections.techSeo}
            onToggle={() => toggleSection('techSeo')}
          >
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                এগুলো DB-te save হবে। Frontend product page-e render/update না করলে SEO benefit fully আসবে না।
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
            icon={<Upload className="w-5 h-5 text-purple-600" />}
            title="Product Images"
            sectionKey="images"
            expanded={expandedSections.images}
            onToggle={() => toggleSection('images')}
          >
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
                Placeholder image URL automatically বাদ দেওয়া হয়েছে। Real CDN/live image URL থাকলে JSON editor-e add করো, না হলে save করার পর edit page থেকে upload করো।
              </div>
              <JsonEditor label="Images JSON" value={importData.images} onBlur={(value) => updateJsonField('images', value, importData.images)} rows={10} />
            </div>
          </Section>

          <Section
            icon={<TruckIcon className="w-5 h-5 text-purple-600" />}
            title="Shipping"
            sectionKey="shipping"
            expanded={expandedSections.shipping}
            onToggle={() => toggleSection('shipping')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Shipping Weight (grams)" value={importData.shippingWeight} onChange={(value) => updateField('shippingWeight', value)} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (L × W × H cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['length', 'width', 'height'] as const).map((dimension) => (
                    <input
                      key={dimension}
                      type="text"
                      value={importData.dimensions[dimension]}
                      onChange={(e) => updateDimension(dimension, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder={dimension.charAt(0).toUpperCase()}
                    />
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importData.isFragile}
                onChange={(e) => updateField('isFragile', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">Fragile Item</span>
            </label>
          </Section>

          <Section
            icon={<Upload className="w-5 h-5 text-purple-600" />}
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
                <label key={key as string} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={Boolean(importData[key])}
                    onChange={(e) => updateField(key, e.target.checked as never)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <TextInput label="Low Stock Threshold" value={importData.lowStockThreshold} onChange={(value) => updateField('lowStockThreshold', value)} small />
            </div>
          </Section>

          <Section
            icon={<HelpCircle className="w-5 h-5 text-purple-600" />}
            title="Product FAQs"
            sectionKey="faqs"
            expanded={expandedSections.faqs}
            onToggle={() => toggleSection('faqs')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Import থেকে {importData.faqs.length} টি FAQ import হয়েছে। Edit/add করতে পারো।
            </p>
            <ProductFaqSection faqs={importData.faqs} onChange={(faqs) => updateField('faqs', faqs)} />
          </Section>

          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky bottom-0 z-10">
            <button
              type="button"
              onClick={() => {
                setStep('paste');
                setImportData(null);
              }}
              className="inline-flex items-center px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> আবার Paste করো
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" /> Product Save করো
                </>
              )}
            </button>
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
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${highlight ? 'border-amber-300' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${highlight ? 'bg-amber-50' : ''}`}
        aria-expanded={expanded}
        aria-controls={`section-${sectionKey}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold ${highlight ? 'text-amber-800' : 'text-gray-900'}`}>{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div id={`section-${sectionKey}`} className="px-6 pb-6 pt-2 border-t border-gray-100">
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  small?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 ${small ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value.join(', ')}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        defaultValue={jsonString(value, Array.isArray(value) ? [] : {})}
        onBlur={(e) => onBlur(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono"
      />
    </div>
  );
}
