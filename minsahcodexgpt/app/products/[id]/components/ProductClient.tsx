'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react';
import CartStepper from '@/components/cart/CartStepper';
import CardBuyNowButton from '@/components/cart/CardBuyNowButton';
import ProductGallery from './ProductGallery';
import { GiftRequestButton, ShareButton } from './GiftShareButtons';
import ProductStickyHeader from './ProductStickyHeader';
import VariantSelector from './VariantSelector';
import StickyBottomBar from './StickyBottomBar';
import ReviewSection from './ReviewSection';

interface ImageItem {
  url: string;
  alt?: string;
  isDefault?: boolean;
}

interface Variant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string> | null;
  image?: string;
  weight?: number | null;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
}

interface RatingData {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  slug: string;
  stock: number;
  hasVariants: boolean;
}

interface FrequentlyBoughtProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string;
  stock: number;
  hasVariants: boolean;
  orderCount: number;
  totalUnits: number;
}

interface RecentlyViewedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  stock: number;
  hasVariants: boolean;
}

interface ProductClientProps {
  product: {
    id: string;
    name: string;
    slug: string;
    pageH1?: string;
    bengaliName?: string;
    description: string;
    shortDescription: string;
    seoIntro?: string;
    bengaliDescription?: string;
    price: number;
    salePrice?: number | null;
    discountPercentage?: number | null;
    originalPrice: number | null;
    image: string;
    images: ImageItem[] | string[];
    sku: string;
    stock: number;
    category: string;
    categorySlug?: string;
    brand: string;
    rating: number;
    reviews: number;
    inStock: boolean;
    isNew: boolean;
    ingredients?: string;
    skinType?: string[];
    codAvailable?: boolean;
    returnEligible?: boolean;
    weight?: number | null;
    lowStockThreshold?: number;
    allowBackorder?: boolean;
    preOrderOption?: boolean;
    flashSaleEligible?: boolean;
    offerStartDate?: string | null;
    offerEndDate?: string | null;
    targetAudience?: string;
    primaryConcern?: string;
    gender?: string;
    keyBenefits?: string[];
    descriptionSections?: unknown;
    productSpecs?: unknown;
    productAttributes?: unknown;
    shadeOptions?: unknown;
    variantPriceTable?: unknown;
    variantComparisonTable?: unknown;
    internalLinks?: unknown;
    usageInstructions?: string[];
    authenticityNote?: string;
    ingredientVerificationStatus?: string;
    originCountry?: string;
    shelfLife?: string;
    expiryDate?: string | null;
    shippingWeight?: string;
    isFragile?: boolean;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null;
    barcode?: string;
    condition?: string;
    gtin?: string;
    variants: Variant[];
  };
  reviews: Review[];
  rating: RatingData;
  relatedProducts: RelatedProduct[];
  frequentlyBoughtTogether: FrequentlyBoughtProduct[];
  productUrl: string;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '8801700000000';

function DeliveryEstimate() {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 5 || now.getDay() === 6;
  const dhakaLabel = hour < 15 && !isWeekend ? 'আগামীকাল' : 'পরশু';
  const outsideLabel = hour < 15 && !isWeekend ? '২-৩ দিনের মধ্যে' : '৩-৪ দিনের মধ্যে';

  return (
    <div className="rounded-xl bg-[#F5E9DC] p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#3D1F0E]">
        <Truck size={12} /> ডেলিভারি সময়
      </p>
      <div className="flex gap-3">
        <div className="flex flex-1 items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-[#8B5E3C]" />
          <div>
            <p className="text-xs font-semibold text-[#1A0D06]">ঢাকায়</p>
            <p className="text-xs font-medium text-green-600">{dhakaLabel} পাবেন</p>
            <p className="text-[10px] text-[#8B5E3C]">বিনামূল্যে ডেলিভারি</p>
          </div>
        </div>
        <div className="w-px bg-[#E8D5C0]" />
        <div className="flex flex-1 items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-[#8B5E3C]" />
          <div>
            <p className="text-xs font-semibold text-[#1A0D06]">সারাদেশে</p>
            <p className="text-xs font-medium text-[#3D1F0E]">{outsideLabel}</p>
            <p className="text-[10px] text-[#8B5E3C]">৳120 ডেলিভারি চার্জ</p>
          </div>
        </div>
      </div>
      {hour < 15 && !isWeekend && (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
          <Clock size={10} className="flex-shrink-0 text-amber-600" />
          <p className="text-[10px] font-medium text-amber-700">
            আজ বিকেল ৩টার আগে অর্ডার করলে দ্রুত dispatch হবে।
          </p>
        </div>
      )}
    </div>
  );
}

function StockUrgency({ stock, inStock, threshold = 10 }: { stock: number; inStock: boolean; threshold?: number }) {
  if (!inStock) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-600">স্টক শেষ</span>
      </div>
    );
  }

  if (stock <= threshold) {
    const pct = Math.max(10, Math.round((stock / Math.max(threshold, 1)) * 100));
    return (
      <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600">মাত্র {stock}টি বাকি</span>
          <span className="text-[10px] font-medium text-red-400">দ্রুত শেষ হচ্ছে</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-red-100">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-red-400">এখনই অর্ডার করুন, মিস করবেন না।</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      <span className="text-sm font-medium text-green-600">স্টকে আছে</span>
    </div>
  );
}


