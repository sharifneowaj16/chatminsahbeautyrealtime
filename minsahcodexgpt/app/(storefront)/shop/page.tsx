import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
  buildCanonicalShopPath,
  hasLegacyShopQueryParams,
  parseSearchParams,
  generatePageTitle,
  generateMetaDescription,
} from '@/lib/shopUtils';
import { absoluteUrl } from '@/lib/seo';
import { buildCatalogSearchPath } from '@/lib/catalog-navigation';
import { getShopItemListJsonLd, getShopRobotsMetadata, getShopSeoState } from '@/lib/shopSeo';
import ShopGrid from '@/app/components/shop/ShopGrid';
import ShopSearchBar from '@/app/components/shop/ShopSearchBar';
import ProductGridSkeleton from '@/app/components/shop/ProductGridSkeleton';
import ShopEducationSection from '@/app/components/shop/ShopEducationSection';

const categoryPills = [
  { label: 'All Formulations', href: '/shop' },
  { label: 'Sun Protection', href: buildCatalogSearchPath('sunscreen') },
  { label: 'Antioxidant Serums', href: buildCatalogSearchPath('serum') },
  { label: 'Hydration & Barrier', href: buildCatalogSearchPath('moisturizer') },
  { label: 'Cleansers & Toners', href: buildCatalogSearchPath('cleanser') },
  { label: 'Lip Care', href: buildCatalogSearchPath('lipstick') },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?sort=best-selling' },
];

function shopPageJsonLd(canonicalUrl = absoluteUrl('/shop'), itemListJsonLd: Record<string, unknown> | null = null) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: 'Shop Beauty & Skincare in Bangladesh',
        description: 'Shop authentic beauty, skincare, makeup and personal care products in Bangladesh with COD, bKash/Nagad payment and fast delivery.',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Minsah Beauty',
          url: absoluteUrl('/'),
        },
      },
      ...(itemListJsonLd ? [itemListJsonLd] : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: absoluteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Shop',
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'WebSite',
        url: absoluteUrl('/'),
        potentialAction: {
          '@type': 'SearchAction',
          target: `${absoluteUrl('/shop')}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

// Generate dynamic metadata
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const { params, shouldNoIndex, canonicalUrl } = getShopSeoState(resolvedSearchParams);
  const filters = parseSearchParams(params);
  const title = generatePageTitle(filters);
  const description = generateMetaDescription(filters);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: getShopRobotsMetadata(shouldNoIndex),
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  if (hasLegacyShopQueryParams(resolvedSearchParams)) {
    redirect(buildCanonicalShopPath(resolvedSearchParams));
  }

  const seoState = getShopSeoState(resolvedSearchParams);
  const itemListJsonLd = await getShopItemListJsonLd(seoState.params);
  const jsonLd = shopPageJsonLd(seoState.canonicalUrl, itemListJsonLd);

  return (
    <div className="min-h-screen bg-minsah-light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Editorial Collection Header */}
      <div className="border-b border-stone-200/80 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-stone-500">
            <Link href="/" className="transition hover:text-minsah-primary">
              Home
            </Link>
            <ChevronRight size={13} className="text-stone-400" />
            <span className="font-semibold text-minsah-dark">Collection</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-minsah-primary">
                <Sparkles size={12} aria-hidden="true" />
                CURATED FORMULATIONS
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-minsah-dark sm:text-3xl lg:text-4xl">
                The Skincare Collection
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">
                Dermatology-grade formulations, active botanicals, and authentic clinical beauty curated for high-performance daily skin health.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                  ✓ 100% Authentic Lab Sourced
                </span>
                <span className="hidden sm:inline text-stone-300">•</span>
                <span>Express Nationwide Delivery</span>
                <span className="hidden sm:inline text-stone-300">•</span>
                <span>Cash on Delivery &amp; Easy Returns</span>
              </div>
            </div>

            <div className="w-full max-w-xs shrink-0">
              <Suspense fallback={null}>
                <ShopSearchBar />
              </Suspense>
            </div>
          </div>

          {/* Horizontal Taxonomy Pill Navigation */}
          <div
            className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-hide"
            aria-label="Category formulations"
          >
            {categoryPills.map((pill) => (
              <Link
                key={pill.label}
                href={pill.href}
                className="shrink-0 rounded-full border border-stone-200 bg-minsah-surface-subtle px-3.5 py-1.5 font-medium text-minsah-dark transition-all hover:border-minsah-primary hover:bg-white hover:text-minsah-primary shadow-xs"
              >
                {pill.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-8 text-minsah-secondary">
                <Loader2 size={20} className="animate-spin text-minsah-primary" />
                <span className="text-sm font-medium">Loading collection...</span>
              </div>
              <ProductGridSkeleton count={8} />
            </div>
          }
        >
          <ShopGrid />
        </Suspense>

        {/* Lightweight Editorial Education Module */}
        <ShopEducationSection />
      </main>
    </div>
  );
}
