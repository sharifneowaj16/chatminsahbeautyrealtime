import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, ChevronRight, CreditCard, Loader2, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
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

const merchandisingShortcuts = [
  { label: 'Today’s Deals', href: '/shop?sort=biggest-discount' },
  { label: 'Best Sellers', href: '/shop?sort=best-selling' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Under ৳999', href: '/shop?maxPrice=999' },
];

const popularSearches = [
  { label: 'Sunscreen', href: buildCatalogSearchPath('sunscreen') },
  { label: 'Serum', href: buildCatalogSearchPath('serum') },
  { label: 'Cleanser', href: buildCatalogSearchPath('cleanser') },
  { label: 'Lipstick', href: buildCatalogSearchPath('lipstick') },
  { label: 'Moisturizer', href: buildCatalogSearchPath('moisturizer') },
];

const trustItems = [
  { label: 'Authentic Products', icon: ShieldCheck },
  { label: 'COD Available', icon: BadgeCheck },
  { label: 'bKash/Nagad Payment', icon: CreditCard },
  { label: 'Fast BD Delivery', icon: Truck },
  { label: 'Easy Return', icon: RotateCcw },
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
      <div className="border-b border-minsah-accent bg-white/95 shadow-sm backdrop-blur">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="mb-2 hidden items-center gap-2 text-sm text-minsah-secondary md:flex">
            <Link href="/" className="transition-colors hover:text-minsah-primary">
              Home
            </Link>
            <ChevronRight size={16} />
            <span className="font-medium text-minsah-dark">Shop</span>
          </div>

          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-minsah-dark md:text-3xl">
                Shop Beauty &amp; Skincare
              </h1>
              <p className="mt-1 text-sm text-minsah-secondary">
                Authentic beauty products in Bangladesh — COD, bKash/Nagad &amp; fast delivery.
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <Suspense fallback={null}>
              <ShopSearchBar />
            </Suspense>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-hide">
            <span className="shrink-0 font-semibold uppercase tracking-wide text-minsah-secondary">Popular:</span>
            {popularSearches.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="shrink-0 rounded-full border border-minsah-accent bg-white px-3 py-1.5 font-medium text-minsah-dark transition-colors hover:border-minsah-primary hover:text-minsah-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-hide" aria-label="Shop merchandising shortcuts">
            <span className="shrink-0 font-semibold uppercase tracking-wide text-minsah-secondary">Browse:</span>
            {merchandisingShortcuts.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="minsah-shop-chip shrink-0 border border-minsah-accent bg-minsah-dark px-3 py-2 font-semibold text-minsah-accent outline-none transition-colors hover:bg-minsah-primary focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
            {trustItems.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-minsah-accent/40 px-3 py-2 font-medium text-minsah-dark">
                <Icon size={15} className="shrink-0 text-minsah-primary" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 md:py-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-4 text-minsah-secondary">
                <Loader2 size={20} className="animate-spin text-minsah-primary" />
                <span>Loading products...</span>
              </div>
              <ProductGridSkeleton count={8} />
            </div>
          }
        >
          <ShopGrid />
        </Suspense>
      </div>
    </div>
  );
}
