'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import type { Product as ContextProduct } from '@/contexts/ProductsContext';
import type { HomeSection, HomeSectionBrand } from '@/types/admin';
import { defaultBrands, defaultHomeSections } from '@/lib/homeData';
import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';
import HomeCountdownTimer from './HomeCountdownTimer';
import ProductCard from '@/app/components/shop/ProductCard';
import type { Product as ShopProduct, ProductVariant } from '@/types/product';
import { adminProductToShopProduct } from '@/lib/productAdapter';
import { productPath } from '@/lib/product-url';

// Modular Micro Components
import HomeSectionHeader from './home/sections/HomeSectionHeader';
import FlashSaleBannerStrip from './home/sections/FlashSaleBannerStrip';
import SectionLayoutWrapper from './home/sections/SectionLayoutWrapper';
import type { SectionIconType } from './home/sections/SectionBadgeIcon';

type ProductSectionType = 'flash-sale' | 'new-arrivals' | 'for-you' | 'recommendations' | 'favourites' | 'brands';

const PRODUCT_SECTION_TYPES = new Set<string>([
  'flash-sale',
  'new-arrivals',
  'for-you',
  'recommendations',
  'favourites',
  'brands',
]);

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getCardPrice(product: ContextProduct) {
  const salePrice = toFiniteNumber(product.salePrice, 0);
  const basePrice = toFiniteNumber(product.price, 0);
  const price = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const originalPrice =
    product.originalPrice && product.originalPrice > price
      ? product.originalPrice
      : salePrice > 0 && salePrice < basePrice
        ? basePrice
        : undefined;

  return { price, originalPrice };
}

function isActiveFlashSale(product: ContextProduct, now?: number) {
  if (!product.flashSaleEligible || !product.offerStartDate || !product.offerEndDate) return false;

  const startsAt = new Date(product.offerStartDate).getTime();
  const endsAt = new Date(product.offerEndDate).getTime();

  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return false;

  const currentTime = typeof now === 'number' ? now : Date.now();
  return startsAt <= currentTime && endsAt >= currentTime;
}

