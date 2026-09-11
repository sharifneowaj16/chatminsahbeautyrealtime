"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Gift,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  X,
} from "lucide-react";

import { Drawer } from "@/components/ui/Drawer";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import CartItemRow from "@/features/cart/CartItemRow";
import { formatPrice } from "@/utils/currency";

interface CrossSellProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  subtitle: string;
  badge?: string;
}

// Curated beauty cross-sells matching Seed.com "Bundle + Save" aesthetic
const CROSS_SELL_PRODUCTS: CrossSellProduct[] = [
  {
    id: "prod-addon-lip",
    name: "Hydra-Peptide Lip Therapy Balm",
    price: 650,
    originalPrice: 850,
    image: "/images/categories/Lip_Care.png",
    subtitle: "Nourishing barrier care",
    badge: "Save 25%",
  },
  {
    id: "prod-addon-serum",
    name: "Advanced Niacinamide Glow Serum",
    price: 1150,
    originalPrice: 1450,
    image: "/images/categories/Serum.png",
    subtitle: "Clinical radiance booster",
    badge: "Top Pick",
  },
  {
    id: "prod-addon-sun",
    name: "Ultra-Light Invisible Sunscreen SPF50+",
    price: 990,
    originalPrice: 1250,
    image: "/images/categories/Sunscreen.png",
    subtitle: "Invisible daily UV veil",
    badge: "Popular",
  },
  {
    id: "prod-addon-skincare",
    name: "Radiance Essentials Duo Bundle",
    price: 1950,
    originalPrice: 2450,
    image: "/images/categories/Skincare.png",
    subtitle: "Complete clinical reset",
    badge: "Bundle",
  },
];

