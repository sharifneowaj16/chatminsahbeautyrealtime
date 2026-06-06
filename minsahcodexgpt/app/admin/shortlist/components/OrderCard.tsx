// app/admin/shortlist/components/OrderCard.tsx

'use client';

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

  const borderColor = order.isCompleted
    ? 'border-l-4 border-green-500'
    : 'border-l-4 border-orange-500';
  
  const bgColor = order.isCompleted ? 'bg-green-50' : 'bg-orange-50';
  const badgeColor = order.isCompleted
    ? 'bg-green-100 text-green-700'
    : 'bg-orange-100 text-orange-700';

  return (
    <div
      className={`${bgColor} ${borderColor} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer hover:bg-opacity-60 transition-colors"
      >
        <div className="space-y-3">
          {/* Order Number & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">
                #{order.orderNumber}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                {order.isCompleted ? '✅ Completed' : '⏳ Pending'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-xl transition-transform"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>

          {/* Customer Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{order.customer.name}</p>
              <p className="text-gray-600 text-xs">{order.customer.phone}</p>
            </div>
            <p className="text-gray-500 text-xs">{formatDate(order.createdAt)}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {order.purchasedProducts}/{order.totalProducts} Purchased
              </span>
              <span className="text-xs font-bold text-gray-900">{order.progress}%</span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  order.isCompleted
                    ? 'bg-green-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${order.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 sm:border-t-0">
            <div>
              <p className="text-xs text-gray-600">Profit</p>
              <p className="font-bold text-gray-900">{formatCurrency(order.totalProfit)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Remaining</p>
              <p className="font-bold text-red-600">{order.unpurchasedProducts} items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 sm:p-5 bg-white space-y-3">
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