type DisplayRow = { label: string; value: string };
type DisplaySection = { heading: string; content?: string; bullets?: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function humanizeKey(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(', ');
  return JSON.stringify(value);
}

function toDisplayRows(value: unknown): DisplayRow[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (typeof item === 'string') return [{ label: `Item ${index + 1}`, value: item }];
      if (!isRecord(item)) return [];
      const label = stringifyValue(item.label ?? item.name ?? item.title ?? item.key ?? item.variant ?? item.option ?? `Item ${index + 1}`);
      const itemValue = stringifyValue(item.value ?? item.text ?? item.description ?? item.price ?? item.content ?? item.stock);
      if (itemValue) return [{ label, value: itemValue }];
      return Object.entries(item)
        .filter(([, entryValue]) => stringifyValue(entryValue))
        .map(([entryKey, entryValue]) => ({ label: humanizeKey(entryKey), value: stringifyValue(entryValue) }));
    });
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([, entryValue]) => stringifyValue(entryValue))
      .map(([entryKey, entryValue]) => ({ label: humanizeKey(entryKey), value: stringifyValue(entryValue) }));
  }
  return [];
}

function toDisplaySections(value: unknown): DisplaySection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === 'string') return [{ heading: `Section ${index + 1}`, content: item }];
    if (!isRecord(item)) return [];
    const heading = stringifyValue(item.heading ?? item.title ?? item.name ?? `Section ${index + 1}`);
    const content = stringifyValue(item.content ?? item.description ?? item.text);
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.map(stringifyValue).filter(Boolean)
      : Array.isArray(item.items)
        ? item.items.map(stringifyValue).filter(Boolean)
        : [];
    return heading || content || bullets.length ? [{ heading, content, bullets }] : [];
  });
}

function formatDateLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
}

