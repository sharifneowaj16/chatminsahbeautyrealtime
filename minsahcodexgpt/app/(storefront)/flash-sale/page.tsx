import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, Flame, Search, ShieldCheck, Sparkles, TimerReset } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/seo';
import { productPath } from '@/lib/product-url';
import HomeCountdownTimer from '@/app/components/HomeCountdownTimer';
import HomeProductCard, { type HomeProductCardData } from '@/app/components/HomeProductCard';
import type { VariantOption } from '@/components/cart/VariantModal';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Flash Sale Deals',
  description: 'Shop active limited-time flash sale beauty deals at Minsah Beauty before the offers end.',
  alternates: { canonical: absoluteUrl('/flash-sale') },
  openGraph: {
    title: 'Flash Sale Deals',
    description: 'Limited-time active beauty offers from Minsah Beauty.',
    url: absoluteUrl('/flash-sale'),
    type: 'website',
    images: [{ url: absoluteUrl('/images/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flash Sale Deals',
    description: 'Limited-time active beauty offers from Minsah Beauty.',
    images: [absoluteUrl('/images/og-default.jpg')],
  },
};

type FlashSalePageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

type DecimalLike = number | string | { toNumber?: () => number } | null | undefined;

type FlashSaleProductRecord = {
  id: string;
  slug: string | null;
  name: string;
  price: DecimalLike;
  compareAtPrice: DecimalLike;
  salePrice: DecimalLike;
  quantity: number;
  lowStockThreshold: number;
  discountPercentage: DecimalLike;
  averageRating: DecimalLike;
  reviewCount: number;
  isNew: boolean;
  isFeatured: boolean;
  flashSaleEligible: boolean;
  offerEndDate: Date | null;
  orderCount?: number | null;
  confirmedOrderCount?: number | null;
  images: Array<{
    url: string;
    isDefault: boolean;
  }>;
  category: {
    name: string;
    slug: string;
  } | null;
  brand: {
    name: string;
  } | null;
  variants: Array<{
    id: string;
    sku: string | null;
    name: string | null;
    price: DecimalLike;
    quantity: number;
    attributes: unknown;
    image: string | null;
  }>;
};

type FlashSaleCategory = {
  name: string;
  slug: string;
  count: number;
};

function toNumber(value: DecimalLike, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const converted = value?.toNumber?.();
  return typeof converted === 'number' && Number.isFinite(converted) ? converted : fallback;
}

function getAttributeValue(attributes: unknown, key: string) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return '';
  const value = (attributes as Record<string, unknown>)[key];
  return value == null ? '' : String(value);
}

function normalizeVariantName(variant: FlashSaleProductRecord['variants'][number]) {
  const size = getAttributeValue(variant.attributes, 'size');
  const color = getAttributeValue(variant.attributes, 'color');
  return variant.name || [size, color].filter(Boolean).join(' / ') || 'Option';
}

function mapVariants(product: FlashSaleProductRecord): VariantOption[] {
  const basePrice = toNumber(product.salePrice, 0) || toNumber(product.price, 0);

  return product.variants
    .map((variant) => {
      const size = getAttributeValue(variant.attributes, 'size');
      const color = getAttributeValue(variant.attributes, 'color');

      return {
        id: variant.id,
        name: normalizeVariantName(variant),
        price: toNumber(variant.price, basePrice),
        stock: variant.quantity,
        sku: variant.sku || undefined,
        image: variant.image || null,
        attributes: {
          ...(size ? { size } : {}),
          ...(color ? { color } : {}),
        },
      };
    })
    .filter((variant) => variant.id);
}

function getCardPrice(product: FlashSaleProductRecord) {
  const basePrice = toNumber(product.price, 0);
  const salePrice = toNumber(product.salePrice, 0);
  const compareAtPrice = toNumber(product.compareAtPrice, 0);
  const price = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const originalPrice = compareAtPrice > price ? compareAtPrice : basePrice > price ? basePrice : undefined;

  return { price, originalPrice };
}

function mapProduct(product: FlashSaleProductRecord): HomeProductCardData {
  const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
  const { price, originalPrice } = getCardPrice(product);
  const variants = mapVariants(product);

  return {
    id: product.id,
    slug: product.slug,
    href: productPath(product),
    name: product.name,
    category: product.category?.name || '',
    brand: product.brand?.name || '',
    price,
    originalPrice,
    discount: toNumber(product.discountPercentage, 0) || undefined,
    image: mainImage?.url || '',
    stock: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    rating: toNumber(product.averageRating, 0),
    reviews: product.reviewCount || 0,
    soldCount: product.confirmedOrderCount || product.orderCount || 0,
    isNew: product.isNew,
    featured: product.isFeatured,
    flashSaleEligible: product.flashSaleEligible,
    offerEndDate: product.offerEndDate?.toISOString() || null,
    hasVariants: variants.length > 0,
    variants,
  };
}

function getNearestOfferEnd(products: FlashSaleProductRecord[]) {
  const endTimes = products
    .map((product) => product.offerEndDate?.getTime())
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (endTimes.length === 0) return null;

  return new Date(Math.min(...endTimes)).toISOString();
}

function getCategories(products: FlashSaleProductRecord[]): FlashSaleCategory[] {
  const categoryMap = new Map<string, FlashSaleCategory>();

  products.forEach((product) => {
    if (!product.category?.slug) return;
    const current = categoryMap.get(product.category.slug);
    if (current) {
      current.count += 1;
      return;
    }
    categoryMap.set(product.category.slug, {
      name: product.category.name,
      slug: product.category.slug,
      count: 1,
    });
  });

  return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildHref({ category, q }: { category?: string; q?: string }) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (q) params.set('q', q);
  const query = params.toString();
  return query ? `/flash-sale?${query}` : '/flash-sale';
}

async function getActiveFlashSaleProducts() {
  const now = new Date();

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      flashSaleEligible: true,
      offerStartDate: { lte: now },
      offerEndDate: { gte: now },
    },
    orderBy: [
      { offerEndDate: 'asc' },
      { discountPercentage: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 2 },
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true } },
      variants: {
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          quantity: true,
          attributes: true,
          image: true,
        },
        take: 20,
      },
    },
    take: 60,
  });

  return products as unknown as FlashSaleProductRecord[];
}

