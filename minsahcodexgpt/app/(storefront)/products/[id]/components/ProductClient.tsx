"use client";

/* eslint-disable react-hooks/preserve-manual-memoization */

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Truck,
  Sparkles,
  ShoppingBag,
  Heart,
  Share2,
  Check,
} from "lucide-react";
import CartStepper from "@/components/cart/CartStepper";
import CardBuyNowButton from "@/components/cart/CardBuyNowButton";
import ProductGallery from "./ProductGallery";
import { GiftRequestButton, ShareButton } from "./GiftShareButtons";
import WishlistButton from "@/components/wishlist/WishlistButton";
import ProductStickyHeader from "./ProductStickyHeader";
import VariantSelector from "./VariantSelector";
import StickyBottomBar from "./StickyBottomBar";
import {
  trackAddToCartBundle,
  trackProductView,
} from "@/lib/tracking/ecommerce";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { productPath } from "@/lib/product-url";
import CatalogProductImage from "@/components/catalog/CatalogProductImage";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

const ReviewSection = dynamic(() => import("./ReviewSection"), {
  loading: () => (
    <div className="h-48 animate-pulse rounded-3xl bg-minsah-surface-subtle" aria-hidden="true" />
  ),
});

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

interface ActiveDeliveryOffer {
  type: "FREE" | "FIXED" | "DEFAULT" | string;
  amount: number | null;
  badgeText: string | null;
  startDate?: string | null;
  endDate?: string | null;
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
  sku: string;
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
  slug?: string | null;
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
    authenticityNote?: string;
    ingredientVerificationStatus?: string;
    activeDeliveryOffer?: ActiveDeliveryOffer | null;
    keyBenefits?: string[];
    usageInstructions?: string[];
    descriptionSections?: unknown;
    productSpecs?: unknown;
    productAttributes?: unknown;
    shadeOptions?: unknown;
    variantPriceTable?: unknown;
    variantComparisonTable?: unknown;
    internalLinks?: unknown;
    targetAudience?: string;
    primaryConcern?: string;
    gender?: string;
    flashSaleEligible?: boolean;
    offerStartDate?: string | null;
    offerEndDate?: string | null;
    shelfLife?: string;
    expiryDate?: string | null;
    shippingWeight?: string;
    originCountry?: string;
    isFragile?: boolean;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    dimensions?: {
      length?: number | null;
      width?: number | null;
      height?: number | null;
    } | null;
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

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801700000000";
const ENABLE_GIFT_REQUEST = false;

function DeliveryEstimate({
  activeOffer,
}: {
  activeOffer?: ActiveDeliveryOffer | null;
}) {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 5 || now.getDay() === 6;
  const dhakaLabel = hour < 15 && !isWeekend ? "আগামীকাল" : "পরশু";
  const outsideLabel =
    hour < 15 && !isWeekend ? "২-৩ দিনের মধ্যে" : "৩-৪ দিনের মধ্যে";
  const normalizedOfferType = activeOffer?.type?.toUpperCase();
  const isFreeDelivery = normalizedOfferType === "FREE";
  const isFixedDelivery =
    normalizedOfferType === "FIXED" && typeof activeOffer?.amount === "number";
  const fixedDeliveryAmount = isFixedDelivery
    ? (activeOffer?.amount ?? 0)
    : null;
  const offerBadgeText = activeOffer?.badgeText?.trim();

  return (
    <div className="rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle/70 p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-black tracking-wide text-minsah-action-primary">
          <Truck size={14} /> এক্সপ্রেস ডেলিভারি
        </p>
        {isFreeDelivery && (
          <span className="rounded-full bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-300/40 px-2.5 py-0.5 text-xs font-black">
            ফ্রি ডেলিভারি
          </span>
        )}
        {isFixedDelivery && (
          <span className="rounded-full bg-amber-500/15 text-amber-800 ring-1 ring-amber-300/40 px-2.5 py-0.5 text-xs font-black">
            বিশেষ অফার
          </span>
        )}
      </div>

      {isFreeDelivery ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
          <p className="text-xs font-black text-emerald-900">
            {offerBadgeText || "এই পণ্যে ফ্রি ডেলিভারি"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800">
            এই পণ্যটি কার্টে থাকলে সম্পূর্ণ অর্ডারে কোনো ডেলিভারি চার্জ লাগবে না।
          </p>
        </div>
      ) : isFixedDelivery ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
          <p className="text-xs font-black text-amber-900">
            {offerBadgeText ||
              `বিশেষ ডেলিভারি অফার: সর্বোচ্চ ৳${fixedDeliveryAmount?.toLocaleString("bn-BD")}`}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
            ঠিকানা অনুযায়ী চেকআউটে কুরিয়ার চার্জ হিসাব হবে।
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex items-start gap-2 rounded-xl bg-white/80 p-2 border border-minsah-border-subtle/60">
          <MapPin size={14} className="mt-0.5 shrink-0 text-minsah-action-primary" />
          <div>
            <p className="text-[11px] font-bold text-minsah-text-muted">ঢাকা সিটি</p>
            <p className="text-xs font-black text-emerald-800">{dhakaLabel} ডেলিভারি</p>
            <p className="text-[10px] text-minsah-text-muted">চার্জ: ৳৬০</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-white/80 p-2 border border-minsah-border-subtle/60">
          <MapPin size={14} className="mt-0.5 shrink-0 text-minsah-action-secondary" />
          <div>
            <p className="text-[11px] font-bold text-minsah-text-muted">সারাদেশে</p>
            <p className="text-xs font-black text-minsah-action-secondary">{outsideLabel}</p>
            <p className="text-[10px] text-minsah-text-muted">চার্জ: ৳১২০</p>
          </div>
        </div>
      </div>
      {hour < 15 && !isWeekend && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
          <Clock size={12} className="shrink-0 text-amber-700" />
          <span>আজ বিকেল ৩টার মধ্যে অর্ডার করলে আজই পার্সেল বের হবে।</span>
        </div>
      )}
    </div>
  );
}

function StockUrgency({
  stock,
  inStock,
  threshold = 10,
}: {
  stock: number;
  inStock: boolean;
  threshold?: number;
}) {
  if (!inStock) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 border border-red-200">
        <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
        <span className="text-xs font-black text-red-700">স্টক শেষ (Out of stock)</span>
      </div>
    );
  }

  if (stock <= threshold) {
    const pct = Math.max(
      10,
      Math.round((stock / Math.max(threshold, 1)) * 100),
    );
    return (
      <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-red-800">
            🔥 মাত্র {stock}টি বাকি আছে!
          </span>
          <span className="text-[11px] font-bold text-red-700">
            দ্রুত শেষ হচ্ছে
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-red-200">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 border border-emerald-200/60 w-fit">
      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
      <span className="text-xs font-black text-emerald-800">স্টকে পর্যাপ্ত আছে (In Stock)</span>
    </div>
  );
}

