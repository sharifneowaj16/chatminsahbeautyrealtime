// app/admin/shortlist/components/mobile/MobileOrderPreviewSheet.tsx
// 100% Mobile Pixel Parity for Stitch Screen abe7ac911f164e029104a798d02abca8
// Customer Order Preview Bottom-Sheet composed via Loop 8 Atomic Components

'use client';

import React, { useState } from 'react';
import { EnrichedOrderDemand } from './MobileOrdersDemandSheet';
import { WholesaleSkuRow } from '../../types';
import { MobileOrderPreviewHeader } from '@/components/admin/shortlist/mobile/demand/MobileOrderPreviewHeader';
import { MobileOrderCustomerSnippet } from '@/components/admin/shortlist/mobile/demand/MobileOrderCustomerSnippet';
import { MobileOrderItemsMiniList } from '@/components/admin/shortlist/mobile/demand/MobileOrderItemsMiniList';
import { MobileOrderPreviewFooter } from '@/components/admin/shortlist/mobile/demand/MobileOrderPreviewFooter';
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
        <div className="flex-1 w-full" onClick={onClose} />

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

          <MobileOrderPreviewHeader
            orderNumber={orderNumber}
            isExpress={isExpress}
            courierService={order.courierService || 'Steadfast Express • Same-Day Direct Van'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            <MobileOrderCustomerSnippet
              customerName={customerName}
              phone={customerPhone}
              address={customerAddress}
            />

            <MobileOrderItemsMiniList
              sku={sku}
              order={order}
              orderTotal={orderTotal}
              isExpanded={expandedItem === 'item-1'}
              onToggleExpand={() => setExpandedItem(expandedItem === 'item-1' ? '' : 'item-1')}
            />

            {/* Mini Financial Summary */}
            <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Customer Bill ({order.paymentMethod || 'Pre-paid bKash'})
                </span>
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

          <MobileOrderPreviewFooter
            onPrintOrderSlip={() => onPrintOrderSlip && onPrintOrderSlip(order)}
            onViewFullOrder={() => {
              onClose();
              if (onOpenFullOrder) onOpenFullOrder(order.orderId || order.orderNumber);
            }}
          />
        </div>
      </div>
    </div>
  );
}
