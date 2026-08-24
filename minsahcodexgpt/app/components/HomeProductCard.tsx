import Link from 'next/link';
import { Star } from 'lucide-react';
import type { VariantOption } from '@/components/cart/VariantModal';
import { formatPrice } from '@/utils/currency';
import { productPath } from '@/lib/product-url';
import { HomePrimaryCartAction, HomeOverlayCartAction } from './HomeProductActions';
import HomeWishlistButton from './HomeWishlistButton';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

export interface HomeProductCardData {
  id: string;
  slug?: string | null;
  urlSlug?: string | null;
  href?: string | null;
  name: string;
  category?: string | null;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  discount?: number | null;
  image: string;
  stock: number;
  lowStockThreshold?: number | null;
  rating?: number | null;
  reviews?: number | null;
  soldCount?: number | null;
  isNew?: boolean | null;
  featured?: boolean | null;
  flashSaleEligible?: boolean | null;
  offerEndDate?: string | null;
  hasVariants: boolean;
  variantCount?: number | null;
  variantsFullyLoaded?: boolean | null;
  variants?: VariantOption[];
}

type HomeProductCardVariant = 'standard' | 'compact' | 'horizontal';

interface HomeProductCardProps {
  product: HomeProductCardData;
  variant?: HomeProductCardVariant;
  priority?: boolean;
  showCategory?: boolean;
}

function clampRating(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(5, value));
}

function calculateDiscount(product: HomeProductCardData) {
  if (typeof product.discount === 'number' && product.discount > 0) return Math.round(product.discount);
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

function StockMessage({ product }: { product: HomeProductCardData }) {
  if (product.stock <= 0) {
    return <span className="text-xs font-semibold text-stone-500">Out of stock</span>;
  }

  const threshold = product.lowStockThreshold ?? 5;
  if (product.stock <= threshold) {
    return <span className="text-xs font-semibold text-orange-600">Only {product.stock} left</span>;
  }

  if (product.hasVariants) {
    const optionCount = product.variantCount ?? product.variants?.length ?? 0;
    return (
      <span className="text-xs font-semibold text-minsah-secondary">
        {optionCount > 1 ? `Choose from ${optionCount} options` : 'Choose your option'}
      </span>
    );
  }

  return <span className="text-xs font-semibold text-emerald-700">In stock</span>;
}

function CardBadges({ product }: { product: HomeProductCardData }) {
  const discount = calculateDiscount(product);
  if (discount > 0) {
    return (
      <div className="absolute left-2.5 top-2.5 z-10">
        <span className="rounded-full bg-minsah-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-xs">
          {discount}% off
        </span>
      </div>
    );
  }
  if (product.isNew) {
    return (
      <div className="absolute left-2.5 top-2.5 z-10">
        <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-xs">
          New
        </span>
      </div>
    );
  }
  if (product.featured) {
    return (
      <div className="absolute left-2.5 top-2.5 z-10">
        <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-minsah-accent shadow-xs">
          Popular
        </span>
      </div>
    );
  }
  return null;
}

function RatingRow({ product, compact = false }: { product: HomeProductCardData; compact?: boolean }) {
  const rating = clampRating(product.rating);
  const reviews = product.reviews ?? 0;

  if (rating <= 0 && reviews <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-minsah-secondary text-xs">
      {rating > 0 && (
        <span className="inline-flex items-center gap-0.5 font-medium text-amber-700">
          <Star size={compact ? 11 : 12} className="fill-current" />
          {rating.toFixed(1)}
        </span>
      )}
      {reviews > 0 && <span className="text-stone-400">({reviews})</span>}
    </div>
  );
}

export default function HomeProductCard({
  product,
  variant = 'standard',
  priority = false,
  showCategory = true,
}: HomeProductCardProps) {
  const href = product.href || productPath(product);
  const isCompact = variant === 'compact';
  const isOutOfStock = product.stock <= 0;
  const imageSizes = isCompact ? '(max-width: 640px) 33vw, 160px' : '(max-width: 640px) 50vw, 260px';

  if (variant === 'horizontal') {
    return (
      <article className="group/card minsah-card-lift grid grid-cols-[112px,1fr] gap-3 rounded-lg border border-stone-200/70 bg-white p-3 shadow-none transition-all duration-200 ease-out hover:border-stone-300 hover:shadow-sm motion-reduce:transition-none">
        <Link href={href} className="relative block aspect-square overflow-hidden rounded-md bg-minsah-surface-subtle">
          <CatalogProductImage src={product.image} alt={product.name} priority={priority} sizes="112px" className="group-hover/card:scale-105" />
          <CardBadges product={product} />
        </Link>
        <div className="min-w-0 flex flex-col justify-between">
          <div>
            <div className="mb-1 flex items-start justify-between gap-2">
              <Link href={href} className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-semibold text-minsah-dark transition-colors hover:text-minsah-primary">
                  {product.name}
                </h3>
              </Link>
              <HomeWishlistButton productId={product.id} productName={product.name} size="sm" />
            </div>
            <RatingRow product={product} compact />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-minsah-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs font-normal text-stone-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
          <HomePrimaryCartAction
            productId={product.id}
            productName={product.name}
            productImage={product.image}
            price={product.price}
            stock={product.stock}
            hasVariants={product.hasVariants}
            variants={product.variants}
            variantCount={product.variantCount ?? undefined}
            variantsFullyLoaded={product.variantsFullyLoaded ?? undefined}
            className="mt-2 h-9 w-full text-xs"
          />
        </div>
      </article>
    );
  }

  return (
    <article className={`group/card minsah-card-lift flex h-full flex-col rounded-lg border border-stone-200/70 bg-white shadow-none transition-all duration-200 ease-out hover:border-stone-300 hover:shadow-sm motion-reduce:transition-none ${isCompact ? 'p-2.5' : 'p-3'}`}>
      <div className="relative">
        <Link
          href={href}
          className={`relative block aspect-square overflow-hidden bg-minsah-surface-subtle ${isCompact ? 'rounded' : 'rounded-md'}`}
          aria-label={`View ${product.name}`}
        >
          <CatalogProductImage src={product.image} alt={product.name} priority={priority} sizes={imageSizes} className="group-hover/card:scale-105" />
          <CardBadges product={product} />
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-900/45">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-sm">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        <div className="absolute right-2 top-2 z-20">
          <HomeWishlistButton productId={product.id} productName={product.name} size={isCompact ? 'sm' : 'md'} />
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${isCompact ? 'pt-2' : 'pt-3'}`}>
        {showCategory && product.category && (
          <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wider text-minsah-secondary">
            {product.category}
          </p>
        )}

        <Link href={href} className="block">
          <h3 className={`${isCompact ? 'min-h-[2rem] text-xs' : 'min-h-[2.5rem] text-sm'} line-clamp-2 font-semibold leading-snug text-minsah-dark transition-colors hover:text-minsah-primary`}>
            {product.name}
          </h3>
        </Link>

        <div className="mt-1.5">
          <RatingRow product={product} compact={isCompact} />
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`${isCompact ? 'text-sm' : 'text-base'} font-bold text-minsah-primary`}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs font-normal text-stone-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-1 items-end">
          <HomePrimaryCartAction
            productId={product.id}
            productName={product.name}
            productImage={product.image}
            price={product.price}
            stock={product.stock}
            hasVariants={product.hasVariants}
            variants={product.variants}
            variantCount={product.variantCount ?? undefined}
            variantsFullyLoaded={product.variantsFullyLoaded ?? undefined}
            className={isCompact ? 'h-9 w-full px-2 text-xs' : 'w-full'}
          />
        </div>
      </div>
    </article>
  );
}
