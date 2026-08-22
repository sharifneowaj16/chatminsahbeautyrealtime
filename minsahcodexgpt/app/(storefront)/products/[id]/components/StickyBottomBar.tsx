"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import AddToCartStepper from "./AddToCartStepper";
import dynamic from "next/dynamic";
import type { BuyNowVariantOption } from "@/components/cart/BuyNowModal";
import type { VariantOption } from "@/components/cart/VariantModal";
import { Button } from "@/components/ui/Button";
import { SOCIAL_PLATFORM_COLORS } from "@/lib/design-token-exceptions";

const BuyNowModal = dynamic(() => import("@/components/cart/BuyNowModal"), {
  ssr: false,
  loading: () => null,
});

interface StickyBottomBarProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  unitPrice: number;
  weightKg?: number | null;
  variantId: string | null;
  variantName?: string | null;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  variantImage?: string | null;
  variants?: BuyNowVariantOption[];
  quantity: number;
  maxStock: number;
  inStock: boolean;
  requiresVariantSelection?: boolean;
  whatsappNumber: string;
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.815 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function StickyBottomBar({
  productId,
  productName,
  productImage,
  price,
  unitPrice,
  weightKg = null,
  variantId,
  variantName,
  sku,
  size,
  color,
  variantImage,
  variants = [],
  quantity,
  maxStock,
  inStock,
  requiresVariantSelection = false,
  whatsappNumber,
}: StickyBottomBarProps) {
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

  const displayImage = variantImage || productImage;
  const cartVariants: VariantOption[] = variants.map((variant) => ({
    ...variant,
    sku: variant.sku ?? undefined,
  }));

  const hasVariantOptions = variants.length > 0;
  const hasAvailableInventory = hasVariantOptions
    ? variants.some((variant) => variant.stock > 0)
    : inStock;
  const needsOptionSelection = Boolean(requiresVariantSelection);
  const selectedVariantSoldOut = Boolean(variantId && !inStock);
  const isUnavailable = !hasAvailableInventory;
  const shouldGuideToOption = needsOptionSelection || selectedVariantSoldOut;
  const addToCartDisabled = isUnavailable || selectedVariantSoldOut;
  const buyNowDisabled = isUnavailable;
  const whatsappBlocked = isUnavailable || shouldGuideToOption;

  const stickyLabel = isUnavailable
    ? "স্টক শেষ"
    : selectedVariantSoldOut
      ? "অপশন নেই"
      : needsOptionSelection
        ? "অপশন দরকার"
        : "মোট";
  const stickyValue = isUnavailable
    ? "বর্তমানে স্টকে নেই"
    : selectedVariantSoldOut
      ? "অন্য উপলভ্য অপশন নিন"
      : needsOptionSelection
        ? "সাইজ/শেড নির্বাচন করুন"
        : `৳${price.toLocaleString("bn-BD")}`;
  const buyNowLabel = shouldGuideToOption ? "অপশন নিয়ে কিনুন" : "এখনই কিনুন";
  const helperText = isUnavailable
    ? "এই পণ্যটি বর্তমানে স্টকে নেই।"
    : selectedVariantSoldOut
      ? "নির্বাচিত অপশনটি স্টকে নেই — অন্য উপলভ্য অপশন বেছে নিন।"
      : needsOptionSelection
        ? "অর্ডার করার আগে একটি উপলভ্য অপশন নির্বাচন করুন।"
        : null;

  const whatsappMessage = `অর্ডার রিকোয়েস্ট:\n\nপণ্য: ${productName}${
    variantName ? `\nভ্যারিয়েন্ট: ${variantName}` : ""
  }${sku ? `\nSKU: ${sku}` : ""}${size ? `\nসাইজ: ${size}` : ""}${color ? `\nশেড/রং: ${color}` : ""}${
    variantId ? `\nভ্যারিয়েন্ট ID: ${variantId}` : ""
  }\nপরিমাণ: ${quantity}\nমোট: ৳${price.toLocaleString(
    "bn-BD",
  )}\n\nঅনুগ্রহ করে এই অর্ডারটি confirm করুন।`;

  const focusVariantSelector = () => {
    const selector = document.getElementById("product-variant-selector");
    selector?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleBuyNow = () => {
    if (buyNowDisabled) return;
    setIsBuyNowOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-minsah-border-subtle bg-minsah-surface-elevated/95 shadow-[var(--shadow-elevated)] backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 pt-2.5 minsah-sticky-action-safe">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-minsah-muted">
              {stickyLabel}
            </span>
            <span className="truncate text-base font-semibold text-minsah-text">
              {stickyValue}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_3rem] gap-2">
            <AddToCartStepper
              productId={productId}
              productName={productName}
              productImage={productImage}
              price={unitPrice}
              initialQuantity={quantity}
              maxStock={maxStock}
              variantId={variantId}
              variantName={variantName}
              sku={sku}
              size={size}
              color={color}
              variantImage={variantImage}
              hasRequiredVariants={requiresVariantSelection}
              variants={cartVariants}
              className="min-w-0 border border-minsah-border-default bg-minsah-surface-subtle text-minsah-action-primary hover:bg-minsah-surface-soft font-bold rounded-2xl h-11"
              disabled={addToCartDisabled}
            />

            <Button
              type="button"
              fullWidth
              onClick={handleBuyNow}
              disabled={buyNowDisabled}
              aria-describedby={helperText ? "sticky-purchase-helper" : undefined}
              className="min-w-0 rounded-2xl h-11 bg-minsah-action-primary hover:bg-minsah-action-primary-hover text-white font-black shadow-md"
            >
              <ShoppingBag size={15} aria-hidden="true" className="mr-1" />
              <span className="truncate">{buyNowLabel}</span>
            </Button>

            {whatsappBlocked ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={shouldGuideToOption ? focusVariantSelector : undefined}
                disabled={isUnavailable}
                aria-label={
                  shouldGuideToOption
                    ? "WhatsApp অর্ডারের আগে অপশন নির্বাচন করুন"
                    : "WhatsApp অর্ডার বর্তমানে বন্ধ"
                }
                aria-describedby={helperText ? "sticky-purchase-helper" : undefined}
                className="w-12 rounded-2xl"
              >
                <WhatsAppIcon />
              </Button>
            ) : (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp-এ অর্ডার করুন"
                className="minsah-control flex h-11 w-12 items-center justify-center rounded-2xl text-minsah-text-inverse shadow-sm hover:brightness-95"
                style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.whatsapp }}
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>

          {helperText && (
            <p
              id="sticky-purchase-helper"
              className="mt-2 text-center text-xs font-medium text-minsah-status-warning-text"
            >
              {helperText}
            </p>
          )}
        </div>
      </div>

      <BuyNowModal
        isOpen={isBuyNowOpen}
        productId={productId}
        productName={productName}
        productImage={displayImage}
        basePrice={unitPrice}
        baseWeightKg={weightKg}
        baseStock={maxStock}
        variants={variants}
        initialVariantId={variantId}
        initialQuantity={quantity}
        onClose={() => setIsBuyNowOpen(false)}
      />
    </>
  );
}