function TopTrustSnapshot({
  rating,
  verifiedReviewCount,
  codAvailable,
  returnEligible,
}: {
  rating: RatingData;
  verifiedReviewCount: number;
  codAvailable?: boolean;
  returnEligible?: boolean;
}) {
  const items = [
    {
      icon: ShieldCheck,
      label: "১০০% অরিজিনাল",
      value: "সরাসরি ব্রান্ড/অথোরাইজড সোর্স",
      tone: "bg-minsah-surface-subtle text-minsah-action-secondary border-minsah-border-subtle",
    },
    {
      icon: CheckCircle,
      label: "ভেরিফায়েড কোয়ালিটি",
      value: "ল্যাব ও কোয়ালিটি সার্টিফাইড",
      tone: "bg-minsah-surface-subtle text-minsah-text-primary border-minsah-border-subtle",
    },
    {
      icon: Smartphone,
      label: "ক্যাশ অন ডেলিভারি",
      value: "পণ্য দেখে নেওয়ার সুবিধা",
      tone: "bg-minsah-surface-subtle text-minsah-action-primary border-minsah-border-subtle",
    },
    {
      icon: RotateCcw,
      label: "৭ দিনের রিটার্ন",
      value: "সহজ রিটার্ন ও রিপ্লেসমেন্ট",
      tone: "bg-minsah-surface-subtle text-minsah-text-primary border-minsah-border-subtle",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className={`rounded-2xl border p-2.5 transition-all hover:shadow-sm ${tone}`}>
          <div className="mb-1 flex items-center gap-1.5">
            <Icon size={14} className="shrink-0" aria-hidden="true" />
            <p className="text-[11px] font-black uppercase tracking-wide">
              {label}
            </p>
          </div>
          <p className="text-[10px] font-medium leading-tight opacity-80">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TrustPromiseCard({
  authenticityNote,
  ingredientVerificationStatus,
  codAvailable,
  returnEligible,
}: {
  authenticityNote?: string;
  ingredientVerificationStatus?: string;
  codAvailable?: boolean;
  returnEligible?: boolean;
}) {
  const trustItems = [
    {
      icon: ShieldCheck,
      title: "অরিজিনাল অথেন্টিসিটি গ্যারান্টি",
      description:
        authenticityNote ||
        "আমরা শুধুমাত্র ১০০% অরিজিনাল ও অথোরাইজড বিউটি প্রোডাক্ট সরবরাহ করি। কোনো ক্লোন বা ডুপ্লিকেট পণ্য বিক্রি করা হয় না।",
    },
    {
      icon: Smartphone,
      title: "নিরাপদ পেমেন্ট ও ক্যাশ অন ডেলিভারি",
      description:
        codAvailable === false
          ? "অনলাইন গেটওয়ে বা bKash-এর মাধ্যমে নিরাপদ পেমেন্ট সম্পন্ন করুন।"
          : "ক্যাশ অন ডেলিভারিতে পার্সেল রিসিভ করার সময় পেমেন্ট করার সুযোগ রয়েছে।",
    },
    {
      icon: RotateCcw,
      title: "৭ দিনের রিপ্লেসমেন্ট ও সাপোর্ট",
      description:
        returnEligible === false
          ? "হাইজিন ও কসমেটিক্স নীতি অনুযায়ী সিল ভাঙা পণ্য রিটার্নযোগ্য নয়।"
          : "প্যাকেজিং ক্ষতিগ্রস্ত বা ভুল পণ্য এলে ৭ দিনের মধ্যে দ্রুত রিপ্লেসমেন্ট সুবিধা।",
    },
    {
      icon: CheckCircle,
      title: "ডার্মাটোলজিস্ট ও স্কিন সেফটি",
      description:
        ingredientVerificationStatus ||
        "আমাদের সকল স্কিনকেয়ার সামগ্রী ক্ষতিকর প্যারাবেন ও নিষিদ্ধ উপাদানমুক্ত।",
    },
  ];

  return (
    <section
      className="rounded-3xl border border-minsah-border-subtle bg-minsah-surface-panel p-4 shadow-sm"
      aria-labelledby="trust-promise-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-minsah-action-primary" />
        <div>
          <p
            id="trust-promise-heading"
            className="text-sm font-black text-minsah-text-primary"
          >
            মিনসাহ বিউটি ট্রাস্ট ও নিশ্চয়তা
          </p>
          <p className="text-xs text-minsah-text-muted">
            আপনার স্কিনের যত্ন ও সুরক্ষায় আমাদের প্রতিটি প্রোডাক্টের শতভাগ নিশ্চয়তা
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl border border-minsah-border-subtle/70 bg-minsah-surface-subtle/50 p-3">
            <div className="flex items-center gap-1.5">
              <Icon size={14} className="text-minsah-action-primary shrink-0" aria-hidden="true" />
              <p className="text-xs font-black text-minsah-text-primary">{title}</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-minsah-text-muted">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

type DisplayRow = { label: string; value: string };
type DisplaySection = { heading: string; content?: string; bullets?: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(stringifyValue).filter(Boolean).join(", ");
  return JSON.stringify(value);
}

function getAttributeValue(
  attributes: Record<string, string> | null | undefined,
  keys: string[],
) {
  if (!attributes) return null;

  for (const key of keys) {
    const exact = attributes[key];
    if (exact) return exact;
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

function getAdditionalVariantAttributes(
  attributes: Record<string, string> | null | undefined,
) {
  if (!attributes) return [];
  const handledKeys = new Set(["size", "color", "shade"]);

  return Object.entries(attributes)
    .filter(([key, value]) => value && !handledKeys.has(key.toLowerCase()))
    .map(([key, value]) => `${humanizeKey(key)}: ${value}`);
}

function getVariantDisplayLabel(variant: Variant) {
  const size = getAttributeValue(variant.attributes, ["size", "Size"]);
  const color = getAttributeValue(variant.attributes, [
    "color",
    "Color",
    "shade",
    "Shade",
  ]);
  const extras = getAdditionalVariantAttributes(variant.attributes);
  const attributeLabel = [size, color, ...extras].filter(Boolean).join(" / ");

  return attributeLabel || variant.name;
}

function toDisplayRows(value: unknown): DisplayRow[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (typeof item === "string")
        return [{ label: `Item ${index + 1}`, value: item }];
      if (!isRecord(item)) return [];
      const label = stringifyValue(
        item.label ??
          item.name ??
          item.title ??
          item.key ??
          item.variant ??
          item.option ??
          `Item ${index + 1}`,
      );
      const itemValue = stringifyValue(
        item.value ??
          item.text ??
          item.description ??
          item.price ??
          item.content ??
          item.stock,
      );
      if (itemValue) return [{ label, value: itemValue }];
      return Object.entries(item)
        .filter(([, entryValue]) => stringifyValue(entryValue))
        .map(([entryKey, entryValue]) => ({
          label: humanizeKey(entryKey),
          value: stringifyValue(entryValue),
        }));
    });
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([, entryValue]) => stringifyValue(entryValue))
      .map(([entryKey, entryValue]) => ({
        label: humanizeKey(entryKey),
        value: stringifyValue(entryValue),
      }));
  }
  return [];
}

function toDisplaySections(value: unknown): DisplaySection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string")
      return [{ heading: `Section ${index + 1}`, content: item }];
    if (!isRecord(item)) return [];
    const heading = stringifyValue(
      item.heading ?? item.title ?? item.name ?? `Section ${index + 1}`,
    );
    const content = stringifyValue(
      item.content ?? item.description ?? item.text,
    );
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.map(stringifyValue).filter(Boolean)
      : Array.isArray(item.items)
        ? item.items.map(stringifyValue).filter(Boolean)
        : [];
    return heading || content || bullets.length
      ? [{ heading, content, bullets }]
      : [];
  });
}

function formatDateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function InfoRowsBlock({ title, rows }: { title: string; rows: DisplayRow[] }) {
  const visibleRows = rows.filter((row) => row.value);
  if (visibleRows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-minsah-action-primary">
        {title}
      </p>
      <div className="overflow-hidden rounded-2xl border border-minsah-border-subtle bg-minsah-surface-panel">
        {visibleRows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="grid grid-cols-[42%_1fr] gap-3 border-b border-minsah-border-subtle/60 px-3.5 py-2.5 last:border-b-0"
          >
            <p className="text-xs font-medium text-minsah-text-muted">{row.label}</p>
            <p className="text-xs font-bold text-minsah-text-primary">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DescriptionSectionsBlock({
  sections,
}: {
  sections: DisplaySection[];
}) {
  if (sections.length === 0) return null;
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={`${section.heading}-${index}`}
          className="rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle/50 p-4"
        >
          <p className="text-sm font-black text-minsah-action-primary">
            {section.heading}
          </p>
          {section.content && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-minsah-text-primary">
              {section.content}
            </p>
          )}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-minsah-text-muted">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function getInternalLinks(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .filter(isRecord)
    .map((item) => ({
      label: stringifyValue(item.label ?? item.text ?? item.title ?? item.name),
      href: stringifyValue(item.href ?? item.url ?? item.link),
    }))
    .filter((item) => item.label && item.href);
}

function InternalLinksBlock({ value }: { value: unknown }) {
  const links = getInternalLinks(value);
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-minsah-action-primary">
        আরও দেখুন
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="rounded-full border border-minsah-border-default px-3 py-1.5 text-xs font-semibold text-minsah-text-primary transition hover:border-minsah-action-primary hover:bg-minsah-surface-subtle focus-visible:ring-2 focus-visible:ring-minsah-focus"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

type BundleStatus = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function ProductClient({
  product,
  reviews,
  rating,
  relatedProducts,
  frequentlyBoughtTogether,
  productUrl,
}: ProductClientProps) {
  const initialVariant =
    product.variants.length === 1 ? product.variants[0] : null;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariant?.id ?? null,
  );
  const baseDisplayPrice =
    product.salePrice && product.salePrice > 0
      ? product.salePrice
      : product.price;
  const [currentPrice, setCurrentPrice] = useState(
    initialVariant?.price ?? baseDisplayPrice,
  );
  const [quantity, setQuantity] = useState(1);
  const [variantImageOverride, setVariantImageOverride] = useState<
    string | null
  >(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>(
    [],
  );
  const [selectedBundleProductIds, setSelectedBundleProductIds] = useState<
    string[]
  >([]);
  const [bundleStatus, setBundleStatus] = useState<BundleStatus>(null);
  const [activeStoryTab, setActiveStoryTab] = useState<
    "overview" | "usage" | "ingredients" | "specs" | "shipping"
  >("overview");

  const viewedProductKeysRef = useRef<Set<string>>(new Set());
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const selectedVariantObj =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    null;
  const requiresVariantSelection =
    product.variants.length > 0 && !selectedVariantId;
  const activeStock = selectedVariantObj
    ? selectedVariantObj.stock
    : product.stock;
  const activeInStock = selectedVariantObj
    ? selectedVariantObj.stock > 0
    : product.inStock;
  const lowStockThreshold = product.lowStockThreshold ?? 10;
  const hasPurchasableStock = product.allowBackorder
    ? true
    : selectedVariantObj
      ? selectedVariantObj.stock > 0
      : product.stock > 0;

  const comparePrice =
    product.originalPrice && product.originalPrice > currentPrice
      ? product.originalPrice
      : null;
  const discountPct = comparePrice
    ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
    : product.discountPercentage && product.discountPercentage > 0
      ? product.discountPercentage
      : null;

  const variantPrices = useMemo(
    () => product.variants.map((v) => v.price).filter((p) => p > 0),
    [product.variants],
  );
  const variantPriceMin =
    variantPrices.length > 0 ? Math.min(...variantPrices) : null;
  const variantPriceMax =
    variantPrices.length > 0 ? Math.max(...variantPrices) : null;
  const hasMultiplePrices =
    variantPriceMin !== null &&
    variantPriceMax !== null &&
    variantPriceMin !== variantPriceMax;

  const priceDisplayText =
    requiresVariantSelection && hasMultiplePrices
      ? `৳${variantPriceMin.toLocaleString("bn-BD")} - ৳${variantPriceMax.toLocaleString("bn-BD")}`
      : `৳${currentPrice.toLocaleString("bn-BD")}`;

  const variantNameLabel = selectedVariantObj
    ? getVariantDisplayLabel(selectedVariantObj)
    : null;
  const variantSize = selectedVariantObj
    ? getAttributeValue(selectedVariantObj.attributes, ["size", "Size"])
    : null;
  const variantColor = selectedVariantObj
    ? getAttributeValue(selectedVariantObj.attributes, [
        "color",
        "Color",
        "shade",
        "Shade",
      ])
    : null;
  const variantImage = selectedVariantObj?.image ?? null;
  const variantExtraAttributes = selectedVariantObj
    ? getAdditionalVariantAttributes(selectedVariantObj.attributes)
    : [];

  const bundleProducts = useMemo(
    () => frequentlyBoughtTogether.slice(0, 4),
    [frequentlyBoughtTogether],
  );
  const selectableBundleProducts = useMemo(
    () =>
      bundleProducts.filter(
        (bundleProduct) =>
          bundleProduct.stock > 0 && !bundleProduct.hasVariants,
      ),
    [bundleProducts],
  );
  const selectedBundleProducts = useMemo(
    () =>
      selectableBundleProducts.filter((bundleProduct) =>
        selectedBundleProductIds.includes(bundleProduct.id),
      ),
    [selectableBundleProducts, selectedBundleProductIds],
  );
  const bundleAddOnsTotal = selectedBundleProducts.reduce(
    (sum, bundleProduct) => sum + bundleProduct.price,
    0,
  );
  const bundleCurrentProductTotal = currentPrice * quantity;
  const bundleTotal = bundleCurrentProductTotal + bundleAddOnsTotal;
  const bundleCompareTotal =
    (comparePrice && comparePrice > currentPrice
      ? comparePrice
      : currentPrice) *
      quantity +
    selectedBundleProducts.reduce(
      (sum, bundleProduct) =>
        sum +
        (bundleProduct.originalPrice &&
        bundleProduct.originalPrice > bundleProduct.price
          ? bundleProduct.originalPrice
          : bundleProduct.price),
      0,
    );
  const bundleSavings = Math.max(0, bundleCompareTotal - bundleTotal);
  const galleryImages = (
    product.images as Array<string | { url: string; alt?: string }>
  ).map((img) =>
    typeof img === "string" ? { url: img, alt: product.name } : img,
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
        sku: variant.sku ?? null,
      })),
    [product.variants, product.weight],
  );

  const handleVariantChange = useCallback(
    (variantId: string | null, price: number, qty: number) => {
      setSelectedVariantId(variantId);
      setCurrentPrice(price);
      setQuantity(qty);
    },
    [],
  );

  const handleVariantImageChange = useCallback((imageUrl: string | null) => {
    setVariantImageOverride(imageUrl);
  }, []);

  useEffect(() => {
    setSelectedBundleProductIds((previousIds) => {
      const selectableIds = new Set(
        selectableBundleProducts.map((bundleProduct) => bundleProduct.id),
      );
      const keptIds = previousIds.filter((id) => selectableIds.has(id));
      if (keptIds.length > 0 || selectableBundleProducts.length === 0)
        return keptIds;
      return selectableBundleProducts
        .slice(0, 2)
        .map((bundleProduct) => bundleProduct.id);
    });
  }, [selectableBundleProducts]);

  const toggleBundleProduct = useCallback((productId: string) => {
    setBundleStatus(null);
    setSelectedBundleProductIds((previousIds) =>
      previousIds.includes(productId)
        ? previousIds.filter((id) => id !== productId)
        : [...previousIds, productId],
    );
  }, []);

  const handleAddBundleToCart = useCallback(async () => {
    if (requiresVariantSelection) {
      setBundleStatus({
        type: "error",
        message:
          "বান্ডেল কার্টে যোগ করার আগে এই পণ্যের সাইজ/শেড/ভ্যারিয়েন্ট নির্বাচন করুন।",
      });
      document
        .getElementById("product-variant-selector")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!activeInStock) {
      setBundleStatus({
        type: "error",
        message: "মূল পণ্যের স্টক না থাকায় বান্ডেল যোগ করা যাবে না।",
      });
      return;
    }

    if (selectedBundleProducts.length === 0) {
      setBundleStatus({
        type: "info",
        message: "বান্ডেল তৈরি করতে অন্তত ১টি add-on নির্বাচন করুন।",
      });
      return;
    }

    const mainCartKey = selectedVariantObj?.id ?? product.id;
    const bundleCartItems: CartItem[] = [
      {
        id: mainCartKey,
        productId: product.id,
        variantId: selectedVariantObj?.id ?? null,
        variantName: variantNameLabel ?? null,
        sku: selectedVariantObj?.sku ?? product.sku ?? undefined,
        productSku: product.sku ?? undefined,
        variantSku: selectedVariantObj?.sku ?? null,
        size: variantSize ?? null,
        color: variantColor ?? null,
        variantImage: variantImage ?? null,
        name: product.name,
        price: currentPrice,
        quantity,
        image: variantImageOverride || variantImage || product.image,
        weight: selectedVariantObj?.weight ?? product.weight ?? null,
        stock: activeStock,
        maxQuantity: product.allowBackorder ? null : activeStock,
      },
      ...selectedBundleProducts.map((bundleProduct) => ({
        id: bundleProduct.id,
        productId: bundleProduct.id,
        variantId: null,
        variantName: null,
        sku: bundleProduct.sku,
        productSku: bundleProduct.sku,
        variantSku: null,
        name: bundleProduct.name,
        price: bundleProduct.price,
        quantity: 1,
        image: bundleProduct.image,
        stock: bundleProduct.stock,
        maxQuantity: bundleProduct.stock,
      })),
    ];

    try {
      const intentId = registerAddIntent();
      bundleCartItems.forEach((cartItem) => {
        addItem(cartItem, { track: false });
      });

      trackAddToCartBundle(bundleCartItems, `${product.name} বান্ডেল`);

      openForSuccessfulAdd(
        intentId,
        bundleCartItems[0],
        bundleCartItems[0].quantity,
      );

      setBundleStatus({
        type: "success",
        message: `${selectedBundleProducts.length + 1}টি আইটেম কার্টে যোগ হয়েছে।`,
      });
    } catch {
      setBundleStatus({
        type: "error",
        message: "বান্ডেল কার্টে যোগ করা যায়নি। আবার চেষ্টা করুন।",
      });
    }
  }, [
    activeInStock,
    addItem,
    openForSuccessfulAdd,
    registerAddIntent,
    currentPrice,
    product.id,
    product.image,
    product.name,
    product.sku,
    quantity,
    requiresVariantSelection,
    selectedBundleProducts,
    selectedVariantObj,
    variantColor,
    variantImage,
    variantImageOverride,
    variantNameLabel,
    variantSize,
    bundleTotal,
    activeStock,
  ]);

  useEffect(() => {
    const viewKey = selectedVariantObj?.id ? `${product.id}:${selectedVariantObj.id}` : `${product.id}:group`;
    if (viewedProductKeysRef.current.has(viewKey)) return;
    viewedProductKeysRef.current.add(viewKey);

    trackProductView({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      category: product.category,
      brand: product.brand,
      variants: product.variants,
      selectedVariantId: selectedVariantObj?.id ?? null,
    });
  }, [
    product.id,
    product.sku,
    product.name,
    product.price,
    product.salePrice,
    product.category,
    product.brand,
    product.variants,
    selectedVariantObj,
  ]);

  const displayTitle = product.pageH1 || product.name;
  const productInfoRows: DisplayRow[] = [
    { label: "ব্র্যান্ড", value: product.brand || "" },
    { label: "ক্যাটাগরি", value: product.category || "" },
    { label: "উৎপত্তি দেশ", value: product.originCountry || "" },
    { label: "শেলফ লাইফ", value: product.shelfLife || "" },
    { label: "মেয়াদ শেষ", value: formatDateLabel(product.expiryDate) },
    { label: "শিপিং ওজন", value: product.shippingWeight || "" },
    {
      label: "Dimensions",
      value: [
        product.dimensions?.length ?? product.length,
        product.dimensions?.width ?? product.width,
        product.dimensions?.height ?? product.height,
      ]
        .filter(Boolean)
        .join(" × "),
    },
    { label: "বারকোড", value: product.barcode || "" },
    { label: "GTIN", value: product.gtin || "" },
    { label: "কন্ডিশন", value: product.condition || "" },
    { label: "ভঙ্গুর পণ্য", value: product.isFragile ? "হ্যাঁ" : "" },
    { label: "প্রি-অর্ডার", value: product.preOrderOption ? "উপলভ্য" : "" },
    { label: "ব্যাকঅর্ডার", value: product.allowBackorder ? "উপলভ্য" : "" },
  ];
  const bestMatchRows: DisplayRow[] = [
    { label: "টার্গেট অডিয়েন্স", value: product.targetAudience || "" },
    { label: "প্রধান concern", value: product.primaryConcern || "" },
    { label: "লিঙ্গ", value: product.gender || "" },
  ];
  const offerRows: DisplayRow[] = [
    {
      label: "ফ্ল্যাশ সেল",
      value: product.flashSaleEligible ? "Eligible" : "",
    },
    { label: "অফার শুরু", value: formatDateLabel(product.offerStartDate) },
    { label: "অফার শেষ", value: formatDateLabel(product.offerEndDate) },
  ];
  const descriptionSections = toDisplaySections(product.descriptionSections);
  const specRows = toDisplayRows(product.productSpecs);
  const attributeRows = toDisplayRows(product.productAttributes);
  const shadeRows = toDisplayRows(product.shadeOptions);
  const variantPriceRows = toDisplayRows(product.variantPriceTable);
  const variantComparisonRows = toDisplayRows(product.variantComparisonTable);
  const verifiedReviewCount = reviews.filter(
    (review) => review.verified,
  ).length;

  useEffect(() => {
    const storageKey = "minsah_recently_viewed_products";

    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved
        ? (JSON.parse(saved) as RecentlyViewedProduct[])
        : [];
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
        JSON.stringify([currentProduct, ...filtered].slice(0, 12)),
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
    baseDisplayPrice,
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

      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        {/* Top Hero: 2-Column Grid */}
        <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12">
          {/* Left Column: Product Gallery */}
          <div className="lg:sticky lg:top-20">
            <ProductGallery
              images={galleryImages}
              productName={displayTitle}
              discountPct={discountPct}
              isNew={product.isNew}
              overrideImage={variantImageOverride ?? variantImage}
            />
          </div>

          {/* Right Column: Core Commerce & Details */}
          <div className="space-y-6 pt-4 pb-36 lg:pt-0 lg:pb-8">
            {/* Category & Brand Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="rounded-full bg-minsah-surface-subtle px-3 py-1 text-xs font-bold text-minsah-action-primary border border-minsah-border-subtle">
                  {product.brand}
                </span>
              )}
              {product.category && (
                <span className="rounded-full bg-minsah-surface-subtle px-3 py-1 text-xs font-semibold text-minsah-text-muted border border-minsah-border-subtle">
                  {product.category}
                </span>
              )}
              {product.isNew && (
                <span className="rounded-full bg-minsah-action-secondary px-3 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1">
                  <Sparkles size={12} /> New Arrival
                </span>
              )}
            </div>

            {/* Title & Bengali Subhead */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-minsah-text-primary sm:text-3xl leading-snug">
                {displayTitle}
              </h1>
              {product.bengaliName && product.bengaliName !== displayTitle && (
                <p className="mt-1 text-base font-semibold text-minsah-text-muted">
                  {product.bengaliName}
                </p>
              )}

              {/* Rating & Review Jump Link */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 border border-amber-200/60">
                  <div className="flex gap-0.5 text-amber-500" aria-label={`${rating.average.toFixed(1)} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={13}
                        className={
                          star <= Math.round(rating.average)
                            ? "fill-amber-500 text-amber-500"
                            : "text-neutral-300"
                        }
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-amber-900">
                    {rating.average > 0 ? rating.average.toFixed(1) : "নতুন"}
                  </span>
                </div>

                <a
                  href="#product-reviews"
                  className="text-xs font-bold text-minsah-action-primary underline-offset-4 hover:underline"
                >
                  {rating.total > 0 ? `(${rating.total} কাস্টমার রিভিউ)` : "প্রথম রিভিউ দিন"}
                </a>
              </div>
            </div>

            {/* Price Box with Savings Banner */}
            <div className="rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle/50 p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-black text-minsah-action-primary tracking-tight">
                  {priceDisplayText}
                </span>

                {comparePrice && comparePrice > currentPrice && (
                  <span className="text-lg text-minsah-text-muted line-through font-medium">
                    ৳{comparePrice.toLocaleString("bn-BD")}
                  </span>
                )}

                {discountPct && (
                  <span className="rounded-full bg-minsah-action-primary px-3 py-1 text-xs font-black text-white shadow-sm">
                    {discountPct}% সাশ্রয়
                  </span>
                )}
              </div>

              {requiresVariantSelection && variantPriceMin && (
                <p className="mt-1.5 text-xs font-bold text-amber-800">
                  ⚠️ সাইজ বা শেড অপশন নির্বাচন করলে সুনির্দিষ্ট মূল্য দেখতে পাবেন।
                </p>
              )}
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-sm leading-relaxed text-minsah-text-primary/90">
                {product.shortDescription}
              </p>
            )}

            {/* Key Benefits Pills */}
            {product.keyBenefits && product.keyBenefits.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-minsah-text-muted">
                  🌿 প্রধান উপকারিতা
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.keyBenefits.slice(0, 5).map((benefit) => (
                    <span
                      key={benefit}
                      className="rounded-full bg-minsah-surface-subtle px-3 py-1 text-xs font-semibold text-minsah-text-primary border border-minsah-border-subtle/80 flex items-center gap-1"
                    >
                      <Check size={12} className="text-minsah-action-secondary" /> {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-minsah-border-subtle" />

            {/* Variant Selector */}
            <div id="product-variant-selector" className="scroll-mt-24">
              <VariantSelector
                variants={product.variants}
                basePrice={baseDisplayPrice}
                baseStock={product.stock}
                onVariantChange={handleVariantChange}
                onImageChange={handleVariantImageChange}
              />
            </div>

            {/* Stock Urgency Indicator */}
            {requiresVariantSelection ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                <p className="text-xs font-black text-amber-900">
                  ভ্যারিয়েন্ট সিলেক্ট করুন
                </p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  কার্টে যোগ করা বা ১-ক্লিকে অর্ডারের আগে সঠিক অপশন নির্বাচন করুন।
                </p>
              </div>
            ) : (
              <StockUrgency
                stock={activeStock}
                inStock={activeInStock}
                threshold={lowStockThreshold}
              />
            )}

            {/* Desktop / Tablet Primary Action Buttons */}
            <div className="hidden lg:flex flex-col gap-3 rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle/40 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-minsah-text-muted">
                  অর্ডার সামারি ({quantity} পিস)
                </span>
                <span className="text-lg font-black text-minsah-action-primary">
                  ৳{(currentPrice * quantity).toLocaleString("bn-BD")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CartStepper
                  productId={product.id}
                  productName={product.name}
                  productImage={variantImageOverride || variantImage || product.image}
                  price={currentPrice}
                  initialQuantity={quantity}
                  maxStock={activeStock}
                  variantId={selectedVariantId}
                  variantName={variantNameLabel}
                  sku={selectedVariantObj?.sku ?? product.sku}
                  size={variantSize}
                  color={variantColor}
                  variantImage={variantImage}
                  hasRequiredVariants={requiresVariantSelection}
                  variants={stickyBarVariants as any}
                  className="w-full justify-center rounded-2xl border border-minsah-border-default bg-white text-minsah-action-primary hover:bg-minsah-surface-subtle font-bold shadow-sm h-12"
                  disabled={!activeInStock}
                />

                <CardBuyNowButton
                  productId={product.id}
                  productName={product.name}
                  productImage={variantImageOverride || variantImage || product.image}
                  price={currentPrice}
                  maxStock={activeStock}
                  variants={stickyBarVariants as any}
                  disabled={!activeInStock}
                  className="w-full h-12 rounded-2xl bg-minsah-action-primary hover:bg-minsah-action-primary-hover text-white font-bold shadow-md hover:shadow-lg transition-all"
                />
              </div>
            </div>

            {/* Express Delivery Snapshot */}
            {hasPurchasableStock && (
              <DeliveryEstimate activeOffer={product.activeDeliveryOffer} />
            )}

            {/* Wishlist & Share Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <WishlistButton
                productId={product.id}
                productName={product.name}
                presentation="labeled"
                className="flex-1 sm:flex-none"
              />
              <ShareButton productName={product.name} productUrl={productUrl} />
            </div>

            {/* Top Trust Snapshot */}
            <TopTrustSnapshot
              rating={rating}
              verifiedReviewCount={verifiedReviewCount}
              codAvailable={product.codAvailable}
              returnEligible={product.returnEligible}
            />

            {/* Trust Promise Assurance */}
            <TrustPromiseCard
              authenticityNote={product.authenticityNote}
              ingredientVerificationStatus={
                product.ingredientVerificationStatus
              }
              codAvailable={product.codAvailable}
              returnEligible={product.returnEligible}
            />
          </div>
        </div>

        {/* Middle Section: Storytelling Tabs */}
        <section className="mt-12 space-y-6">
          {/* Desktop Tab Switcher */}
          <div className="hidden lg:flex border-b border-minsah-border-subtle gap-2">
            <button
              type="button"
              onClick={() => setActiveStoryTab("overview")}
              className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeStoryTab === "overview"
                  ? "border-minsah-action-primary text-minsah-action-primary bg-minsah-surface-subtle/50 rounded-t-xl"
                  : "border-transparent text-minsah-text-muted hover:text-minsah-text-primary"
              }`}
            >
              🌿 বিবরণ ও সুবিধা
            </button>

            {(product.usageInstructions?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => setActiveStoryTab("usage")}
                className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeStoryTab === "usage"
                    ? "border-minsah-action-primary text-minsah-action-primary bg-minsah-surface-subtle/50 rounded-t-xl"
                    : "border-transparent text-minsah-text-muted hover:text-minsah-text-primary"
                }`}
              >
                💧 ব্যবহার বিধি (How to Use)
              </button>
            )}

            {product.ingredients && (
              <button
                type="button"
                onClick={() => setActiveStoryTab("ingredients")}
                className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeStoryTab === "ingredients"
                    ? "border-minsah-action-primary text-minsah-action-primary bg-minsah-surface-subtle/50 rounded-t-xl"
                    : "border-transparent text-minsah-text-muted hover:text-minsah-text-primary"
                }`}
              >
                🧪 উপাদান (Ingredients)
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveStoryTab("specs")}
              className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeStoryTab === "specs"
                  ? "border-minsah-action-primary text-minsah-action-primary bg-minsah-surface-subtle/50 rounded-t-xl"
                  : "border-transparent text-minsah-text-muted hover:text-minsah-text-primary"
              }`}
            >
              📋 স্পেসিফিকেশন
            </button>

            <button
              type="button"
              onClick={() => setActiveStoryTab("shipping")}
              className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeStoryTab === "shipping"
                  ? "border-minsah-action-primary text-minsah-action-primary bg-minsah-surface-subtle/50 rounded-t-xl"
                  : "border-transparent text-minsah-text-muted hover:text-minsah-text-primary"
              }`}
            >
              🚚 ডেলিভারি ও রিটার্ন
            </button>
          </div>

          {/* Desktop Tab Contents */}
          <div className="hidden lg:block rounded-3xl border border-minsah-border-subtle bg-minsah-surface-panel p-6 shadow-sm min-h-[220px]">
            {activeStoryTab === "overview" && (
              <div className="space-y-4">
                {product.seoIntro && (
                  <p className="text-base font-semibold leading-relaxed text-minsah-action-primary">
                    {product.seoIntro}
                  </p>
                )}
                {product.description && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-minsah-text-primary/90">
                    {product.description}
                  </p>
                )}
                {product.bengaliDescription && product.bengaliDescription !== product.description && (
                  <div className="mt-4 rounded-2xl bg-minsah-surface-subtle/60 p-4 border border-minsah-border-subtle">
                    <p className="text-xs font-black uppercase tracking-wider text-minsah-action-primary mb-1">
                      বাংলায় বিস্তারিত
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-minsah-text-primary">
                      {product.bengaliDescription}
                    </p>
                  </div>
                )}
                <DescriptionSectionsBlock sections={descriptionSections} />
              </div>
            )}

            {activeStoryTab === "usage" && (
              <div className="space-y-3">
                <p className="text-sm font-black text-minsah-action-primary">
                  সঠিক ব্যবহারের ধাপসমূহ
                </p>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-minsah-text-primary/90">
                  {product.usageInstructions?.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {activeStoryTab === "ingredients" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-minsah-action-secondary">
                  <Package size={16} />
                  <p className="text-sm font-black">সম্পূর্ণ উপাদান তালিকা</p>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-minsah-text-muted bg-minsah-surface-subtle/50 p-4 rounded-2xl border border-minsah-border-subtle">
                  {product.ingredients}
                </p>
              </div>
            )}

            {activeStoryTab === "specs" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRowsBlock title="উপযুক্ততা (Best Match)" rows={bestMatchRows} />
                <InfoRowsBlock title="পণ্যের বিস্তারিত" rows={productInfoRows} />
                <InfoRowsBlock title="স্পেসিফিকেশন" rows={specRows} />
                <InfoRowsBlock title="অ্যাট্রিবিউট" rows={attributeRows} />
              </div>
            )}

            {activeStoryTab === "shipping" && (
              <div className="space-y-4">
                <DeliveryEstimate activeOffer={product.activeDeliveryOffer} />
                <TrustPromiseCard
                  authenticityNote={product.authenticityNote}
                  ingredientVerificationStatus={product.ingredientVerificationStatus}
                  codAvailable={product.codAvailable}
                  returnEligible={product.returnEligible}
                />
              </div>
            )}
          </div>

          {/* Mobile Accordions */}
          <div className="space-y-3 lg:hidden">
            <details className="group rounded-2xl border border-minsah-border-subtle bg-minsah-surface-panel p-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-sm text-minsah-text-primary">
                <span>🌿 বিবরণ ও সুবিধা</span>
                <ChevronDown size={16} className="transition-transform group-open:rotate-180 text-minsah-text-muted" />
              </summary>
              <div className="mt-3 pt-3 border-t border-minsah-border-subtle/60 text-sm leading-relaxed text-minsah-text-primary/90 space-y-3">
                {product.seoIntro && <p className="font-semibold text-minsah-action-primary">{product.seoIntro}</p>}
                {product.description && <p className="whitespace-pre-line">{product.description}</p>}
                {product.bengaliDescription && (
                  <p className="whitespace-pre-line text-xs bg-minsah-surface-subtle p-3 rounded-xl">
                    {product.bengaliDescription}
                  </p>
                )}
                <DescriptionSectionsBlock sections={descriptionSections} />
              </div>
            </details>

            {(product.usageInstructions?.length || 0) > 0 && (
              <details className="group rounded-2xl border border-minsah-border-subtle bg-minsah-surface-panel p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-sm text-minsah-text-primary">
                  <span>💧 ব্যবহার বিধি (How to Use)</span>
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180 text-minsah-text-muted" />
                </summary>
                <div className="mt-3 pt-3 border-t border-minsah-border-subtle/60 text-sm">
                  <ol className="list-decimal space-y-1.5 pl-4 text-minsah-text-muted">
                    {product.usageInstructions?.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </details>
            )}

            {product.ingredients && (
              <details className="group rounded-2xl border border-minsah-border-subtle bg-minsah-surface-panel p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-sm text-minsah-text-primary">
                  <span>🧪 উপাদান (Ingredients)</span>
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180 text-minsah-text-muted" />
                </summary>
                <div className="mt-3 pt-3 border-t border-minsah-border-subtle/60 text-xs text-minsah-text-muted leading-relaxed">
                  {product.ingredients}
                </div>
              </details>
            )}

            <details className="group rounded-2xl border border-minsah-border-subtle bg-minsah-surface-panel p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-sm text-minsah-text-primary">
                <span>📋 স্পেসিফিকেশন ও পণ্যের তথ্য</span>
                <ChevronDown size={16} className="transition-transform group-open:rotate-180 text-minsah-text-muted" />
              </summary>
              <div className="mt-3 pt-3 border-t border-minsah-border-subtle/60 space-y-3">
                <InfoRowsBlock title="উপযুক্ততা" rows={bestMatchRows} />
                <InfoRowsBlock title="পণ্যের বিস্তারিত" rows={productInfoRows} />
                <InfoRowsBlock title="স্পেসিফিকেশন" rows={specRows} />
              </div>
            </details>
          </div>
        </section>

        {/* Frequently Bought Together: Bundle Section */}
        {bundleProducts.length > 0 && (
          <section
            className="mt-12 rounded-3xl border border-minsah-border-subtle bg-minsah-surface-panel p-5 sm:p-7 shadow-sm"
            aria-labelledby="frequently-bought-together-heading"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  id="frequently-bought-together-heading"
                  className="text-xs font-black uppercase tracking-wider text-minsah-action-primary"
                >
                  স্মার্ট বান্ডেল ও কম্বো অফার
                </p>
                <h3 className="mt-1 text-lg font-black text-minsah-text-primary sm:text-xl">
                  একসাথে বেশি কেনা হয় (Frequently Bought Together)
                </h3>
              </div>
              <span className="rounded-full bg-minsah-action-secondary px-3 py-1 text-xs font-black text-white shadow-sm">
                বান্ডেল সেভিংস
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
              {/* Left: Bundle Items List */}
              <div className="space-y-3">
                {/* Main Product Card */}
                <div className="flex items-center gap-3 rounded-2xl border border-minsah-border-default bg-minsah-surface-subtle/60 p-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white border border-minsah-border-subtle">
                    <CatalogProductImage
                      src={variantImageOverride || variantImage || product.image}
                      alt={product.name}
                      sizes="56px"
                      padding="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      <CheckCircle size={10} /> এই পণ্য
                    </span>
                    <p className="truncate text-xs font-bold text-minsah-text-primary mt-0.5">
                      {product.name}
                    </p>
                    <p className="text-xs font-black text-minsah-action-primary">
                      ৳{bundleCurrentProductTotal.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>

                {/* Bundle Addons */}
                {bundleProducts.map((bundleProduct) => {
                  const isSelectable =
                    bundleProduct.stock > 0 && !bundleProduct.hasVariants;
                  const isSelected = selectedBundleProductIds.includes(
                    bundleProduct.id,
                  );

                  return (
                    <div
                      key={bundleProduct.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                        isSelected && isSelectable
                          ? "border-minsah-action-primary bg-minsah-surface-subtle shadow-sm"
                          : "border-minsah-border-subtle bg-white/60 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <Checkbox
                        label={<span className="sr-only">{bundleProduct.name} নির্বাচন করুন</span>}
                        checked={isSelected && isSelectable}
                        disabled={!isSelectable}
                        onChange={() => toggleBundleProduct(bundleProduct.id)}
                      />

                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white border border-minsah-border-subtle">
                        <CatalogProductImage
                          src={bundleProduct.image}
                          alt={bundleProduct.name}
                          sizes="56px"
                          padding="none"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={productPath(bundleProduct)}
                          className="truncate block text-xs font-bold text-minsah-text-primary hover:text-minsah-action-primary transition"
                        >
                          {bundleProduct.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-black text-minsah-action-primary">
                            ৳{bundleProduct.price.toLocaleString("bn-BD")}
                          </span>
                          {bundleProduct.originalPrice &&
                            bundleProduct.originalPrice > bundleProduct.price && (
                              <span className="text-[11px] text-minsah-text-muted line-through">
                                ৳{bundleProduct.originalPrice.toLocaleString("bn-BD")}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Bundle CTA Card */}
              <div className="rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle p-5 text-center space-y-3">
                <p className="text-xs font-bold text-minsah-text-muted">
                  সর্বমোট মূল্য ({selectedBundleProducts.length + 1}টি আইটেম)
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-black text-minsah-action-primary">
                    ৳{bundleTotal.toLocaleString("bn-BD")}
                  </span>
                  {bundleSavings > 0 && (
                    <span className="text-xs text-minsah-text-muted line-through">
                      ৳{bundleCompareTotal.toLocaleString("bn-BD")}
                    </span>
                  )}
                </div>

                {bundleSavings > 0 && (
                  <span className="inline-block rounded-full bg-minsah-action-primary px-3 py-0.5 text-xs font-black text-white">
                    মোট সাশ্রয় ৳{bundleSavings.toLocaleString("bn-BD")}
                  </span>
                )}

                <Button
                  type="button"
                  fullWidth
                  onClick={handleAddBundleToCart}
                  disabled={!activeInStock}
                  className="rounded-2xl h-11 bg-minsah-action-primary hover:bg-minsah-action-primary-hover text-white font-black shadow-md"
                >
                  <ShoppingBag size={16} className="mr-1.5" />
                  বান্ডেল কার্টে যোগ করুন
                </Button>

                {bundleStatus && (
                  <p
                    className={`text-xs font-bold ${
                      bundleStatus.type === "success"
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {bundleStatus.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Customer Reviews Section */}
        <section id="product-reviews" className="mt-12 scroll-mt-24 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-minsah-action-primary">
                কাস্টমার রিভিউ
              </p>
              <h3 className="text-lg font-black text-minsah-text-primary sm:text-xl">
                ক্রেতাদের অভিজ্ঞতা ও রেটিং
              </h3>
            </div>
          </div>
          <ReviewSection reviews={reviews} rating={rating} />
        </section>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 rounded-3xl border border-minsah-border-subtle bg-minsah-surface-panel p-5 sm:p-7 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-minsah-action-primary">
                  আপনার পছন্দ হতে পারে
                </p>
                <h3 className="text-lg font-black text-minsah-text-primary sm:text-xl">
                  সম্পর্কিত পণ্যসমূহ (Related Products)
                </h3>
              </div>
              <Link
                href="/shop"
                className="text-xs font-bold text-minsah-action-primary hover:underline"
              >
                সব দেখুন →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct) => {
                const relatedDiscount =
                  relatedProduct.originalPrice &&
                  relatedProduct.originalPrice > relatedProduct.price
                    ? Math.round(
                        ((relatedProduct.originalPrice -
                          relatedProduct.price) /
                          relatedProduct.originalPrice) *
                          100,
                      )
                    : null;

                return (
                  <Link
                    key={relatedProduct.id}
                    href={productPath(relatedProduct)}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle/50 transition-all hover:shadow-md hover:border-minsah-action-primary/50"
                  >
                    <div className="relative aspect-square bg-white p-2">
                      <CatalogProductImage
                        src={relatedProduct.image}
                        alt={relatedProduct.name}
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      {relatedDiscount && (
                        <span className="absolute right-2 top-2 rounded-full bg-minsah-action-primary px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                          -{relatedDiscount}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-xs font-bold text-minsah-text-primary group-hover:text-minsah-action-primary transition">
                        {relatedProduct.name}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-sm font-black text-minsah-action-primary">
                          ৳{relatedProduct.price.toLocaleString("bn-BD")}
                        </span>
                        {relatedProduct.originalPrice &&
                          relatedProduct.originalPrice > relatedProduct.price && (
                            <span className="text-xs text-minsah-text-muted line-through">
                              ৳{relatedProduct.originalPrice.toLocaleString("bn-BD")}
                            </span>
                          )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recently Viewed Products */}
        {recentlyViewed.length > 0 && (
          <section className="mt-12 rounded-3xl border border-minsah-border-subtle bg-minsah-surface-panel p-5 sm:p-7 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-minsah-action-primary">
                সম্প্রতি দেখা হয়েছে
              </p>
              <h3 className="text-lg font-black text-minsah-text-primary">
                Recently Viewed Products
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {recentlyViewed.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug || item.id}`}
                  className="group block overflow-hidden rounded-2xl border border-minsah-border-subtle bg-white p-2 transition hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-minsah-surface-subtle">
                    <CatalogProductImage
                      src={item.image}
                      alt={item.name}
                      sizes="120px"
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-bold text-minsah-text-primary group-hover:text-minsah-action-primary transition">
                    {item.name}
                  </p>
                  <p className="text-xs font-black text-minsah-action-primary">
                    ৳{item.price.toLocaleString("bn-BD")}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating Mobile Bottom Action Bar */}
      <StickyBottomBar
        productId={product.id}
        productName={product.name}
        productImage={variantImageOverride || variantImage || product.image}
        price={currentPrice * quantity}
        unitPrice={currentPrice}
        weightKg={selectedVariantObj?.weight ?? product.weight ?? null}
        variantId={selectedVariantId}
        variantName={variantNameLabel}
        sku={selectedVariantObj?.sku ?? product.sku}
        size={variantSize}
        color={variantColor}
        variantImage={variantImage}
        variants={stickyBarVariants as any}
        quantity={quantity}
        maxStock={activeStock}
        inStock={activeInStock}
        requiresVariantSelection={requiresVariantSelection}
        whatsappNumber={WHATSAPP_NUMBER}
      />
    </>
  );
}
