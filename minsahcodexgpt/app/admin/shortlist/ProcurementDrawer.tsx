// app/admin/shortlist/ProcurementDrawer.tsx
// Dual-Mode Responsive Procurement Drawer & Slide-up Bottom Sheet
// Matching Stitch Screen ID: 39286148a6704e6995ed026438f698cf & 787e84a5a6b6479a89244d9d01282889

'use client';

import React, { useState } from 'react';
import { ShortlistOrder, ShortlistItem } from './types';

interface ProcurementDrawerProps {
  order: ShortlistOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleItemPurchased: (orderId: string, itemId: string) => void;
  onMarkAllPurchased: (orderId: string) => void;
  onOpenWholesaleSlip: (order: ShortlistOrder) => void;
  onConfirmOrderStatus: (orderId: string) => void;
}

export default function ProcurementDrawer({
  order,
  isOpen,
  onClose,
  onToggleItemPurchased,
  onMarkAllPurchased,
  onOpenWholesaleSlip,
  onConfirmOrderStatus,
}: ProcurementDrawerProps) {
  const [supplierModalItemId, setSupplierModalItemId] = useState<string | null>(null);
  const [customSupplierName, setCustomSupplierName] = useState('');

  if (!isOpen || !order) return null;

  const purchasedCount = order.items.filter((i) => i.purchased).length;
  const pendingCount = order.items.length - purchasedCount;
  const progressPercent = Math.round((purchasedCount / (order.items.length || 1)) * 100);

  const totalBuy = order.items.reduce((s, i) => s + i.buyPrice * i.quantity, 0);
  const totalBill = order.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0);
  const netProfit = totalBill - totalBuy;

  const primarySupplier = order.items[0]?.supplierName || 'Polton Heritage Trading Co.';
  const primarySupplierPhone = order.items[0]?.supplierPhone || '+8801812345678';

  const handleSupplierSave = (itemId: string) => {
    if (customSupplierName.trim()) {
      const item = order.items.find((i) => i.id === itemId);
      if (item) {
        item.supplierName = customSupplierName.trim();
      }
    }
    setSupplierModalItemId(null);
    setCustomSupplierName('');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Right-docked on desktop, Slide-up bottom sheet on mobile) */}
      <aside
        className={`fixed lg:static inset-x-0 bottom-0 z-50 lg:z-10
          max-h-[88vh] lg:max-h-full h-full w-full lg:w-[500px] xl:w-[540px] flex-shrink-0
          bg-[#0d1c2d] border-t lg:border-t-0 lg:border-l border-[#273647]
          rounded-t-2xl lg:rounded-none flex flex-col justify-between
          shadow-2xl lg:shadow-none overflow-hidden select-none animate-in slide-in-from-bottom lg:slide-in-from-right duration-200`}
        aria-label="Procurement & Sourcing Drawer"
      >
        {/* Mobile Top Drag Handle */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* 1. DRAWER TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#273647] bg-[#122131]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-extrabold text-[#f7f8f8]">
                {order.orderNumber}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316] font-bold text-[10px] tracking-wider uppercase">
                ⚡ Urgent Sourcing
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenWholesaleSlip(order)}
                className="p-1.5 rounded-lg text-[#8a8f98] hover:text-white hover:bg-white/10 transition-colors"
                title="Print Wholesale Sourcing Slip"
                aria-label="Print Wholesale Sourcing Slip"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8a8f98] hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close drawer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Customer Metadata Card */}
          <div className="mt-3.5 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#6366f1]/20 text-[#6366f1] flex items-center justify-center font-bold text-[10px]">
                👤
              </div>
              <span className="font-bold text-[#f7f8f8]">{order.customer.name}</span>
              <a
                href={`tel:${order.customer.phone}`}
                className="text-[#6366f1] hover:underline font-mono"
              >
                ({order.customer.phone})
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-[#8a8f98] text-[11px] pl-7">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{order.customer.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#8a8f98] text-[11px] pl-7">
              <span>📅 Created: {new Date(order.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="text-[#4edea3] font-medium">{order.source}</span>
            </div>
          </div>

          {/* Top Quick Actions Row */}
          <div className="mt-4 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            <button
              type="button"
              onClick={() => onMarkAllPurchased(order.id)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <span>✓ Mark All Purchased</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenWholesaleSlip(order)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#161824] hover:bg-[#1f2333] border border-[#273647] text-[#c0c1ff] font-medium text-xs transition-colors"
            >
              <span>Wholesale Slip</span>
            </button>
            <a
              href={`tel:${primarySupplierPhone}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#161824] hover:bg-[#1f2333] border border-[#273647] text-[#4edea3] font-medium text-xs transition-colors"
              title={`Call ${primarySupplier}`}
            >
              <span>📞 Call Supplier</span>
            </a>
          </div>
        </div>

        {/* 2. SOURCING ITEMS LIST (Scrollable Canvas) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8a8f98]">
            <span>Items to Buy ({order.items.length} Products)</span>
            <span className="font-mono text-[11px] text-[#4edea3]">
              {pendingCount} Pending • {purchasedCount} Acquired
            </span>
          </div>

          {order.items.map((item: ShortlistItem) => {
            const itemMargin = Math.round(
              ((item.sellPrice - item.buyPrice) / (item.sellPrice || 1)) * 100
            );
            const lineProfit = (item.sellPrice - item.buyPrice) * item.quantity;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  item.purchased
                    ? 'bg-[#122131]/60 border-[#10b981]/30 hover:border-[#10b981]/50'
                    : 'bg-[#122131] border-[#f97316]/30 hover:border-[#f97316]/50 shadow-md'
                }`}
              >
                {/* Item Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={() => onToggleItemPurchased(order.id, item.id)}
                      className="w-4 h-4 rounded border-[#273647] bg-[#0d1c2d] text-[#6366f1] focus:ring-0 cursor-pointer"
                      aria-label={`Mark ${item.productName} as purchased`}
                    />
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                        item.purchased
                          ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                          : 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30'
                      }`}
                    >
                      {item.purchased ? '✓ Purchased' : 'Awaiting Purchase'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#f7f8f8]">
                    Qty: {item.quantity} pcs
                  </span>
                </div>

                {/* Product Name & Specs */}
                <div className="mt-2.5">
                  <h4 className="font-bold text-sm text-[#f7f8f8] leading-snug">
                    {item.productName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8a8f98] font-mono">
                    <span>SKU: {item.sku}</span>
                    <span>•</span>
                    <span>Barcode: {item.barcode}</span>
                  </div>
                </div>

                {/* Financial Breakdown Box (3 Columns) */}
                <div className="mt-3 grid grid-cols-3 gap-2 bg-[#090a0f]/60 rounded-lg p-2.5 border border-[#273647]/50 text-center font-mono">
                  <div className="border-r border-[#273647]/50 pr-1">
                    <span className="text-[10px] text-[#8a8f98] uppercase block">Wholesale Buy</span>
                    <span className="text-xs font-bold text-[#f7f8f8]">৳{item.buyPrice} ea</span>
                    <span className="text-[10px] text-[#8a8f98] block">Tot: ৳{item.buyPrice * item.quantity}</span>
                  </div>
                  <div className="border-r border-[#273647]/50 pr-1">
                    <span className="text-[10px] text-[#8a8f98] uppercase block">Customer Sell</span>
                    <span className="text-xs font-bold text-[#f7f8f8]">৳{item.sellPrice} ea</span>
                    <span className="text-[10px] text-[#8a8f98] block">Tot: ৳{item.sellPrice * item.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8a8f98] uppercase block">Net Profit</span>
                    <span className="text-xs font-extrabold text-[#4edea3]">+৳{lineProfit}</span>
                    <span className="text-[10px] text-[#4edea3] block font-bold">Margin: {itemMargin}%</span>
                  </div>
                </div>

                {/* Supplier Assignment Bar */}
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#273647]/40">
                  <div className="flex items-center gap-1.5 text-[#8a8f98] truncate max-w-[240px]">
                    <span className="text-sm">🏬</span>
                    <span className="truncate text-white font-medium">{item.supplierName}</span>
                    {item.verifiedBy && (
                      <span className="text-[10px] text-[#4edea3] font-bold">
                        • Verified by {item.verifiedBy}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierModalItemId(item.id);
                      setCustomSupplierName(item.supplierName);
                    }}
                    className="text-[#6366f1] hover:underline text-[11px] font-bold shrink-0"
                  >
                    Change Supplier
                  </button>
                </div>

                {/* Bengali Customer Note Callout (if present) */}
                {item.customerNote && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[#f97316]/10 border-l-2 border-[#f97316] text-[#f97316] text-[11px] flex items-center gap-1.5">
                    <span>📌</span>
                    <span>&quot;{item.customerNote}&quot;</span>
                  </div>
                )}

                {/* Interactive Tap-To-Buy Action Button (If pending) */}
                {!item.purchased && (
                  <button
                    type="button"
                    onClick={() => onToggleItemPurchased(order.id, item.id)}
                    className="mt-3 w-full py-2 rounded-lg bg-[#6366f1]/20 hover:bg-[#6366f1]/30 border border-[#6366f1]/40 text-[#c0c1ff] font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <span>Tap when Purchased (৳{item.buyPrice * item.quantity} Total)</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. DRAWER STICKY FOOTER */}
        <div className="p-4 sm:p-5 border-t border-[#273647] bg-[#122131]">
          {/* Financial Totals */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono pb-3 border-b border-[#273647]/60">
            <div>
              <span className="text-[10px] text-[#8a8f98] uppercase block">Total Buy Cost</span>
              <span className="text-sm font-extrabold text-[#f7f8f8]">৳{totalBuy.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8f98] uppercase block">Customer Bill</span>
              <span className="text-sm font-extrabold text-[#f7f8f8]">৳{totalBill.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8f98] uppercase block">Net Order Profit</span>
              <span className="text-sm font-extrabold text-[#4edea3]">+৳{netProfit.toLocaleString()}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[#8a8f98]">{purchasedCount} of {order.items.length} items sourced</span>
              <span className="text-[#4edea3] font-bold">{progressPercent}% Completed</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1c2b3c] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#4edea3] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sticky CTA Button */}
          <button
            type="button"
            onClick={() => onConfirmOrderStatus(order.id)}
            className="mt-4 w-full py-3 rounded-xl bg-[#6366f1] hover:bg-[#5255d6] text-white font-bold text-sm shadow-lg shadow-[#6366f1]/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Confirm &amp; Update Order Status →</span>
          </button>
        </div>
      </aside>

      {/* Change Supplier Inline Modal */}
      {supplierModalItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#161824] border border-[#273647] rounded-xl p-4 shadow-xl">
            <h4 className="font-bold text-sm text-white mb-2">Assign Sourcing Supplier</h4>
            <input
              type="text"
              value={customSupplierName}
              onChange={(e) => setCustomSupplierName(e.target.value)}
              placeholder="Enter supplier name..."
              className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#273647] rounded-lg text-white mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSupplierModalItemId(null)}
                className="px-3 py-1.5 rounded text-xs text-[#8a8f98] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSupplierSave(supplierModalItemId)}
                className="px-3 py-1.5 rounded bg-[#6366f1] text-white text-xs font-bold"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
