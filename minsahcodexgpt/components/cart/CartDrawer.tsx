"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Gift,
  Loader2,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

import { Drawer } from "@/components/ui/Drawer";
import { useCart } from "@/contexts/CartContext";
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
  },
  {
    id: "prod-addon-serum",
    name: "Advanced Niacinamide Glow Serum",
    price: 1150,
    originalPrice: 1450,
    image: "/images/categories/Serum.png",
    subtitle: "Clinical radiance booster",
  },
  {
    id: "prod-addon-sun",
    name: "Ultra-Light Invisible Sunscreen SPF50+",
    price: 990,
    originalPrice: 1250,
    image: "/images/categories/Sunscreen.png",
    subtitle: "Invisible daily UV veil",
  },
  {
    id: "prod-addon-skincare",
    name: "Radiance Essentials Duo Bundle",
    price: 1950,
    originalPrice: 2450,
    image: "/images/categories/Skincare.png",
    subtitle: "Complete clinical reset",
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

  const hasItems = items.length > 0;

  // Free delivery calculations (Universal Offer Engine sync)
  const targetThreshold = freeDeliveryThreshold;
  const isFreeDeliveryUnlocked = Boolean(isContextFreeUnlocked || subtotal >= targetThreshold);
  const remainingForFreeDelivery = isFreeDeliveryUnlocked ? 0 : Math.max(0, targetThreshold - subtotal);

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

  // Available cross-sells filtered against existing cart items
  const availableCrossSells = CROSS_SELL_PRODUCTS.filter(
    (addon) => !items.some((item) => item.id === addon.id || item.name === addon.name),
  );

  // Seed.com 100% Pixel-Perfect Sticky Footer
  const drawerFooter = hasItems ? (
    <div className="w-full px-6 pt-5 pb-7 space-y-4">
      {/* ── Total & Pricing Breakdown ── */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[18px] font-[350] text-[#1B361B] tracking-tight font-sans">Total</span>
          <div className="text-right">
            <span className="text-[20px] font-[350] text-[#1B361B] font-sans">
              {formatPrice(Math.max(0, subtotal - discount))}
            </span>
            {discount > 0 && (
              <span className="block text-[11px] font-[350] text-emerald-700">
                Saved -{formatPrice(discount)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs font-[350] text-[#667085] mt-1">
          {isFreeDeliveryUnlocked
            ? "Free delivery unlocked • Taxes included"
            : "Shipping + taxes calculated at checkout"}
        </p>
      </div>

      {/* ── Seed-style Capsule Checkout Button (Clean "Checkout" text, no clutter) ── */}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={cartLoading || !hasItems}
        className="w-full h-[54px] rounded-full bg-[#1B361B] hover:bg-[#254825] active:scale-[0.99] text-white font-[350] text-base transition-all duration-200 flex items-center justify-center shadow-[0_4px_14px_rgba(27,54,27,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer tracking-wide"
      >
        Checkout
      </button>
    </div>
  ) : undefined;

  return (
    <Drawer
      open={isOpen}
      onClose={closeDrawer}
      side="right"
      variant="seed"
      title="Your Cart"
      closeLabel="Close cart drawer"
      footer={drawerFooter}
    >
      {hasItems ? (
        <div className="flex flex-col min-h-full pb-4">
          {/* ── Seed-style Bracketed Incentive Banner 【 🏷️ Save 25% when you add another product 】 ── */}
          <div className="px-6 pt-2 pb-3">
            <div className="rounded-lg bg-[#E5EAE1] px-4 py-3 text-center text-xs font-[450] text-[#1B361B] flex items-center justify-center gap-2">
              <span className="text-[#1B361B]/40 select-none">【</span>
              {isFreeDeliveryUnlocked ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#1B361B] shrink-0" />
                  <span>FREE Delivery Unlocked on your order</span>
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5 text-[#1B361B] shrink-0" />
                  <span>Add {formatPrice(remainingForFreeDelivery)} more for FREE Delivery</span>
                </>
              )}
              <span className="text-[#1B361B]/40 select-none">】</span>
            </div>
          </div>

          {/* ── Cart Items List ── */}
          <div className="px-6 divide-y divide-black/[0.06]">
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

          {/* ── Seed-style Cross-Sell ("Bundle + Save 25%") Carousel ── */}
          {availableCrossSells.length > 0 && (
            <div className="mt-5 pt-3 border-t border-black/[0.06]">
              <div className="px-6 mb-3">
                <h3 className="text-sm font-semibold text-[#1B361B]">
                  Bundle + Save 25%
                </h3>
              </div>

              <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-0.5">
                {availableCrossSells.map((addon) => (
                  <div
                    key={addon.id}
                    className="w-[230px] shrink-0 rounded-xl bg-[#EDECE6] p-3 flex items-center gap-3 border border-black/[0.04] hover:border-black/10 transition-all"
                  >
                    <div className="w-11 h-11 rounded-lg bg-white/80 p-1 overflow-hidden shrink-0 flex items-center justify-center">
                      <Image
                        src={addon.image}
                        alt={addon.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-[#1B361B] truncate">
                        {addon.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-[#1B361B]">
                          {formatPrice(addon.price)}
                        </span>
                        {addon.originalPrice && (
                          <span className="text-[11px] text-[#8A8F98] line-through">
                            {formatPrice(addon.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={addingAddonId === addon.id}
                      onClick={() => handleAddCrossSell(addon)}
                      className="rounded-full border border-[#1B361B] bg-transparent hover:bg-[#1B361B] hover:text-white text-[#1B361B] text-xs font-semibold px-3 py-1 transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
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

          {/* ── Seed-style "Apply Promo Code" Editorial Link ── */}
          {!hasOnlyBundles && (
            <div className="px-6 mt-4 pt-3 border-t border-black/[0.06]">
              {discount > 0 && promoCode ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-[350] tracking-wider text-emerald-900">{promoCode}</span>
                    <span className="font-[350] text-emerald-700">(-{formatPrice(discount)} OFF)</span>
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
                    className="text-sm font-semibold text-[#1B361B] underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    Apply Promo Code
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
                          className="rounded-full px-4 py-2 text-xs font-[350] bg-[#1B361B] text-white hover:bg-[#254825] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                        </button>
                      </div>

                      {/* Quick Suggestions */}
                      <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-gray-500 pt-0.5 no-scrollbar">
                        <span className="text-[10px] font-[400] uppercase text-gray-400 flex items-center gap-1 shrink-0">
                          <Gift className="h-3 w-3 text-[#1B361B]" /> Offers:
                        </span>
                        {["WELCOME10", "SAVE10", "SAVE20", "MINSAH10"].map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleApplyCoupon(code)}
                            className="rounded-full border border-dashed border-[#1B361B]/30 bg-[#F2F2EC] px-2 py-0.5 font-semibold text-[#1B361B] hover:bg-[#1B361B] hover:text-white transition-colors cursor-pointer shrink-0"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Seed-style Minimalist Empty Cart State ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E5E5DF] flex items-center justify-center text-[#1B361B]">
            <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
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
