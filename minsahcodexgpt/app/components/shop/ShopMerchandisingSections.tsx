'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, BadgePercent, Flame, Sparkles, Star } from 'lucide-react';
import { normalizeShopSearchParams } from '@/lib/shopUtils';
import { productPath } from '@/lib/product-url';
import { formatPrice } from '@/lib/shopUtils';
import { trackShopSelectItem, trackShopViewItemList } from '@/lib/tracking/shop-events';
import type { Product } from '@/types/product';
import ShopMerchandisingFallback from './ShopMerchandisingFallback';

type MerchIconKey = 'sparkles' | 'flame' | 'badge-percent' | 'star';

type ServerMerchProduct = {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  brand?: string;
  brandSlug?: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  discountPercentage?: number;
  image?: string;
  images?: Array<string | { url?: string; alt?: string }> | string[];
  stock?: number;
  quantity?: number;
  category?: string;
  categorySlug?: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  description?: string;
  shortDescription?: string;
  featured?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  isCODAvailable?: boolean;
  codAvailable?: boolean;
  freeShippingEligible?: boolean;
  returnEligible?: boolean;
  authenticityBadge?: boolean;
  deliveryBadge?: string | null;
  badges?: string[];
  tags?: string | string[];
  views?: number;
  viewCount?: number;
  salesCount?: number;
  orderCount?: number;
  confirmedOrderCount?: number;
  deliveredOrderCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type MerchSection = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: MerchIconKey;
  reason: string;
  personalized: boolean;
  trackingListName: string;
  products: Product[];
};

interface ShopMerchandisingSectionsProps {
  excludeProductIds?: string[];
  totalProducts?: number;
}

const ICONS: Record<MerchIconKey, typeof Flame> = {
  sparkles: Sparkles,
  flame: Flame,
  'badge-percent': BadgePercent,
  star: Star,
};

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function imageToUrl(image: string | { url?: string } | null | undefined): string {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return typeof image.url === 'string' ? image.url : '';
}

function serverProductToShopProduct(product: ServerMerchProduct): Product {
  const imageUrls = (Array.isArray(product.images) ? product.images : []).map(imageToUrl).filter(Boolean);
  const mainImage = product.image || imageUrls[0] || '';
  const createdAt = product.createdAt ? new Date(product.createdAt) : new Date();
  const updatedAt = product.updatedAt ? new Date(product.updatedAt) : createdAt;
  const originalPrice = product.originalPrice ?? undefined;
  const discount =
    typeof product.discount === 'number'
      ? product.discount
      : typeof product.discountPercentage === 'number'
        ? product.discountPercentage
        : originalPrice && originalPrice > product.price
          ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
          : undefined;

  return {
    ...product,
    slug: product.slug || toSlug(product.name),
    sku: product.sku || product.id,
    stock: Number(product.stock ?? product.quantity ?? 0),
    brand: product.brand || '',
    brandSlug: product.brandSlug || toSlug(product.brand || ''),
    originalPrice,
    discount,
    image: mainImage,
    images: imageUrls.length ? imageUrls : mainImage ? [mainImage] : [],
    category: product.category || '',
    categorySlug: product.categorySlug || toSlug(product.category || ''),
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || product.reviews || 0),
    description: product.description || '',
    shortDescription: product.shortDescription || product.name,
    isNew: Boolean(product.isNew),
    isBestSeller: Number(product.salesCount || product.deliveredOrderCount || product.confirmedOrderCount || product.orderCount || 0) > 0,
    isExclusive: false,
    isTrending: Boolean(product.isTrending || product.featured || product.isFeatured),
    skinConcerns: [],
    tags: Array.isArray(product.tags)
      ? product.tags
      : typeof product.tags === 'string'
        ? product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
    isVegan: false,
    isCrueltyFree: false,
    isOrganic: false,
    isHalalCertified: false,
    isBSTIApproved: false,
    isImported: false,
    hasVariants: false,
    isCODAvailable: product.isCODAvailable === true || product.codAvailable === true,
    isSameDayDelivery: false,
    freeShippingEligible: product.freeShippingEligible === true,
    returnEligible: product.returnEligible === true,
    authenticityBadge: product.authenticityBadge === true,
    deliveryDays: 3,
    isEMIAvailable: false,
    views: Number(product.views || product.viewCount || 0),
    salesCount: Number(product.salesCount || product.deliveredOrderCount || product.confirmedOrderCount || product.orderCount || 0),
    createdAt,
    updatedAt,
  };
}

function buildMerchandisingUrl(searchParams: URLSearchParams, excludeProductIds: string[] = []) {
  const params = normalizeShopSearchParams(searchParams);
  params.delete('page');
  params.delete('limit');
  if (excludeProductIds.length) {
    params.set('exclude', excludeProductIds.slice(0, 40).join(','));
  }
  return `/api/shop/merchandising?${params.toString()}`;
}

