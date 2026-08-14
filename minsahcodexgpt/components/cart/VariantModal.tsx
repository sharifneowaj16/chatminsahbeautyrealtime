'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { UI_COPY } from '@/lib/ui-copy';
import { formatPrice } from '@/utils/currency';
import { getCachedProductDetail } from './productDetailCache';

export interface VariantOption {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string | null;
  image?: string | null;
  attributes: Record<string, string>;
}

export interface VariantSelectionPayload {
  productId: string;
  productName: string;
  productImage: string;
  basePrice: number;
  variant: VariantOption;
  quantity: number;
}

export interface VariantAdjustmentPayload {
  variant: VariantOption;
  delta: 1 | -1;
}

export type VariantModalMode = 'select' | 'increase' | 'decrease';

interface VariantModalProps {
  isOpen: boolean;
  mode: VariantModalMode;
  productId: string;
  productName?: string;
  productImage?: string;
  variants?: VariantOption[];
  variantsFullyLoaded?: boolean;
  currentVariantId?: string | null;
  onClose: () => void;
  onConfirm?: (payload: VariantSelectionPayload) => Promise<void> | void;
  onAdjust?: (payload: VariantAdjustmentPayload) => Promise<void> | void;
}

function normalizeVariants(variants: VariantModalProps['variants']): VariantOption[] {
  return (variants ?? []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: variant.price,
    stock: variant.stock,
    sku: variant.sku,
    image: variant.image ?? null,
    attributes: (variant.attributes ?? {}) as Record<string, string>,
  }));
}

