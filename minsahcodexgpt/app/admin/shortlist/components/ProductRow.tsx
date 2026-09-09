'use client';

// app/admin/shortlist/components/ProductRow.tsx

import { Input } from '@/components/ui/Input';
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
          <Input
            type="checkbox"
            checked={item.purchased}
            onChange={onCheckboxChange}
            className="w-5 h-5 rounded border border-[#2A2A32] bg-[#14141A] cursor-pointer text-[#D07A60] focus:ring-[#D07A60] transition-all"
          />
        </label>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm sm:text-base transition-all ${
              item.purchased
                ? 'text-green-700 line-through'
                : 'text-[#F5F3F0]'
            }`}
          >
            {item.productName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-[#14141A] border border-[#2A2A32] text-[#9A9691] px-2 py-0.5 rounded">
              Qty: {item.quantity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPriorityColor(item.priority)}`}>
              {getPriorityIcon(item.priority)} {item.priority === 'LOW_PRIORITY' ? 'Low' : item.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Details Grid - Mobile Stack */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-9 text-xs sm:text-sm border-t border-[#2A2A32] pt-2 mt-2">
        <div>
          <p className="text-[#9A9691] text-xs">Buy Price</p>
          <p className="font-bold text-[#F5F3F0]">{formatCurrency(item.buyPrice)}</p>
        </div>
        <div>
          <p className="text-[#9A9691] text-xs">Total Cost</p>
          <p className="font-bold text-rose-400">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-[#9A9691] text-xs">Sell Price</p>
          <p className="font-bold text-[#F5F3F0]">{formatCurrency(item.sellPrice)}</p>
        </div>
        <div>
          <p className="text-[#9A9691] text-xs">Profit</p>
          <p className="font-bold text-emerald-400">{formatCurrency(profit)}</p>
        </div>
      </div>

      {/* Purchase Status */}
      {item.purchased && item.purchasedAt && (
        <div className="pl-9 mt-2 pt-2 border-t border-emerald-800/40">
          <p className="text-xs text-emerald-400">
            ✅ Purchased on {new Date(item.purchasedAt).toLocaleDateString('bn-BD')}
          </p>
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="pl-9 mt-2 pt-2 border-t border-[#2A2A32]">
          <p className="text-xs text-[#9A9691] italic">
            📝 {item.notes}
          </p>
        </div>
      )}
    </div>
  );
}
