"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, Check, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart, type CartItem, type ProductVariantItem } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/currency";
import { Button } from "@/components/ui/Button";
import { extractVariantAttributes } from "@/utils/cartItemHelper";

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

/**
 * Resolves color swatch hex code based on explicit hex attribute or common beauty shade names.
 */
function getSwatchColor(shadeName?: string | null, hexAttr?: string | null): string {
  if (hexAttr && (hexAttr.startsWith("#") || hexAttr.startsWith("rgb"))) {
    return hexAttr;
  }
  if (!shadeName) return "#D3B89D";
  const s = shadeName.toLowerCase();
  const hexMatch = shadeName.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
  if (hexMatch) return hexMatch[0];

  if (s.includes("fair") || s.includes("porcelain") || s.includes("ivory") || s.includes("bone")) return "#F9DEC9";
  if (s.includes("light") && s.includes("medium")) return "#DFC3A5";
  if (s.includes("light") || s.includes("vanilla") || s.includes("creme") || s.includes("cream")) return "#EFC9A8";
  if (s.includes("medium") || s.includes("natural") || s.includes("beige") || s.includes("sand")) return "#D5A67D";
  if (s.includes("tan") || s.includes("honey") || s.includes("caramel") || s.includes("golden")) return "#B87F53";
  if (s.includes("deep") || s.includes("espresso") || s.includes("rich") || s.includes("dark") || s.includes("chestnut") || s.includes("mocha")) return "#664028";
  if (s.includes("rose") || s.includes("blush") || s.includes("pink")) return "#E89EA0";
  if (s.includes("red") || s.includes("crimson") || s.includes("ruby")) return "#B82835";
  if (s.includes("nude") || s.includes("mauve")) return "#C79A8B";
  if (s.includes("coral") || s.includes("peach")) return "#F69F86";
  if (s.includes("berry") || s.includes("plum") || s.includes("wine")) return "#7E2D4E";
  if (s.includes("clear") || s.includes("invisible") || s.includes("transparent")) return "#F5F5F0";
  return "#D9B596"; // Natural beauty skin-tone default
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

function getVariantShadeOrType(v: ProductVariantItem): { label: string; value: string; isColor: boolean; hex?: string } | null {
  const attrs = v.attributes || {};
  const shadeKeys = ["shade", "Shade", "shadeName", "color", "Color", "colour"];
  for (const k of shadeKeys) {
    if (attrs[k]) {
      const val = String(attrs[k]).trim();
      const hex = attrs["hex"] || attrs["colorHex"] || attrs["hexCode"];
      return { label: "Shade", value: val, isColor: true, hex: typeof hex === "string" ? hex : undefined };
    }
  }

  const typeKeys = ["type", "Type", "skinType", "skin_type", "Skin Type", "formulation"];
  for (const k of typeKeys) {
    if (attrs[k]) {
      const val = String(attrs[k]).trim();
      return { label: "Type", value: val, isColor: false };
    }
  }

  // Fallback: check extracted shade attribute
  const extracted = extractVariantAttributes(attrs, v.name);
  if (extracted.shade) {
    return { label: "Shade", value: extracted.shade, isColor: true };
  }
  if (extracted.color) {
    return { label: "Color", value: extracted.color, isColor: true };
  }

  return null;
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
  const imageClass = isSummary
    ? "h-12 w-12 rounded-xl"
    : isCompact
      ? "h-[72px] w-[72px] rounded-lg bg-[#EAEAE4] shrink-0"
      : "h-24 w-24 rounded-3xl";

  // Available real product variants
  const [variants, setVariants] = useState<ProductVariantItem[]>(() => {
    if (item.availableVariants && item.availableVariants.length > 0) {
      return item.availableVariants;
    }
    const prodId = item.productId || item.id;
    return prodId ? productVariantsCache.get(prodId) || [] : [];
  });

  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [isShadeDropdownOpen, setIsShadeDropdownOpen] = useState(false);
  const [isOptionDropdownOpen, setIsOptionDropdownOpen] = useState(false);
  const [isSwitchingVariant, setIsSwitchingVariant] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real product variants from /api/products/[id] if not already available
  useEffect(() => {
    const prodId = item.productId || item.id;
    if (!prodId) return;

    if (item.availableVariants && item.availableVariants.length > 0) {
      setVariants(item.availableVariants);
      productVariantsCache.set(prodId, item.availableVariants);
      return;
    }

    const cached = productVariantsCache.get(prodId);
    if (cached && cached.length > 0) {
      setVariants(cached);
      return;
    }

    let isMounted = true;
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
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [item.productId, item.id, item.availableVariants]);

  // Click outside listener for open dropdown menus
  useEffect(() => {
    if (!isSizeDropdownOpen && !isShadeDropdownOpen && !isOptionDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSizeDropdownOpen(false);
        setIsShadeDropdownOpen(false);
        setIsOptionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSizeDropdownOpen, isShadeDropdownOpen, isOptionDropdownOpen]);

  // Extract distinct available sizes and shades/types from real variants
  const { availableSizes, availableShadesOrTypes, currentSize, currentShadeOrType } = useMemo(() => {
    const sizeMap = new Map<string, { size: string; price?: number; stock?: number }>();
    const shadeMap = new Map<string, { label: string; value: string; isColor: boolean; hex?: string; stock?: number }>();

    variants.forEach((v) => {
      const sizeVal = getVariantSize(v);
      if (sizeVal && !sizeMap.has(sizeVal)) {
        sizeMap.set(sizeVal, { size: sizeVal, price: v.price, stock: v.stock });
      }

      const shadeVal = getVariantShadeOrType(v);
      if (shadeVal && !shadeMap.has(shadeVal.value)) {
        shadeMap.set(shadeVal.value, { ...shadeVal, stock: v.stock });
      }
    });

    const activeVar = variants.find((v) => v.id === item.variantId) || null;
    const activeSize = item.size || (activeVar ? getVariantSize(activeVar) : null);
    const activeShade = activeVar ? getVariantShadeOrType(activeVar) : null;

    return {
      availableSizes: Array.from(sizeMap.values()),
      availableShadesOrTypes: Array.from(shadeMap.values()),
      currentSize: activeSize,
      currentShadeOrType: activeShade || (item.shade || item.color ? { label: "Shade", value: (item.shade || item.color) as string, isColor: true } : null),
    };
  }, [variants, item.variantId, item.size, item.shade, item.color]);

  // Handler: Change Size
  const handleSelectSize = async (newSize: string) => {
    setIsSizeDropdownOpen(false);
    if (newSize === currentSize) return;

    const matchingSize = variants.filter((v) => getVariantSize(v) === newSize);
    if (matchingSize.length === 0) return;

    // Preserve current shade if multi-attribute
    let target = currentShadeOrType?.value
      ? matchingSize.find((v) => getVariantShadeOrType(v)?.value === currentShadeOrType.value)
      : null;

    if (!target) {
      target = matchingSize[0];
    }

    if (target && target.id !== item.variantId) {
      setIsSwitchingVariant(true);
      try {
        await updateItemVariant(item.id, target);
      } finally {
        setIsSwitchingVariant(false);
      }
    }
  };

  // Handler: Change Shade / Type
  const handleSelectShadeOrType = async (newShadeVal: string) => {
    setIsShadeDropdownOpen(false);
    if (newShadeVal === currentShadeOrType?.value) return;

    const matchingShade = variants.filter((v) => getVariantShadeOrType(v)?.value === newShadeVal);
    if (matchingShade.length === 0) return;

    // Preserve current size if multi-attribute
    let target = currentSize
      ? matchingShade.find((v) => getVariantSize(v) === currentSize)
      : null;

    if (!target) {
      target = matchingShade[0];
    }

    if (target && target.id !== item.variantId) {
      setIsSwitchingVariant(true);
      try {
        await updateItemVariant(item.id, target);
      } finally {
        setIsSwitchingVariant(false);
      }
    }
  };

  // Handler: Change single-dimension variant option
  const handleSelectVariantOption = async (targetVar: ProductVariantItem) => {
    setIsOptionDropdownOpen(false);
    if (targetVar.id === item.variantId) return;

    setIsSwitchingVariant(true);
    try {
      await updateItemVariant(item.id, targetVar);
    } finally {
      setIsSwitchingVariant(false);
    }
  };

  const hasMultipleSizes = availableSizes.length > 1;
  const hasMultipleShadesOrTypes = availableShadesOrTypes.length > 1;
  const hasMultipleVariants = variants.length > 1;
  const activeVariantName = variants.find((v) => v.id === item.variantId)?.name || item.variantName;

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
          className={`${imageClass} flex-shrink-0 overflow-hidden relative ${isCompact ? "border border-black/[0.04]" : "bg-minsah-light"}`}
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

          {isSwitchingVariant && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#1B361B]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`${isSummary ? "text-sm font-bold text-minsah-text" : isCompact ? "text-[14px] font-[500] text-[#181C1A] leading-snug" : "text-base font-bold text-minsah-text"} line-clamp-2`}
              >
                {item.name}
              </h3>

              {/* ── Interactive Variant Selector Pill Buttons (Size & Shade/Type Dropdowns) ── */}
              {!isSummary && hasMultipleVariants ? (
                <div ref={containerRef} className="mt-1.5 flex flex-wrap items-center gap-1.5 relative">
                  {/* 1. Size Dropdown Pill (when product has size/volume variants) */}
                  {hasMultipleSizes && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSizeDropdownOpen((prev) => !prev);
                          setIsShadeDropdownOpen(false);
                          setIsOptionDropdownOpen(false);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-[300] transition-all select-none shadow-2xs cursor-pointer ${
                          isSizeDropdownOpen
                            ? "border-[#1B361B] bg-[#E5EAE1] text-[#1B361B] ring-1 ring-[#1B361B]/30"
                            : "border-stone-300/90 bg-stone-100/90 hover:bg-stone-200/80 text-[#181C1A] dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200"
                        }`}
                        aria-expanded={isSizeDropdownOpen}
                        aria-label="Select size"
                      >
                        <span className="font-[300] text-stone-500 dark:text-stone-400">Size:</span>
                        <span className="font-[300]">{currentSize || "Select"}</span>
                        <ChevronDown
                          size={11}
                          className={`text-stone-500 transition-transform duration-150 ${isSizeDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Size Options Dropdown Menu */}
                      {isSizeDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[145px] max-w-[200px] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="text-[10px] uppercase font-[300] text-stone-400 px-2 py-1 tracking-wider">
                            Choose Size
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                            {availableSizes.map((sizeOpt) => {
                              const isSelected = sizeOpt.size === currentSize;
                              const isOOS = sizeOpt.stock !== undefined && sizeOpt.stock <= 0;
                              return (
                                <button
                                  key={`size-opt-${sizeOpt.size}`}
                                  type="button"
                                  disabled={isOOS}
                                  onClick={() => handleSelectSize(sizeOpt.size)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-[300] transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-[#E5EAE1] text-[#1B361B]"
                                      : isOOS
                                      ? "opacity-40 cursor-not-allowed text-stone-400"
                                      : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  <span className="truncate">{sizeOpt.size}</span>
                                  {isSelected ? (
                                    <Check size={12} className="text-[#1B361B] shrink-0 ml-1.5" />
                                  ) : isOOS ? (
                                    <span className="text-[9px] text-stone-400 shrink-0 ml-1">Sold out</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Shade / Skin Type Dropdown Pill (with color swatch dot) */}
                  {hasMultipleShadesOrTypes && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsShadeDropdownOpen((prev) => !prev);
                          setIsSizeDropdownOpen(false);
                          setIsOptionDropdownOpen(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-[300] transition-all select-none shadow-2xs cursor-pointer ${
                          isShadeDropdownOpen
                            ? "border-[#1B361B] bg-[#E5EAE1] text-[#1B361B] ring-1 ring-[#1B361B]/30"
                            : "border-stone-300/90 bg-stone-100/90 hover:bg-stone-200/80 text-[#181C1A] dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200"
                        }`}
                        aria-expanded={isShadeDropdownOpen}
                        aria-label="Select shade or formulation type"
                      >
                        {currentShadeOrType?.isColor && (
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/15 shadow-2xs shrink-0"
                            style={{
                              backgroundColor: getSwatchColor(currentShadeOrType.value, currentShadeOrType.hex),
                            }}
                          />
                        )}
                        <span className="font-[300] text-stone-500 dark:text-stone-400">
                          {currentShadeOrType?.label || "Shade"}:
                        </span>
                        <span className="font-[300] truncate max-w-[110px]">
                          {currentShadeOrType?.value || "Select"}
                        </span>
                        <ChevronDown
                          size={11}
                          className={`text-stone-500 transition-transform duration-150 ${isShadeDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Shade / Type Options Dropdown Menu */}
                      {isShadeDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] max-w-[220px] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="text-[10px] uppercase font-[300] text-stone-400 px-2 py-1 tracking-wider">
                            Choose {currentShadeOrType?.label || "Option"}
                          </div>
                          <div className="max-h-52 overflow-y-auto space-y-0.5 no-scrollbar">
                            {availableShadesOrTypes.map((shadeOpt) => {
                              const isSelected = shadeOpt.value === currentShadeOrType?.value;
                              const isOOS = shadeOpt.stock !== undefined && shadeOpt.stock <= 0;
                              const swatchBg = getSwatchColor(shadeOpt.value, shadeOpt.hex);
                              return (
                                <button
                                  key={`shade-opt-${shadeOpt.value}`}
                                  type="button"
                                  disabled={isOOS}
                                  onClick={() => handleSelectShadeOrType(shadeOpt.value)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-[300] transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-[#E5EAE1] text-[#1B361B]"
                                      : isOOS
                                      ? "opacity-40 cursor-not-allowed text-stone-400"
                                      : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate min-w-0">
                                    {shadeOpt.isColor && (
                                      <span
                                        className="h-3 w-3 rounded-full border border-black/15 shadow-2xs shrink-0"
                                        style={{ backgroundColor: swatchBg }}
                                      />
                                    )}
                                    <span className="truncate">{shadeOpt.value}</span>
                                  </div>
                                  {isSelected ? (
                                    <Check size={12} className="text-[#1B361B] shrink-0 ml-1.5" />
                                  ) : isOOS ? (
                                    <span className="text-[9px] text-stone-400 shrink-0 ml-1">Sold out</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Single-Dimension Variant Option Fallback (when multiple variants exist without parsed size/shade tags) */}
                  {!hasMultipleSizes && !hasMultipleShadesOrTypes && variants.length > 1 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOptionDropdownOpen((prev) => !prev);
                          setIsSizeDropdownOpen(false);
                          setIsShadeDropdownOpen(false);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-[300] transition-all select-none shadow-2xs cursor-pointer ${
                          isOptionDropdownOpen
                            ? "border-[#1B361B] bg-[#E5EAE1] text-[#1B361B] ring-1 ring-[#1B361B]/30"
                            : "border-stone-300/90 bg-stone-100/90 hover:bg-stone-200/80 text-[#181C1A] dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200"
                        }`}
                      >
                        <span className="font-[300] text-stone-500 dark:text-stone-400">Option:</span>
                        <span className="font-[300] truncate max-w-[120px]">
                          {activeVariantName || "Choose"}
                        </span>
                        <ChevronDown
                          size={11}
                          className={`text-stone-500 transition-transform duration-150 ${isOptionDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOptionDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[155px] max-w-[220px] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="text-[10px] uppercase font-[300] text-stone-400 px-2 py-1 tracking-wider">
                            Choose Option
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                            {variants.map((v) => {
                              const isSelected = v.id === item.variantId;
                              const isOOS = v.stock !== undefined && v.stock <= 0;
                              return (
                                <button
                                  key={`option-${v.id}`}
                                  type="button"
                                  disabled={isOOS}
                                  onClick={() => handleSelectVariantOption(v)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-[300] transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-[#E5EAE1] text-[#1B361B]"
                                      : isOOS
                                      ? "opacity-40 cursor-not-allowed text-stone-400"
                                      : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  <span className="truncate">{v.name}</span>
                                  {isSelected ? (
                                    <Check size={12} className="text-[#1B361B] shrink-0 ml-1.5" />
                                  ) : isOOS ? (
                                    <span className="text-[9px] text-stone-400 shrink-0 ml-1">Sold out</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
            <div className={`flex items-center justify-between gap-3 ${isCompact ? "mt-3" : "mt-3"}`}>
              <div>
                <p
                  className={`${isCompact ? "text-[15px] font-[450] text-[#181C1A]" : "text-base font-black text-minsah-primary"}`}
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
                      style={{ minBlockSize: 0, minHeight: 0 }}
                      className="h-full w-full p-0 m-0 flex items-center justify-center text-[#181C1A] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 focus:outline-none"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={11} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <div
                      style={{ minBlockSize: 0, minHeight: 0 }}
                      className="h-full w-full p-0 m-0 flex items-center justify-center overflow-hidden"
                    >
                      <span
                        key={item.quantity}
                        className="text-xs font-semibold leading-none text-[#181C1A] text-center inline-flex items-center justify-center animate-counter-pop select-none"
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
