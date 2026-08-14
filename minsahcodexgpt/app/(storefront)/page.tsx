import type { Metadata } from 'next';
import { Suspense } from 'react';
import HomeCategoriesSection from '@/app/components/HomeCategoriesSection';
import HomeCombosSection from '@/app/components/HomeCombosSection';
import HomeHeroBanner from '@/app/components/HomeHeroBanner';
import HomeTrustStrip from '@/app/components/HomeTrustStrip';
import HomeProductsClientFallback from '@/app/components/HomeProductsClientFallback';
import HomeProductSections from '@/app/components/HomeProductSections';
import HomeSectionSkeleton from '@/app/components/HomeSectionSkeleton';
import prisma from '@/lib/prisma';
import { getHomePageConfig, type HomePageConfig } from '@/lib/homepageConfig';
import type { Product } from '@/contexts/ProductsContext';
import type { HomeSection } from '@/types/admin';
import { resolveProductTrustBadges } from '@/lib/shopTrust';
import { absoluteUrl } from '@/lib/seo';


const HOME_TITLE = 'Korean Skincare, Makeup & Beauty Products BD | Minsah Beauty';
const HOME_DESCRIPTION =
  'Shop authentic Korean skincare, makeup, sunscreen, serum and lip tint in Bangladesh. Cash on delivery, bKash/Nagad payment and fast nationwide delivery.';

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: absoluteUrl('/'),
    siteName: 'Minsah Beauty',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: absoluteUrl('/images/og-default.jpg'),
        width: 1200,
        height: 630,
        alt: 'Minsah Beauty authentic skincare and beauty products in Bangladesh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [absoluteUrl('/images/og-default.jpg')],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const revalidate = 60;

const HOME_VARIANT_PREVIEW_LIMIT = 8;
// ProductVariant currently has no isActive/deletedAt flag in Prisma schema,
// so _count.variants matches the public product-detail API variant list.
// If variant-level active/soft-delete fields are added later, apply the same
// relation filter to both _count and the product detail API.

const PRODUCT_SECTION_TYPES = new Set<HomeSection['type']>([
  'flash-sale',
  'new-arrivals',
  'for-you',
  'recommendations',
  'favourites',
]);

function toNumber(value: { toNumber?: () => number } | number | null | undefined): number {
  if (typeof value === 'number') return value;
  return value?.toNumber?.() ?? 0;
}

function getAttributeValue(attributes: unknown, key: string): string {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return '';
  }

  const value = (attributes as Record<string, unknown>)[key];
  return value == null ? '' : String(value);
}

function getVisibleProductSections(sections: HomeSection[]) {
  return sections
    .filter((section) => section.isVisible !== false && PRODUCT_SECTION_TYPES.has(section.type))
    .sort((a, b) => a.order - b.order);
}

