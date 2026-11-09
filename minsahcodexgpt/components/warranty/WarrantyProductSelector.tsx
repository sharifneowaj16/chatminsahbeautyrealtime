'use client';

import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { WarrantyEligibleProduct } from './types';

interface WarrantyProductSelectorProps {
  products: WarrantyEligibleProduct[];
  selectedProductId: string;
  onSelect: (id: string) => void;
}

export default function WarrantyProductSelector({
  products,
  selectedProductId,
  onSelect,
}: WarrantyProductSelectorProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
          1. Select Item
        </span>
        <span className="text-xs text-[#828fff] font-mono">
          {products.length} eligible items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {products.length === 0 ? (
          <div className="rounded-2xl p-5 bg-[#0f1011] border border-[#23252a] text-center text-xs text-[#8a8f98]">
            No warranty eligible products found in past 14 days
          </div>
        ) : (
          products.map((item) => {
            const isSelected = item.id === selectedProductId;
            return (
              <label
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`rounded-2xl p-3.5 flex items-center gap-3.5 cursor-pointer shadow-sm transition-all ${
                  isSelected
                    ? 'bg-[#141516] border-2 border-[#5e6ad2] text-[#f7f8f8]'
                    : 'bg-[#0f1011] border border-[#23252a] text-[#8a8f98] hover:border-[#5e6ad2]/40'
                }`}
              >
                <input
                  type="radio"
                  name="claim_product"
                  value={item.id}
                  checked={isSelected}
                  onChange={() => onSelect(item.id)}
                  className="sr-only"
                />
                <div className="relative w-14 h-14 rounded-xl bg-[#0f1011] overflow-hidden shrink-0 border border-[#23252a]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold text-[#f7f8f8] truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8a8f98]">
                    <span>Order #{item.orderNumber}</span>
                    <span>•</span>
                    <span className="text-[#828fff]">{item.daysRemaining} days warranty left</span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#5e6ad2] text-white' : 'border border-[#23252a] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}