function getAttributeValue(attributes: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (attributes[key]) return attributes[key];
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

function toVariantLabel(variant: VariantOption) {
  const size = getAttributeValue(variant.attributes, ['size']);
  const color = getAttributeValue(variant.attributes, ['color', 'shade']);
  return [size, color].filter(Boolean).join(' / ') || variant.name;
}

export default function VariantModal({
  isOpen,
  mode,
  productId,
  productName,
  productImage,
  variants,
  variantsFullyLoaded = true,
  currentVariantId,
  onClose,
  onConfirm,
  onAdjust,
}: VariantModalProps) {
  const [resolvedProductName, setResolvedProductName] = useState(productName ?? '');
  const [resolvedProductImage, setResolvedProductImage] = useState(productImage ?? '');
  const [resolvedBasePrice, setResolvedBasePrice] = useState(0);
  const [resolvedVariants, setResolvedVariants] = useState<VariantOption[]>(normalizeVariants(variants));
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(currentVariantId ?? null);
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const prefetched = normalizeVariants(variants);
    const needsFullVariantLoad = variantsFullyLoaded === false || prefetched.length === 0;

    setResolvedProductName(productName ?? '');
    setResolvedProductImage(productImage ?? '');
    setSelectedVariantId(currentVariantId ?? null);
    setSelectedQuantity(currentVariantId ? 1 : !needsFullVariantLoad && prefetched.length === 1 ? 1 : 0);
    setError(null);
    setLoading(needsFullVariantLoad);
    setResolvedVariants(needsFullVariantLoad ? [] : prefetched);

    if (!needsFullVariantLoad) return;

    void getCachedProductDetail(productId)
      .then((productDetail) => {
        if (!active) return;
        setResolvedProductName(productDetail.name || productName || '');
        setResolvedProductImage(productDetail.image || productImage || '');
        setResolvedBasePrice(productDetail.price);
        setResolvedVariants(productDetail.variants);
        setSelectedQuantity(currentVariantId ? 1 : productDetail.variants.length === 1 ? 1 : 0);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load variants');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentVariantId, isOpen, productId, productImage, productName, variants, variantsFullyLoaded]);

  useEffect(() => {
    if (!isOpen || resolvedBasePrice > 0 || resolvedVariants.length === 0) return;
    setResolvedBasePrice(Math.min(...resolvedVariants.map((variant) => variant.price)));
  }, [isOpen, resolvedBasePrice, resolvedVariants]);

  useEffect(() => {
    if (!isOpen || mode !== 'select') return;
    if (!selectedVariantId && resolvedVariants.length === 1) {
      setSelectedVariantId(resolvedVariants[0].id);
      setSelectedQuantity(1);
    } else if (!selectedVariantId && selectedQuantity !== 0) {
      setSelectedQuantity(0);
    }
  }, [isOpen, mode, resolvedVariants, selectedQuantity, selectedVariantId]);

  const actionVariants = useMemo(() => {
    if (mode === 'select') return [];
    const currentId = currentVariantId ?? selectedVariantId;
    return [...resolvedVariants].sort((first, second) => {
      if (first.id === currentId) return -1;
      if (second.id === currentId) return 1;
      return 0;
    });
  }, [currentVariantId, mode, resolvedVariants, selectedVariantId]);

  const selectedVariant = resolvedVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const canConfirm = Boolean(
    mode === 'select' &&
      selectedVariant &&
      selectedVariant.stock > 0 &&
      selectedQuantity > 0 &&
      !submitting &&
      !loading,
  );

  const modalTitle =
    mode === 'decrease' ? 'Update Cart' : mode === 'increase' ? 'Add Another Variant' : 'Select Variant';

  const handleConfirm = async () => {
    if (!selectedVariant || !onConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm({
        productId,
        productName: resolvedProductName,
        productImage: resolvedProductImage,
        basePrice: resolvedBasePrice || selectedVariant.price,
        variant: selectedVariant,
        quantity: selectedQuantity,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (variant: VariantOption, delta: 1 | -1) => {
    if (!onAdjust) return;
    setSubmitting(true);
    try {
      await onAdjust({ variant, delta });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const updateSelectedVariantQuantity = (variant: VariantOption, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setSelectedVariantId(null);
      setSelectedQuantity(0);
      return;
    }
    setSelectedVariantId(variant.id);
    setSelectedQuantity(Math.min(variant.stock, nextQuantity));
  };

  const footer =
    mode === 'select' ? (
      <Button
        onClick={() => void handleConfirm()}
        disabled={!canConfirm}
        fullWidth
        size="lg"
        aria-busy={submitting}
      >
        {submitting ? <Spinner size="sm" decorative /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
        {UI_COPY.cart.add}
      </Button>
    ) : undefined;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={resolvedProductName || productName || 'Product'}
      size="lg"
      dismissible={!submitting}
      closeLabel={UI_COPY.common.close}
      bodyClassName="max-h-[70dvh]"
      footer={footer}
      footerClassName="pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4"
    >
      {loading ? (
        <LoadingState label="Loading variants…" description="Available product options are being loaded." />
      ) : error ? (
        <Alert tone="danger" role="alert">{error}</Alert>
      ) : resolvedVariants.length === 0 ? (
        <Alert tone="warning">No variants are available for this product right now.</Alert>
      ) : mode === 'select' ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-minsah-surface-subtle p-4 text-sm text-minsah-text-muted">
            Select a variant and quantity to add to your cart.
          </p>

          {resolvedVariants.map((variant) => {
            const quantity = selectedVariantId === variant.id ? selectedQuantity : 0;
            const isSelected = quantity > 0;
            const outOfStock = variant.stock <= 0;

            return (
              <section
                key={variant.id}
                aria-label={toVariantLabel(variant)}
                className={`rounded-2xl border p-3 sm:p-4 ${
                  isSelected
                    ? 'border-minsah-action-primary bg-minsah-surface-accent'
                    : outOfStock
                      ? 'border-minsah-border-subtle bg-minsah-surface-disabled opacity-70'
                      : 'border-minsah-border-default bg-minsah-surface-panel'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-minsah-surface-subtle sm:h-16 sm:w-16">
                    {variant.image || resolvedProductImage ? (
                      <CatalogProductImage
                        src={variant.image || resolvedProductImage}
                        alt={toVariantLabel(variant)}
                        sizes="64px"
                        padding="sm"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-bold text-minsah-text-primary">{toVariantLabel(variant)}</h3>
                      {isSelected ? <Badge tone="success">Selected</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-minsah-text-muted">
                      {outOfStock ? UI_COPY.cart.outOfStock : `${formatPrice(variant.price)} · ${variant.stock} available`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <div className="flex items-center gap-1 rounded-full border border-minsah-border-default bg-minsah-surface-panel p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateSelectedVariantQuantity(variant, quantity - 1)}
                      disabled={quantity <= 0 || submitting}
                      aria-label={`Decrease ${toVariantLabel(variant)} quantity`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <output className="min-w-8 text-center text-sm font-bold text-minsah-text-primary">{quantity}</output>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateSelectedVariantQuantity(variant, quantity + 1)}
                      disabled={outOfStock || quantity >= variant.stock || submitting}
                      aria-label={`Increase ${toVariantLabel(variant)} quantity`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </section>
            );
          })}

          <dl className="rounded-2xl border border-minsah-border-default bg-minsah-surface-subtle p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-minsah-text-muted">{UI_COPY.cart.quantity}</dt>
              <dd className="font-bold text-minsah-text-primary">{selectedQuantity}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <dt className="text-minsah-text-muted">{UI_COPY.cart.subtotal}</dt>
              <dd className="font-bold text-minsah-text-primary">
                {formatPrice(selectedVariant ? selectedVariant.price * selectedQuantity : 0)}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-minsah-surface-subtle p-4 text-sm text-minsah-text-muted">
            {mode === 'decrease'
              ? 'Decrease quantity or remove a variant from your cart.'
              : 'Choose which variant to add more of.'}
          </p>

          {actionVariants.map((variant) => {
            const isCurrent = variant.id === (currentVariantId ?? selectedVariantId);
            const delta: 1 | -1 = isCurrent && mode === 'decrease' ? -1 : 1;
            const disableAction = delta === 1 && variant.stock <= 0;

            return (
              <section
                key={variant.id}
                aria-label={toVariantLabel(variant)}
                className={`rounded-2xl border p-4 ${
                  isCurrent
                    ? 'border-minsah-action-primary bg-minsah-surface-accent'
                    : 'border-minsah-border-default bg-minsah-surface-panel'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-minsah-surface-subtle sm:h-16 sm:w-16">
                    {variant.image || resolvedProductImage ? (
                      <CatalogProductImage
                        src={variant.image || resolvedProductImage}
                        alt={toVariantLabel(variant)}
                        sizes="64px"
                        padding="sm"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-bold text-minsah-text-primary">{toVariantLabel(variant)}</h3>
                      {isCurrent ? <Badge tone="info">Current</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-minsah-text-muted">
                      {variant.stock > 0 ? `${variant.stock} available` : UI_COPY.cart.outOfStock}
                    </p>
                    <p className="mt-2 text-sm font-bold text-minsah-text-primary">{formatPrice(variant.price)}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="icon"
                    variant={delta === -1 ? 'secondary' : 'primary'}
                    disabled={disableAction || submitting}
                    onClick={() => void handleAdjust(variant, delta)}
                    aria-label={delta === -1 ? `Decrease ${variant.name}` : `Add ${variant.name}`}
                  >
                    {submitting ? (
                      <Spinner size="sm" decorative />
                    ) : delta === -1 ? (
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
