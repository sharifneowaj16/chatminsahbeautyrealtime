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
  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
      {discount > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          {discount}% off
        </span>
      )}
      {product.isNew && (
        <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          New
        </span>
      )}
      {product.featured && !product.isNew && (
        <span className="rounded-full bg-minsah-dark px-2 py-1 text-xs font-bold uppercase tracking-wide text-minsah-accent shadow-sm">
          Popular
        </span>
      )}
    </div>
  );
}


function FlashSaleProgress({ product, compact = false }: { product: HomeProductCardData; compact?: boolean }) {
  if (!product.flashSaleEligible || (!product.soldCount && product.stock <= 0)) return null;

  const sold = Math.max(0, product.soldCount ?? 0);
  const remaining = Math.max(0, product.stock);
  const total = sold + remaining;
  const percentage = total > 0 ? Math.min(100, Math.max(8, Math.round((sold / total) * 100))) : 0;
  const label = sold > 0 ? `${sold}+ sold` : 'Limited stock';

  return (
    <div className={`mt-2 ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-orange-700">
        <span>{label}</span>
        {remaining > 0 && <span>{remaining} left</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-orange-100" aria-hidden="true">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function RatingRow({ product, compact = false }: { product: HomeProductCardData; compact?: boolean }) {
  const rating = clampRating(product.rating);
  const reviews = product.reviews ?? 0;

  if (rating <= 0 && reviews <= 0 && !product.soldCount) return null;

  return (
    <div className={`flex items-center gap-1.5 text-minsah-secondary ${compact ? 'text-xs' : 'text-xs'}`}>
      {rating > 0 && (
        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
          <Star size={compact ? 11 : 13} className="fill-current" />
          {rating.toFixed(1)}
        </span>
      )}
      {reviews > 0 && <span>({reviews})</span>}
      {product.soldCount ? <span>• {product.soldCount}+ sold</span> : null}
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
      <article className="group/card minsah-card-lift grid grid-cols-[112px,1fr] gap-3 rounded-2xl border border-stone-100 bg-white p-2.5 shadow-sm transition-all duration-300 ease-out motion-reduce:transition-none">
        <Link href={href} className="relative block aspect-square overflow-hidden rounded-2xl bg-minsah-accent">
          <CatalogProductImage src={product.image} alt={product.name} priority={priority} sizes="112px" className="group-hover/card:scale-105" />
          <CardBadges product={product} />
        </Link>
        <div className="min-w-0">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Link href={href} className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-bold text-minsah-dark transition-colors hover:text-minsah-primary">
                {product.name}
              </h3>
            </Link>
            <HomeWishlistButton productId={product.id} productName={product.name} size="sm" />
          </div>
          <RatingRow product={product} compact />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-minsah-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs font-medium text-minsah-secondary line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="mt-1.5"><StockMessage product={product} /></div>
          <FlashSaleProgress product={product} compact />
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
    <article className={`group/card minsah-card-lift flex h-full flex-col rounded-3xl border border-stone-100 bg-white shadow-sm transition-all duration-300 ease-out motion-reduce:transition-none ${isCompact ? 'p-2' : 'p-3'}`}>
      <div className="relative">
        <Link
          href={href}
          className={`relative block aspect-square overflow-hidden bg-minsah-accent ${isCompact ? 'rounded-2xl' : 'rounded-[1.35rem]'}`}
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

        {!isOutOfStock && (
          <div className="absolute bottom-2 right-2 z-20">
            <HomeOverlayCartAction
              productId={product.id}
              productName={product.name}
              productImage={product.image}
              price={product.price}
              stock={product.stock}
              hasVariants={product.hasVariants}
              variants={product.variants}
            variantCount={product.variantCount ?? undefined}
            variantsFullyLoaded={product.variantsFullyLoaded ?? undefined}
            />
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${isCompact ? 'pt-2' : 'pt-3'}`}>
        {showCategory && product.category && (
          <p className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-minsah-secondary">
            {product.category}
          </p>
        )}

        <Link href={href} className="block">
          <h3 className={`${isCompact ? 'min-h-[2rem] text-xs' : 'min-h-[2.5rem] text-sm'} line-clamp-2 font-bold leading-snug text-minsah-dark transition-colors hover:text-minsah-primary`}>
            {product.name}
          </h3>
        </Link>

        <div className="mt-2">
          <RatingRow product={product} compact={isCompact} />
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className={`${isCompact ? 'text-sm' : 'text-base'} font-extrabold text-minsah-primary`}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className={`${isCompact ? 'text-xs' : 'text-xs'} font-medium text-minsah-secondary line-through`}>
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-1.5">
          <StockMessage product={product} />
        </div>

        <FlashSaleProgress product={product} compact={isCompact} />

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