function MerchProductTile({ product, index, section }: { product: Product; index: number; section: MerchSection }) {
  const hasImage = product.image && (product.image.startsWith('/') || product.image.startsWith('http'));

  return (
    <Link
      href={productPath(product)}
      onClick={() => trackShopSelectItem(product, index + 1, section.trackingListName, { sort: section.reason })}
      className="group block w-36 shrink-0 rounded-2xl border border-minsah-accent bg-white p-2 shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2 md:w-40"
      aria-label={`Open ${product.name}`}
    >
      <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-minsah-accent/35">
        {hasImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="160px"
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">✨</div>
        )}
        {(product.discount || 0) > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {product.discount}% OFF
          </span>
        )}
      </div>
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-minsah-secondary">
        {product.brand || 'Minsah Beauty'}
      </p>
      <p className="line-clamp-2 min-h-[2rem] text-xs font-semibold leading-snug text-minsah-dark group-hover:text-minsah-primary">
        {product.name}
      </p>
      <p className="mt-1 text-sm font-bold text-minsah-primary">৳{formatPrice(product.price)}</p>
    </Link>
  );
}

export default function ShopMerchandisingSections({ excludeProductIds = [], totalProducts }: ShopMerchandisingSectionsProps) {
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<MerchSection[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const excludeKey = excludeProductIds.join(',');
  const requestUrl = useMemo(() => buildMerchandisingUrl(searchParams, excludeProductIds), [searchParams, excludeKey]);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadMerchandising() {
      setStatus('loading');
      try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Merchandising request failed');
        const data = await response.json();
        const nextSections = Array.isArray(data.sections)
          ? data.sections.map((section: any) => ({
              id: String(section.id || ''),
              title: String(section.title || ''),
              subtitle: String(section.subtitle || ''),
              href: String(section.href || '/shop'),
              icon: (section.icon || 'sparkles') as MerchIconKey,
              reason: String(section.reason || 'catalog_performance'),
              personalized: section.personalized === true,
              trackingListName: String(section.trackingListName || `Shop Merchandising - ${section.title || 'Section'}`),
              products: Array.isArray(section.products)
                ? section.products.map(serverProductToShopProduct).filter((product: Product) => product.id && product.name)
                : [],
            })).filter((section: MerchSection) => section.products.length >= 3)
          : [];

        if (!ignore) {
          setSections(nextSections);
          setStatus('ready');
        }
      } catch (error) {
        if (controller.signal.aborted || ignore) return;
        console.warn('Shop merchandising could not load:', error);
        setSections([]);
        setStatus('error');
      }
    }

    loadMerchandising();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [requestUrl]);

  useEffect(() => {
    if (status !== 'ready') return;
    sections.forEach((section) => {
      trackShopViewItemList(section.products, section.trackingListName, {
        sort: section.reason,
        page: 1,
      });
    });
  }, [sections, status]);

  if (status === 'loading') {
    return (
      <div className="mb-6 rounded-3xl border border-minsah-accent bg-white p-4 shadow-sm" aria-label="Loading shop recommendations" aria-busy="true">
        <div className="mb-3 h-5 w-40 animate-pulse rounded-full bg-minsah-accent/70 motion-reduce:animate-none" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-minsah-accent/50 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') return <ShopMerchandisingFallback reason="error" />;

  if (!sections.length) return <ShopMerchandisingFallback reason="empty" />;

  return (
    <div className="mb-6 space-y-4" aria-label="Server-backed shop merchandising recommendations" data-merchandising-source="server_catalog">
      {sections.map((section) => {
        const Icon = ICONS[section.icon] || Sparkles;
        return (
          <section key={section.id} className="rounded-3xl border border-minsah-accent bg-white p-4 shadow-sm" data-merchandising-section={section.id} data-personalized={section.personalized ? 'true' : 'false'}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-minsah-accent text-minsah-primary">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-minsah-dark md:text-lg">{section.title}</h2>
                  <p className="text-xs text-minsah-secondary md:text-sm">{section.subtitle}</p>
                  {section.personalized && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-minsah-primary">
                      Based on current filters{typeof totalProducts === 'number' ? ` • ${totalProducts} matching products` : ''}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={section.href}
                className="hidden shrink-0 items-center gap-1 rounded-full border border-minsah-accent px-3 py-2 text-xs font-semibold text-minsah-dark outline-none transition-colors hover:border-minsah-primary hover:text-minsah-primary focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2 sm:flex"
              >
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" role="list" aria-label={`${section.title} products`}>
              {section.products.map((product, index) => (
                <div key={`${section.id}-${product.id}`} role="listitem">
                  <MerchProductTile product={product} index={index} section={section} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