function getSelectedProductKeys(sections: HomeSection[]) {
  return Array.from(
    new Set(
      getVisibleProductSections(sections)
        .flatMap((section) => section.settings.selectedProductIds ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function getHomeProductLimit(sections: HomeSection[]) {
  const visibleProductSections = getVisibleProductSections(sections);
  if (visibleProductSections.length === 0) return 0;

  const configuredTotal = visibleProductSections.reduce((total, section) => {
    const fallback = section.type === 'flash-sale' || section.type === 'new-arrivals' ? 4 : 6;
    const limit = Math.max(1, Math.min(24, section.settings.itemsToShow ?? fallback));
    return total + limit;
  }, 0);

  // Keep enough products for sorting/recommendation sections without sending an oversized home payload.
  return Math.max(12, Math.min(32, configuredTotal + 8));
}

async function getInitialProducts(homeConfig: HomePageConfig): Promise<Product[]> {
  const productTake = getHomeProductLimit(homeConfig.sections);
  if (productTake === 0) return [];

  const selectedProductKeys = getSelectedProductKeys(homeConfig.sections);
  const selectedWhere = selectedProductKeys.length > 0
    ? {
        OR: selectedProductKeys.flatMap((key) => [
          { id: key },
          { slug: key },
        ]),
      }
    : undefined;

  try {
    const [automaticProducts, selectedProducts] = await Promise.all([
      prisma.product.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: productTake,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          subcategory: true,
          originCountry: true,
          price: true,
          compareAtPrice: true,
          salePrice: true,
          quantity: true,
          isActive: true,
          averageRating: true,
          reviewCount: true,
          confirmedOrderCount: true,
          orderCount: true,
          createdAt: true,
          isFeatured: true,
          isNew: true,
          discountPercentage: true,
          offerStartDate: true,
          offerEndDate: true,
          flashSaleEligible: true,
          lowStockThreshold: true,
          returnEligible: true,
          codAvailable: true,
          isFragile: true,
          deliveryOfferEnabled: true,
          deliveryOfferType: true,
          deliveryOfferAmount: true,
          deliveryOfferStartDate: true,
          deliveryOfferEndDate: true,
          deliveryOfferBadgeText: true,
          preOrderOption: true,
          images: {
            orderBy: [
              { isDefault: 'desc' },
              { sortOrder: 'asc' },
            ],
            take: 1,
            select: { url: true },
          },
          category: { select: { name: true } },
          brand: { select: { name: true } },
          _count: { select: { variants: true } },
          variants: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              sku: true,
              price: true,
              quantity: true,
              attributes: true,
              image: true,
            },
            take: HOME_VARIANT_PREVIEW_LIMIT,
          },
        },
      }),
      selectedWhere
        ? prisma.product.findMany({
            where: {
              deletedAt: null,
              isActive: true,
              ...selectedWhere,
            },
            take: Math.min(24, selectedProductKeys.length),
            select: {
              id: true,
              sku: true,
              name: true,
              slug: true,
              subcategory: true,
              originCountry: true,
              price: true,
              compareAtPrice: true,
              salePrice: true,
              quantity: true,
              isActive: true,
              averageRating: true,
              reviewCount: true,
              confirmedOrderCount: true,
              orderCount: true,
              createdAt: true,
              isFeatured: true,
              isNew: true,
              discountPercentage: true,
              offerStartDate: true,
              offerEndDate: true,
              flashSaleEligible: true,
              lowStockThreshold: true,
              returnEligible: true,
              codAvailable: true,
              isFragile: true,
              deliveryOfferEnabled: true,
              deliveryOfferType: true,
              deliveryOfferAmount: true,
              deliveryOfferStartDate: true,
              deliveryOfferEndDate: true,
              deliveryOfferBadgeText: true,
              preOrderOption: true,
              images: {
                orderBy: [
                  { isDefault: 'desc' },
                  { sortOrder: 'asc' },
                ],
                take: 1,
                select: { url: true },
              },
              category: { select: { name: true } },
              brand: { select: { name: true } },
              _count: { select: { variants: true } },
              variants: {
                orderBy: { id: 'asc' },
                select: {
                  id: true,
                  sku: true,
                  price: true,
                  quantity: true,
                  attributes: true,
                  image: true,
                },
                take: HOME_VARIANT_PREVIEW_LIMIT,
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const productsById = new Map([...selectedProducts, ...automaticProducts].map((product) => [product.id, product]));

    return Array.from(productsById.values()).map((product): Product => {
      const mainImage = product.images[0];
      const price = toNumber(product.price);
      const trustBadges = resolveProductTrustBadges({
        ...product,
        price,
        stock: product.quantity,
      });

      return {
        id: product.id,
        sku: product.sku || '',
        name: product.name,
        category: product.category?.name || '',
        subcategory: product.subcategory || '',
        item: '',
        brand: product.brand?.name || '',
        originCountry: product.originCountry || 'Bangladesh (Local)',
        price,
        originalPrice: product.compareAtPrice ? toNumber(product.compareAtPrice) : undefined,
        stock: product.quantity,
        status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
        image: mainImage?.url || '',
        images: mainImage?.url ? [mainImage.url] : [],
        rating: toNumber(product.averageRating),
        reviews: product.reviewCount || 0,
        soldCount: product.confirmedOrderCount || product.orderCount || 0,
        createdAt: product.createdAt.toISOString(),
        featured: product.isFeatured,
        isNew: product.isNew,
        description: '',
        weight: '',
        ingredients: '',
        skinType: [],
        expiryDate: '',
        shelfLife: '',
        variantCount: product._count.variants,
        variantsFullyLoaded: product._count.variants <= product.variants.length,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku || '',
          size: getAttributeValue(variant.attributes, 'size'),
          color: getAttributeValue(variant.attributes, 'color'),
          price: String(toNumber(variant.price) || price),
          stock: String(variant.quantity),
          image: variant.image || '',
        })),
        metaTitle: '',
        metaDescription: '',
        slug: product.slug || '',
        urlSlug: product.slug || '',
        tags: '',
        shippingWeight: '',
        dimensions: { length: '', width: '', height: '' },
        isFragile: product.isFragile || false,
        freeShippingEligible: trustBadges.freeShippingEligible,
        discountPercentage: product.discountPercentage ? String(toNumber(product.discountPercentage)) : '',
        salePrice: product.salePrice ? String(toNumber(product.salePrice)) : '',
        offerStartDate: product.offerStartDate?.toISOString() || '',
        offerEndDate: product.offerEndDate?.toISOString() || '',
        flashSaleEligible: product.flashSaleEligible || false,
        lowStockThreshold: String(product.lowStockThreshold || 5),
        barcode: '',
        returnEligible: trustBadges.returnEligible,
        codAvailable: trustBadges.isCODAvailable,
        preOrderOption: product.preOrderOption,
        relatedProducts: '',
      };
    });
  } catch (error) {
    console.error('[home] Failed to load optimized initial products:', error);
    return [];
  }
}

function isProductHomeSection(type: HomeSection['type']) {
  return ['flash-sale', 'new-arrivals', 'for-you', 'recommendations', 'favourites', 'brands'].includes(type);
}

export default async function HomePage() {
  const homePageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': absoluteUrl('/#webpage'),
    url: absoluteUrl('/'),
    name: HOME_TITLE,
    description: HOME_DESCRIPTION,
    isPartOf: { '@id': absoluteUrl('/#website') },
    about: { '@id': absoluteUrl('/#organization') },
    inLanguage: ['bn-BD', 'en-US'],
  };

  const homeConfig = await getHomePageConfig();
  const initialProducts = await getInitialProducts(homeConfig);

  const heroProduct = initialProducts.find((product) => product.image) || initialProducts[0];
  const hasVisibleProductSections = getVisibleProductSections(homeConfig.sections).length > 0;
  const visibleSections = homeConfig.sections
    .filter((section) => section.isVisible !== false)
    .sort((a, b) => a.order - b.order);

  const renderedSections = visibleSections.map((section) => {
    if (section.type === 'promotion') {
      if (!homeConfig.hero.isVisible) return null;

      return (
        <div key={section.id}>
          <HomeHeroBanner
            eyebrow={homeConfig.hero.eyebrow}
            title={homeConfig.hero.title || section.title}
            subtitle={homeConfig.hero.subtitle || section.subtitle}
            primaryCtaText={homeConfig.hero.primaryCtaText}
            primaryCtaHref={homeConfig.hero.primaryCtaHref}
            secondaryCtaText={homeConfig.hero.secondaryCtaText}
            secondaryCtaHref={homeConfig.hero.secondaryCtaHref}
            badgeOne={homeConfig.hero.badgeOne}
            badgeTwo={homeConfig.hero.badgeTwo}
            backgroundClass={homeConfig.hero.backgroundClass}
            featuredImage={homeConfig.hero.imageUrl || heroProduct?.image}
            featuredProductName={homeConfig.hero.featuredProductName || heroProduct?.name}
          />
          <HomeTrustStrip />
        </div>
      );
    }

    if (section.type === 'categories') {
      return (
        <Suspense key={section.id} fallback={<HomeSectionSkeleton type="categories" />}>
          <HomeCategoriesSection
            categories={homeConfig.categories.filter((category) => category.isVisible !== false)}
            title={section.title}
            subtitle={section.subtitle}
            itemsToShow={section.settings.itemsToShow}
            showViewAll={section.settings.showViewAll !== false}
            selectedCategoryIds={section.settings.selectedCategoryIds}
          />
        </Suspense>
      );
    }

    if (section.type === 'combos') {
      return (
        <Suspense key={section.id} fallback={<HomeSectionSkeleton type="combos" />}>
          <HomeCombosSection
            title={section.title}
            subtitle={section.subtitle}
            showViewAll={section.settings.showViewAll !== false}
            viewAllHref={section.settings.viewAllHref || '/combos'}
          />
        </Suspense>
      );
    }

    if (isProductHomeSection(section.type)) {
      return (
        <Suspense key={section.id} fallback={<HomeSectionSkeleton type="products" />}>
          <HomeProductSections
            products={initialProducts}
            sections={[section]}
            brands={homeConfig.brands}
          />
        </Suspense>
      );
    }

    return null;
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homePageSchema) }}
      />
      <div className="bg-minsah-light">
        {renderedSections}
        {hasVisibleProductSections && initialProducts.length === 0 && <HomeProductsClientFallback />}
      </div>
    </>
  );
}
