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
    ? 'border-l-emerald-500'
    : 'border-l-[#D07A60]';

  const badgeColor = order.isCompleted
    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
    : 'bg-amber-950/70 text-amber-400 border border-amber-800/40';

  return (
    <div
      className={`bg-[#1E1E24] border border-[#2A2A32] border-l-4 ${borderAccent} rounded-xl overflow-hidden shadow-sm hover:border-[#3E3E48] transition-all`}
    >
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer hover:bg-[#26262E]/50 transition-colors"
      >
        <div className="space-y-3">
          {/* Order Number & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-[#F5F3F0]">
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
              className="text-xl transition-transform text-[#9A9691] hover:text-[#F5F3F0] bg-transparent border-none p-0"
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
          </div>

          {/* Customer Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-semibold text-[#F5F3F0] text-sm">{order.customer.name}</p>
              <p className="text-[#9A9691] text-xs">{order.customer.phone}</p>
            </div>
            <p className="text-[#6B6864] text-xs">{formatDate(order.createdAt)}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9A9691]">
                {order.purchasedProducts}/{order.totalProducts} Purchased
              </span>
              <span className="text-xs font-bold text-[#F5F3F0]">{order.progress}%</span>
            </div>
            <progress
              className="h-2 w-full accent-[#D07A60] bg-[#2A2A32] rounded-full overflow-hidden"
              max={100}
              value={order.progress}
              aria-label={`${order.customer.name} progress`}
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2A32] sm:border-t-0">
            <div>
              <p className="text-xs text-[#9A9691]">Profit</p>
              <p className="font-bold text-[#F5F3F0]">{formatCurrency(order.totalProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-[#9A9691]">Remaining</p>
              <p className="font-bold text-rose-400">{order.unpurchasedProducts} items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#2A2A32] p-4 sm:p-5 bg-[#14141A] space-y-3">
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
