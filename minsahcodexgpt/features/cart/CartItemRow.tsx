"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, Check, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useCart, type CartItem, type ProductVariantItem } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/currency";
import { Button } from "@/components/ui/Button";
import { extractVariantAttributes } from "@/utils/cartItemHelper";
import { safeImageUrl } from "@/lib/safe-image";

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

// Module-level in-memory cache for real product variants to prevent redundant API calls
const productVariantsCache = new Map<string, ProductVariantItem[]>();


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

function getVariantSize(v: ProductVariantItem): string | null {
  const attrs = extractVariantAttributes(v.attributes, v.name);
  if (attrs.size) return attrs.size;
  if (attrs.volume) return attrs.volume;
  if (v.name) {
    if (v.name.includes("30*2") || v.name.toLowerCase().includes("30ml")) return "30*2 ml";
    if (v.name.includes("80*2") || v.name.toLowerCase().includes("80ml")) return "80*2 ml";
    const match = v.name.match(/\b(\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack))\b/i);
    if (match) return match[1].trim();
  }
  return null;
}

function getVariantShadeName(v: ProductVariantItem): string {
  if (v.attributes && typeof v.attributes === "object") {
    const shadeKeys = ["shade", "Shade", "shadeName", "color", "Color", "colour", "tone", "formulation"];
    for (const key of shadeKeys) {
      if (v.attributes[key]) {
        return String(v.attributes[key]).trim();
      }
    }
  }
  return v.name || "Default";
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
  const { updateItemVariant } = useCart();
  const variantLabel = getVariantLabel(item);
  const maxQuantity =
    typeof item.maxQuantity === "number" ? item.maxQuantity : null;
  const isAtMaxQuantity = maxQuantity !== null && item.quantity >= maxQuantity;
  const isSummary = density === "summary";
  const isCompact = density === "compact";
  const imageSize = isSummary ? 48 : isCompact ? 72 : 96;


  // Available real product variants
  const [variants, setVariants] = useState<ProductVariantItem[]>(() => {
    if (item.availableVariants && item.availableVariants.length > 0) {
      return item.availableVariants;
    }
    const prodId = item.productId || item.id;
    return prodId ? productVariantsCache.get(prodId) || [] : [];
  });

  const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(() => {
    if (item.availableVariants && item.availableVariants.length > 0) return false;
    const prodId = item.productId || item.id;
    if (prodId && productVariantsCache.has(prodId)) return false;
    return Boolean(prodId && (item.variantId || item.size || item.shade || item.color));
  });

  const [isVariantMenuOpen, setIsVariantMenuOpen] = useState(false);
  const [isSwitchingVariant, setIsSwitchingVariant] = useState(false);
  const [optimisticVariant, setOptimisticVariant] = useState<ProductVariantItem | null>(null);

  // Sync optimisticVariant when item.variantId updates externally
  useEffect(() => {
    setOptimisticVariant(null);
  }, [item.variantId]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real product variants from /api/products/[id] if not already available
  useEffect(() => {
    const prodId = item.productId || item.id;
    if (!prodId) return;

    if (item.availableVariants && item.availableVariants.length > 0) {
      setVariants(item.availableVariants);
      productVariantsCache.set(prodId, item.availableVariants);
      setIsLoadingVariants(false);
      return;
    }

    const cached = productVariantsCache.get(prodId);
    if (cached && cached.length > 0) {
      setVariants(cached);
      setIsLoadingVariants(false);
      return;
    }

    let isMounted = true;
    setIsLoadingVariants(true);
    fetch(`/api/products/${encodeURIComponent(prodId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.product?.variants) return;
        const fetchedVars: ProductVariantItem[] = data.product.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price ? Number(v.price) : Number(data.product.price),
          stock: v.stock !== undefined ? Number(v.stock) : undefined,
          sku: v.sku,
          attributes: v.attributes,
          image: v.image || null,
        }));
        productVariantsCache.set(prodId, fetchedVars);
        setVariants(fetchedVars);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingVariants(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.productId, item.id, item.availableVariants]);

  // Click outside and Escape listener for open variant menu
  useEffect(() => {
    if (!isVariantMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVariantMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVariantMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVariantMenuOpen]);

  const activeVariant = useMemo(() => {
    if (optimisticVariant) return optimisticVariant;
    return variants.find((v) => v.id === item.variantId) || (variants.length > 0 ? variants[0] : null);
  }, [optimisticVariant, variants, item.variantId]);

  const activeSize = useMemo(() => {
    return item.size || (activeVariant ? getVariantSize(activeVariant) : null);
  }, [item.size, activeVariant]);

  const saveAmount = useMemo(() => {
    const regularVariantPrice = activeVariant?.price;
    if (regularVariantPrice && regularVariantPrice > item.price) {
      return regularVariantPrice - item.price;
    }
    const rawOriginal = (item as unknown as { originalPrice?: number }).originalPrice;
    if (rawOriginal && rawOriginal > item.price) {
      return rawOriginal - item.price;
    }
    return 0;
  }, [activeVariant?.price, item]);

  // Handler: Change variant atomically with instant 0ms optimistic UI reaction
  const handleSelectVariant = async (targetVar: ProductVariantItem) => {
    setIsVariantMenuOpen(false);
    if (targetVar.id === item.variantId) return;

    setOptimisticVariant(targetVar);
    setIsSwitchingVariant(true);
    try {
      await updateItemVariant(item.id, targetVar);
    } finally {
      setIsSwitchingVariant(false);
    }
  };

  const hasMultipleVariants = variants.length > 1;

  return (
    <article
      className={`${
        isSummary
          ? "flex items-center gap-3"
          : isCompact
            ? "border-b border-black/[0.08] bg-transparent py-4 md:py-2 transition-colors last:border-b-0"
            : "rounded-[28px] border border-minsah-border-soft bg-minsah-panel p-4 shadow-sm"
      } ${className}`}
    >
      <div className={isSummary ? "contents" : "flex gap-3.5 md:gap-2.5 items-center"}>
        <div
          className={`relative flex-shrink-0 overflow-hidden aspect-square rounded-xl bg-stone-100 dark:bg-zinc-800 border border-black/[0.06] dark:border-white/10 ${
            isSummary ? "h-12 w-12" : isCompact ? "h-[72px] w-[72px] md:h-[54px] md:w-[54px]" : "h-24 w-24 rounded-2xl"
          }`}
        >
          <Image
            src={safeImageUrl(activeVariant?.image || item.variantImage || item.image)}
            alt={item.name}
            fill
            sizes={`${imageSize}px`}
            className="object-cover"
          />

          {isSwitchingVariant && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 size={16} className="animate-spin text-[#1B361B] dark:text-emerald-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`${isSummary ? "text-sm font-bold text-minsah-text" : isCompact ? "text-[13px] sm:text-[14px] md:text-[12.5px] font-medium text-[#181C1A] leading-snug" : "text-base font-bold text-minsah-text"} line-clamp-2 md:line-clamp-1`}
              >
                {item.name}
              </h3>

              {/* ── Custom Rich Variant Selector [ {image thumbnail} {color/shade} {size} {price} ] ── */}
              {!isSummary && isLoadingVariants && variants.length <= 1 ? (
                /* Sleek Shimmer Skeleton with exact selector dimensions to eliminate CLS */
                <div className="mt-1.5 md:mt-1 w-full h-8 sm:h-8.5 md:h-7 px-2.5 md:px-2 flex items-center justify-between rounded-xl border border-stone-200/70 dark:border-white/10 bg-stone-50/70 dark:bg-zinc-800/50 animate-pulse">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-4 md:w-4 rounded-md bg-stone-200 dark:bg-zinc-700 aspect-square shrink-0" />
                    <span className="text-[11px] sm:text-xs md:text-[10.5px] font-medium text-stone-400 truncate">
                      {variantLabel || "Loading options..."}
                    </span>
                  </div>
                  <ChevronDown size={12} className="text-stone-300 md:scale-90 shrink-0" />
                </div>
              ) : !isSummary && hasMultipleVariants ? (
                <div ref={containerRef} className="mt-1.5 md:mt-1 w-full relative">
                  <button
                    type="button"
                    onClick={() => setIsVariantMenuOpen((prev) => !prev)}
                    aria-expanded={isVariantMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={`Change variant for ${item.name}. Currently: ${activeVariant ? getVariantShadeName(activeVariant) : item.name}`}
                    className={`w-full h-8 sm:h-8.5 md:h-7 px-2.5 md:px-2 flex items-center justify-between gap-1.5 rounded-xl border bg-white dark:bg-zinc-800/90 text-left transition-all shadow-2xs cursor-pointer ${
                      isVariantMenuOpen
                        ? "border-[#1B361B] ring-1 ring-[#1B361B]/30 dark:border-emerald-400 dark:ring-emerald-400"
                        : "border-stone-200 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/30"
                    }`}
                  >
                    {/* Left: Mini Equal Square Thumbnail + Shade + Size */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="relative h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-4 md:w-4 rounded-md overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800 aspect-square">
                        <Image
                          src={safeImageUrl(activeVariant?.image || item.variantImage || item.image)}
                          alt={activeVariant?.name || item.name}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[11px] sm:text-xs md:text-[10.5px] font-semibold text-[#181C1A] dark:text-white truncate max-w-[100px] sm:max-w-[140px]">
                        {activeVariant ? getVariantShadeName(activeVariant) : (item.shade || item.color || item.name)}
                      </span>
                      {activeSize && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-700/80 text-[9px] md:text-[8px] font-mono text-stone-600 dark:text-stone-300 leading-none">
                          {activeSize}
                        </span>
                      )}
                    </div>

                    {/* Right: Price + Animated Chevron */}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="font-inter font-bold text-[11px] md:text-[10px] text-[#1B361B] dark:text-emerald-400">
                        ৳{Math.round(activeVariant?.price ?? item.price)}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-stone-500 transition-transform duration-200 md:scale-90 ${
                          isVariantMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Floating Luxury Vertical Track Dropdown */}
                  {isVariantMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Available variants"
                      className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-w-[280px] rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[9px] uppercase font-bold text-stone-400 dark:text-stone-500 px-3 py-1.5 tracking-wider bg-stone-50/70 dark:bg-zinc-800/40 border-b border-stone-100 dark:border-white/5">
                        Select Variant ({variants.length} available)
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 dark:divide-white/5 py-0.5 scroll-smooth no-scrollbar">
                        {variants.map((v) => {
                          const isSelected = v.id === item.variantId;
                          const isOOS = v.stock !== undefined && v.stock <= 0;
                          const vSize = getVariantSize(v);
                          const vShade = getVariantShadeName(v);
                          const vImage = v.image || item.image;

                          return (
                            <button
                              key={`cart-var-${item.id}-${v.id}`}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              disabled={isOOS || isSwitchingVariant}
                              onClick={() => handleSelectVariant(v)}
                              className={`w-full px-2.5 py-2 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-[#E5EAE1] dark:bg-emerald-950/40 text-[#1B361B] dark:text-emerald-200"
                                  : isOOS
                                  ? "opacity-40 cursor-not-allowed bg-stone-50/40 dark:bg-zinc-800/30"
                                  : "hover:bg-stone-50 dark:hover:bg-zinc-800/70 text-stone-800 dark:text-stone-200"
                              }`}
                            >
                              {/* Left: Thumbnail + Shade + Size */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="relative h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800">
                                  {vImage ? (
                                    <Image
                                      src={vImage}
                                      alt={v.name}
                                      fill
                                      sizes="32px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-stone-500">
                                      {v.name.slice(0, 3)}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate leading-tight">
                                    {vShade}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                                    {vSize && <span className="font-mono">Size: {vSize}</span>}
                                    {vSize && <span>•</span>}
                                    <span>{isOOS ? "Sold out" : "In Stock"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Price & Check */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-inter font-bold text-xs text-[#1B361B] dark:text-emerald-400">
                                  ৳{Math.round(v.price)}
                                </span>
                                {isSelected && (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1B361B] dark:bg-emerald-400 text-white dark:text-zinc-950 shadow-2xs">
                                    <Check size={9} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Static variant label if product has 0 or 1 variant */
                variantLabel && (
                  <p className={`mt-0.5 line-clamp-1 text-xs ${isCompact ? "text-[#667085] font-normal" : "font-medium text-minsah-muted"}`}>
                    {variantLabel}
                  </p>
                )
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
            <div className={`flex items-center justify-between gap-2 ${isCompact ? "mt-2.5 md:mt-1.5" : "mt-3"}`}>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <p
                  className={`${isCompact ? "text-[14px] sm:text-[15px] md:text-[13px] font-bold text-[#181C1A]" : "text-base font-black text-minsah-primary"}`}
                >
                  {formatPrice(
                    optimisticVariant
                      ? (item.isBundle
                          ? Math.round(optimisticVariant.price * (item.bundleDiscountRatio ?? 1))
                          : optimisticVariant.price)
                      : item.price
                  )}
                </p>
                {saveAmount > 0 && (
                  <span className="inline-flex items-center px-1.5 md:px-1 py-0.5 md:py-[1px] rounded-md bg-[#EAF5EC] dark:bg-emerald-950/60 border border-[#D4EBD9] dark:border-emerald-500/25 text-[#1E6839] dark:text-emerald-300 font-inter text-[10px] md:text-[9px] font-bold leading-tight shadow-2xs">
                    Save ৳{Math.round(saveAmount)}
                  </span>
                )}
                {showLineTotal && item.quantity > 1 && (
                  <p className="w-full mt-0.5 text-xs text-minsah-muted">
                    Line total: {formatPrice(item.price * item.quantity)}
                  </p>
                )}
              </div>

              {onQuantityChange && (
                isCompact ? (
                  <div
                    className="grid grid-cols-3 items-center h-[32px] md:h-[26px] w-[86px] md:w-[74px] rounded-full border border-[#D0D5DD] bg-white shadow-xs overflow-hidden select-none"
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
                      style={{ minBlockSize: 0, minHeight: 0 }}
                      className="h-full w-full p-0 m-0 flex items-center justify-center text-[#181C1A] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 focus:outline-none"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={11} strokeWidth={2} aria-hidden="true" className="md:scale-90" />
                    </button>
                    <div
                      style={{ minBlockSize: 0, minHeight: 0 }}
                      className="h-full w-full p-0 m-0 flex items-center justify-center overflow-hidden"
                    >
                      <span
                        key={item.quantity}
                        className="text-xs md:text-[11px] font-semibold leading-none text-[#181C1A] text-center inline-flex items-center justify-center animate-counter-pop select-none"
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
                      style={{ minBlockSize: 0, minHeight: 0 }}
                      className="h-full w-full p-0 m-0 flex items-center justify-center text-[#181C1A] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 focus:outline-none"
                      aria-label={
                        isAtMaxQuantity
                          ? `${item.name} maximum quantity reached`
                          : `Increase ${item.name}`
                      }
                    >
                      <Plus size={11} strokeWidth={2} aria-hidden="true" className="md:scale-90" />
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
