"use client";

import Image from "next/image";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { CartItem } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/currency";
import { Button } from "@/components/ui/Button";

type CartItemRowDensity = "compact" | "regular" | "summary";

interface CartItemRowProps {
  item: CartItem;
  density?: CartItemRowDensity;
  busy?: boolean;
  onQuantityChange?: (nextQuantity: number) => void;
  onRemove?: () => void;
  showLineTotal?: boolean;
  className?: string;
}

function isDisplayableImage(src?: string | null) {
  return Boolean(
    src &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:")),
  );
}

function getVariantLabel(
  item: Pick<CartItem, "size" | "color" | "variantName">,
) {
  return (
    [item.size, item.color].filter(Boolean).join(" / ") ||
    item.variantName ||
    ""
  );
}

export default function CartItemRow({
  item,
  density = "regular",
  busy = false,
  onQuantityChange,
  onRemove,
  showLineTotal = false,
  className = "",
}: CartItemRowProps) {
  const variantLabel = getVariantLabel(item);
  const maxQuantity =
    typeof item.maxQuantity === "number" ? item.maxQuantity : null;
  const isAtMaxQuantity = maxQuantity !== null && item.quantity >= maxQuantity;
  const isSummary = density === "summary";
  const isCompact = density === "compact";
  const imageSize = isSummary ? 48 : isCompact ? 64 : 96;
  const imageClass = isSummary
    ? "h-12 w-12 rounded-xl"
    : isCompact
      ? "h-16 w-16 rounded-2xl"
      : "h-24 w-24 rounded-3xl";

  return (
    <article
      className={`${
        isSummary
          ? "flex items-center gap-3"
          : isCompact
            ? "rounded-3xl border border-minsah-border-soft bg-minsah-panel p-3 transition-shadow duration-200 hover:shadow-sm"
            : "rounded-[28px] border border-minsah-border-soft bg-minsah-panel p-4 shadow-sm"
      } ${className}`}
    >
      <div className={isSummary ? "contents" : "flex gap-4"}>
        <div
          className={`${imageClass} flex-shrink-0 overflow-hidden bg-minsah-light`}
        >
          {isDisplayableImage(item.variantImage || item.image) ? (
            <Image
              src={(item.variantImage || item.image) as string}
              alt={item.name}
              width={imageSize}
              height={imageSize}
              sizes={`${imageSize}px`}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-minsah-secondary">
              <ShoppingBag
                size={isSummary ? 18 : isCompact ? 20 : 26}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={`${isSummary || isCompact ? "text-sm" : "text-base"} line-clamp-2 font-bold leading-snug text-minsah-text`}
              >
                {item.name}
              </h3>
              {variantLabel && (
                <p className="mt-1 line-clamp-1 text-xs font-medium text-minsah-muted">
                  {variantLabel}
                </p>
              )}
              {isSummary ? (
                <p className="mt-1 text-xs text-minsah-muted">
                  Qty: {item.quantity}
                </p>
              ) : isAtMaxQuantity && maxQuantity !== null ? (
                <p className="mt-1 text-xs font-semibold text-minsah-warning">
                  Maximum available quantity reached
                </p>
              ) : null}
            </div>

            {onRemove && !isSummary && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                disabled={busy}
                className="text-minsah-danger hover:bg-red-50"
                aria-label={`Remove ${item.name}`}
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={16} aria-hidden="true" />
                )}
              </Button>
            )}
          </div>

          {isSummary ? null : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  className={`${isCompact ? "text-sm" : "text-base"} font-black text-minsah-primary`}
                >
                  {formatPrice(item.price)}
                </p>
                {showLineTotal && item.quantity > 1 && (
                  <p className="mt-0.5 text-xs text-minsah-muted">
                    Line total: {formatPrice(item.price * item.quantity)}
                  </p>
                )}
              </div>

              {onQuantityChange && (
                <div className="flex h-11 items-center overflow-hidden rounded-full border border-minsah-border-soft bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onQuantityChange(item.quantity - 1)}
                    disabled={busy}
                    className="h-full w-11 rounded-none text-minsah-primary hover:bg-minsah-light"
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus size={14} aria-hidden="true" />
                  </Button>
                  <span
                    className="min-w-10 text-center text-sm font-black text-minsah-text"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {busy ? (
                      <Loader2 size={14} className="mx-auto animate-spin" />
                    ) : (
                      item.quantity
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onQuantityChange(item.quantity + 1)}
                    disabled={busy || isAtMaxQuantity}
                    className="h-full w-11 rounded-none text-minsah-primary hover:bg-minsah-light"
                    aria-label={
                      isAtMaxQuantity
                        ? `${item.name} maximum quantity reached`
                        : `Increase ${item.name}`
                    }
                  >
                    <Plus size={14} aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {isSummary && (
          <p className="whitespace-nowrap text-sm font-bold text-minsah-primary">
            {formatPrice(item.price * item.quantity)}
          </p>
        )}
      </div>
    </article>
  );
}
