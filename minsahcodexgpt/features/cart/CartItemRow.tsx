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
  item: Pick<CartItem, "size" | "color" | "shade" | "variantName">,
) {
  const colorOrShade = item.shade || item.color;
  return (
    [item.size, colorOrShade].filter(Boolean).join(" / ") ||
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
  const imageSize = isSummary ? 48 : isCompact ? 72 : 96;
  const imageClass = isSummary
    ? "h-12 w-12 rounded-xl"
    : isCompact
      ? "h-[72px] w-[72px] rounded-lg bg-[#EAEAE4] shrink-0"
      : "h-24 w-24 rounded-3xl";

  return (
    <article
      className={`${
        isSummary
          ? "flex items-center gap-3"
          : isCompact
            ? "border-b border-black/[0.08] bg-transparent py-4 transition-colors last:border-b-0"
            : "rounded-[28px] border border-minsah-border-soft bg-minsah-panel p-4 shadow-sm"
      } ${className}`}
    >
      <div className={isSummary ? "contents" : "flex gap-3.5 items-center"}>
        <div
          className={`${imageClass} flex-shrink-0 overflow-hidden ${isCompact ? "border border-black/[0.04]" : "bg-minsah-light"}`}
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
                size={isSummary ? 18 : isCompact ? 22 : 26}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={`${isSummary ? "text-sm font-bold text-minsah-text" : isCompact ? "text-[14px] font-semibold text-[#181C1A] leading-snug" : "text-base font-bold text-minsah-text"} line-clamp-2`}
              >
                {item.name}
              </h3>
              {variantLabel && (
                <p className={`mt-0.5 line-clamp-1 text-xs ${isCompact ? "text-[#667085] font-normal" : "font-medium text-minsah-muted"}`}>
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

            {onRemove && !isSummary && !isCompact && (
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
            <div className={`flex items-center justify-between gap-3 ${isCompact ? "mt-3" : "mt-3"}`}>
              <div>
                <p
                  className={`${isCompact ? "text-[15px] font-semibold text-[#181C1A]" : "text-base font-black text-minsah-primary"}`}
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
                isCompact ? (
                  <div
                    className="grid grid-cols-3 items-center h-[32px] w-[86px] rounded-full border border-[#D0D5DD] bg-white shadow-xs overflow-hidden select-none"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity <= 1 && onRemove) {
                          onRemove();
                        } else {
                          onQuantityChange(item.quantity - 1);
                        }
                      }}
                      disabled={busy}
                      className="h-full w-full flex items-center justify-center text-[#181C1A] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 focus:outline-none"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={11} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <div className="h-full w-full flex items-center justify-center overflow-hidden">
                      <span
                        key={item.quantity}
                        className="text-xs font-semibold text-[#181C1A] text-center inline-block animate-counter-pop select-none"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {busy ? (
                          <Loader2 size={11} className="mx-auto animate-spin" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(item.quantity + 1)}
                      disabled={busy || isAtMaxQuantity}
                      className="h-full w-full flex items-center justify-center text-[#181C1A] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 focus:outline-none"
                      aria-label={
                        isAtMaxQuantity
                          ? `${item.name} maximum quantity reached`
                          : `Increase ${item.name}`
                      }
                    >
                      <Plus size={11} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center overflow-hidden rounded-full h-11 border border-minsah-border-soft bg-white"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (item.quantity <= 1 && onRemove) {
                          onRemove();
                        } else {
                          onQuantityChange(item.quantity - 1);
                        }
                      }}
                      disabled={busy}
                      className="h-full w-11 rounded-none text-minsah-primary hover:bg-minsah-light"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </Button>
                    <span
                      className="min-w-10 text-sm font-black text-minsah-text text-center"
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
                )
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
