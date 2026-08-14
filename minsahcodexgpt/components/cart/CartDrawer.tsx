"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingBag, Truck } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import CartItemRow from "@/features/cart/CartItemRow";
import OrderSummary from "@/features/cart/OrderSummary";
import { formatPrice } from "@/utils/currency";

function getVariantLabel(item: {
  size?: string | null;
  color?: string | null;
  variantName?: string | null;
}) {
  return [item.size, item.color].filter(Boolean).join(" / ") || item.variantName || "";
}

export default function CartDrawer() {
  const router = useRouter();
  const { isOpen, closeDrawer, lastAddedItem } = useCartDrawer();
  const { items, subtotal, updateQuantity, removeItem, cartLoading } = useCart();
  const [busyItemIds, setBusyItemIds] = useState<string[]>([]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;
  const currentLastAddedItem = useMemo(() => {
    if (!lastAddedItem) return null;
    const matchedItem = items.find((item) => item.id === lastAddedItem.id);
    return matchedItem
      ? { ...matchedItem, addedQuantity: lastAddedItem.addedQuantity, addedAt: lastAddedItem.addedAt }
      : lastAddedItem;
  }, [items, lastAddedItem]);

  const markBusy = async (itemId: string, action: () => Promise<boolean>) => {
    if (busyItemIds.includes(itemId)) return;
    setBusyItemIds((current) => [...current, itemId]);
    try {
      await action();
    } finally {
      setBusyItemIds((current) => current.filter((id) => id !== itemId));
    }
  };

  const handleCheckout = () => {
    if (!hasItems) return;
    closeDrawer();
    router.push("/checkout");
  };

  const footer = hasItems ? (
    <div className="w-full">
      <OrderSummary
        compact
        title=""
        lines={[{ key: "subtotal", label: "Subtotal", value: formatPrice(subtotal), emphasis: true }]}
        notice={
          <div className="rounded-3xl bg-minsah-surface-soft p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-minsah-action-primary">
                <Truck size={16} aria-hidden="true" /> Delivery charge
              </span>
              <span className="text-xs font-semibold text-minsah-text-muted">Calculated at checkout</span>
            </div>
            <p className="text-xs leading-5 text-minsah-text-muted">
              Final delivery cost uses your address, courier quote, and active product delivery offers.
            </p>
          </div>
        }
        action={
          <div className="grid gap-2">
            <Button type="button" fullWidth onClick={handleCheckout} disabled={cartLoading || !hasItems}>
              Checkout
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeDrawer}>
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
      footerClassName="block px-4 sm:px-5"
    >
      {hasItems ? (
        <div className="space-y-4 px-4 py-4 sm:px-5">
          {currentLastAddedItem ? (
            <Alert
              tone="success"
              announcement="polite"
              title="Added to cart"
              icon={<CheckCircle2 className="h-5 w-5" />}
              className="minsah-success-pulse"
            >
              <span className="line-clamp-2">
                {currentLastAddedItem.addedQuantity > 1 ? `${currentLastAddedItem.addedQuantity} × ` : ""}
                {currentLastAddedItem.name}
              </span>
              {getVariantLabel(currentLastAddedItem) ? (
                <span className="mt-1 block text-xs font-semibold">{getVariantLabel(currentLastAddedItem)}</span>
              ) : null}
            </Alert>
          ) : null}

          <div className="space-y-3">
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
            <Button type="button" onClick={closeDrawer}>
              Continue shopping
            </Button>
          }
          className="m-4 border-0 shadow-none"
        />
      )}
    </Drawer>
  );
}
