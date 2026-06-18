// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import ProductClient from './components/ProductClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface FaqItem {
  question: string;
  answer: string;
}

async function fetchProduct(idOrSlug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let res = await fetch(`${baseUrl}/api/products/${idOrSlug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    res = await fetch(`${baseUrl}/api/products?slug=${idOrSlug}&limit=1`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.products?.[0];
    if (!product) return null;
    const fullRes = await fetch(`${baseUrl}/api/products/${product.id}`, {
      next: { revalidate: 60 },
    });
    if (!fullRes.ok) return null;
    return fullRes.json();
  }
  return res.json();
}

const BASE_URL = 'https://minsahbeauty.cloud';

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
  if (!data) return { title: 'Product Not Found' };
  const { product } = data;

  const title       = product.metaTitle       || product.pageH1 || `${product.name} | Minsah Beauty`;
  const description = product.metaDescription || product.seoIntro || product.shortDescription || product.bengaliDescription || '';
  const canonical   = product.canonicalUrl    || `${BASE_URL}/products/${product.slug}`;
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
    twitter: {
      card:        'summary_large_image',
      title:       ogTitle,
      description:   ogDescription,
      images:      ogImage ? [ogImage] : [],
    },
  };
}

// ── Schema builders ───────────────────────────────────────────────────────────
function buildProductSchema(product: Record<string, unknown>, rating: { average: number; total: number }, productUrl: string) {
  // Image array — prefer full image objects, fallback to main image
  const images: string[] = [];
  if (Array.isArray(product.images) && (product.images as Array<{url: string}>).length > 0) {
    (product.images as Array<{url: string}>).forEach((img) => { if (img.url) images.push(img.url); });
  } else if (product.image) {
    images.push(product.image as string);
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    '@id':      `${productUrl}#product`,
    name:        product.name,
    description: product.description || product.shortDescription,
    sku:         product.sku,
    url:         productUrl,
    image:       images.length > 0 ? images : undefined,
    brand: {
      '@type': 'Brand',
      name:     product.brand || 'Minsah Beauty',
    },
    offers: {
      '@type':           'Offer',
      '@id':             `${productUrl}#offer`,
      url:               productUrl,
      price:             product.salePrice || product.price,
      priceCurrency:     'BDT',
      priceValidUntil:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability:      (product.inStock || (product as {stock?: number}).stock !== 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: product.condition === 'USED'
        ? 'https://schema.org/UsedCondition'
        : product.condition === 'REFURBISHED'
        ? 'https://schema.org/RefurbishedCondition'
        : 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name:    'Minsah Beauty',
        url:     BASE_URL,
      },
      hasMerchantReturnPolicy: product.returnEligible
        ? { '@type': 'MerchantReturnPolicy', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow' }
        : undefined,
      shippingDetails: {
        '@type':               'OfferShippingDetails',
        shippingDestination: {
          '@type':          'DefinedRegion',
          addressCountry:   'BD',
        },
      },
    },
  };

  // GTIN
  if (product.gtin) schema.gtin13 = product.gtin;

  // Rating
  if (rating.total > 0) {
    schema.aggregateRating = {
      '@type':       'AggregateRating',
      ratingValue:   rating.average,
      reviewCount:   rating.total,
      bestRating:    5,
      worstRating:   1,
    };
  }

  // Weight
  if (product.weight) {
    schema.weight = {
      '@type': 'QuantitativeValue',
      value:    product.weight,
      unitCode: 'GRM',
    };
  }

  return schema;
}

function buildBreadcrumbSchema(product: Record<string, unknown>, productUrl: string) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'হোম',           item: BASE_URL },
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
export default async function ProductPage({ params }: PageProps) {
  const { id }   = await params;
  const data     = await fetchProduct(id);

  if (!data?.product) notFound();

  const { product, reviews, rating, relatedProducts, frequentlyBoughtTogether } = data;
  const productUrl  = product.canonicalUrl || `${BASE_URL}/products/${product.slug}`;

  const faqs: FaqItem[] = Array.isArray(product.faqs) ? product.faqs : [];

  const productSchema    = parseJsonLd(product.structuredDataJsonLd) || buildProductSchema(product, rating, productUrl);
  const breadcrumbSchema = parseJsonLd(product.breadcrumbJsonLd) || buildBreadcrumbSchema(product, productUrl);
  const faqSchema        = product.faqSchemaReady || faqs.length > 0 ? buildFaqSchema(faqs) : null;
  const extraJsonLdSchemas = [
    parseJsonLd(product.productGroupJsonLd),
    parseJsonLd(product.merchantListingJsonLd),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-2.5">
        <nav className="flex items-center gap-1.5 text-xs text-[#8B5E3C]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#3D1F0E] transition">হোম</Link>
          <span aria-hidden="true">/</span>
          {product.category && (
            <>
              <Link
                href={`/shop?category=${product.categorySlug}`}
                className="hover:text-[#3D1F0E] transition"
              >
                {product.category}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-[#3D1F0E] font-medium line-clamp-1" aria-current="page">
            {product.name}
          </span>
        </nav>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto">
        <ProductClient
          product={product}
          reviews={reviews}
          rating={rating}
          relatedProducts={relatedProducts}
          frequentlyBoughtTogether={frequentlyBoughtTogether}
          productUrl={productUrl}
        />
      </main>

      {/* ── JSON-LD schemas ── */}

      {/* 1. Product schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
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
