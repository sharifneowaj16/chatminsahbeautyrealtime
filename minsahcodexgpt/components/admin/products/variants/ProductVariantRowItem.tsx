'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductVariant } from '../types';

export interface ProductVariantRowItemProps {
  index: number;
  variant: ProductVariant;
  canRemove: boolean;
  aiApplied?: boolean;
  errors?: Record<string, string>;
  onChange: (field: keyof ProductVariant, value: string) => void;
  onRemove: () => void;
}

export function ProductVariantRowItem({
  index,
  variant,
  canRemove,
  aiApplied = false,
  errors = {},
  onChange,
  onRemove,
}: ProductVariantRowItemProps) {
  const getFieldError = (field: string) => errors[`variant_${variant.id}_${field}`];

  return (
    <div className="border border-[#232636] rounded-lg p-4 bg-[#10121b] transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#F7F8F8] flex items-center gap-2">
          <span>Variant #{index + 1}</span>
          {variant.sku && (
            <span className="text-[10px] font-mono text-white/40">({variant.sku})</span>
          )}
        </h3>

        {canRemove && (
          <Button
            type="button"
            aria-label={`Remove variant ${index + 1}`}
            onClick={onRemove}
            className="p-1 h-7 text-white/40 hover:text-rose-400 bg-transparent hover:bg-rose-500/10 rounded transition-all"
            title="Remove variant"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Size / Volume
          </label>
          <Input
            type="text"
            value={variant.size || ''}
            onChange={(e) => onChange('size', e.target.value)}
            className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="e.g. 50ml or Large"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Color / Shade
          </label>
          <Input
            type="text"
            value={variant.color || ''}
            onChange={(e) => onChange('color', e.target.value)}
            className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="e.g. 01 Ribbon / Pink"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Price (BDT ৳) <span className="text-rose-400">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={variant.price || ''}
            onChange={(e) => onChange('price', e.target.value)}
            className={`w-full px-3 py-1.5 bg-[#161824] border rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 ${
              getFieldError('price')
                ? 'border-rose-500'
                : fieldColorClass(aiApplied)
            }`}
            placeholder="0.00"
          />
          {getFieldError('price') && (
            <p className="mt-1 text-[10px] text-rose-400">{getFieldError('price')}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Stock <span className="text-rose-400">*</span>
          </label>
          <Input
            type="number"
            min="0"
            value={variant.stock || ''}
            onChange={(e) => onChange('stock', e.target.value)}
            className={`w-full px-3 py-1.5 bg-[#161824] border rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 ${
              getFieldError('stock') ? 'border-rose-500' : 'border-[#232636]'
            }`}
            placeholder="0"
          />
          {getFieldError('stock') && (
            <p className="mt-1 text-[10px] text-rose-400">{getFieldError('stock')}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            SKU <span className="text-rose-400">*</span>
          </label>
          <Input
            type="text"
            value={variant.sku || ''}
            onChange={(e) => onChange('sku', e.target.value)}
            className={`w-full px-3 py-1.5 bg-[#161824] border rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 ${
              getFieldError('sku') ? 'border-rose-500' : 'border-[#232636]'
            }`}
            placeholder="e.g. COSRX-SNAIL-50ML"
          />
          {getFieldError('sku') && (
            <p className="mt-1 text-[10px] text-rose-400">{getFieldError('sku')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function fieldColorClass(aiApplied: boolean) {
  return aiApplied
    ? 'bg-amber-500/10 border-amber-400/50 text-amber-200'
    : 'border-[#232636]';
}
