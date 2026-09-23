import Link from 'next/link';
import { ChevronRight, Flame, TimerReset } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Product as ContextProduct } from '@/contexts/ProductsContext';
import type { HomeSection, HomeSectionBrand } from '@/types/admin';
import { defaultBrands, defaultHomeSections } from '@/lib/homeData';
import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';
import HomeCountdownTimer from './HomeCountdownTimer';
import ProductCard from '@/app/components/shop/ProductCard';
import type { Product as ShopProduct, ProductVariant } from '@/types/product';
import { adminProductToShopProduct } from '@/lib/productAdapter';

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

function isActiveFlashSale(product: ContextProduct, now = Date.now()) {
  if (!product.flashSaleEligible || !product.offerStartDate || !product.offerEndDate) return false;

  const startsAt = new Date(product.offerStartDate).getTime();
  const endsAt = new Date(product.offerEndDate).getTime();

  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return false;

  return startsAt <= now && endsAt >= now;
}

function getNearestOfferEnd(products: ContextProduct[]) {
  const activeEndTimes = products
    .filter((product) => isActiveFlashSale(product))
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

function SectionHeader({ title, subtitle, href, cta = 'View all', icon, showViewAll = true }: {
  title: string;
  subtitle?: string;
  href: string;
  cta?: string;
  icon?: ReactNode;
  showViewAll?: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="truncate text-xl font-bold tracking-tight text-minsah-dark">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-xs font-normal text-minsah-secondary">{subtitle}</p>}
      </div>
      {showViewAll && (
        <Link href={href} aria-label={`${cta} ${title}`} className="minsah-tap-target minsah-touch-target min-h-10 inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold text-minsah-primary hover:bg-minsah-surface-subtle">
          {cta} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
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
  const limit = sectionLimit(section, type === 'flash-sale' || type === 'new-arrivals' ? 4 : 6);

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

function gridClass(section: HomeSection) {
  if (section.settings.layout === 'grid-3') return 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4';
  if (section.settings.layout === 'grid-4') return 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4';
  return 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4';
}

function ProductGrid({ section, products }: { section: HomeSection; products: ShopProduct[] }) {
  if (products.length === 0) return null;

  if (section.settings.layout === 'horizontal-scroll') {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pt-1">
        {products.map((product, index) => (
          <div key={product.id} className="w-[180px] sm:w-[220px] md:w-[250px] shrink-0">
            <ProductCard
              product={product}
              layout="grid"
              index={index}
              listName={section.title || section.type}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass(section)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          layout="grid"
          index={index}
          listName={section.title || section.type}
        />
      ))}
    </div>
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
    <section className="px-4 py-10 lg:px-8 lg:py-14" style={{ backgroundColor: section.settings.backgroundColor || DESIGN_TOKEN_VALUES.surface.panel }}>
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        href={section.settings.viewAllHref || getDefaultHref(section.type)}
        cta={section.settings.ctaText || 'View all'}
        showViewAll={section.settings.showViewAll !== false}
      />
      <div className="grid grid-cols-4 gap-3.5">
        {filteredBrands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="minsah-tap-target flex aspect-square items-center justify-center rounded-lg border border-stone-200/70 bg-white p-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm"
          >
            <span className="whitespace-pre-line text-center text-xs font-semibold text-minsah-dark">
              {brand.logo || brand.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomeProductSections({
  products,
  sections,
  brands = defaultBrands,
}: {
  products: ContextProduct[];
  sections?: HomeSection[];
  brands?: HomeSectionBrand[];
}) {
  const activeProducts = products.filter((product) => product.status === 'active');
  const cardProducts = activeProducts.map(mapProduct);
  const createdAtById = new Map(activeProducts.map((product) => [product.id, product.createdAt]));
  const activeFlashSaleSourceProducts = activeProducts.filter((product) => isActiveFlashSale(product));
  const activeFlashSaleIds = new Set(activeFlashSaleSourceProducts.map((product) => product.id));
  const flashSaleEndsAt = getNearestOfferEnd(activeFlashSaleSourceProducts);
  const sectionConfigs = getProductSectionConfigs(sections);

  const renderedSections = sectionConfigs.map((section) => {
    if (section.type === 'brands') {
      return <BrandsSection key={section.id} section={section} brands={brands} />;
    }

    let sectionProducts = getProductsForSection({ section, cardProducts, createdAtById });
    let icon: ReactNode = null;
    let cta = section.settings.ctaText || 'View all';

    if (section.type === 'flash-sale') {
      sectionProducts = sectionProducts.length > 0 && (section.settings.selectedProductIds?.length ?? 0) > 0
        ? sectionProducts.filter((product) => activeFlashSaleIds.has(product.id))
        : activeFlashSaleSourceProducts.map(mapProduct);
      sectionProducts = sectionProducts
        .filter((product) => product.originalPrice != null && product.originalPrice > product.price)
        .slice(0, sectionLimit(section, 4));
      icon = <Flame className="text-orange-500" size={20} />;
      cta = section.settings.ctaText || 'Shop Now';
    }

    if (sectionProducts.length === 0) return null;

    return (
      <section key={section.id} className="px-4 py-10 lg:px-8 lg:py-14" style={{ backgroundColor: section.settings.backgroundColor || undefined }}>
        <SectionHeader
          title={section.title}
          subtitle={section.subtitle}
          href={section.settings.viewAllHref || getDefaultHref(section.type)}
          cta={cta}
          icon={icon}
          showViewAll={section.settings.showViewAll !== false}
        />

        {section.type === 'flash-sale' && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <HomeCountdownTimer endsAt={flashSaleEndsAt} />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-orange-700 border border-stone-200/70">
              <TimerReset size={13} /> Active limited-time offers only
            </div>
          </div>
        )}

        <ProductGrid section={section} products={sectionProducts} />
      </section>
    );
  }).filter(Boolean);

  if (renderedSections.length === 0) return null;

  return <div className="bg-minsah-light pb-24">{renderedSections}</div>;
}
