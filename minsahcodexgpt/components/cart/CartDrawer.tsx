"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, ShoppingBag, Sparkles, Tag, Truck, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import CartItemRow from "@/features/cart/CartItemRow";
import OrderSummary from "@/features/cart/OrderSummary";
import { formatPrice } from "@/utils/currency";

const FREE_DELIVERY_THRESHOLD = 2500; // Free delivery at ৳2,500 BDT

export default function CartDrawer() {
  const router = useRouter();
  const { isOpen, closeDrawer } = useCartDrawer();
  const {
    items,
    subtotal,
    updateQuantity,
    removeItem,
    cartLoading,
    promoCode,
    applyPromoCode,
    removePromoCode,
    discount,
  } = useCart();

  const [busyItemIds, setBusyItemIds] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;

  // Free delivery calculations
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const isFreeDeliveryUnlocked = subtotal >= FREE_DELIVERY_THRESHOLD;

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
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!hasItems) return;
    closeDrawer();
    router.push("/checkout");
  };

  const orderLines = [
    { key: "subtotal", label: "Subtotal", value: formatPrice(subtotal), emphasis: true },
    ...(discount > 0
      ? [
          {
            key: "discount",
            label: (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Coupon ({promoCode})
              </span>
            ),
            value: <span className="font-bold text-emerald-700">-{formatPrice(discount)}</span>,
            emphasis: true,
          },
        ]
      : []),
  ];

  const footer = hasItems ? (
    <div className="w-full space-y-4">
      {/* ── Quick Coupon Box ── */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-3">
        {discount > 0 && promoCode ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="font-bold tracking-wider text-emerald-900">{promoCode}</span>
              <span className="font-semibold text-emerald-700">(-{formatPrice(discount)} OFF)</span>
            </div>
            <button
              type="button"
              onClick={removePromoCode}
              className="rounded-full p-1 text-gray-400 hover:bg-emerald-100 hover:text-red-600 transition-colors"
              aria-label="Remove coupon"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                  placeholder="Coupon code (e.g. SAVE10)"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold uppercase tracking-wider text-gray-800 placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#D07A60] focus:outline-none focus:ring-1 focus:ring-[#D07A60]"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!couponInput.trim() || couponLoading}
                onClick={() => handleApplyCoupon()}
                className="rounded-xl px-4 py-2 text-xs font-bold bg-[#181C1A] text-white hover:bg-[#D07A60] transition-colors"
              >
                {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
              </Button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-gray-500 pt-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                <Gift className="h-3 w-3 text-[#D07A60]" /> Offers:
              </span>
              {["SAVE10", "SAVE20", "FIRST50", "MINSAH10"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleApplyCoupon(code)}
                  className="rounded-md border border-dashed border-[#D07A60]/40 bg-[#FAF9F6] px-1.5 py-0.5 font-semibold text-[#D07A60] hover:bg-[#D07A60] hover:text-white transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Order Summary ── */}
      <OrderSummary
        compact
        title=""
        lines={orderLines}
        notice={
          <div className="rounded-2xl bg-minsah-surface-soft p-3">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-minsah-action-primary">
                <Truck size={16} aria-hidden="true" /> Delivery Charge
              </span>
              <span className={`text-xs font-bold ${isFreeDeliveryUnlocked ? 'text-emerald-700' : 'text-minsah-text-muted'}`}>
                {isFreeDeliveryUnlocked ? '🎉 FREE' : 'Calculated at checkout'}
              </span>
            </div>
            <p className="text-xs leading-5 text-minsah-text-muted">
              {isFreeDeliveryUnlocked
                ? 'Your order qualifies for 100% Free Standard Delivery across Bangladesh!'
                : 'Final delivery cost uses your address, courier quote, and active product delivery offers.'}
            </p>
          </div>
        }
        action={
          <div className="grid gap-2 pt-1">
            <Button
              type="button"
              fullWidth
              onClick={handleCheckout}
              disabled={cartLoading || !hasItems}
              className="bg-[#D07A60] hover:bg-[#B56148] text-white font-bold py-3 text-sm rounded-2xl shadow-lg shadow-orange-950/10 transition-all hover:shadow-orange-950/20"
            >
              Checkout ({formatPrice(Math.max(0, subtotal - discount))})
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeDrawer} className="rounded-2xl text-xs font-semibold">
              Continue shopping
            </Button>
          </div>
        }
      />
    </div>
  ) : undefined;

  return (
    <Drawer
      open={isOpen}
      onClose={closeDrawer}
      side="right"
      size="md"
      title={hasItems ? `${items.length} product${items.length > 1 ? "s" : ""}` : "Your cart is empty"}
      description={hasItems ? `${totalQuantity} item${totalQuantity !== 1 ? "s" : ""} ready to review` : "Add products to start your order."}
      closeLabel="Close cart drawer"
      bodyClassName="p-0 sm:p-0"
      footer={footer}
      footerClassName="block px-4 sm:px-5 pb-5"
    >
      {hasItems ? (
        <div className="space-y-3 px-4 py-3 sm:px-5">
          {/* ── Free Delivery Progress Bar ── */}
          <div className="rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/70 via-stone-50/60 to-orange-50/50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
              <span className="flex items-center gap-1.5">
                <Truck className={`h-4 w-4 ${isFreeDeliveryUnlocked ? 'text-emerald-600' : 'text-[#D07A60]'}`} />
                {isFreeDeliveryUnlocked ? (
                  <span className="font-bold text-emerald-800">
                    🎉 Congratulations! You unlocked <span className="underline decoration-emerald-500">FREE Delivery</span>
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-[#D07A60] font-bold">{formatPrice(remainingForFreeDelivery)}</strong> more for <strong className="text-emerald-700 font-bold">FREE Delivery</strong>
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-gray-500">{progressPercent}%</span>
            </div>

            {/* Progress Track */}
            <div className="relative mt-2.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isFreeDeliveryUnlocked
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm"
                    : "bg-gradient-to-r from-[#D07A60] via-[#4A7C59] to-[#88B296]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 pt-1">
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
        </div>
      ) : (
        <EmptyState
          title="No items yet"
          description="Add a product to see your cart preview, subtotal, and checkout action here."
          icon={<ShoppingBag className="h-7 w-7" />}
          action={
            <Button type="button" onClick={closeDrawer} className="rounded-2xl bg-minsah-action-primary hover:bg-minsah-action-primary-hover text-white font-semibold px-6">
              Continue shopping
            </Button>
          }
          className="m-4 border-0 shadow-none"
        />
      )}
    </Drawer>
  );
}