function getNearestOfferEnd(products: ContextProduct[], now?: number) {
  const activeEndTimes = products
    .filter((product) => isActiveFlashSale(product, now))
    .map((product) => product.offerEndDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (activeEndTimes.length === 0) return null;

  return new Date(Math.min(...activeEndTimes)).toISOString();
}

function mapProduct(product: ContextProduct): ShopProduct {
  const baseShopProduct = adminProductToShopProduct(product);
  const { price, originalPrice } = getCardPrice(product);
  const discountPercentage = toFiniteNumber(product.discountPercentage, 0);
  const discount = discountPercentage > 0
    ? discountPercentage
    : originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : undefined;

  const variants: ProductVariant[] = (product.variants ?? []).map((variant) => {
    const size = variant.size ?? '';
    const color = variant.color ?? '';
    const name = [color, size].filter(Boolean).join(' ') || variant.sku || 'Option';
    const option = color ? 'Shade' : size ? 'Size' : 'Option';
    const value = name;
    const variantPrice = toFiniteNumber(variant.price, price);
    const variantStock = toFiniteNumber(variant.stock, 0);

    return {
      id: variant.id,
      name,
      option,
      value,
      price: variantPrice,
      originalPrice,
      stock: variantStock,
      sku: variant.sku || '',
      image: variant.image || undefined,
    };
  });

  const _resolvedPath = productPath(product);
  const slug = product.slug || product.urlSlug || baseShopProduct.slug;

  return {
    ...baseShopProduct,
    slug,
    price,
    originalPrice,
    discount,
    stock: toFiniteNumber(product.stock, 0),
    rating: toFiniteNumber(product.rating, 0),
    reviewCount: toFiniteNumber(product.reviews, 0),
    hasVariants: variants.length > 0 || Boolean(product.variantCount && product.variantCount > 0),
    variants,
    flashSaleEligible: product.flashSaleEligible,
    offerEndDate: product.offerEndDate,
    isBestSeller: Boolean(product.featured || (product.soldCount && product.soldCount > 20) || product.rating >= 4.5),
  };
}

function getDefaultHref(type: string) {
  const hrefs: Record<string, string> = {
    'flash-sale': '/flash-sale',
    'new-arrivals': '/new-arrivals',
    'for-you': '/for-you',
    recommendations: '/recommendations',
    favourites: '/favourites',
    brands: '/brands',
  };

  return hrefs[type] ?? '/shop';
}

function getProductSectionConfigs(sections?: HomeSection[]) {
  const source = sections && sections.length > 0 ? sections : defaultHomeSections;
  return source
    .filter((section) => PRODUCT_SECTION_TYPES.has(section.type))
    .filter((section) => section.isVisible !== false)
    .sort((a, b) => a.order - b.order);
}

function selectedSet(section: HomeSection, key: 'selectedProductIds' | 'selectedBrandIds') {
  return new Set((section.settings[key] ?? []).map((item) => item.toLowerCase()));
}

function filterSelectedProducts(products: ShopProduct[], section: HomeSection) {
  const selected = selectedSet(section, 'selectedProductIds');
  if (selected.size === 0) return null;

  return products
    .filter((product) => 
      selected.has(product.id.toLowerCase()) || 
      selected.has(product.slug.toLowerCase()) || 
      ((product as any).urlSlug && selected.has(String((product as any).urlSlug).toLowerCase()))
    )
    .sort((a, b) => {
      const selectedIds = section.settings.selectedProductIds ?? [];
      const indexA = selectedIds.findIndex((id) => id === a.id || id === a.slug || id === (a as any).urlSlug);
      const indexB = selectedIds.findIndex((id) => id === b.id || id === b.slug || id === (b as any).urlSlug);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
}

function sectionLimit(section: HomeSection, fallback: number) {
  return Math.max(1, Math.min(24, section.settings.itemsToShow ?? fallback));
}

function getProductsForSection({
  section,
  cardProducts,
  createdAtById,
}: {
  section: HomeSection;
  cardProducts: ShopProduct[];
  createdAtById: Map<string, string>;
}) {
  const manualProducts = filterSelectedProducts(cardProducts, section);
  const type = section.type as ProductSectionType;
  const limit = Math.max(10, sectionLimit(section, 12));

  if (manualProducts) return manualProducts.slice(0, limit);

  if (type === 'new-arrivals') {
    return [...cardProducts]
      .sort((a, b) => {
        const originalA = createdAtById.get(a.id) ?? '';
        const originalB = createdAtById.get(b.id) ?? '';
        return new Date(originalB).getTime() - new Date(originalA).getTime();
      })
      .slice(0, limit);
  }

  if (type === 'for-you') return cardProducts.slice(0, limit);

  if (type === 'recommendations') {
    return [...cardProducts]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, limit);
  }

  if (type === 'favourites') {
    return [...cardProducts]
      .sort((a, b) => Number(Boolean(b.isTrending || b.isBestSeller)) - Number(Boolean(a.isTrending || a.isBestSeller)))
      .slice(0, limit);
  }

  return [];
}

function getSectionBadge(section: HomeSection): string | undefined {
  if (section.type === 'new-arrivals') return 'NEW';
  if (section.type === 'for-you') return 'FOR YOU';
  if (section.type === 'recommendations') return 'RECOMMENDED';
  if (section.type === 'favourites') return 'FAVORITE';

  const titleLower = (section.title || '').toLowerCase();
  if (titleLower.includes('new arrival')) return 'NEW';
  if (titleLower.includes('for you') || titleLower.includes('picked')) return 'FOR YOU';
  if (titleLower.includes('recommend')) return 'RECOMMENDED';
  if (titleLower.includes('favorite') || titleLower.includes('favourite')) return 'FAVORITE';

  return undefined;
}

function ProductSectionCarousel({
  section,
  products,
  flashSaleEndsAt,
}: {
  section: HomeSection;
  products: ShopProduct[];
  flashSaleEndsAt?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(products.length > 2);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollPrev(scrollLeft > 8);
    setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, products.length]);

  const handlePrev = () => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 16 : 240;
    el.scrollBy({ left: -(cardWidth * 2), behavior: 'smooth' });
  };

  const handleNext = () => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 16 : 240;
    el.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
  };

  const sectionType = section.type as SectionIconType;
  const sectionBadge = getSectionBadge(section);

  return (
    <SectionLayoutWrapper
      key={section.id}
      style={{ backgroundColor: section.settings.backgroundColor || undefined }}
    >
      <HomeSectionHeader
        type={sectionType}
        title={section.title}
        subtitle={section.subtitle}
        showArrows={true}
        onPrev={handlePrev}
        onNext={handleNext}
        canScrollPrev={canScrollPrev}
        canScrollNext={canScrollNext}
      />

      {section.type === 'flash-sale' && (
        <FlashSaleBannerStrip
          timer={<HomeCountdownTimer endsAt={flashSaleEndsAt} label="Offer ends in:" />}
          urgencyText="Active limited-time offers only"
        />
      )}

      {/* Fenty Beauty Inspired Horizontal Carousel Track */}
      <div
        ref={trackRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[185px] sm:w-[220px] md:w-[245px] lg:w-[calc(20%-13px)] shrink-0 h-full"
          >
            <ProductCard
              product={product}
              layout="grid"
              index={index}
              listName={section.title || section.type}
              sectionBadge={sectionBadge}
            />
          </div>
        ))}
      </div>
    </SectionLayoutWrapper>
  );
}

