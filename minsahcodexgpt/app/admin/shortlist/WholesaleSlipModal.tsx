// app/admin/shortlist/WholesaleSlipModal.tsx
// 80mm POS / A4 Wholesale Procurement Slip Modal

'use client';

import React from 'react';
import { ShortlistOrder } from './types';

interface WholesaleSlipModalProps {
  order: ShortlistOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WholesaleSlipModal({
  order,
  isOpen,
  onClose,
}: WholesaleSlipModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalWholesale = order.items.reduce(
    (sum, item) => sum + item.buyPrice * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#161824] border border-[#273647] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#273647] bg-[#122131]">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6366f1]/20 text-[#6366f1] text-sm">
              🧾
            </span>
            <h3 className="font-bold text-sm text-[#f7f8f8]">Wholesale Sourcing Slip</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a8f98] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close wholesale slip modal"
          >
            ✕
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#0b0f17]">
          <div
            id="printable-wholesale-slip"
            className="bg-white text-stone-900 p-5 rounded-lg shadow-sm font-mono text-xs border border-stone-300"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400">
              <h2 className="font-extrabold text-base uppercase tracking-wider">
                Minsah Beauty
              </h2>
              <p className="text-[11px] text-stone-600">Procurement & Wholesale Slip</p>
              <p className="text-[10px] text-stone-500 mt-1">
                Dhaka Warehouse • Hotline: 01700-MINSAH
              </p>
            </div>

            {/* Order & Date Details */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">Order ID:</span>
                <span>{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="text-right truncate max-w-[180px]">{order.customer.area}</span>
              </div>
            </div>

            {/* Procurement Items Table */}
            <div className="py-2.5 border-b border-dashed border-stone-400">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 font-bold mb-1.5 text-[10px] text-stone-700 uppercase">
                <span>Item & Supplier</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Buy Total</span>
              </div>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="text-[11px]">
                    <div className="font-semibold leading-tight">{item.productName}</div>
                    <div className="text-[10px] text-stone-500 flex justify-between mt-0.5">
                      <span>SKU: {item.sku}</span>
                      <span>Supplier: {item.supplierName}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 mt-0.5">
                      <span>৳{item.buyPrice} × {item.quantity}</span>
                      <span className="font-bold">৳{item.buyPrice * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1">
              <div className="flex justify-between font-extrabold text-sm">
                <span>TOTAL WHOLESALE BUY:</span>
                <span>৳{totalWholesale}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Customer Sale Total:</span>
                <span>৳{order.totalCustomerBill}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800 text-[11px]">
                <span>Projected Net Profit:</span>
                <span>+৳{order.totalProfit}</span>
              </div>
            </div>

            {/* Barcode & Officer Footer */}
            <div className="pt-3 text-center text-[10px] text-stone-500 space-y-1">
              <div className="tracking-[0.25em] font-bold text-stone-800 text-xs">
                ||||| | |||| ||||| |||| |
              </div>
              <p>Barcode: {order.items[0]?.barcode || '89412389401'}</p>
              <p className="mt-2 text-stone-400">
                Procurement Lead: Minsah Admin (MA) • Verified Sourcing
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between p-4 border-t border-[#273647] bg-[#122131]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#8a8f98] hover:text-white hover:bg-white/5 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#5255d6] text-white text-xs font-bold shadow-md shadow-[#6366f1]/20 transition-all active:scale-95"
          >
            <span>🖨️ Print Sourcing Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
