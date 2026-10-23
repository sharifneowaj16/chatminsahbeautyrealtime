'use client';

import React from 'react';
import type { OrderProductLine } from './types';

interface OrderHistoryProductItemProps {
  product: OrderProductLine;
}

export default function OrderHistoryProductItem({ product }: OrderHistoryProductItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#F8FAF7]">
      <div className="w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-xs border border-[#E2DED8]/50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            // Fallback placeholder if broken URL
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80';
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-[13px] leading-snug text-[#062402] font-bold truncate">
          {product.name}
        </h4>
        {product.details && (
          <p className="text-[11px] text-[#43483f] truncate">{product.details}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-[#43483f]">Qty: {product.quantity}</span>
          <span className="text-xs text-[#062402] font-bold">
            ৳ {product.price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