export default async function FlashSalePage({ searchParams }: FlashSalePageProps) {
  const params = await searchParams;
  const selectedCategory = params.category || 'all';
  const searchQuery = (params.q || '').trim();
  const activeProducts = await getActiveFlashSaleProducts();
  const categories = getCategories(activeProducts);
  const nearestOfferEnd = getNearestOfferEnd(activeProducts);

  const filteredProducts = activeProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category?.slug === selectedCategory;
    const haystack = [product.name, product.brand?.name, product.category?.name].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !searchQuery || haystack.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cardProducts = filteredProducts.map(mapProduct);

  return (
    <>
      <div className="min-h-screen bg-minsah-light pb-24">
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-white px-4 py-10">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.1fr,0.9fr] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-orange-700 shadow-sm">
                <Flame size={15} /> Active flash sale
              </div>
              <h1 className="max-w-2xl text-3xl font-black leading-tight text-minsah-dark sm:text-4xl lg:text-5xl">
                Limited-time beauty deals that are actually active now.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-minsah-secondary sm:text-base">
                Only products with real flash sale eligibility and valid offer dates appear here. Expired deals are hidden automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="#deals" className="inline-flex items-center gap-2 rounded-full bg-minsah-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-minsah-dark">
                  Shop deals <ChevronRight size={17} />
                </Link>
                <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-minsah-dark shadow-sm ring-1 ring-stone-200 transition hover:ring-minsah-primary">
                  Browse all products
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-orange-200/30 backdrop-blur">
              <div className="flex items-center gap-3 text-minsah-dark">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  <TimerReset size={24} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-minsah-secondary">Nearest offer ends</p>
                  <HomeCountdownTimer endsAt={nearestOfferEnd} className="mb-0 mt-2" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-minsah-light p-3">
                  <p className="text-xl font-black text-minsah-primary">{activeProducts.length}</p>
                  <p className="text-xs font-semibold text-minsah-secondary">Active deals</p>
                </div>
                <div className="rounded-2xl bg-minsah-light p-3">
                  <p className="text-xl font-black text-minsah-primary">{categories.length}</p>
                  <p className="text-xs font-semibold text-minsah-secondary">Categories</p>
                </div>
                <div className="rounded-2xl bg-minsah-light p-3">
                  <p className="text-xl font-black text-minsah-primary">৳</p>
                  <p className="text-xs font-semibold text-minsah-secondary">Best prices</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <ShieldCheck size={18} /> Expired or inactive offers are excluded.
              </div>
            </div>
          </div>
        </section>

        <section id="deals" className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-minsah-dark">Flash Sale Deals</h2>
              <p className="mt-1 text-sm text-minsah-secondary">
                {cardProducts.length > 0
                  ? `${cardProducts.length} active offer${cardProducts.length > 1 ? 's' : ''} showing`
                  : 'No active offer matched your filters'}
              </p>
            </div>

            <form action="/flash-sale" className="w-full lg:max-w-sm">
              {selectedCategory !== 'all' && <input type="hidden" name="category" value={selectedCategory} />}
              <Input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search active offers..."
                label="Search active offers"
                hideLabel
                leading={<Search size={18} aria-hidden="true" />}
                className="rounded-2xl border-stone-200 bg-white py-3 text-sm text-minsah-dark shadow-sm focus:border-minsah-primary focus:ring-2 focus:ring-minsah-primary/15"
              />
            </form>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              href={buildHref({ category: 'all', q: searchQuery })}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${selectedCategory === 'all' ? 'bg-minsah-primary text-white shadow-sm' : 'bg-white text-minsah-dark ring-1 ring-stone-200 hover:ring-minsah-primary'}`}
            >
              All ({activeProducts.length})
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={buildHref({ category: category.slug, q: searchQuery })}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${selectedCategory === category.slug ? 'bg-minsah-primary text-white shadow-sm' : 'bg-white text-minsah-dark ring-1 ring-stone-200 hover:ring-minsah-primary'}`}
              >
                {category.name} ({category.count})
              </Link>
            ))}
          </div>

          {cardProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {cardProducts.map((product, index) => (
                <HomeProductCard key={product.id} product={product} priority={index < 4} showCategory />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Sparkles size={26} />
              </div>
              <h3 className="text-xl font-black text-minsah-dark">No active flash sale right now</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-minsah-secondary">
                Flash sale products must be marked eligible and be inside their offer start/end date window before they appear here.
              </p>
              <Link href="/shop" className="mt-5 inline-flex rounded-full bg-minsah-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-minsah-dark">
                Shop regular products
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
