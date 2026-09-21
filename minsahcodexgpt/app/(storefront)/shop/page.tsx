import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
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
import ProductGridSkeleton from '@/app/components/shop/ProductGridSkeleton';



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
  // contract: getShopSeoState(searchParams)
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
  // contract: hasLegacyShopQueryParams(searchParams) && buildCanonicalShopPath(searchParams)
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

      <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 pt-2 sm:pt-2.5 pb-6">
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
      </div>
    </div>
  );
}
