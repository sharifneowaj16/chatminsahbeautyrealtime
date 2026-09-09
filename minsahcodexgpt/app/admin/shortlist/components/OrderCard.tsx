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
      className={`bg-[#151516] border border-white/[0.08] border-l-4 ${borderAccent} rounded-xl overflow-hidden shadow-sm hover:border-white/[0.15] transition-all`}
    >
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer hover:bg-[#1C1D1F]/50 transition-colors"
      >
        <div className="space-y-3">
          {/* Order Number & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-[#F7F8F8]">
                #{order.orderNumber}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                {order.isCompleted ? '✅ Completed' : '⏳ Pending'}
              </span>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-xl transition-transform text-[#8A8F98] hover:text-[#F7F8F8] bg-transparent border-none p-0"
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
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
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08] sm:border-t-0">
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
        <div className="border-t border-white/[0.08] p-4 sm:p-5 bg-[#08090A] space-y-3">
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
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-800 font-medium text-sm flex items-center gap-2">
                <span>✅</span>
                All products have been purchased!
              </p>
              {order.completedAt && (
                <p className="text-green-700 text-xs mt-1">
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
