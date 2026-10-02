'use client';

import React from 'react';
import { Package, Trash2, Tag, Cpu, Archive } from 'lucide-react';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';
import { QuantityStepper } from './QuantityStepper';

export interface OrderItemRowProps {
  id?: string;
  title: string;
  sku?: string;
  variantName?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  total?: number;
  productType?: 'new' | 'old' | 'virtual' | string;
  isCustom?: boolean;
  editable?: boolean;
  onQuantityChange?: (newQty: number) => void;
  onDelete?: () => void;
  className?: string;
}

const TYPE_BADGE: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new: { label: 'New', icon: Tag, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  old: { label: 'Old Stock', icon: Archive, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  virtual: { label: 'Virtual', icon: Cpu, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  title,
  sku,
  variantName,
  imageUrl,
  unitPrice,
  quantity,
  total,
  productType = 'new',
  isCustom = false,
  editable = false,
  onQuantityChange,
  onDelete,
  className = '',
}) => {
  const lineTotal = total !== undefined ? total : unitPrice * quantity;
  const typeConfig = TYPE_BADGE[productType] || TYPE_BADGE.new;
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors ${className}`}
    >
      {/* Product Image & Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-slate-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-white truncate max-w-[280px]" title={title}>
              {title}
            </h4>

            {isCustom && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Custom Item
              </span>
            )}

            {productType && productType !== 'new' && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${typeConfig.color}`}
              >
                <TypeIcon className="w-2.5 h-2.5" />
                {typeConfig.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            {sku && <span className="font-mono text-slate-500">SKU: {sku}</span>}
            {variantName && (
              <span className="text-slate-300 font-medium bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                {variantName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing & Quantity Controls */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-[11px] text-slate-400">
            <CurrencyDisplay amount={unitPrice} size="xs" /> &times; {quantity}
          </div>
          <CurrencyDisplay amount={lineTotal} size="sm" className="font-bold text-white" />
        </div>

        {editable && onQuantityChange ? (
          <QuantityStepper
            value={quantity}
            onChange={onQuantityChange}
            size="sm"
          />
        ) : (
          <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-200">
            Qty: {quantity}
          </span>
        )}

        {editable && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Remove item"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderItemRow;
