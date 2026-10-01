// app/admin/shortlist/components/mobile/MobileOrderPreviewSheet.tsx
// 100% Mobile Pixel Parity for Stitch Screen abe7ac911f164e029104a798d02abca8
// Customer Order Preview Bottom-Sheet with Contact Triggers, Courier Milestone & Items Breakdown

'use client';

import React, { useState } from 'react';
import { EnrichedOrderDemand } from './MobileOrdersDemandSheet';
import { WholesaleSkuRow } from '../../types';
import {
  X,
  Truck,
  Phone,
  MessageSquare,
  MapPin,
  Store,
  QrCode,
  CheckCircle,
  Clock,
  ChevronDown,
  Receipt,
  ArrowRight,
  Package,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface MobileOrderPreviewSheetProps {
  order: EnrichedOrderDemand | null;
  sku?: WholesaleSkuRow | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullOrder?: (orderId: string) => void;
  onPrintOrderSlip?: (order: EnrichedOrderDemand) => void;
}

export default function MobileOrderPreviewSheet({
  order,
  sku,
  isOpen,
  onClose,
  onOpenFullOrder,
  onPrintOrderSlip,
}: MobileOrderPreviewSheetProps) {
  if (!order) return null;

  const [expandedItem, setExpandedItem] = useState<string>('item-1');

  const customerName = order.customerName || 'Ayesha Siddiqua';
  const customerPhone = order.phone || '+8801712345678';
  const customerAddress = order.address || 'House 14, Road 5, Uttara Sector 4, Dhaka-1230';
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const isExpress = order.shippingType === 'Express';
  const orderNumber = order.orderNumber || 'ORD-65412890';
  const orderTotal = order.orderTotal || 1710;
  const wholesaleCost = Math.round(orderTotal * 0.65);
  const deliveryFee = 60;
  const grossProfit = Math.max(0, orderTotal - wholesaleCost - deliveryFee);
  const profitMarginPercent = orderTotal > 0 ? Math.round((grossProfit / orderTotal) * 100) : 0;

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(1, 15, 31, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full h-full flex flex-col justify-end">
        {/* Dismiss Backdrop */}
        <div className="flex-1 w-full" onClick={onClose} />

        {/* Bottom Sheet Container */}
        <div
          className={`w-full max-h-[92vh] bg-[#0d1c2d] border-t border-[#1f2f45] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Drag Handle Indicator */}
          <div
            onClick={onClose}
            className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer shrink-0"
          >
            <div className="w-12 h-1.5 rounded-full bg-[#273647]" />
          </div>

          {/* Bottom-sheet Header */}
          <div className="px-4 pt-2 pb-3 border-b border-[#1c2b3c] flex items-start justify-between gap-3 shrink-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-mono text-base text-white font-bold tracking-wide">
                  #{orderNumber}
                </h2>
                {isExpress ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    2x Express
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-slate-300 font-bold">
                    Standard Delivery
                  </span>
                )}
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-amber-200 font-semibold">
                  42m left (3:30 PM)
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{order.courierService || 'Steadfast Express • Same-Day Direct Van'}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-slate-300 hover:text-white flex items-center justify-center shrink-0 active:scale-90 transition"
              aria-label="Close Order Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Sheet Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {/* Customer Information Card */}
            <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] shadow-sm flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/30">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white font-bold truncate">
                        {customerName}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                        VIP
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-400 font-medium">
                      {customerPhone}
                    </span>
                  </div>
                </div>

                {/* Quick Customer Contacts */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${customerPhone}`}
                    className="h-8 px-2.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-sm"
                    aria-label="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg bg-[#1c2b3c] text-emerald-400 flex items-center justify-center active:scale-95 transition"
                    aria-label="WhatsApp Customer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-2 rounded-lg bg-[#051424] text-slate-300 flex items-start gap-1.5 text-xs">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-200 leading-tight">
                  {customerAddress}
                </span>
              </div>
            </div>

            {/* Order Items Breakdown Header */}
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Items Breakdown (2 SKUs • 3 pcs)
              </span>
              <span className="font-mono text-xs text-indigo-400 font-semibold">
                Order Total: {formatPrice(orderTotal)}
              </span>
            </div>

            {/* Item 1: Focused Shortlist SKU */}
            <div className="rounded-xl bg-[#122131] border border-[#1f2f45] overflow-hidden shadow-sm transition-all">
              <div
                onClick={() => setExpandedItem(expandedItem === 'item-1' ? '' : 'item-1')}
                className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-[#172a3e] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-11 h-11 rounded-md bg-[#051424] overflow-hidden shrink-0 border border-[#1c2b3c]">
                      {sku?.thumbnailUrl ? (
                        <img
                          src={sku.thumbnailUrl}
                          alt={sku.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-indigo-300 font-bold">
                          {sku?.sku || 'MSB-LIP-01'}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                          1/2 Acquired
                        </span>
                      </div>
                      <span className="text-xs text-white font-semibold truncate leading-tight mt-0.5">
                        {sku?.title || 'Velvet Matte Liquid Lipstick'}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {sku?.variantOrShade || 'Shade: Ruby Rose 3.2ml'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-white font-bold">
                        {order.quantity || 2} pcs
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          expandedItem === 'item-1' ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">৳550 msrp</span>
                  </div>
                </div>

                <div className="px-2 py-1 rounded bg-[#051424] flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 truncate">
                    <Store className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      {sku?.vendor.stallName || 'Paltan Heritage'} (
                      {sku?.vendor.standLocation || 'Stand 14'})
                    </span>
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">Cost: ৳640</span>
                </div>
              </div>

              {expandedItem === 'item-1' && (
                <div className="px-3 pb-3 pt-1 border-t border-[#1c2b3c] flex flex-col gap-2 bg-[#051424]/60">
                  <div className="p-2 rounded-lg bg-[#122131] flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        Batch &amp; Barcode
                      </span>
                      <span className="text-indigo-400 font-semibold">Batch LK-24</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-300 flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-slate-400" />
                        890123450912
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1c2b3c] text-amber-300 font-bold text-[10px]">
                        Urgent Runner Tag
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#122131] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">
                          Babul • Paltan Heritage
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 truncate">
                          +880 1711-892401
                        </span>
                      </div>
                    </div>
                    <a
                      href="tel:+8801711892401"
                      className="h-7 px-2 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition shadow-sm shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  </div>

                  <div className="p-2 rounded-lg bg-[#051424] border border-[#1c2b3c] flex flex-col gap-1.5">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                      Sourcing Progress
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">1 pc in runner bag</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-300 truncate">1 pc stall pickup</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mini Financial Summary */}
            <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Customer Bill ({order.paymentMethod || 'Pre-paid bKash'})</span>
                <span className="font-mono text-white font-bold">{formatPrice(orderTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Wholesale Stall Cost</span>
                <span className="font-mono text-slate-300 font-medium">{formatPrice(wholesaleCost)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Direct Van Delivery Fee</span>
                <span className="font-mono text-slate-300 font-medium">{formatPrice(deliveryFee)}</span>
              </div>
              <div className="h-px bg-[#1c2b3c] my-0.5" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 uppercase font-bold text-[10px]">
                  Est. Gross Profit
                </span>
                <span className="font-mono text-sm text-emerald-400 font-bold">
                  {formatPrice(grossProfit)} ({profitMarginPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Action Cluster Footer */}
          <div className="p-4 pt-2 pb-8 border-t border-[#1c2b3c] bg-[#051424] flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPrintOrderSlip && onPrintOrderSlip(order)}
              className="h-11 px-3.5 rounded-xl bg-[#1c2b3c] hover:bg-[#273647] text-indigo-300 flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-bold">Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenFullOrder) onOpenFullOrder(order.orderId || order.orderNumber);
              }}
              className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-98 transition"
            >
              <span>View Full Order Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
