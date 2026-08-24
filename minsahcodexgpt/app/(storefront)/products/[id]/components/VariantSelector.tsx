'use client';

import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';

import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Variant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string> | null;
  image?: string;
}

interface VariantSelectorProps {
  variants: Variant[];
  basePrice: number;
  baseStock: number;
  onVariantChange: (variantId: string | null, price: number, qty: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
}

function getAttributeValue(attributes: Record<string, string> | null | undefined, keys: string[]) {
  if (!attributes) return null;
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

function getAdditionalAttributes(attributes: Record<string, string> | null | undefined) {
  if (!attributes) return [];
  const handledKeys = new Set(['size', 'color', 'shade']);
  return Object.entries(attributes)
    .filter(([key, value]) => value && !handledKeys.has(key.toLowerCase()))
    .map(([key, value]) => `${key}: ${value}`);
}

function toVariantLabel(variant: Variant) {
  const size = getAttributeValue(variant.attributes, ['size', 'Size']);
  const color = getAttributeValue(variant.attributes, ['color', 'Color', 'shade', 'Shade']);
  const extras = getAdditionalAttributes(variant.attributes);
  return [size, color, ...extras].filter(Boolean).join(' / ') || variant.name;
}

function QuantityControl({
  quantity,
  maxStock,
  disabled,
  onChange,
}: {
  quantity: number;
  maxStock: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={`flex items-center gap-1 rounded-full border px-1 ${disabled ? 'border-minsah-border-subtle bg-minsah-surface-disabled' : 'border-minsah-border-default bg-minsah-surface-panel'}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(-1)}
        disabled={disabled || quantity <= 1}
        aria-label="পরিমাণ কমান"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span className="w-8 text-center text-sm font-bold text-minsah-text-primary" aria-live="polite">{quantity}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(1)}
        disabled={disabled || quantity >= maxStock || maxStock <= 0}
        aria-label="পরিমাণ বাড়ান"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default function VariantSelector({
  variants,
  basePrice,
  baseStock,
  onVariantChange,
  onImageChange,
}: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length === 1 ? variants[0].id : null,
  );
  const [quantity, setQuantity] = useState(1);

  const currentVariant = variants.find((variant) => variant.id === selectedVariant) ?? null;
  const currentPrice = currentVariant?.price ?? basePrice;
  const maxStock = currentVariant?.stock ?? baseStock;
  const quantityDisabled = variants.length > 0 && !currentVariant;

  const handleVariantSelect = (variantId: string) => {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant || variant.stock <= 0) return;

    setSelectedVariant(variantId);
    setQuantity(1);
    onVariantChange(variantId, variant.price, 1);
    onImageChange?.(variant.image || null);
  };

  const handleQtyChange = (delta: number) => {
    if (quantityDisabled || maxStock <= 0) return;
    const nextQuantity = Math.max(1, Math.min(maxStock, quantity + delta));
    setQuantity(nextQuantity);
    onVariantChange(selectedVariant, currentPrice, nextQuantity);
  };

  if (variants.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3" lang="bn">
        <span className="text-sm font-semibold text-minsah-text-muted">পরিমাণ</span>
        <QuantityControl quantity={quantity} maxStock={maxStock} disabled={false} onChange={handleQtyChange} />
        {maxStock <= 5 && maxStock > 0 ? <Badge tone="warning">মাত্র {maxStock}টি বাকি</Badge> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4" lang="bn">
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-minsah-text-primary">অপশন বেছে নিন</h3>
          <span className="text-xs font-semibold text-minsah-text-muted">
            {currentVariant ? toVariantLabel(currentVariant) : 'সাইজ বা শেড নির্বাচন করুন'}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {variants.map((variant) => {
            const isSelected = selectedVariant === variant.id;
            const outOfStock = variant.stock <= 0;
            const label = toVariantLabel(variant);
            const size = getAttributeValue(variant.attributes, ['size', 'Size']);
            const color = getAttributeValue(variant.attributes, ['color', 'Color', 'shade', 'Shade']);

            return (
              <Button
                key={variant.id}
                type="button"
                variant="secondary"
                onClick={() => handleVariantSelect(variant.id)}
                disabled={outOfStock}
                aria-pressed={isSelected}
                aria-label={`${label}${outOfStock ? ' স্টক শেষ' : ''}`}
                className={`relative min-h-[5.75rem] w-full justify-start rounded-lg px-3 py-3 text-left ${
                  isSelected
                    ? 'border-minsah-border-strong bg-minsah-surface-soft shadow-xs'
                    : outOfStock
                      ? 'bg-minsah-surface-disabled opacity-60'
                      : 'bg-minsah-surface-panel hover:bg-minsah-surface-subtle'
                }`}
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-minsah-surface-soft">
                  {variant.image ? (
                    <CatalogProductImage src={variant.image} alt={label} sizes="56px" padding="sm" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-1 text-center text-xs font-bold text-minsah-text-muted">
                      {color || size || variant.name}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`break-words text-sm font-bold ${outOfStock ? 'text-minsah-text-disabled line-through' : 'text-minsah-text-primary'}`}>
                      {label}
                    </span>
                    {isSelected ? (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-minsah-action-primary text-minsah-text-inverse">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>

                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {size ? <Badge tone="neutral">সাইজ: {size}</Badge> : null}
                    {color ? <Badge tone="neutral">শেড: {color}</Badge> : null}
                  </span>

                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-minsah-action-primary">৳{variant.price.toLocaleString('bn-BD')}</span>
                    <Badge tone={outOfStock ? 'danger' : 'success'}>{outOfStock ? 'স্টক শেষ' : `${variant.stock}টি আছে`}</Badge>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-minsah-text-primary">পরিমাণ</span>
        <QuantityControl quantity={quantity} maxStock={maxStock} disabled={quantityDisabled} onChange={handleQtyChange} />
        {quantityDisabled ? (
          <Badge tone="warning">আগে একটি অপশন নির্বাচন করুন</Badge>
        ) : maxStock <= 5 && maxStock > 0 ? (
          <Badge tone="warning">মাত্র {maxStock}টি বাকি</Badge>
        ) : null}
      </div>
    </div>
  );
}
