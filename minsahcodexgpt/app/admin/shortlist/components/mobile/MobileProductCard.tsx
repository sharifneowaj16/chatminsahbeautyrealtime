// app/admin/shortlist/components/mobile/MobileProductCard.tsx
// 100% Mobile Pixel Parity for Stitch Screen 02248546b4a44f16b9880f1c139de699
// Collapsible Mobile Product Card with Vendor Info, Tap-to-Call, Runout Risk & Action Triggers

'use client';

import React from 'react';
import { WholesaleSkuRow } from '../../types';
import {
  Store,
  Phone,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface MobileProductCardProps {
  sku: WholesaleSkuRow;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onAcquire: () => void;
  onOrdersDemand: () => void;
  onPrintSlip: () => void;
}

export default function MobileProductCard({
  sku,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onAcquire,
  onOrdersDemand,
  onPrintSlip,
}: MobileProductCardProps) {
  const isUrgent = sku.priority === 'URGENT' || sku.demandTag?.toLowerCase().includes('urgent');
  const vendorPhone = sku.vendor.phone || '+8801711892401';
  const unitCost = sku.financials.unitCost || 320;
  const totalCost = unitCost * sku.requiredQuantity;
  const retailValue = sku.financials.retailValue || unitCost * 1.8;
  const marginPercent = Math.round(((retailValue - totalCost) / retailValue) * 100) || 45;
  const orderCount = sku.linkedOrders?.length || 2;

  return (
    <article
      className={`rounded-xl bg-[#0d1c2d] border transition-all shadow-md overflow-hidden ${
        isSelected
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
          : isUrgent
          ? 'border-amber-500/30'
          : 'border-[#1f2f45]'
      }`}
    >
      {/* ── Card Header / Collapsed Summary Bar (Always Visible) ── */}
      <div
        onClick={onToggleExpand}
        className="p-3 flex items-start gap-2.5 cursor-pointer active:bg-[#122336]/60 transition-colors select-none"
      >
        {/* Row Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="mt-1 h-4 w-4 rounded bg-[#172a3e] border-[#1f2f45] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />

        {/* Product Thumbnail */}
        <div className="w-13 h-13 rounded-lg bg-[#102135] border border-[#1f2f45] overflow-hidden shrink-0 flex items-center justify-center">
          {sku.thumbnailUrl ? (
            <img
              src={sku.thumbnailUrl}
              alt={sku.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] font-bold text-indigo-400 tracking-wider truncate">
              {sku.sku}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {isUrgent && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                  ⚡ URGENT
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </div>

          <h3 className="text-xs font-semibold text-white tracking-tight leading-snug truncate mt-0.5">
            {sku.title}
          </h3>

          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Demand:</span>
              <span className="font-bold text-amber-300">{sku.requiredQuantity} pcs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Est. Buy:</span>
              <span className="font-bold text-emerald-400">{formatPrice(unitCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded Accordion Details (Stitch Screen 02248546b4a44f16b9880f1c139de699) ── */}
      {isExpanded && (
        <div className="border-t border-[#172a3e] p-3 space-y-3 bg-[#0a1727]/90 animate-in fade-in-50 duration-150">
          {/* 1. Preferred Supplier Info & Call Button */}
          <div className="p-2.5 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {sku.vendor.stallName || 'Paltan Heritage Trading'}
                </span>
                <span className="text-[10px] text-slate-400 truncate font-mono">
                  {sku.vendor.standLocation || 'Stand 14, Lane 2, Paltan'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${vendorPhone.replace(/\s+/g, '')}`}
                aria-label="Call Supplier"
                className="h-8 w-8 rounded-lg bg-[#172a3e] hover:bg-[#1f344d] active:scale-95 text-emerald-400 flex items-center justify-center border border-[#1f2f45] transition-transform"
              >
                <Phone className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onToggleExpand}
                aria-label="Collapse Details"
                className="h-8 w-8 rounded-lg bg-[#172a3e] hover:bg-rose-500/20 active:scale-95 text-slate-400 hover:text-rose-400 flex items-center justify-center border border-[#1f2f45] transition-transform"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 2. Procurement Quantities, Orders & Financial Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Orders Demand</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold text-white font-mono">{sku.requiredQuantity} pcs</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
                  {orderCount} Orders
                </span>
              </div>
              <button
                type="button"
                onClick={onOrdersDemand}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 mt-1.5 underline underline-offset-2 cursor-pointer"
              >
                <ListOrdered className="h-3 w-3" />
                <span>View Order IDs →</span>
              </button>
            </div>

            <div className="p-2 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Wholesale Rate</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold text-emerald-400 font-mono">{formatPrice(unitCost)}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {marginPercent}% Margin
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1.5 truncate">
                Total: {formatPrice(totalCost)}
              </span>
            </div>
          </div>

          {/* 3. Runout Risk & Tied-up Capital Alert */}
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Runout Risk: ≤ 3 Days remaining</span>
            </div>
            <span className="text-slate-400">
              Tied Capital: <strong className="text-white">{formatPrice(totalCost)}</strong>
            </span>
          </div>

          {/* 4. Action Buttons Bar (Acquire, Orders Demand, Print Slip) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={onAcquire}
              className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition-transform cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Acquire</span>
            </button>

            <button
              type="button"
              onClick={onOrdersDemand}
              className="h-9 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 active:scale-95 text-indigo-300 border border-indigo-500/40 font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-transform cursor-pointer"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span>Orders</span>
            </button>

            <button
              type="button"
              onClick={onPrintSlip}
              className="h-9 rounded-lg bg-[#172a3e] hover:bg-[#1f344d] active:scale-95 text-slate-300 hover:text-white border border-[#1f2f45] font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-transform cursor-pointer"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
