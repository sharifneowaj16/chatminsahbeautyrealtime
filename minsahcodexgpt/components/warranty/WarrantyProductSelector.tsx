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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider">
          1. Select Item
        </span>
        <span className="text-[11px] text-[#43483f]">
          {products.length} eligible items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {products.length === 0 ? (
          <div className="rounded-xl p-4 bg-[#F8FAF7] border border-[#E2DED8]/60 text-center text-xs text-[#43483f]">
            No warranty eligible products found
          </div>
        ) : (
          products.map((item) => {
          const isSelected = item.id === selectedProductId;
          return (
            <label
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`rounded-xl p-3 flex items-center gap-3 cursor-pointer shadow-sm transition-all ${
                isSelected
                  ? 'bg-[#E8F0E5] border-2 border-[#062402]'
                  : 'bg-[#F8FAF7] border border-[#E2DED8]/60 hover:bg-[#efeeeb]'
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
              <div className="relative w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 border border-[#E2DED8]/40">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-[14px] font-bold text-[#062402] truncate">
                    {item.name}
                  </h3>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#062402] text-white'
                        : 'bg-[#e3e2e0] text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#43483f]">
                    {item.size} • Order #{item.orderNumber}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold">
                    {item.daysRemaining} Days Left
                  </span>
                </div>
              </div>
            </label>
          );
        }))}
      </div>
    </div>
  );
}
