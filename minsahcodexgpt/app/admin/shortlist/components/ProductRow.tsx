// app/admin/shortlist/components/ProductRow.tsx

'use client';

import React from 'react';

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

interface ProductRowProps {
  item: ShortlistItem;
  onCheckboxChange: () => void;
}

export default function ProductRow({ item, onCheckboxChange }: ProductRowProps) {
  const profit = (item.sellPrice - item.buyPrice) * item.quantity;
  const totalCost = item.buyPrice * item.quantity;
  const totalRevenue = item.sellPrice * item.quantity;

  const formatCurrency = (amount: number) => {
    return `৳${Math.round(amount).toLocaleString('bn-BD')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-50';
      case 'NORMAL':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW_PRIORITY':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '🔴';
      case 'NORMAL':
        return '🟡';
      case 'LOW_PRIORITY':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border-2 transition-all ${
        item.purchased
          ? 'border-green-300 bg-green-50'
          : 'border-gray-300 bg-white hover:border-blue-400'
      }`}
    >
      {/* Main Row - Checkbox + Product Name */}
      <div className="flex items-start gap-3 mb-2">
        {/* Checkbox */}
        <label className="flex items-center cursor-pointer pt-0.5">
          <input
            type="checkbox"
            checked={item.purchased}
            onChange={onCheckboxChange}
            className="w-6 h-6 rounded border-2 border-gray-300 cursor-pointer checked:bg-green-500 checked:border-green-500 transition-all"
          />
        </label>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm sm:text-base transition-all ${
              item.purchased
                ? 'text-green-700 line-through'
                : 'text-gray-900'
            }`}
          >
            {item.productName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Qty: {item.quantity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPriorityColor(item.priority)}`}>
              {getPriorityIcon(item.priority)} {item.priority === 'LOW_PRIORITY' ? 'Low' : item.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Details Grid - Mobile Stack */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-9 text-xs sm:text-sm border-t border-gray-200 pt-2 mt-2">
        <div>
          <p className="text-gray-600 text-xs">Buy Price</p>
          <p className="font-bold text-gray-900">{formatCurrency(item.buyPrice)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Total Cost</p>
          <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Sell Price</p>
          <p className="font-bold text-gray-900">{formatCurrency(item.sellPrice)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Profit</p>
          <p className="font-bold text-green-600">{formatCurrency(profit)}</p>
        </div>
      </div>

      {/* Purchase Status */}
      {item.purchased && item.purchasedAt && (
        <div className="pl-9 mt-2 pt-2 border-t border-green-200">
          <p className="text-xs text-green-700">
            ✅ Purchased on {new Date(item.purchasedAt).toLocaleDateString('bn-BD')}
          </p>
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="pl-9 mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">
            📝 {item.notes}
          </p>
        </div>
      )}
    </div>
  );
}
