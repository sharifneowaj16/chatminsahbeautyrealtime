'use client';

// app/admin/shortlist/components/OrderCard.tsx

import { Button } from '@/components/ui/Button';
import React, { useState } from 'react';
import { useShortlist } from '../ShortlistContext';
import ProductRow from './ProductRow';

interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt?: string | null;
  priority: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  items: ShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  unpurchasedProducts: number;
  progress: number;
  isCompleted: boolean;
  totalProfit: number;
  completedAt?: string | null;
}

export default function OrderCard({ order }: { order: Order }) {
  const [isExpanded, setIsExpanded] = useState(!order.isCompleted);
  const { updateItemStatus } = useShortlist();

  const handleCheckboxChange = async (itemId: string, currentStatus: boolean) => {
    await updateItemStatus(itemId, !currentStatus);
  };

  const formatCurrency = (amount: number) => {
    return `৳${Math.round(amount).toLocaleString('bn-BD')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const borderAccent = order.isCompleted
    ? 'border-l-white'
    : 'border-l-white/40';

  const badgeColor = order.isCompleted
    ? 'bg-white/[0.12] text-white border border-white/[0.20]'
    : 'bg-white/[0.06] text-white/80 border border-white/[0.10]';

  return (
    <div
      className={`linear-card bg-[#161824] border border-[#232636] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border-l-4 ${borderAccent} rounded-xl overflow-hidden hover:border-white/[0.15] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all`}
    >
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-4.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="space-y-2.5">
          {/* Order Number & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold tracking-tight text-[#F7F8F8]">
                #{order.orderNumber}
              </span>
              <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium tracking-tight ${badgeColor}`}>
                {order.isCompleted ? '✅ Completed' : '⏳ Pending'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] active:scale-[0.96] transition-all text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>

          {/* Customer Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-semibold text-[#F7F8F8] text-sm">{order.customer.name}</p>
              <p className="text-[#8A8F98] text-xs">{order.customer.phone}</p>
            </div>
            <p className="text-[#62666D] text-xs">{formatDate(order.createdAt)}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#8A8F98]">
                {order.purchasedProducts}/{order.totalProducts} Purchased
              </span>
              <span className="text-xs font-bold text-[#F7F8F8]">{order.progress}%</span>
            </div>
            <progress
              className="h-2 w-full accent-[#F7F8F8] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden"
              max={100}
              value={order.progress}
              aria-label={`${order.customer.name} progress`}
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232636] sm:border-t-0">
            <div>
              <p className="text-xs text-[#8A8F98]">Profit</p>
              <p className="font-bold text-[#F7F8F8]">{formatCurrency(order.totalProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-[#8A8F98]">Remaining</p>
              <p className="font-bold text-rose-400">{order.unpurchasedProducts} items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#232636] p-4 sm:p-5 bg-[#10121b] space-y-3">
          {/* Product List */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <ProductRow
                key={item.id}
                item={item}
                onCheckboxChange={() =>
                  handleCheckboxChange(item.id, item.purchased)
                }
              />
            ))}
          </div>

          {/* Completion Message */}
          {order.isCompleted && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-green-300 rounded-lg">
              <p className="text-emerald-300 font-medium text-sm flex items-center gap-2">
                <span>✅</span>
                All products have been purchased!
              </p>
              {order.completedAt && (
                <p className="text-emerald-400 text-xs mt-1">
                  Completed on {formatDate(order.completedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