function InfoRowsBlock({ title, rows }: { title: string; rows: DisplayRow[] }) {
  const visibleRows = rows.filter((row) => row.value);
  if (visibleRows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">{title}</p>
      <div className="overflow-hidden rounded-2xl border border-[#E8D5C0] bg-[#FFFDF9]">
        {visibleRows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="grid grid-cols-[42%_1fr] gap-3 border-b border-[#F0DFC9] px-3 py-2.5 last:border-b-0">
            <p className="text-xs font-medium text-[#8B5E3C]">{row.label}</p>
            <p className="text-xs font-semibold text-[#1A0D06]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DescriptionSectionsBlock({ sections }: { sections: DisplaySection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div key={`${section.heading}-${index}`} className="rounded-2xl bg-[#F5E9DC] p-4">
          <p className="text-sm font-semibold text-[#3D1F0E]">{section.heading}</p>
          {section.content && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#4A2C1A]">{section.content}</p>}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[#4A2C1A]">
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function InternalLinksBlock({ value }: { value: unknown }) {
  const rows = Array.isArray(value) ? value : [];
  const links = rows
    .filter(isRecord)
    .map((item) => ({
      label: stringifyValue(item.label ?? item.text ?? item.title ?? item.name),
      href: stringifyValue(item.href ?? item.url ?? item.link),
    }))
    .filter((item) => item.label && item.href);
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">আরও দেখুন</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link key={`${link.label}-${link.href}`} href={link.href} className="rounded-full border border-[#D4B896] px-3 py-1.5 text-xs font-medium text-[#3D1F0E] hover:bg-[#F5E9DC]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProductClient({
  product,
  reviews,
  rating,
  relatedProducts,
  frequentlyBoughtTogether,
  productUrl,
}: ProductClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0].id : null
  );
  const baseDisplayPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const [currentPrice, setCurrentPrice] = useState(baseDisplayPrice);
  const [quantity, setQuantity] = useState(1);
  const [expandIngredients, setExpandIngredients] = useState(false);
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  const selectedVariantObj = product.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const variantSize = selectedVariantObj?.attributes?.size ?? null;
  const variantColor = selectedVariantObj?.attributes?.color ?? null;
  const variantImage = selectedVariantObj?.image ?? null;
  const variantNameLabel = selectedVariantObj
    ? [variantSize, variantColor].filter(Boolean).join(' / ') || selectedVariantObj.name
    : null;

  const requiresVariantSelection = product.variants.length > 0 && !selectedVariantObj;
  const activeStock = selectedVariantObj ? selectedVariantObj.stock : requiresVariantSelection ? 0 : product.stock;
  const activeInStock = !requiresVariantSelection && activeStock > 0;
  const comparePrice =
    product.originalPrice && product.originalPrice > currentPrice
      ? product.originalPrice
      : product.salePrice && product.price > currentPrice
        ? product.price
        : null;
  const discountPct =
    product.discountPercentage && product.discountPercentage > 0
      ? Math.round(product.discountPercentage)
      : comparePrice && comparePrice > currentPrice
        ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
        : null;
  const lowStockThreshold = product.lowStockThreshold ?? 10;
  const totalPrice = currentPrice * quantity;
  const galleryImages = (product.images as Array<string | { url: string; alt?: string }>).map((img) =>
    typeof img === 'string' ? { url: img, alt: product.name } : img
  );
  const stickyBarVariants = useMemo(
    () =>
      product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        stock: variant.stock,
        image: variant.image ?? null,
        weight: variant.weight ?? product.weight ?? null,
        attributes: (variant.attributes ?? {}) as Record<string, string>,
      })),
    [product.variants, product.weight]
  );

  const handleVariantChange = useCallback((variantId: string | null, price: number, qty: number) => {
    setSelectedVariantId(variantId);
    setCurrentPrice(price);
    setQuantity(qty);
  }, []);

  const handleVariantImageChange = useCallback((imageUrl: string | null) => {
    setVariantImageOverride(imageUrl);
  }, []);

  const displayTitle = product.pageH1 || product.name;
  const productInfoRows: DisplayRow[] = [
    { label: 'Brand', value: product.brand || '' },
    { label: 'Category', value: product.category || '' },
    { label: 'Origin', value: product.originCountry || '' },
    { label: 'Shelf life', value: product.shelfLife || '' },
    { label: 'Expiry date', value: formatDateLabel(product.expiryDate) },
    { label: 'Shipping weight', value: product.shippingWeight || '' },
    { label: 'Dimensions', value: [product.dimensions?.length ?? product.length, product.dimensions?.width ?? product.width, product.dimensions?.height ?? product.height].filter(Boolean).join(' × ') },
    { label: 'Barcode', value: product.barcode || '' },
    { label: 'GTIN', value: product.gtin || '' },
    { label: 'Condition', value: product.condition || '' },
    { label: 'Fragile item', value: product.isFragile ? 'Yes' : '' },
    { label: 'Pre-order', value: product.preOrderOption ? 'Available' : '' },
    { label: 'Backorder', value: product.allowBackorder ? 'Available' : '' },
  ];
  const bestMatchRows: DisplayRow[] = [
    { label: 'Target audience', value: product.targetAudience || '' },
    { label: 'Primary concern', value: product.primaryConcern || '' },
    { label: 'Gender', value: product.gender || '' },
  ];
  const offerRows: DisplayRow[] = [
    { label: 'Flash sale', value: product.flashSaleEligible ? 'Eligible' : '' },
    { label: 'Offer starts', value: formatDateLabel(product.offerStartDate) },
    { label: 'Offer ends', value: formatDateLabel(product.offerEndDate) },
  ];
  const descriptionSections = toDisplaySections(product.descriptionSections);
  const specRows = toDisplayRows(product.productSpecs);
  const attributeRows = toDisplayRows(product.productAttributes);
  const shadeRows = toDisplayRows(product.shadeOptions);
  const variantPriceRows = toDisplayRows(product.variantPriceTable);
  const variantComparisonRows = toDisplayRows(product.variantComparisonTable);

  useEffect(() => {
    const storageKey = 'minsah_recently_viewed_products';

    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? (JSON.parse(saved) as RecentlyViewedProduct[]) : [];
      const filtered = parsed.filter((item) => item.id !== product.id);
      setRecentlyViewed(filtered.slice(0, 8));

      const currentProduct: RecentlyViewedProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: baseDisplayPrice,
        originalPrice: product.originalPrice,
        image: product.image,
        stock: product.stock,
        hasVariants: product.variants.length > 0,
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify([currentProduct, ...filtered].slice(0, 12))
      );
    } catch {
      setRecentlyViewed([]);
    }
  }, [
    product.id,
    product.slug,
    product.name,
    product.price,
    product.salePrice,
    product.originalPrice,
    product.image,
    product.stock,
    product.variants.length,
  ]);

  return (
    <>
      <ProductStickyHeader
        productName={displayTitle}
        price={currentPrice}
        variantName={variantNameLabel}
        requiresVariantSelection={requiresVariantSelection}
        stock={activeStock}
        inStock={activeInStock}
      />

      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-20">
            <ProductGallery
              images={galleryImages}
              productName={displayTitle}
              discountPct={discountPct}
              isNew={product.isNew}
              overrideImage={variantImageOverride}
            />
          </div>

          <div className="space-y-5 px-4 pt-4 pb-36 lg:px-0 lg:pt-0 lg:pb-8">
            {(product.brand || product.category) && (
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <span className="rounded-full bg-[#F5E9DC] px-2.5 py-1 text-xs font-medium text-[#6B4226]">
                    {product.brand}
                  </span>
                )}
                {product.category && (
                  <span className="rounded-full bg-[#F5E9DC] px-2.5 py-1 text-xs font-medium text-[#6B4226]">
                    {product.category}
                  </span>
                )}
              </div>
            )}

            <div>
              <h1 className="text-xl font-semibold leading-tight text-[#1A0D06] md:text-2xl lg:text-3xl">
                {displayTitle}
              </h1>
              {product.bengaliName && product.bengaliName !== displayTitle && (
                <p className="mt-1 text-sm font-medium text-[#8B5E3C]">{product.bengaliName}</p>
              )}
              {rating.total > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} width="13" height="13" viewBox="0 0 24 24">
                        <path
                          fill={star <= Math.round(rating.average) ? '#F59E0B' : '#E5E7EB'}
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#1A0D06]">{rating.average.toFixed(1)}</span>
                  <span className="text-sm text-[#8B5E3C]">({rating.total} রিভিউ)</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-semibold text-[#1A0D06] md:text-3xl">
                ৳{currentPrice.toLocaleString('bn-BD')}
              </span>
              {comparePrice && comparePrice > currentPrice && (
                <span className="text-lg text-[#A0856A] line-through">
                  ৳{comparePrice.toLocaleString('bn-BD')}
                </span>
              )}
              {discountPct && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                  {discountPct}% সাশ্রয়
                </span>
              )}
            </div>

            {requiresVariantSelection ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">ভ্যারিয়েন্ট সিলেক্ট করুন</p>
                <p className="mt-1 text-xs text-amber-700">
                  Add to cart করার আগে সাইজ বা শেড বেছে নিতে হবে।
                </p>
              </div>
            ) : (
              <StockUrgency stock={activeStock} inStock={activeInStock} threshold={lowStockThreshold} />
            )}

            {activeInStock && <DeliveryEstimate />}

            {product.shortDescription && (
              <p className="text-sm leading-relaxed text-[#4A2C1A]">{product.shortDescription}</p>
            )}

            {product.seoIntro && (
              <div className="rounded-2xl bg-[#F5E9DC] p-4">
                <p className="text-sm leading-relaxed text-[#4A2C1A]">{product.seoIntro}</p>
              </div>
            )}

            <div className="h-px bg-[#E8D5C0]" />

            <VariantSelector
              variants={product.variants}
              basePrice={baseDisplayPrice}
              baseStock={product.stock}
              onVariantChange={handleVariantChange}
              onImageChange={handleVariantImageChange}
            />

            {selectedVariantObj && (
              <div className="rounded-2xl bg-[#F5E9DC] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                      Selected Option
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#1A0D06]">{variantNameLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#8B5E3C]">Available</p>
                    <p
                      className={`text-sm font-semibold ${
                        selectedVariantObj.stock > 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {selectedVariantObj.stock > 0 ? `${selectedVariantObj.stock} pcs` : 'Out of stock'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <GiftRequestButton
                  productId={product.id}
                  productName={product.name}
                  variantId={selectedVariantId}
                />
              </div>
              <ShareButton productName={product.name} productUrl={productUrl} />
            </div>

            {product.skinType && product.skinType.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                  উপযুক্ত ত্বকের ধরন
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.skinType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-[#F5E9DC] px-3 py-1 text-xs font-medium text-[#6B4226]"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-[#E8D5C0]" />

            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Truck, label: 'Fast Delivery', sub: 'Nationwide' },
                { icon: ShieldCheck, label: '100% Original', sub: 'Guaranteed' },
                {
                  icon: RotateCcw,
                  label: product.returnEligible ? '7 Days' : 'No Return',
                  sub: product.returnEligible ? 'Return' : 'Final sale',
                },
                {
                  icon: Smartphone,
                  label: product.codAvailable ? 'bKash / COD' : 'Online Pay',
                  sub: 'Payment',
                },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="rounded-xl bg-[#F5E9DC] p-2.5 text-center">
                  <Icon size={16} className="mx-auto mb-1 text-[#3D1F0E]" />
                  <p className="text-[10px] font-semibold leading-tight text-[#1A0D06]">{label}</p>
                  <p className="mt-0.5 text-[9px] text-[#8B5E3C]">{sub}</p>
                </div>
              ))}
            </div>

            {product.authenticityNote && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Authenticity</p>
                <p className="mt-1 text-sm leading-relaxed text-green-800">{product.authenticityNote}</p>
              </div>
            )}

            {product.ingredientVerificationStatus && (
              <div className="rounded-2xl border border-[#E8D5C0] bg-[#FFFDF9] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">Ingredient verification</p>
                <p className="mt-1 text-sm text-[#4A2C1A]">{product.ingredientVerificationStatus}</p>
              </div>
            )}

            <InfoRowsBlock title="Best Match" rows={bestMatchRows} />

            {product.keyBenefits && product.keyBenefits.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">Key Benefits</p>
                <div className="flex flex-wrap gap-2">
                  {product.keyBenefits.map((benefit) => (
                    <span key={benefit} className="rounded-full bg-[#F5E9DC] px-3 py-1 text-xs font-medium text-[#6B4226]">{benefit}</span>
                  ))}
                </div>
              </div>
            )}

            {product.description && product.description !== product.shortDescription && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                  বিস্তারিত
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#4A2C1A]">
                  {product.description}
                </p>
              </div>
            )}

            {product.bengaliDescription && product.bengaliDescription !== product.description && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">বাংলা বিস্তারিত</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#4A2C1A]">{product.bengaliDescription}</p>
              </div>
            )}

            <DescriptionSectionsBlock sections={descriptionSections} />

            {product.usageInstructions && product.usageInstructions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">ব্যবহারবিধি</p>
                <ol className="list-decimal space-y-1 pl-4 text-sm text-[#4A2C1A]">
                  {product.usageInstructions.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            )}

            <InfoRowsBlock title="Product Details" rows={productInfoRows} />
            <InfoRowsBlock title="Product Specs" rows={specRows} />
            <InfoRowsBlock title="Attributes" rows={attributeRows} />
            <InfoRowsBlock title="Shade Options" rows={shadeRows} />
            <InfoRowsBlock title="Variant Price Table" rows={variantPriceRows} />
            <InfoRowsBlock title="Variant Comparison" rows={variantComparisonRows} />
            <InfoRowsBlock title="Offer Details" rows={offerRows} />
            <InternalLinksBlock value={product.internalLinks} />

            {product.ingredients && (
              <div className="overflow-hidden rounded-2xl border border-[#E8D5C0]">
                <button
                  onClick={() => setExpandIngredients(!expandIngredients)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-[#3D1F0E]" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                      উপাদান
                    </span>
                  </div>
                  {expandIngredients ? (
                    <ChevronUp size={14} className="text-[#8B5E3C]" />
                  ) : (
                    <ChevronDown size={14} className="text-[#8B5E3C]" />
                  )}
                </button>
                {expandIngredients && (
                  <div className="px-4 pb-4">
                    <p className="text-xs leading-relaxed text-[#4A2C1A]">{product.ingredients}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                কাস্টমার রিভিউ
              </p>
              <ReviewSection reviews={reviews} rating={rating} />
            </div>

            {relatedProducts.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                  সম্পর্কিত পণ্য
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {relatedProducts.slice(0, 4).map((relatedProduct) => {
                    const relatedDiscount =
                      relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price
                        ? Math.round(
                            ((relatedProduct.originalPrice - relatedProduct.price) /
                              relatedProduct.originalPrice) *
                              100
                          )
                        : null;

                    return (
                      <div
                        key={relatedProduct.id}
                        className="overflow-hidden rounded-2xl bg-[#F5E9DC] transition-shadow hover:shadow-md"
                      >
                        <Link
                          href={`/products/${relatedProduct.slug}`}
                          className="block"
                        >
                        <div className="relative aspect-square">
                          <img
                            src={relatedProduct.image}
                            alt={relatedProduct.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              (event.target as HTMLImageElement).src = `https://placehold.co/200x200/F5E9DC/8B5E3C?text=${encodeURIComponent(
                                relatedProduct.name.slice(0, 4)
                              )}`;
                            }}
                          />
                          {relatedDiscount && (
                            <span className="absolute top-2 right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              -{relatedDiscount}%
                            </span>
                          )}
                          {relatedProduct.stock > 0 && (
                            <div
                              className="absolute bottom-2.5 right-2.5 z-10"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            >
                              <CartStepper
                                productId={relatedProduct.id}
                                productName={relatedProduct.name}
                                productImage={relatedProduct.image}
                                price={relatedProduct.price}
                                maxStock={relatedProduct.stock}
                                hasRequiredVariants={relatedProduct.hasVariants}
                                circleAdd={true}
                                disabled={relatedProduct.stock === 0}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="line-clamp-2 text-xs font-medium leading-tight text-[#1A0D06]">
                            {relatedProduct.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#3D1F0E]">
                            ৳{relatedProduct.price.toLocaleString('bn-BD')}
                          </p>
                        </div>
                        </Link>
                        <div className="px-2.5 pb-2.5">
                          <CardBuyNowButton
                            productId={relatedProduct.id}
                            productName={relatedProduct.name}
                            productImage={relatedProduct.image}
                            price={relatedProduct.price}
                            disabled={relatedProduct.stock === 0}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {frequentlyBoughtTogether.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                      Frequently Bought Together
                    </p>
                    <p className="mt-1 text-[11px] text-[#8B5E3C]">
                      Real delivered order history থেকে popular pairings
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {frequentlyBoughtTogether.map((bundleProduct) => {
                    const bundleDiscount =
                      bundleProduct.originalPrice && bundleProduct.originalPrice > bundleProduct.price
                        ? Math.round(
                            ((bundleProduct.originalPrice - bundleProduct.price) /
                              bundleProduct.originalPrice) *
                              100
                          )
                        : null;

                    return (
                      <div
                        key={bundleProduct.id}
                        className="overflow-hidden rounded-2xl bg-[#F5E9DC] transition-shadow hover:shadow-md"
                      >
                        <Link href={`/products/${bundleProduct.slug}`} className="block">
                          <div className="relative aspect-square">
                            <img
                              src={bundleProduct.image}
                              alt={bundleProduct.name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                (event.target as HTMLImageElement).src = `https://placehold.co/200x200/F5E9DC/8B5E3C?text=${encodeURIComponent(
                                  bundleProduct.name.slice(0, 4)
                                )}`;
                              }}
                            />
                            {bundleDiscount && (
                              <span className="absolute top-2 right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                -{bundleDiscount}%
                              </span>
                            )}
                            {bundleProduct.stock > 0 && (
                              <div
                                className="absolute bottom-2.5 right-2.5 z-10"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                              >
                                <CartStepper
                                  productId={bundleProduct.id}
                                  productName={bundleProduct.name}
                                  productImage={bundleProduct.image}
                                  price={bundleProduct.price}
                                  maxStock={bundleProduct.stock}
                                  hasRequiredVariants={bundleProduct.hasVariants}
                                  circleAdd={true}
                                  disabled={bundleProduct.stock === 0}
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="line-clamp-2 text-xs font-medium leading-tight text-[#1A0D06]">
                              {bundleProduct.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#3D1F0E]">
                              ৳{bundleProduct.price.toLocaleString('bn-BD')}
                            </p>
                            <p className="mt-1 text-[10px] text-[#8B5E3C]">
                              {bundleProduct.orderCount} orders together • {bundleProduct.totalUnits} units
                            </p>
                          </div>
                        </Link>
                        <div className="px-2.5 pb-2.5">
                          <CardBuyNowButton
                            productId={bundleProduct.id}
                            productName={bundleProduct.name}
                            productImage={bundleProduct.image}
                            price={bundleProduct.price}
                            disabled={bundleProduct.stock === 0}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recentlyViewed.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#3D1F0E]">
                  Recently Viewed
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {recentlyViewed.slice(0, 4).map((recentProduct) => {
                    const recentDiscount =
                      recentProduct.originalPrice && recentProduct.originalPrice > recentProduct.price
                        ? Math.round(
                            ((recentProduct.originalPrice - recentProduct.price) /
                              recentProduct.originalPrice) *
                              100
                          )
                        : null;

                    return (
                      <div
                        key={recentProduct.id}
                        className="overflow-hidden rounded-2xl bg-[#F5E9DC] transition-shadow hover:shadow-md"
                      >
                        <Link href={`/products/${recentProduct.slug}`} className="block">
                          <div className="relative aspect-square">
                            <img
                              src={recentProduct.image}
                              alt={recentProduct.name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                (event.target as HTMLImageElement).src = `https://placehold.co/200x200/F5E9DC/8B5E3C?text=${encodeURIComponent(
                                  recentProduct.name.slice(0, 4)
                                )}`;
                              }}
                            />
                            {recentDiscount && (
                              <span className="absolute top-2 right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                -{recentDiscount}%
                              </span>
                            )}
                            {recentProduct.stock > 0 && (
                              <div
                                className="absolute bottom-2.5 right-2.5 z-10"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                              >
                                <CartStepper
                                  productId={recentProduct.id}
                                  productName={recentProduct.name}
                                  productImage={recentProduct.image}
                                  price={recentProduct.price}
                                  maxStock={recentProduct.stock}
                                  hasRequiredVariants={recentProduct.hasVariants}
                                  circleAdd={true}
                                  disabled={recentProduct.stock === 0}
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="line-clamp-2 text-xs font-medium leading-tight text-[#1A0D06]">
                              {recentProduct.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#3D1F0E]">
                              ৳{recentProduct.price.toLocaleString('bn-BD')}
                            </p>
                          </div>
                        </Link>
                        <div className="px-2.5 pb-2.5">
                          <CardBuyNowButton
                            productId={recentProduct.id}
                            productName={recentProduct.name}
                            productImage={recentProduct.image}
                            price={recentProduct.price}
                            disabled={recentProduct.stock === 0}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StickyBottomBar
        productId={product.id}
        productName={product.name}
        productImage={product.image}
        price={totalPrice}
        unitPrice={currentPrice}
        weightKg={product.weight ?? null}
        variantId={selectedVariantId}
        variantName={variantNameLabel}
        size={variantSize}
        color={variantColor}
        variantImage={variantImage}
        variants={stickyBarVariants}
        quantity={quantity}
        maxStock={activeStock}
        inStock={activeInStock}
        requiresVariantSelection={requiresVariantSelection}
        whatsappNumber={WHATSAPP_NUMBER}
      />
    </>
  );
}
