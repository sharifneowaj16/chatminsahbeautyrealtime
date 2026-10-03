// app/products/[id]/page.tsx
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import ProductClient from './components/ProductClient';
import ProductDeliveryTopBar from './components/ProductDeliveryTopBar';
import { cleanProductName } from './components/hero/cleanProductName';
import { productPath } from '@/lib/product-url';
import { getSiteUrl, safeCanonicalUrl } from '@/lib/seo';

import { getProductDetail } from '@/lib/products/get-product';
import { ProductJsonLd } from './components/seo/ProductJsonLd';
import { buildProductOgOther } from './components/seo/buildProductOgOther';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface FaqItem {
  question: string;
  answer: string;
}

async function fetchProduct(idOrSlug: string) {
  return getProductDetail(idOrSlug);
}

const BASE_URL = getSiteUrl();

const ATTRIBUTION_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'variant',
] as const;

function withPreservedAttributionParams(
  path: string,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const query = new URLSearchParams();

  for (const key of ATTRIBUTION_QUERY_KEYS) {
    const value = searchParams[key];
    if (typeof value === 'string' && value.trim()) {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      const firstValue = value.find((item) => typeof item === 'string' && item.trim());
      if (firstValue) query.set(key, firstValue);
    }
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseJsonLd(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return null;
}

function shouldIndexProduct(value: unknown) {
  const indexing = parseJsonLd(value);
  if (!indexing) return true;
  if (indexing.index === false) return false;
  if (indexing.noindex === true) return false;
  if (typeof indexing.robots === 'string' && indexing.robots.toLowerCase().includes('noindex')) return false;
  return true;
}

// ── generateMetadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchProduct(id);
  if (!data?.product) return { title: 'Product Not Found' };
  const { product } = data;

  const title       = product.metaTitle       || product.pageH1 || product.name;
  const description = product.metaDescription || product.seoIntro || product.shortDescription || product.bengaliDescription || '';
  const canonicalPath = productPath(product);
  const canonical   = safeCanonicalUrl(product.canonicalUrl, canonicalPath);
  const ogTitle     = product.ogTitle         || product.metaTitle || product.pageH1 || product.name;
  const ogDescription = product.ogDescription || description;
  const ogImage     = product.ogImageUrl      || product.image     || '';
  const indexProduct = shouldIndexProduct(product.sitemapIndexing);

  const keywordParts = [
    product.focusKeyword,
    ...asStringArray(product.secondaryKeywords),
    product.bengaliFocusKeyword,
    ...asStringArray(product.bengaliSecondaryKeywords),
    ...asStringArray(product.searchTags),
    ...asStringArray(product.synonyms),
    ...asStringArray(product.banglaSearchTerms),
    ...asStringArray(product.reviewKeywords),
    ...asStringArray(product.entities),
    ...asStringArray(product.buyingIntentKeywords),
    ...asStringArray(product.metaKeywords),
    product.bengaliName,
    product.category ? `${product.category} bangladesh` : null,
    product.brand ? `${product.brand} bangladesh` : null,
  ];

  return {
    title,
    description,
    keywords: Array.from(new Set(keywordParts.filter(Boolean) as string[])),
    alternates: {
      canonical,
    },
    robots: {
      index:  indexProduct,
      follow: indexProduct,
      googleBot: {
        index:              indexProduct,
        follow:             indexProduct,
        'max-image-preview': 'large',
        'max-snippet':       -1,
      },
    },
    openGraph: {
      type:        'website',
      locale:      'bn_BD',
      url:         canonical,
      siteName:    'Minsah Beauty',
      title:       ogTitle,
      description: ogDescription,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }]
        : [],
    },
    other: buildProductOgOther({ product, offer: product.offer }),
    twitter: {
      card:        'summary_large_image',
      title:       ogTitle,
      description:   ogDescription,
      images:      ogImage ? [ogImage] : [],
    },
  };
}

// ── Schema builders ───────────────────────────────────────────────────────────

