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
    <div className="h-48 animate-pulse rounded-3xl bg-minsah-accent/40" aria-hidden="true" />
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
    flashSaleEligible?: boolean;
    offerStartDate?: string | null;
    offerEndDate?: string | null;
    deliveryOfferEnabled?: boolean | null;
    deliveryOfferType?: "DEFAULT" | "FREE" | "FIXED" | string | null;
    deliveryOfferAmount?: number | null;
    deliveryOfferStartDate?: string | null;
    deliveryOfferEndDate?: string | null;
    deliveryOfferBadgeText?: string | null;
    activeDeliveryOffer?: ActiveDeliveryOffer | null;
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
    <div className="rounded-xl bg-minsah-light p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-minsah-dark">
          <Truck size={12} /> ডেলিভারি
        </p>
        {isFreeDelivery && (
          <span className="rounded-full bg-minsah-status-success-surface px-2 py-0.5 text-xs font-semibold text-minsah-status-success-text">
            ফ্রি ডেলিভারি
          </span>
        )}
        {isFixedDelivery && (
          <span className="rounded-full bg-minsah-status-warning-surface px-2 py-0.5 text-xs font-semibold text-minsah-status-warning-text">
            বিশেষ অফার
          </span>
        )}
      </div>

      {isFreeDelivery ? (
        <div className="rounded-lg border border-minsah-status-success-border bg-minsah-status-success-surface px-3 py-2">
          <p className="text-sm font-semibold text-minsah-status-success-text">
            {offerBadgeText || "এই পণ্যে ফ্রি ডেলিভারি"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-minsah-status-success-text">
            এই পণ্যটি কার্টে থাকলে পুরো অর্ডারের ডেলিভারি চার্জ ৳0 থাকবে।
          </p>
        </div>
      ) : isFixedDelivery ? (
        <div className="rounded-lg border border-minsah-status-warning-border bg-minsah-status-warning-surface px-3 py-2">
          <p className="text-sm font-semibold text-minsah-status-warning-text">
            {offerBadgeText ||
              `বিশেষ ডেলিভারি অফার: সর্বোচ্চ ৳${fixedDeliveryAmount?.toLocaleString("bn-BD")}`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-minsah-status-warning-text">
            ঠিকানা অনুযায়ী চেকআউটে কুরিয়ার চার্জ নেওয়া হবে; আপনার ডেলিভারি চার্জ
            এই অফারের নির্ধারিত amount-এর বেশি হবে না।
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-minsah-border-default bg-minsah-surface-panel/70 px-3 py-2">
          <p className="text-sm font-semibold text-minsah-text">
            ডেলিভারি চার্জ চেকআউটে হিসাব হবে
          </p>
          <p className="mt-1 text-xs leading-relaxed text-minsah-text-muted">
            আপনার ঠিকানা ও নির্বাচিত শিপিং পদ্ধতি অনুযায়ী Pathao/Steadfast চার্জ
            হিসাব হবে।
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-1 items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-minsah-text-muted" />
          <div>
            <p className="text-xs font-semibold text-minsah-text">ঢাকায়</p>
            <p className="text-xs font-medium text-minsah-status-success-text">
              {dhakaLabel} পাবেন
            </p>
            <p className="text-xs text-minsah-text-muted">আনুমানিক সময়</p>
          </div>
        </div>
        <div className="w-px bg-minsah-border-default" />
        <div className="flex flex-1 items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-minsah-text-muted" />
          <div>
            <p className="text-xs font-semibold text-minsah-text">সারাদেশে</p>
            <p className="text-xs font-medium text-minsah-dark">
              {outsideLabel}
            </p>
            <p className="text-xs text-minsah-text-muted">আনুমানিক সময়</p>
          </div>
        </div>
      </div>
      {hour < 15 && !isWeekend && (
        <div className="flex items-center gap-1.5 rounded-lg border border-minsah-status-warning-border bg-minsah-status-warning-surface px-2.5 py-1.5">
          <Clock size={10} className="flex-shrink-0 text-minsah-status-warning-text" />
          <p className="text-xs font-medium text-minsah-status-warning-text">
            আজ বিকেল ৩টার আগে অর্ডার করলে দ্রুত ডিসপ্যাচ হবে।
          </p>
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
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-minsah-status-danger-text" />
        <span className="text-sm font-medium text-minsah-status-danger-text">স্টক শেষ</span>
      </div>
    );
  }

  if (stock <= threshold) {
    const pct = Math.max(
      10,
      Math.round((stock / Math.max(threshold, 1)) * 100),
    );
    return (
      <div className="space-y-1.5 rounded-xl border border-minsah-status-danger-border bg-minsah-status-danger-surface px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-minsah-status-danger-text">
            মাত্র {stock}টি বাকি
          </span>
          <span className="text-xs font-medium text-minsah-status-danger-text">
            দ্রুত শেষ হচ্ছে
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-minsah-status-danger-surface">
          <div
            className="h-full rounded-full bg-minsah-status-danger-text transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-minsah-status-danger-text">এখনই অর্ডার করুন, মিস করবেন না।</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-minsah-status-success-surface0" />
      <span className="text-sm font-medium text-minsah-status-success-text">স্টকে আছে</span>
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
  const hasReviews = rating.total > 0;
  const reviewLabel = hasReviews
    ? `${rating.average.toFixed(1)} রেটিং • ${rating.total}টি রিভিউ`
    : "নতুন পণ্য • রিভিউ আসছে";
  const verifiedLabel =
    verifiedReviewCount > 0
      ? `${verifiedReviewCount}টি ভেরিফায়েড ক্রেতার রিভিউ`
      : hasReviews
        ? "ভেরিফায়েড ব্যাজসহ রিভিউ আলাদা দেখা যাবে"
        : "পণ্যের বিস্তারিত দেখে সিদ্ধান্ত নিন";

  const items = [
    {
      icon: Star,
      label: "কাস্টমার ট্রাস্ট",
      value: reviewLabel,
      tone: "bg-minsah-status-warning-surface text-minsah-status-warning-text border-minsah-status-warning-border",
    },
    {
      icon: CheckCircle,
      label: "ভেরিফায়েড সিগন্যাল",
      value: verifiedLabel,
      tone: "bg-minsah-status-success-surface text-minsah-status-success-text border-minsah-status-success-border",
    },
    {
      icon: ShieldCheck,
      label: "অরিজিনাল গ্যারান্টি",
      value: "অরিজিনাল পণ্যের নিশ্চয়তা",
      tone: "bg-minsah-light text-minsah-dark border-minsah-border-default",
    },
    {
      icon: codAvailable ? Smartphone : RotateCcw,
      label: codAvailable ? "পেমেন্ট" : "রিটার্ন পলিসি",
      value: codAvailable
        ? "bKash / COD সুবিধা"
        : returnEligible
          ? "যোগ্য পণ্যে রিটার্ন support"
          : "রিটার্ন পলিসি দেখে অর্ডার করুন",
      tone: "bg-minsah-surface-panel text-minsah-dark border-minsah-border-default",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-minsah-border-default bg-minsah-surface-panel p-2 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className={`rounded-xl border px-3 py-2 ${tone}`}>
          <div className="mb-1 flex items-center gap-1.5">
            <Icon size={13} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              {label}
            </p>
          </div>
          <p className="text-xs font-semibold leading-snug">{value}</p>
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
      title: "অরিজিনাল পণ্যের নিশ্চয়তা",
      description:
        authenticityNote ||
        "পণ্যের source, packaging ও listing information যাচাই করে কাস্টমারের কাছে পাঠানো হয়।",
    },
    {
      icon: Package,
      title: "প্যাকেজিং ও কন্ডিশন চেক",
      description:
        "ডিসপ্যাচের আগে পণ্য, শেড/ভ্যারিয়েন্ট এবং প্যাকেজিং condition মিলিয়ে নেওয়া হয়।",
    },
    {
      icon: Smartphone,
      title: codAvailable ? "bKash / Nagad / COD সুবিধা" : "নিরাপদ অনলাইন পেমেন্ট",
      description: codAvailable
        ? "যোগ্য ঠিকানায় Cash on Delivery, bKash এবং Nagad payment support available."
        : "চেকআউটে নিরাপদ পেমেন্ট প্রক্রিয়া রাখা হয়েছে।",
    },
    {
      icon: RotateCcw,
      title: returnEligible ? "৭ দিনের রিটার্ন support" : "রিটার্ন পলিসি clear",
      description: returnEligible
        ? "যোগ্য পণ্যে policy অনুযায়ী return/support পাওয়া যাবে।"
        : "এই পণ্যের রিটার্ন eligibility চেকআউট/অর্ডারের আগে দেখে নিন।",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-minsah-border-default bg-minsah-surface-panel p-4"
      aria-labelledby="trust-promise-heading"
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-minsah-status-success-surface">
          <ShieldCheck
            size={18}
            className="text-minsah-status-success-text"
            aria-hidden="true"
          />
        </div>
        <div>
          <p
            id="trust-promise-heading"
            className="text-sm font-semibold text-minsah-text"
          >
            ট্রাস্ট ও অরিজিনাল নিশ্চয়তা
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-minsah-text-muted">
            Beauty/skincare অর্ডারের আগে অরিজিনাল পণ্য, পেমেন্ট, ডেলিভারি এবং
            রিটার্ন clarity এক জায়গায় দেখুন।
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-xl bg-minsah-light p-3">
            <div className="flex items-center gap-1.5">
              <Icon size={14} className="text-minsah-dark" aria-hidden="true" />
              <p className="text-xs font-semibold text-minsah-text">{title}</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-minsah-text-muted">
              {description}
            </p>
          </div>
        ))}
      </div>

      {ingredientVerificationStatus && (
        <div className="mt-3 rounded-xl border border-minsah-status-success-border bg-minsah-status-success-surface px-3 py-2">
          <p className="text-xs font-semibold text-minsah-status-success-text">উপাদান যাচাই</p>
          <p className="mt-0.5 text-xs leading-relaxed text-minsah-status-success-text">
            {ingredientVerificationStatus}
          </p>
        </div>
      )}
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
        {title}
      </p>
      <div className="overflow-hidden rounded-2xl border border-minsah-border-default bg-minsah-surface-panel">
        {visibleRows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="grid grid-cols-[42%_1fr] gap-3 border-b border-minsah-border-subtle px-3 py-2.5 last:border-b-0"
          >
            <p className="text-xs font-medium text-minsah-text-muted">{row.label}</p>
            <p className="text-xs font-semibold text-minsah-text">
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
          className="rounded-2xl bg-minsah-light p-4"
        >
          <p className="text-sm font-semibold text-minsah-dark">
            {section.heading}
          </p>
          {section.content && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-minsah-text-muted">
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
        আরও দেখুন
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="rounded-full border border-minsah-border-strong px-3 py-1.5 text-xs font-medium text-minsah-dark transition hover:bg-minsah-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DetailsAccordionItem({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-minsah-border-default bg-minsah-surface-panel"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-minsah-text">{title}</p>
          {summary && (
            <p className="mt-0.5 text-xs leading-relaxed text-minsah-text-muted">
              {summary}
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 text-minsah-text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-4 border-t border-minsah-border-subtle px-4 py-4">
        {children}
      </div>
    </details>
  );
}

function DetailTextBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
        {title}
      </p>
      {children}
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
  const viewedProductKeysRef = useRef<Set<string>>(new Set());
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const selectedVariantObj =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    null;
  const selectedVariantAttributes = selectedVariantObj?.attributes ?? null;
  const variantSize = getAttributeValue(selectedVariantAttributes, [
    "size",
    "Size",
  ]);
  const variantColor = getAttributeValue(selectedVariantAttributes, [
    "color",
    "Color",
    "shade",
    "Shade",
  ]);
  const variantExtraAttributes = getAdditionalVariantAttributes(
    selectedVariantAttributes,
  );
  const variantImage = selectedVariantObj?.image ?? null;
  const variantNameLabel = selectedVariantObj
    ? getVariantDisplayLabel(selectedVariantObj)
    : null;

  const requiresVariantSelection =
    product.variants.length > 0 && !selectedVariantObj;
  const activeStock = selectedVariantObj
    ? selectedVariantObj.stock
    : requiresVariantSelection
      ? 0
      : product.stock;
  const activeInStock = !requiresVariantSelection && activeStock > 0;
  const hasPurchasableStock =
    product.variants.length > 0
      ? product.variants.some((variant) => variant.stock > 0)
      : product.stock > 0;
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
  const variantPrices = product.variants
    .map((variant) => variant.price)
    .filter((price) => price > 0);
  const variantPriceMin =
    variantPrices.length > 0 ? Math.min(...variantPrices) : null;
  const variantPriceMax =
    variantPrices.length > 0 ? Math.max(...variantPrices) : null;
  const priceDisplayText =
    requiresVariantSelection && variantPriceMin
      ? variantPriceMax && variantPriceMax > variantPriceMin
        ? `৳${variantPriceMin.toLocaleString("bn-BD")} - ৳${variantPriceMax.toLocaleString("bn-BD")}`
        : `৳${variantPriceMin.toLocaleString("bn-BD")}`
      : `৳${currentPrice.toLocaleString("bn-BD")}`;
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
      const drawerIntentId = registerAddIntent();
      const results: boolean[] = [];
      for (const cartItem of bundleCartItems) {
        results.push(await addItem(cartItem, { track: false }));
      }

      if (results.some((added) => !added)) {
        setBundleStatus({
          type: "error",
          message: "বান্ডেল কার্টে যোগ করা যায়নি। আবার চেষ্টা করুন।",
        });
        return;
      }

      trackAddToCartBundle(bundleCartItems, `${product.name} bundle`);
      openForSuccessfulAdd(
        drawerIntentId,
        bundleCartItems[0],
        bundleCartItems[0].quantity,
      );

      setBundleStatus({
        type: "success",
        message: `${selectedBundleProducts.length + 1}টি আইটেম কার্টে যোগ হয়েছে। কার্ট থেকে quantity adjust করতে পারবেন।`,
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

      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-20">
            <ProductGallery
              images={galleryImages}
              productName={displayTitle}
              discountPct={discountPct}
              isNew={product.isNew}
              overrideImage={variantImageOverride ?? variantImage}
            />
          </div>

          <div className="space-y-5 px-4 pt-4 pb-36 lg:px-0 lg:pt-0 lg:pb-8">
            {(product.brand || product.category) && (
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <span className="rounded-full bg-minsah-light px-2.5 py-1 text-xs font-medium text-minsah-text-muted">
                    {product.brand}
                  </span>
                )}
                {product.category && (
                  <span className="rounded-full bg-minsah-light px-2.5 py-1 text-xs font-medium text-minsah-text-muted">
                    {product.category}
                  </span>
                )}
              </div>
            )}

            <div>
              <h1 className="text-xl font-semibold leading-tight text-minsah-text md:text-2xl lg:text-3xl">
                {displayTitle}
              </h1>
              {product.bengaliName && product.bengaliName !== displayTitle && (
                <p className="mt-1 text-sm font-medium text-minsah-text-muted">
                  {product.bengaliName}
                </p>
              )}
              {rating.total > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div
                    className="flex gap-0.5"
                    aria-label={`${rating.average.toFixed(1)} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        className={
                          star <= Math.round(rating.average)
                            ? "text-minsah-status-warning-text"
                            : "text-minsah-border-default"
                        }
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-minsah-text">
                    {rating.average.toFixed(1)}
                  </span>
                  <a
                    href="#product-reviews"
                    className="text-sm font-medium text-minsah-text-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
                  >
                    {rating.total} রিভিউ দেখুন
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-semibold text-minsah-text md:text-3xl">
                {priceDisplayText}
              </span>
              {requiresVariantSelection && variantPriceMin && (
                <span className="rounded-full bg-minsah-status-warning-surface px-2.5 py-1 text-xs font-semibold text-minsah-status-warning-text">
                  অপশন অনুযায়ী দাম
                </span>
              )}
              {comparePrice && comparePrice > currentPrice && (
                <span className="text-lg text-minsah-text-subtle line-through">
                  ৳{comparePrice.toLocaleString("bn-BD")}
                </span>
              )}
              {discountPct && (
                <span className="rounded-full bg-minsah-status-danger-surface px-2.5 py-1 text-xs font-semibold text-minsah-status-danger-text">
                  {discountPct}% সাশ্রয়
                </span>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-sm leading-relaxed text-minsah-text-muted">
                {product.shortDescription}
              </p>
            )}

            <TopTrustSnapshot
              rating={rating}
              verifiedReviewCount={verifiedReviewCount}
              codAvailable={product.codAvailable}
              returnEligible={product.returnEligible}
            />

            {product.keyBenefits && product.keyBenefits.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
                  মূল সুবিধা
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.keyBenefits.slice(0, 5).map((benefit) => (
                    <span
                      key={benefit}
                      className="rounded-full bg-minsah-light px-3 py-1 text-xs font-medium text-minsah-text-muted"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.skinType && product.skinType.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
                  উপযুক্ত ত্বকের ধরন
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.skinType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-minsah-status-warning-surface px-3 py-1 text-xs font-medium text-minsah-text-muted"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-minsah-border-default" />

            <div id="product-variant-selector" className="scroll-mt-24">
              <VariantSelector
                variants={product.variants}
                basePrice={baseDisplayPrice}
                baseStock={product.stock}
                onVariantChange={handleVariantChange}
                onImageChange={handleVariantImageChange}
              />
            </div>

            {selectedVariantObj && (
              <div className="rounded-2xl border border-minsah-border-strong bg-minsah-light px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-minsah-dark">
                      নির্বাচিত অপশন
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-minsah-text">
                      {variantNameLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {variantSize && (
                        <span className="rounded-full bg-minsah-surface-panel/80 px-2 py-0.5 text-xs font-medium text-minsah-text-muted">
                          Size: {variantSize}
                        </span>
                      )}
                      {variantColor && (
                        <span className="rounded-full bg-minsah-surface-panel/80 px-2 py-0.5 text-xs font-medium text-minsah-text-muted">
                          Shade: {variantColor}
                        </span>
                      )}
                      {variantExtraAttributes.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-minsah-surface-panel/80 px-2 py-0.5 text-xs font-medium text-minsah-text-muted"
                        >
                          {item}
                        </span>
                      ))}
                      {selectedVariantObj.sku && (
                        <span className="rounded-full bg-minsah-surface-panel/80 px-2 py-0.5 text-xs font-medium text-minsah-text-muted">
                          SKU: {selectedVariantObj.sku}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-minsah-text-muted">দাম</p>
                    <p className="text-sm font-semibold text-minsah-text">
                      ৳{selectedVariantObj.price.toLocaleString("bn-BD")}
                    </p>
                    <p className="mt-1 text-xs text-minsah-text-muted">স্টক</p>
                    <p
                      className={`text-sm font-semibold ${
                        selectedVariantObj.stock > 0
                          ? "text-minsah-status-success-text"
                          : "text-minsah-status-danger-text"
                      }`}
                    >
                      {selectedVariantObj.stock > 0
                        ? `${selectedVariantObj.stock}টি`
                        : "স্টক শেষ"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {requiresVariantSelection ? (
              <div className="rounded-2xl border border-minsah-status-warning-border bg-minsah-status-warning-surface px-4 py-3">
                <p className="text-sm font-semibold text-minsah-status-warning-text">
                  ভ্যারিয়েন্ট সিলেক্ট করুন
                </p>
                <p className="mt-1 text-xs text-minsah-status-warning-text">
                  Cart, Buy Now বা WhatsApp order করার আগে সঠিক সাইজ/শেড বেছে
                  নিতে হবে।
                </p>
              </div>
            ) : (
              <StockUrgency
                stock={activeStock}
                inStock={activeInStock}
                threshold={lowStockThreshold}
              />
            )}

            {hasPurchasableStock && (
              <DeliveryEstimate activeOffer={product.activeDeliveryOffer} />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <WishlistButton
                productId={product.id}
                productName={product.name}
                presentation="labeled"
                className="flex-1 sm:flex-none"
              />
              {ENABLE_GIFT_REQUEST && (
                <div className="flex-1">
                  <GiftRequestButton
                    productId={product.id}
                    productName={product.name}
                    variantId={selectedVariantId}
                  />
                </div>
              )}
              <ShareButton productName={product.name} productUrl={productUrl} />
            </div>

            <TrustPromiseCard
              authenticityNote={product.authenticityNote}
              ingredientVerificationStatus={
                product.ingredientVerificationStatus
              }
              codAvailable={product.codAvailable}
              returnEligible={product.returnEligible}
            />

            <div id="product-reviews" className="scroll-mt-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
                কাস্টমার রিভিউ
              </p>
              <ReviewSection reviews={reviews} rating={rating} />
            </div>

            <div className="h-px bg-minsah-border-default" />

            <section
              className="space-y-4"
              aria-labelledby="product-overview-heading"
            >
              <div className="rounded-2xl border border-minsah-border-default bg-minsah-light p-4">
                <p
                  id="product-overview-heading"
                  className="text-xs font-semibold uppercase tracking-wide text-minsah-dark"
                >
                  পণ্যের বিস্তারিত
                </p>
                <p className="mt-1 text-xs leading-relaxed text-minsah-text-muted">
                  পণ্যের বর্ণনা, উপাদান, ব্যবহারবিধি ও গুরুত্বপূর্ণ তথ্য এক
                  জায়গায় গুছিয়ে রাখা হয়েছে।
                </p>
              </div>

              {(product.seoIntro ||
                (product.description &&
                  product.description !== product.shortDescription) ||
                product.bengaliDescription ||
                descriptionSections.length > 0) && (
                <DetailsAccordionItem
                  title="ওভারভিউ ও বর্ণনা"
                  summary="পণ্যের বর্ণনা, মূল সুবিধা ও অতিরিক্ত তথ্য"
                  defaultOpen
                >
                  {product.seoIntro && (
                    <div className="rounded-2xl bg-minsah-light p-4">
                      <p className="text-sm leading-relaxed text-minsah-text-muted">
                        {product.seoIntro}
                      </p>
                    </div>
                  )}

                  {product.description &&
                    product.description !== product.shortDescription && (
                      <DetailTextBlock title="বিস্তারিত">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-minsah-text-muted">
                          {product.description}
                        </p>
                      </DetailTextBlock>
                    )}

                  {product.bengaliDescription &&
                    product.bengaliDescription !== product.description && (
                      <DetailTextBlock title="বাংলা বিস্তারিত">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-minsah-text-muted">
                          {product.bengaliDescription}
                        </p>
                      </DetailTextBlock>
                    )}

                  <DescriptionSectionsBlock sections={descriptionSections} />
                </DetailsAccordionItem>
              )}

              {(product.usageInstructions?.length || product.ingredients) && (
                <DetailsAccordionItem
                  title="ব্যবহারবিধি ও উপাদান"
                  summary="কীভাবে ব্যবহার করবেন এবং কী কী উপাদান আছে"
                >
                  {product.usageInstructions &&
                    product.usageInstructions.length > 0 && (
                      <DetailTextBlock title="ব্যবহারবিধি">
                        <ol className="list-decimal space-y-1 pl-4 text-sm text-minsah-text-muted">
                          {product.usageInstructions.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </DetailTextBlock>
                    )}

                  {product.ingredients && (
                    <DetailTextBlock title="উপাদান">
                      <div className="rounded-2xl border border-minsah-border-default bg-minsah-surface-panel p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Package
                            size={14}
                            className="text-minsah-dark"
                            aria-hidden="true"
                          />
                          <p className="text-xs font-semibold text-minsah-text">
                            উপাদানের তালিকা
                          </p>
                        </div>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-minsah-text-muted">
                          {product.ingredients}
                        </p>
                      </div>
                    </DetailTextBlock>
                  )}
                </DetailsAccordionItem>
              )}

              {(bestMatchRows.some((row) => row.value) ||
                productInfoRows.some((row) => row.value) ||
                specRows.length > 0 ||
                attributeRows.length > 0) && (
                <DetailsAccordionItem
                  title="স্পেসিফিকেশন ও পণ্যের তথ্য"
                  summary="কার জন্য উপযুক্ত, পণ্যের বৈশিষ্ট্য ও প্রয়োজনীয় তথ্য"
                >
                  <InfoRowsBlock
                    title="Best Match / উপযুক্ততা"
                    rows={bestMatchRows}
                  />
                  <InfoRowsBlock
                    title="পণ্যের বিস্তারিত"
                    rows={productInfoRows}
                  />
                  <InfoRowsBlock title="স্পেসিফিকেশন" rows={specRows} />
                  <InfoRowsBlock title="অ্যাট্রিবিউট" rows={attributeRows} />
                </DetailsAccordionItem>
              )}

              {(shadeRows.length > 0 ||
                variantPriceRows.length > 0 ||
                variantComparisonRows.length > 0) && (
                <DetailsAccordionItem
                  title="শেড ও ভ্যারিয়েন্ট গাইড"
                  summary="শেড, সাইজ/ভ্যারিয়েন্ট ও তুলনা"
                >
                  <InfoRowsBlock title="শেড অপশন" rows={shadeRows} />
                  <InfoRowsBlock
                    title="ভ্যারিয়েন্ট দাম"
                    rows={variantPriceRows}
                  />
                  <InfoRowsBlock
                    title="ভ্যারিয়েন্ট তুলনা"
                    rows={variantComparisonRows}
                  />
                </DetailsAccordionItem>
              )}

              {(offerRows.some((row) => row.value) ||
                getInternalLinks(product.internalLinks).length > 0) && (
                <DetailsAccordionItem
                  title="অফার ও সহায়ক লিংক"
                  summary="বর্তমান অফার ও সহায়ক পণ্য/তথ্য"
                >
                  <InfoRowsBlock title="অফারের তথ্য" rows={offerRows} />
                  <InternalLinksBlock value={product.internalLinks} />
                </DetailsAccordionItem>
              )}
            </section>

            {relatedProducts.length > 0 && (
              <section
                className="rounded-3xl border border-minsah-border-default bg-minsah-surface-panel p-4 shadow-sm"
                aria-labelledby="related-products-heading"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p
                      id="related-products-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-minsah-dark"
                    >
                      সম্পর্কিত পণ্য
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-minsah-text-muted">
                      আপনার পছন্দের সঙ্গে মিল আছে এমন আরও পণ্য দেখুন। বিস্তারিত
                      দেখে সহজে তুলনা করতে পারবেন।
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-minsah-light px-3 py-1 text-xs font-semibold text-minsah-dark">
                    আরও দেখুন
                  </span>
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
                    const relatedStockLabel =
                      relatedProduct.stock > 0 ? "স্টকে আছে" : "স্টক শেষ";

                    return (
                      <Link
                        key={relatedProduct.id}
                        href={productPath(relatedProduct)}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-minsah-border-default bg-minsah-light transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
                        aria-label={`${relatedProduct.name} বিস্তারিত দেখুন`}
                      >
                        <div className="relative aspect-square bg-minsah-surface-panel p-2">
                          <CatalogProductImage
                            src={relatedProduct.image}
                            alt={relatedProduct.name}
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="group-hover:scale-[1.03]"
                          />
                          <span
                            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              relatedProduct.stock > 0
                                ? "bg-minsah-status-success-surface text-minsah-status-success-text"
                                : "bg-minsah-status-danger-surface text-minsah-status-danger-text"
                            }`}
                          >
                            {relatedStockLabel}
                          </span>
                          {relatedDiscount && (
                            <span className="absolute right-2 top-2 rounded-full bg-minsah-action-primary px-2 py-0.5 text-xs font-bold text-minsah-text-inverse">
                              -{relatedDiscount}%
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-minsah-text">
                            {relatedProduct.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-minsah-dark">
                              ৳{relatedProduct.price.toLocaleString("bn-BD")}
                            </span>
                            {relatedProduct.originalPrice &&
                              relatedProduct.originalPrice >
                                relatedProduct.price && (
                                <span className="text-xs text-minsah-text-muted line-through">
                                  ৳
                                  {relatedProduct.originalPrice.toLocaleString(
                                    "bn-BD",
                                  )}
                                </span>
                              )}
                          </div>
                          <span className="mt-auto inline-flex items-center justify-center rounded-full border border-minsah-border-strong px-3 py-2 text-xs font-semibold text-minsah-dark transition-colors group-hover:bg-minsah-action-primary group-hover:text-minsah-text-inverse">
                            {relatedProduct.hasVariants
                              ? "অপশন দেখে নিন"
                              : "পণ্যটি দেখুন"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {bundleProducts.length > 0 && (
              <section
                className="rounded-3xl border border-minsah-border-default bg-minsah-surface-panel p-4 shadow-sm"
                aria-labelledby="frequently-bought-together-heading"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p
                      id="frequently-bought-together-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-minsah-dark"
                    >
                      একসাথে বেশি কেনা হয়
                    </p>
                    <p className="mt-1 text-sm font-semibold text-minsah-text">
                      মূল পণ্য + নির্বাচিত add-ons একসাথে কার্টে নিন
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-minsah-text-muted">
                      আগের delivered order history থেকে popular pairings দেখানো
                      হচ্ছে। Variant দরকার এমন add-on product আলাদা page থেকে
                      select করতে হবে।
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-minsah-light px-2.5 py-1 text-xs font-semibold text-minsah-text-muted">
                    বান্ডেল
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 rounded-2xl border border-minsah-border-default bg-minsah-light p-3">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-minsah-surface-panel">
                      <CatalogProductImage
                        src={variantImageOverride || variantImage || product.image}
                        alt={product.name}
                        sizes="64px"
                        padding="sm"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle
                          size={13}
                          className="text-minsah-status-success-text"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold uppercase tracking-wide text-minsah-status-success-text">
                          মূল পণ্য
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-minsah-text">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-minsah-text-muted">
                        {variantNameLabel
                          ? `নির্বাচিত: ${variantNameLabel}`
                          : product.variants.length > 0
                            ? "ভ্যারিয়েন্ট নির্বাচন করুন"
                            : `পরিমাণ: ${quantity}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-minsah-text">
                        ৳{bundleCurrentProductTotal.toLocaleString("bn-BD")}
                      </p>
                      {quantity > 1 && (
                        <p className="text-xs text-minsah-text-muted">{quantity} পিস</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {bundleProducts.map((bundleProduct) => {
                      const isSelectable =
                        bundleProduct.stock > 0 && !bundleProduct.hasVariants;
                      const isSelected = selectedBundleProductIds.includes(
                        bundleProduct.id,
                      );
                      const bundleDiscount =
                        bundleProduct.originalPrice &&
                        bundleProduct.originalPrice > bundleProduct.price
                          ? Math.round(
                              ((bundleProduct.originalPrice -
                                bundleProduct.price) /
                                bundleProduct.originalPrice) *
                                100,
                            )
                          : null;

                      return (
                        <div
                          key={bundleProduct.id}
                          className={`rounded-2xl border p-3 transition ${
                            isSelected && isSelectable
                              ? "border-minsah-border-strong bg-minsah-surface-soft"
                              : "border-minsah-border-subtle bg-minsah-surface-panel"
                          }`}
                        >
                          <div className="flex gap-3">
                            <Checkbox
                              label={<span className="sr-only">{bundleProduct.name} বান্ডেলের জন্য নির্বাচন করুন</span>}
                              checked={isSelected && isSelectable}
                              disabled={!isSelectable}
                              onChange={() => toggleBundleProduct(bundleProduct.id)}
                              containerClassName="mt-3 shrink-0"
                            />
                            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-minsah-surface-soft">
                              <CatalogProductImage
                                src={bundleProduct.image}
                                alt={bundleProduct.name}
                                sizes="56px"
                                padding="sm"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={productPath(bundleProduct)}
                                className="line-clamp-2 rounded text-sm font-semibold text-minsah-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-border-focus focus-visible:ring-offset-2"
                              >
                                {bundleProduct.name}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-minsah-action-primary">
                                  ৳{bundleProduct.price.toLocaleString("bn-BD")}
                                </span>
                                {bundleDiscount ? <Badge tone="danger">{bundleDiscount}% সাশ্রয়</Badge> : null}
                                <span className="text-xs text-minsah-text-muted">
                                  {bundleProduct.orderCount} অর্ডার • {bundleProduct.totalUnits} ইউনিট
                                </span>
                              </div>
                              {!isSelectable ? (
                                <p className="mt-1 text-xs font-medium text-minsah-status-warning-text">
                                  {bundleProduct.stock <= 0
                                    ? "স্টক শেষ — বান্ডেলে যোগ করা যাবে না"
                                    : "ভ্যারিয়েন্ট দরকার — পণ্যের পেজ থেকে অপশন নির্বাচন করুন"}
                                </p>
                              ) : null}
                            </div>
                            {isSelected && isSelectable ? (
                              <CheckCircle
                                size={16}
                                className="mt-5 shrink-0 text-minsah-status-success-text"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-minsah-border-default bg-minsah-light p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-minsah-dark">
                          বান্ডেল মোট
                        </p>
                        <p className="mt-0.5 text-xs text-minsah-text-muted">
                          {selectedBundleProducts.length} add-on নির্বাচিত + মূল
                          পণ্য
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-minsah-text">
                          ৳{bundleTotal.toLocaleString("bn-BD")}
                        </p>
                        {bundleSavings > 0 && (
                          <p className="text-xs font-semibold text-minsah-status-success-text">
                            সাশ্রয় ৳{bundleSavings.toLocaleString("bn-BD")}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      fullWidth
                      onClick={handleAddBundleToCart}
                      disabled={!activeInStock || selectedBundleProducts.length === 0}
                      className="mt-3 rounded-xl"
                    >
                      <Plus size={16} aria-hidden="true" />
                      নির্বাচিত বান্ডেল কার্টে যোগ করুন
                    </Button>

                    {requiresVariantSelection && (
                      <p className="mt-2 text-center text-xs font-medium text-minsah-status-warning-text">
                        আগে মূল পণ্যের required variant নির্বাচন করুন।
                      </p>
                    )}

                    {bundleStatus ? (
                      <Alert
                        tone={bundleStatus.type === "success" ? "success" : bundleStatus.type === "error" ? "danger" : "info"}
                        announcement={bundleStatus.type === "error" ? "assertive" : "polite"}
                        className="mt-3"
                      >
                        {bundleStatus.message}
                      </Alert>
                    ) : null}
                  </div>
                </div>
              </section>
            )}

            {recentlyViewed.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-minsah-dark">
                  Recently viewed
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {recentlyViewed.slice(0, 4).map((recentProduct) => {
                    const recentDiscount =
                      recentProduct.originalPrice &&
                      recentProduct.originalPrice > recentProduct.price
                        ? Math.round(
                            ((recentProduct.originalPrice -
                              recentProduct.price) /
                              recentProduct.originalPrice) *
                              100,
                          )
                        : null;

                    return (
                      <div
                        key={recentProduct.id}
                        className="overflow-hidden rounded-2xl bg-minsah-light transition-shadow hover:shadow-md"
                      >
                        <Link
                          href={productPath(recentProduct)}
                          className="block"
                        >
                          <div className="relative aspect-square">
                            <CatalogProductImage
                              src={recentProduct.image}
                              alt={recentProduct.name}
                              sizes="(max-width: 640px) 50vw, 240px"
                              padding="sm"
                            />
                            {recentDiscount && (
                              <span className="absolute top-2 right-2 rounded-full bg-minsah-status-danger-text px-1.5 py-0.5 text-xs font-bold text-minsah-text-inverse">
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
                                  hasRequiredVariants={
                                    recentProduct.hasVariants
                                  }
                                  circleAdd={true}
                                  disabled={recentProduct.stock === 0}
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="line-clamp-2 text-xs font-medium leading-tight text-minsah-text">
                              {recentProduct.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-minsah-dark">
                              ৳{recentProduct.price.toLocaleString("bn-BD")}
                            </p>
                          </div>
                        </Link>
                        <div className="px-2.5 pb-2.5">
                          <CardBuyNowButton
                            productId={recentProduct.id}
                            productName={recentProduct.name}
                            productImage={recentProduct.image}
                            price={recentProduct.price}
                            maxStock={recentProduct.stock}
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
        sku={selectedVariantObj?.sku ?? product.sku ?? null}
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
