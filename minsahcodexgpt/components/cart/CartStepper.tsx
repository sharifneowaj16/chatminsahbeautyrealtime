'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import type {
  VariantAdjustmentPayload,
  VariantModalMode,
  VariantOption,
  VariantSelectionPayload,
} from './VariantModal';
import { getCachedProductDetail } from './productDetailCache';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const VariantModal = dynamic(() => import('./VariantModal'), {
  ssr: false,
  loading: () => null,
});

interface CartStepperProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  initialQuantity?: number;
  maxStock?: number;
  variantId?: string | null;
  variantName?: string | null;
  sku?: string | null;
  productSku?: string | null;
  size?: string | null;
  color?: string | null;
  variantImage?: string | null;
  hasRequiredVariants?: boolean;
  variantCount?: number;
  variantsFullyLoaded?: boolean;
  variants?: VariantOption[];
  className?: string;
  disabled?: boolean;
  circleAdd?: boolean;
  onAddToCartSuccess?: (payload: { quantity: number; variantId?: string | null }) => void;
}

type ZeroStateMode = 'button' | 'stepper';

function clampStock(stock?: number) {
  if (typeof stock !== 'number' || Number.isNaN(stock)) return 99;
  return Math.max(0, stock);
}

function getAttributeValue(attributes: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const exact = attributes[key];
    if (exact) return exact;
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

function getVariantDisplay(variant: { name: string; attributes: Record<string, string> }) {
  const size = getAttributeValue(variant.attributes, ['size', 'Size']);
  const color = getAttributeValue(variant.attributes, ['color', 'Color', 'shade', 'Shade']);
  const label = [size, color].filter(Boolean).join(' / ') || variant.name;

  return { label, size, color };
}

export default function CartStepper({
  productId,
  productName,
  productImage,
  price,
  initialQuantity = 1,
  maxStock = 99,
  variantId,
  variantName,
  sku,
  productSku,
  size,
  color,
  variantImage,
  hasRequiredVariants = false,
  variantCount,
  variantsFullyLoaded = true,
  variants,
  className = '',
  disabled = false,
  circleAdd = false,
  onAddToCartSuccess,
}: CartStepperProps) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();
  const [isBusy, setIsBusy] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<VariantModalMode>('select');
  const [boundVariantId, setBoundVariantId] = useState<string | null>(variantId ?? null);
  const [zeroStateMode, setZeroStateMode] = useState<ZeroStateMode>('button');
  const [resolvedVariants, setResolvedVariants] = useState<VariantOption[]>(variants ?? []);
  const [resolvedMaxStock, setResolvedMaxStock] = useState<number | null>(null);
  const [resolvedProductImage, setResolvedProductImage] = useState<string | null>(null);
  const [resolvedProductSku, setResolvedProductSku] = useState<string | null>(productSku ?? (variantId ? null : sku) ?? null);
  const [resolvedVariantCount, setResolvedVariantCount] = useState(variantCount ?? variants?.length ?? 0);
  const [hasResolvedProductContext, setHasResolvedProductContext] = useState(
    Boolean(variants?.length) && variantsFullyLoaded !== false
  );
  const [pendingDrawerPayload, setPendingDrawerPayload] = useState<{
    intentId: number;
    item: CartItem;
    addedQuantity: number;
  } | null>(null);

  useEffect(() => {
    setResolvedVariants(variants ?? []);
    setResolvedMaxStock(null);
    setResolvedProductImage(null);
    setResolvedProductSku(productSku ?? (variantId ? null : sku) ?? null);
    setResolvedVariantCount(variantCount ?? variants?.length ?? 0);
    setHasResolvedProductContext(Boolean(variants?.length) && variantsFullyLoaded !== false);
  }, [maxStock, productId, productImage, productSku, sku, variantCount, variantId, variants, variantsFullyLoaded]);

  const effectiveVariants = useMemo(
    () => (resolvedVariants.length > 0 ? resolvedVariants : variants ?? []),
    [resolvedVariants, variants]
  );
  const effectiveProductImage = resolvedProductImage || variantImage || productImage;
  const variantsMayBePartial =
    !hasResolvedProductContext &&
    (variantsFullyLoaded === false || resolvedVariantCount > effectiveVariants.length);

  const isVariantProduct =
    hasRequiredVariants || Boolean(variantId || boundVariantId) || resolvedVariantCount > 0 || effectiveVariants.length > 0;

  const productCartItems = useMemo(
    () =>
      items.filter(
        (item) => item.productId === productId || (!item.productId && item.id === productId)
      ),
    [items, productId]
  );

  useEffect(() => {
    if (variantId) {
      setBoundVariantId(variantId);
      setZeroStateMode('button');
      return;
    }
    if (boundVariantId) {
      const matchingItem = productCartItems.find((item) => item.id === boundVariantId);
      if (matchingItem || zeroStateMode === 'stepper') return;
    }
    const firstVariantItem = productCartItems.find((item) => item.variantId);
    if (firstVariantItem?.variantId) {
      setBoundVariantId(firstVariantItem.variantId);
    } else if (zeroStateMode === 'button') {
      setBoundVariantId(null);
    }
  }, [boundVariantId, productCartItems, variantId, zeroStateMode]);

  const currentVariantId = variantId ?? boundVariantId;
  const currentVariant = useMemo(() => {
    if (!currentVariantId) return null;
    return effectiveVariants.find((v) => v.id === currentVariantId) ?? null;
  }, [currentVariantId, effectiveVariants]);

  const currentCartItemId = currentVariantId || productId;
  const currentCartItem = items.find((item) => item.id === currentCartItemId);
  const currentItemQty = currentCartItem?.quantity ?? 0;
  const productQty = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const qty = variantId ? currentItemQty : isVariantProduct ? productQty : currentItemQty;
  const safeMaxStock = clampStock(currentVariant?.stock ?? resolvedMaxStock ?? maxStock);
  const isOutOfStock = safeMaxStock <= 0;

  useEffect(() => {
    if (qty > 0 && zeroStateMode !== 'button') {
      setZeroStateMode('button');
    }
  }, [qty, zeroStateMode]);

  const runMutation = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try { await action(); } finally { setIsBusy(false); }
  };

  const openModal = (mode: VariantModalMode) => {
    setModalMode(mode);
    setIsVariantModalOpen(true);
  };

  const openDrawerForAdd = (
    intentId: number,
    item: CartItem,
    addedQuantity: number,
    delayUntilModalClose = false
  ) => {
    if (delayUntilModalClose || isVariantModalOpen) {
      setPendingDrawerPayload({ intentId, item, addedQuantity });
      return;
    }
    openForSuccessfulAdd(intentId, item, addedQuantity);
  };

  const notifyAddToCartSuccess = (quantity: number, addedVariantId?: string | null) => {
    onAddToCartSuccess?.({ quantity, variantId: addedVariantId ?? null });
  };

  useEffect(() => {
    if (isVariantModalOpen || !pendingDrawerPayload) return;

    const timeout = window.setTimeout(() => {
      openForSuccessfulAdd(
        pendingDrawerPayload.intentId,
        pendingDrawerPayload.item,
        pendingDrawerPayload.addedQuantity
      );
      setPendingDrawerPayload(null);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isVariantModalOpen, openForSuccessfulAdd, pendingDrawerPayload]);

  const resolveProductContext = async ({ forceFullVariants = false } = {}) => {
    const needsFullVariants =
      !hasResolvedProductContext &&
      (forceFullVariants || variantsMayBePartial || (hasRequiredVariants && effectiveVariants.length === 0));

    if (!needsFullVariants && hasResolvedProductContext) {
      return {
        image: effectiveProductImage,
        maxStock: resolvedMaxStock ?? maxStock,
        variants: effectiveVariants,
        sku: resolvedProductSku ?? productSku ?? (variantId ? null : sku) ?? null,
      };
    }

    setIsBusy(true);
    try {
      const productDetail = await getCachedProductDetail(productId);
      const fetchedVariants = productDetail.variants;

      setResolvedVariants(fetchedVariants);
      setResolvedVariantCount(fetchedVariants.length);
      setResolvedMaxStock(productDetail.stock ?? maxStock);
      setResolvedProductImage(productDetail.image || null);
      setResolvedProductSku(productDetail.sku ?? null);
      setHasResolvedProductContext(true);

      return {
        image: productDetail.image || effectiveProductImage,
        maxStock: productDetail.stock ?? maxStock,
        variants: fetchedVariants,
        sku: productDetail.sku ?? resolvedProductSku ?? productSku ?? (variantId ? null : sku) ?? null,
      };
    } catch {
      return {
        image: effectiveProductImage,
        maxStock,
        variants: effectiveVariants,
        sku: resolvedProductSku ?? productSku ?? (variantId ? null : sku) ?? null,
      };
    } finally {
      setIsBusy(false);
    }
  };

  const addOrIncrementVariant = async (
    variant: {
      id: string; name: string; price: number; stock: number; sku?: string | null; image?: string | null;
      attributes: Record<string, string>;
    },
    quantity = 1,
    delayDrawerOpen = false,
    parentSku?: string | null
  ) => {
    const targetId = variant.id;
    const existingItem = items.find((item) => item.id === targetId);
    const existingQty = existingItem?.quantity ?? 0;
    const display = getVariantDisplay(variant);
    const intentId = registerAddIntent();

    if (!variantId) setBoundVariantId(targetId);

    if (existingItem && existingQty > 0) {
      const nextQuantity = existingQty + quantity;
      const success = await updateQuantity(targetId, nextQuantity);
      if (success) {
        openDrawerForAdd(
          intentId,
          { ...existingItem, quantity: nextQuantity },
          quantity,
          delayDrawerOpen
        );
        notifyAddToCartSuccess(quantity, targetId);
      }
      return success;
    }

    const addedQuantity = Math.max(initialQuantity, quantity);
    const cartItem: CartItem = {
      id: targetId,
      productId,
      variantId: targetId,
      variantName: display.label,
      sku: variant.sku ?? undefined,
      productSku: parentSku ?? resolvedProductSku ?? productSku ?? sku ?? undefined,
      variantSku: variant.sku ?? null,
      size: display.size,
      color: display.color,
      variantImage: variant.image ?? null,
      name: productName,
      price: variant.price,
      quantity: addedQuantity,
      image: variant.image || effectiveProductImage,
      stock: variant.stock,
      maxQuantity: variant.stock,
    };

    const success = await addItem(cartItem);
    if (success) {
      openDrawerForAdd(intentId, cartItem, addedQuantity, delayDrawerOpen);
      notifyAddToCartSuccess(addedQuantity, targetId);
    }
    return success;
  };

  const handleSelectConfirm = async ({ variant, quantity }: VariantSelectionPayload) => {
    setZeroStateMode('button');
    await runMutation(async () => { await addOrIncrementVariant(variant, quantity, true, resolvedProductSku ?? productSku ?? sku); });
  };

  const handleAdjustVariant = async ({ variant, delta }: VariantAdjustmentPayload) => {
    const targetId = variant.id;
    const existingQty = items.find((item) => item.id === targetId)?.quantity ?? 0;
    await runMutation(async () => {
      if (delta === -1) {
        if (!variantId) setBoundVariantId(targetId);
        if (existingQty <= 1) {
          await removeItem(targetId);
          setZeroStateMode('stepper');
          return;
        }
        await updateQuantity(targetId, existingQty - 1);
        setZeroStateMode('button');
        return;
      }
      setZeroStateMode('button');
      await addOrIncrementVariant(variant, 1, true, resolvedProductSku ?? productSku ?? sku);
    });
  };

  const handleAddToCart = async () => {
    if (disabled || isBusy || isOutOfStock) return;
    const context = await resolveProductContext({ forceFullVariants: isVariantProduct });
    const availableVariants = context?.variants ?? effectiveVariants;
    const requiresVariantSelection =
      hasRequiredVariants || Boolean(currentVariantId) || availableVariants.length > 0;
    const nextVariant = currentVariantId
      ? availableVariants.find((variant) => variant.id === currentVariantId) ?? null
      : null;

    if (requiresVariantSelection && !currentVariantId) { openModal('select'); return; }
    await runMutation(async () => {
      if (requiresVariantSelection && nextVariant) {
        setZeroStateMode('button');
        await addOrIncrementVariant(nextVariant, 1, false, context?.sku);
        return;
      }
      const existingItem = items.find((item) => item.id === currentCartItemId);
      const existingQty = existingItem?.quantity ?? 0;
      const intentId = registerAddIntent();
      if (existingItem && existingQty > 0) {
        const nextQuantity = existingQty + 1;
        const success = await updateQuantity(currentCartItemId, nextQuantity);
        if (success) {
          openDrawerForAdd(intentId, { ...existingItem, quantity: nextQuantity }, 1);
          notifyAddToCartSuccess(1, currentVariantId);
        }
        return;
      }
      const cartItem: CartItem = {
        id: currentCartItemId,
        productId,
        variantId: variantId ?? null,
        variantName: variantName ?? null,
        sku: sku ?? context?.sku ?? undefined,
        productSku: context?.sku ?? productSku ?? (variantId ? null : sku) ?? undefined,
        variantSku: variantId ? sku ?? null : null,
        size: size ?? null,
        color: color ?? null,
        variantImage: variantImage ?? null,
        name: productName,
        price,
        quantity: initialQuantity,
        image: variantImage || context?.image || effectiveProductImage,
        stock: safeMaxStock,
        maxQuantity: safeMaxStock,
      };
      const success = await addItem(cartItem);
      if (success) {
        openDrawerForAdd(intentId, cartItem, initialQuantity);
        notifyAddToCartSuccess(initialQuantity, variantId ?? null);
      }
    });
  };

  const handleIncrease = async () => {
    if (disabled || isBusy || isOutOfStock) return;
    const context = await resolveProductContext({ forceFullVariants: isVariantProduct });
    const requiresVariantSelection =
      hasRequiredVariants ||
      Boolean(currentVariantId) ||
      Boolean((context?.variants ?? effectiveVariants).length);

    if (requiresVariantSelection) { openModal(qty === 0 ? 'select' : 'increase'); return; }
    await runMutation(async () => {
      const intentId = registerAddIntent();
      if (qty === 0) {
        const cartItem: CartItem = {
          id: currentCartItemId,
          productId,
          variantId: variantId ?? null,
          variantName: variantName ?? null,
          sku: sku ?? context?.sku ?? undefined,
          productSku: context?.sku ?? productSku ?? (variantId ? null : sku) ?? undefined,
          variantSku: variantId ? sku ?? null : null,
          size: size ?? null,
          color: color ?? null,
          variantImage: variantImage ?? null,
          name: productName,
          price,
          quantity: initialQuantity,
          image: variantImage || context?.image || effectiveProductImage,
          stock: safeMaxStock,
          maxQuantity: safeMaxStock,
        };
        const success = await addItem(cartItem);
        if (success) {
          openDrawerForAdd(intentId, cartItem, initialQuantity);
          notifyAddToCartSuccess(initialQuantity, variantId ?? null);
        }
        return;
      }
      const existingItem = items.find((item) => item.id === currentCartItemId);
      const success = await updateQuantity(currentCartItemId, qty + 1);
      if (success && existingItem) {
        openDrawerForAdd(intentId, { ...existingItem, quantity: qty + 1 }, 1);
        notifyAddToCartSuccess(1, currentVariantId);
      }
    });
  };

  const handleDecrease = async () => {
    if (disabled || isBusy) return;
    if (qty === 0) {
      await runMutation(async () => {
        await Promise.all(productCartItems.map((item) => removeItem(item.id)));
      });
      if (!variantId) setBoundVariantId(null);
      setZeroStateMode('button');
      return;
    }
    if (isVariantProduct) { openModal('decrease'); return; }
    await runMutation(async () => {
      if (qty <= 1) {
        await removeItem(currentCartItemId);
        setZeroStateMode('stepper');
        return;
      }
      await updateQuantity(currentCartItemId, qty - 1);
    });
  };

  const showAddButton = qty === 0 && zeroStateMode === 'button';
  const showZeroStepper = qty === 0 && zeroStateMode === 'stepper';
  const plusDisabled = disabled || isBusy || isOutOfStock || (!isVariantProduct && qty >= safeMaxStock);
  const addButtonLabel = isOutOfStock
    ? 'Out of Stock'
    : hasRequiredVariants && !currentVariantId
      ? 'Choose Option'
      : 'Add to Cart';
  const addButtonAriaLabel = isOutOfStock
    ? `${productName} is out of stock`
    : `${addButtonLabel} for ${productName}`;

  const variantModalNode = isVariantModalOpen ? (
    <VariantModal
      isOpen={isVariantModalOpen}
      mode={modalMode}
      productId={productId}
      productName={productName}
      productImage={effectiveProductImage}
      variants={effectiveVariants}
      variantsFullyLoaded={!variantsMayBePartial}
      currentVariantId={currentVariantId}
      onClose={() => setIsVariantModalOpen(false)}
      onConfirm={handleSelectConfirm}
      onAdjust={handleAdjustVariant}
    />
  ) : null;

  // ─── CIRCLE-ADD MODE ──────────────────────────────────────────────────────
  if (circleAdd) {
    return (
      <>
        {showAddButton ? (
          <Button
            type="button"
            size="icon"
            onClick={() => void handleAddToCart()}
            disabled={disabled || isBusy || isOutOfStock}
            aria-label={addButtonAriaLabel}
            className={`shadow-sm ${className}`}
          >
            {isBusy ? (
              <Spinner size="sm" decorative />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden="true" />
            )}
          </Button>
        ) : (
          <div
            className={`inline-flex min-h-11 items-center overflow-hidden rounded-full border border-minsah-border-default bg-minsah-surface-panel shadow-sm ${className}`}
            role="group"
            aria-label={`${productName} cart quantity`}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => void handleDecrease()}
              disabled={disabled || isBusy}
              aria-label={showZeroStepper ? `Remove ${productName}` : `Decrease ${productName}`}
              className="rounded-l-full rounded-r-none"
            >
              {showZeroStepper ? (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Minus className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <output
              className="flex min-w-8 flex-1 items-center justify-center px-1 text-sm font-bold text-minsah-text-primary"
              aria-live="polite"
              aria-atomic="true"
            >
              {isBusy ? <Spinner size="sm" decorative /> : qty}
            </output>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => void handleIncrease()}
              disabled={plusDisabled}
              aria-label={`Increase ${productName}`}
              className="rounded-l-none rounded-r-full"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
        {variantModalNode}
      </>
    );
  }

  // ─── DEFAULT MODE ─────────────────────────────────────────────────────────
  return (
    <>
      {showAddButton ? (
        <Button
          type="button"
          onClick={() => void handleAddToCart()}
          disabled={disabled || isBusy || isOutOfStock}
          aria-label={addButtonAriaLabel}
          className={className}
        >
          {isBusy ? (
            <Spinner size="sm" decorative />
          ) : (
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          )}
          {addButtonLabel}
        </Button>
      ) : (
        <div
          className={`inline-flex min-h-11 items-center rounded-2xl border border-minsah-border-default bg-minsah-surface-panel ${className}`}
          role="group"
          aria-label={`${productName} cart quantity`}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void handleDecrease()}
            disabled={disabled || isBusy}
            aria-label={
              showZeroStepper
                ? `Remove ${productName} from cart`
                : qty <= 1
                  ? `Decrease ${productName} quantity to zero`
                  : `Decrease ${productName} quantity`
            }
            className="rounded-l-2xl rounded-r-none"
          >
            {showZeroStepper ? (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Minus className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <output
            className="flex min-w-10 flex-1 items-center justify-center px-2 text-sm font-bold text-minsah-text-primary"
            aria-live="polite"
            aria-atomic="true"
          >
            {isBusy ? <Spinner size="sm" decorative /> : qty}
          </output>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void handleIncrease()}
            disabled={plusDisabled}
            aria-label={`Increase ${productName} quantity`}
            className="rounded-l-none rounded-r-2xl"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      {variantModalNode}
    </>
  );
}