export default function CartDrawer() {
  const router = useRouter();
  const { isOpen, closeDrawer } = useCartDrawer();
  const {
    items,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    cartLoading,
    promoCode,
    applyPromoCode,
    removePromoCode,
    discount,
    freeDeliveryThreshold = 1100,
    isFreeDeliveryUnlocked: isContextFreeUnlocked,
  } = useCart();

  const [busyItemIds, setBusyItemIds] = useState<string[]>([]);
  const [addingAddonId, setAddingAddonId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [isPromoExpanded, setIsPromoExpanded] = useState(false);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;

  // Free delivery calculations (Universal Offer Engine sync)
  const targetThreshold = freeDeliveryThreshold;
  const isFreeDeliveryUnlocked = Boolean(isContextFreeUnlocked || subtotal >= targetThreshold);
  const remainingForFreeDelivery = isFreeDeliveryUnlocked ? 0 : Math.max(0, targetThreshold - subtotal);
  const progressPercent = isFreeDeliveryUnlocked ? 100 : Math.min(100, Math.round((subtotal / targetThreshold) * 100));

  const markBusy = async (itemId: string, action: () => Promise<boolean>) => {
    if (busyItemIds.includes(itemId)) return;
    setBusyItemIds((current) => [...current, itemId]);
    try {
      await action();
    } finally {
      setBusyItemIds((current) => current.filter((id) => id !== itemId));
    }
  };

  const handleApplyCoupon = (codeToUse?: string) => {
    const code = codeToUse || couponInput;
    if (!code.trim()) return;
    setCouponLoading(true);
    try {
      applyPromoCode(code);
      setCouponInput("");
      setIsPromoExpanded(false);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleAddCrossSell = async (addon: CrossSellProduct) => {
    setAddingAddonId(addon.id);
    try {
      await addItem({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: 1,
        image: addon.image,
        variantName: addon.subtitle,
      });
    } finally {
      setAddingAddonId(null);
    }
  };

  const handleCheckout = () => {
    if (!hasItems) return;
    closeDrawer();
    router.push("/checkout");
  };

  // Bundle and regular item breakdown for coupon applicability
  const nonBundleItems = items.filter(
    (item) =>
      !item.isBundle &&
      !item.bundleId &&
      !(typeof item.id === "string" && item.id.startsWith("bundle-")),
  );
  const hasOnlyBundles = hasItems && nonBundleItems.length === 0;

  // Auto-remove promo code if cart transitions to only bundles
  useEffect(() => {
    if (hasOnlyBundles && promoCode) {
      removePromoCode();
    }
  }, [hasOnlyBundles, promoCode, removePromoCode]);

  // Seed-inspired Custom Drawer Header
  const customTitle = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2.5">
        <h2 className="text-2xl font-semibold text-[#1B361B] tracking-tight font-sans">
          Your Cart
        </h2>
        {hasItems && (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E8E8E2] text-[#1B361B]">
            {totalQuantity}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={closeDrawer}
        className="w-9 h-9 rounded-full bg-[#E8E8E2] hover:bg-[#DFDFD8] flex items-center justify-center text-[#1B361B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1B361B]/20 cursor-pointer"
        aria-label="Close cart drawer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  // Available cross-sells filtered against existing cart items
  const availableCrossSells = CROSS_SELL_PRODUCTS.filter(
    (addon) => !items.some((item) => item.id === addon.id || item.name === addon.name),
  );

  // Sticky Seed-style Footer
  const drawerFooter = hasItems ? (
    <div className="w-full bg-[#F4F4F0] px-6 pt-4 pb-6 border-t border-black/[0.08] space-y-3.5">
      {/* ── Promo Code Accordion / Active Status ── */}
      {hasOnlyBundles ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-900">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="leading-snug">
            <strong className="font-semibold">Special Bundle Savings:</strong> Coupons apply to individual items.
          </span>
        </div>
      ) : discount > 0 && promoCode ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-bold tracking-wider text-emerald-900">{promoCode}</span>
            <span className="font-semibold text-emerald-700">(-{formatPrice(discount)} OFF)</span>
          </div>
          <button
            type="button"
            onClick={removePromoCode}
            className="rounded-full p-1 text-gray-400 hover:bg-emerald-100 hover:text-red-600 transition-colors cursor-pointer"
            aria-label="Remove coupon"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsPromoExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B361B] hover:underline cursor-pointer transition-all"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Apply Promo Code</span>
            {isPromoExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {isPromoExpanded && (
            <div className="rounded-xl border border-black/[0.08] bg-white p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="Promo code (e.g. SAVE10)"
                  className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-base md:text-xs font-semibold uppercase tracking-wider text-[#181C1A] placeholder:normal-case placeholder:font-normal placeholder:text-stone-400 focus:border-[#1B361B] focus:outline-none focus:ring-1 focus:ring-[#1B361B]"
                />
                <button
                  type="button"
                  disabled={!couponInput.trim() || couponLoading}
                  onClick={() => handleApplyCoupon()}
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-[#1B361B] text-white hover:bg-[#254825] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </button>
              </div>

              {/* Quick Suggestions */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-gray-500 pt-0.5 no-scrollbar">
                <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1 shrink-0">
                  <Gift className="h-3 w-3 text-[#1B361B]" /> Offers:
                </span>
                {["WELCOME10", "SAVE10", "SAVE20", "MINSAH10"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleApplyCoupon(code)}
                    className="rounded-full border border-dashed border-[#1B361B]/30 bg-[#F4F4F0] px-2 py-0.5 font-semibold text-[#1B361B] hover:bg-[#1B361B] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Total & Pricing Breakdown ── */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-base font-semibold text-[#1B361B]">Total</span>
          <p className="text-[11px] text-[#667085]">
            {isFreeDeliveryUnlocked
              ? "Free delivery unlocked • Taxes included"
              : "Shipping calculated at checkout"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-[#1B361B]">
            {formatPrice(Math.max(0, subtotal - discount))}
          </span>
          {discount > 0 && (
            <span className="block text-[11px] font-semibold text-emerald-700">
              Saved -{formatPrice(discount)}
            </span>
          )}
        </div>
      </div>

      {/* ── Seed-style Capsule Checkout Button ── */}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={cartLoading || !hasItems}
        className="w-full h-[54px] rounded-full bg-[#1B361B] hover:bg-[#254825] active:scale-[0.99] text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(27,54,27,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span>Checkout</span>
        <span className="text-white/60">•</span>
        <span>{formatPrice(Math.max(0, subtotal - discount))}</span>
      </button>

      {/* ── Trust Indicators ── */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-[#667085] pt-1">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1B361B]" /> 100% Authentic
        </span>
        <span>•</span>
        <span>Cash on Delivery</span>
        <span>•</span>
        <span>Fast Dispatch</span>
      </div>
    </div>
  ) : undefined;

  return (
    <Drawer
      open={isOpen}
      onClose={closeDrawer}
      side="right"
      size="md"
      title={customTitle}
      showCloseButton={false}
      panelClassName="bg-[#F4F4F0] text-[#181C1A] sm:max-w-[460px] w-full sm:rounded-l-[24px] shadow-[0_20px_48px_rgba(0,0,0,0.16)] border-l border-black/5"
      backdropClassName="bg-black/40 backdrop-blur-[4px]"
      headerClassName="border-b border-black/[0.06] bg-[#F4F4F0] px-6 py-5 shrink-0"
      bodyClassName="p-0 bg-[#F4F4F0] overflow-y-auto"
      footer={drawerFooter}
      footerClassName="p-0 border-t border-black/[0.08] bg-[#F4F4F0]"
    >
      {hasItems ? (
        <div className="flex flex-col min-h-full pb-4">
          {/* ── Seed Incentive / Free Delivery Goal Banner ── */}
          <div className="px-6 pt-4 pb-2">
            <div className="rounded-xl border border-[#1B361B]/15 bg-[#E9EDE4] p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1B361B]">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#1B361B] shrink-0" />
                  {isFreeDeliveryUnlocked ? (
                    <span className="font-semibold">
                      🎉 Congratulations! You unlocked <strong className="underline decoration-[#1B361B]/50 font-bold">FREE Delivery</strong>
                    </span>
                  ) : (
                    <span>
                      Add <strong className="font-bold">{formatPrice(remainingForFreeDelivery)}</strong> more for <strong className="font-bold">FREE Delivery</strong>
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-[#1B361B]/70 shrink-0">
                  {progressPercent}%
                </span>
              </div>

              {/* Minimal Progress Bar */}
              <div className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[#1B361B] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Cart Items List ── */}
          <div className="px-6 divide-y divide-black/[0.08]">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                density="compact"
                busy={busyItemIds.includes(item.id)}
                onQuantityChange={(nextQuantity) =>
                  void markBusy(item.id, () => updateQuantity(item.id, nextQuantity))
                }
                onRemove={() => void markBusy(item.id, () => removeItem(item.id))}
              />
            ))}
          </div>

          {/* ── Seed-style Cross-Sell ("Bundle + Save") Carousel ── */}
          {availableCrossSells.length > 0 && (
            <div className="mt-4 pt-3 border-t border-black/[0.06]">
              <div className="px-6 mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1B361B]">
                  Bundle + Save (Add-ons)
                </h3>
                <span className="text-[10px] font-semibold text-[#1B361B]/60">
                  Special Prices
                </span>
              </div>

              <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
                {availableCrossSells.map((addon) => (
                  <div
                    key={addon.id}
                    className="w-[240px] shrink-0 rounded-xl bg-[#EAEAE4] p-3 flex items-center gap-3 border border-black/5 hover:border-black/15 transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white p-1 overflow-hidden shrink-0 flex items-center justify-center">
                      <Image
                        src={addon.image}
                        alt={addon.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-[#1B361B] truncate">
                        {addon.name}
                      </h4>
                      <p className="text-[11px] text-[#667085] truncate">
                        {addon.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-[#1B361B]">
                          {formatPrice(addon.price)}
                        </span>
                        {addon.originalPrice && (
                          <span className="text-[10px] text-stone-400 line-through">
                            {formatPrice(addon.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={addingAddonId === addon.id}
                      onClick={() => handleAddCrossSell(addon)}
                      className="rounded-full border border-[#1B361B] bg-transparent hover:bg-[#1B361B] hover:text-white text-[#1B361B] text-xs font-semibold px-2.5 py-1 transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {addingAddonId === addon.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Seed-style Minimalist Empty Cart State ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E8E8E2] flex items-center justify-center text-[#1B361B]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#1B361B]">
              Your cart is currently empty
            </h3>
            <p className="text-xs text-[#667085] max-w-[260px] mx-auto leading-relaxed">
              Explore our clinically-tested skincare formulas and curated daily routines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              closeDrawer();
              router.push("/shop");
            }}
            className="rounded-full bg-[#1B361B] hover:bg-[#254825] text-white px-7 py-3 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            Shop Best Sellers →
          </button>
        </div>
      )}
    </Drawer>
  );
}