function BrandsSection({ section, brands }: { section: HomeSection; brands: HomeSectionBrand[] }) {
  const selected = selectedSet(section, 'selectedBrandIds');
  const filteredBrands = (selected.size > 0
    ? brands.filter((brand) => selected.has(brand.id.toLowerCase()) || selected.has(brand.slug.toLowerCase()) || selected.has(brand.name.toLowerCase()))
    : brands)
    .filter((brand) => brand.isVisible !== false)
    .slice(0, sectionLimit(section, 4));

  if (filteredBrands.length === 0) return null;

  return (
    <SectionLayoutWrapper style={{ backgroundColor: section.settings.backgroundColor || DESIGN_TOKEN_VALUES.surface.panel }}>
      <HomeSectionHeader
        type="custom"
        title={section.title}
        subtitle={section.subtitle}
        badgeLabel="FEATURED BRANDS"
        href={section.settings.viewAllHref || getDefaultHref(section.type)}
        cta={section.settings.ctaText || 'View all'}
        showViewAll={section.settings.showViewAll !== false}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {filteredBrands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="minsah-tap-target flex aspect-square items-center justify-center rounded-2xl border border-stone-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1c3a13]/30 hover:shadow-md"
          >
            <span className="whitespace-pre-line text-center text-xs sm:text-sm font-bold text-[#1c3a13]">
              {brand.logo || brand.name}
            </span>
          </Link>
        ))}
      </div>
    </SectionLayoutWrapper>
  );
}

export default function HomeProductSections({
  products,
  sections,
  brands = defaultBrands,
  nowIso,
}: {
  products: ContextProduct[];
  sections?: HomeSection[];
  brands?: HomeSectionBrand[];
  nowIso?: string;
}) {
  const now = nowIso ? new Date(nowIso).getTime() : undefined;
  const activeProducts = products.filter((product) => product.status === 'active');
  const cardProducts = activeProducts.map(mapProduct);
  const createdAtById = new Map(activeProducts.map((product) => [product.id, product.createdAt]));
  const activeFlashSaleSourceProducts = activeProducts.filter((product) => isActiveFlashSale(product, now));
  const activeFlashSaleIds = new Set(activeFlashSaleSourceProducts.map((product) => product.id));
  const flashSaleEndsAt = getNearestOfferEnd(activeFlashSaleSourceProducts, now);
  const sectionConfigs = getProductSectionConfigs(sections);

  const renderedSections = sectionConfigs.map((section) => {
    if (section.type === 'brands') {
      return <BrandsSection key={section.id} section={section} brands={brands} />;
    }

    let sectionProducts = getProductsForSection({ section, cardProducts, createdAtById });
    let cta = section.settings.ctaText || 'View all';
    const sectionType = section.type as SectionIconType;

    if (section.type === 'flash-sale') {
      sectionProducts = sectionProducts.length > 0 && (section.settings.selectedProductIds?.length ?? 0) > 0
        ? sectionProducts.filter((product) => activeFlashSaleIds.has(product.id))
        : activeFlashSaleSourceProducts.map(mapProduct);
      sectionProducts = sectionProducts
        .filter((product) => product.originalPrice != null && product.originalPrice > product.price)
        .slice(0, sectionLimit(section, 4));
      cta = section.settings.ctaText || 'Shop Now';
    }

    if (sectionProducts.length === 0) return null;

    return (
      <ProductSectionCarousel
        key={section.id}
        section={section}
        products={sectionProducts}
        flashSaleEndsAt={flashSaleEndsAt}
      />
    );
  }).filter(Boolean);

  if (renderedSections.length === 0) return null;

  return <div className="bg-[#FAF9F6] pb-8 sm:pb-12">{renderedSections}</div>;
}
