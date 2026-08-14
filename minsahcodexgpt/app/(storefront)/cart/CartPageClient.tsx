"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/currency";
import CartItemRow from "@/features/cart/CartItemRow";
import OrderSummary from "@/features/cart/OrderSummary";
import { Button } from "@/components/ui/Button";

export default function CartPageClient() {
  const {
    items,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    cartLoading,
  } = useCart();
  const [busyItemIds, setBusyItemIds] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;

  const markBusy = async (itemId: string, action: () => Promise<boolean>) => {
    if (busyItemIds.includes(itemId)) return;
    setBusyItemIds((current) => [...current, itemId]);
    try {
      await action();
    } finally {
      setBusyItemIds((current) => current.filter((id) => id !== itemId));
    }
  };

  const handleClearCart = async () => {
    if (isClearing || !hasItems) return;
    setIsClearing(true);
    try {
      await clearCart();
    } finally {
      setIsClearing(false);
    }
  };

  if (!hasItems) {
    return (
      <div
        className="min-h-screen bg-minsah-surface px-4 py-8 text-minsah-text sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-minsah-light text-minsah-primary">
            <ShoppingBag size={34} aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-black">Your cart is empty</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-minsah-muted">
            Add products to review quantities, delivery details, and your
            subtotal before checkout.
          </p>
          <Link
            href="/shop"
            className="minsah-tap-target mt-7 inline-flex items-center justify-center rounded-2xl bg-minsah-primary px-6 py-3 text-sm font-bold text-minsah-light hover:bg-minsah-dark"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-minsah-surface px-4 py-6 text-minsah-text sm:px-6 lg:px-8 lg:pb-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-minsah-muted hover:text-minsah-primary"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Continue shopping
            </Link>
            <h1 className="mt-3 text-3xl font-black">Shopping cart</h1>
            <p className="mt-1 text-sm text-minsah-muted">
              {items.length} product{items.length !== 1 ? "s" : ""} ·{" "}
              {totalQuantity} item{totalQuantity !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleClearCart()}
            disabled={isClearing || cartLoading}
            className="rounded-2xl border-red-200 text-minsah-danger hover:bg-red-50"
          >
            {isClearing ? "Clearing..." : "Clear cart"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3" aria-label="Cart items">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                busy={busyItemIds.includes(item.id)}
                showLineTotal
                onQuantityChange={(nextQuantity) =>
                  void markBusy(item.id, () =>
                    updateQuantity(item.id, nextQuantity),
                  )
                }
                onRemove={() =>
                  void markBusy(item.id, () => removeItem(item.id))
                }
              />
            ))}
          </section>

          <OrderSummary
            className="h-fit lg:sticky lg:top-24"
            lines={[
              {
                key: "subtotal",
                label: "Subtotal",
                value: formatPrice(subtotal),
                emphasis: true,
              },
            ]}
            notice={
              <div className="rounded-3xl bg-minsah-light p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-minsah-primary">
                  <Truck size={16} aria-hidden="true" /> Delivery charge
                </div>
                <p className="mt-2 text-xs leading-relaxed text-minsah-muted">
                  Delivery cost is calculated at checkout using your address,
                  courier quote, and active product delivery offers.
                </p>
              </div>
            }
            action={
              <Link
                href="/checkout"
                className="minsah-tap-target flex w-full items-center justify-center rounded-2xl bg-minsah-primary px-4 py-3 text-sm font-black text-minsah-light hover:bg-minsah-dark"
              >
                Proceed to checkout
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