function buildBreadcrumbSchema(product: Record<string, unknown>, productUrl: string) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home',           item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Products',       item: `${BASE_URL}/shop` },
  ];

  if (product.category) {
    items.push({
      '@type':    'ListItem',
      position:   3,
      name:       product.category as string,
      item:       `${BASE_URL}/shop?category=${product.categorySlug || product.category}`,
    });
    items.push({
      '@type':    'ListItem',
      position:   4,
      name:       product.name as string,
      item:       productUrl,
    });
  } else {
    items.push({
      '@type':    'ListItem',
      position:   3,
      name:       product.name as string,
      item:       productUrl,
    });
  }

  return {
    '@context':        'https://schema.org',
    '@type':           'BreadcrumbList',
    itemListElement:   items,
  };
}

function buildFaqSchema(faqs: FaqItem[]) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type':          'Question',
      name:              faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:     faq.answer,
      },
    })),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id }   = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data     = await fetchProduct(id);

  if (!data?.product) notFound();

  const { product, reviews, rating, relatedProducts, frequentlyBoughtTogether } = data;
  const canonicalPath = productPath(product);

  if (product.slug && id !== product.slug) {
    permanentRedirect(withPreservedAttributionParams(canonicalPath, resolvedSearchParams));
  }

  const productUrl  = safeCanonicalUrl(product.canonicalUrl, canonicalPath);

  const faqs: FaqItem[] = Array.isArray(product.faqs) ? product.faqs : [];

  const breadcrumbSchema = parseJsonLd(product.breadcrumbJsonLd) || buildBreadcrumbSchema(product, productUrl);
  const faqSchema        = product.faqSchemaReady || faqs.length > 0 ? buildFaqSchema(faqs) : null;
  const extraJsonLdSchemas = [
    parseJsonLd(product.productGroupJsonLd),
    parseJsonLd(product.merchantListingJsonLd),
  ].filter(Boolean) as Record<string, unknown>[];

  const activeDeliveryOffer = product.activeDeliveryOffer as { type?: string; amount?: number | null } | null | undefined;
  const isFreeDeliveryOffer = activeDeliveryOffer?.type === 'FREE';

  return (
    <div className="min-h-screen bg-[#fcfcf7] text-[#1c3a13]">
      {/* ── Product Delivery Top Bar (Product Page Only) ── */}
      <ProductDeliveryTopBar
        productId={product.id}
        slug={product.slug}
        isFreeDelivery={isFreeDeliveryOffer}
      />

      {/* Breadcrumb (Desktop Only — Hidden on mobile for optimal above-the-fold viewport) */}
      <div className="hidden md:block w-full bg-[#fcfcf7]">
        <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-[#1c3a13]/70 font-medium" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#1c3a13] transition">Home</Link>
            <span aria-hidden="true" className="text-[#1c3a13]/40">/</span>
            {product.category && (
              <>
                <Link
                  href={`/shop?category=${product.categorySlug}`}
                  className="hover:text-[#1c3a13] transition"
                >
                  {product.category}
                </Link>
                <span aria-hidden="true" className="text-[#1c3a13]/40">/</span>
              </>
            )}
            <span className="text-[#1c3a13] font-bold line-clamp-1" aria-current="page">
              {cleanProductName(product.name)}
            </span>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <ProductClient
        product={product as any}
        reviews={reviews}
        rating={rating}
        relatedProducts={relatedProducts}
        frequentlyBoughtTogether={frequentlyBoughtTogether}
        productUrl={productUrl}
      />

      <div className="pb-28">
      </div>

      {/* ── JSON-LD schemas ── */}

      {/* 1. Dynamic Product schema from resolver */}
      <ProductJsonLd
        product={product}
        rating={rating}
        productUrl={productUrl}
      />

      {/* 2. Breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* 3. FAQ schema — only if faqs exist */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* 4. Optional ProductGroup / MerchantListing schemas from admin SEO */}
      {extraJsonLdSchemas.map((schema, index) => (
        <script
          key={`extra-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}
