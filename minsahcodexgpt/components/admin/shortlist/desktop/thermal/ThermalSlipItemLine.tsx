'use client';

import React from 'react';

interface ThermalSlipLineItem {
  title: string;
  shadeOrType: string;
  skuCode: string;
  volumeSpec: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  orderRefs: string[];
}

interface ThermalSlipItemLineProps {
  item: ThermalSlipLineItem;
}

export const ThermalSlipItemLine: React.FC<ThermalSlipItemLineProps> = ({ item }) => {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-start font-bold text-black">
        <span className="text-[11px] leading-snug">{item.title}</span>
        <span className="font-extrabold">
          {item.qty}x ৳{item.unitPrice}
        </span>
      </div>
      <div className="flex justify-between text-[9px] text-slate-700 font-bold">
        <span>
          {item.skuCode} • {item.shadeOrType} • {item.volumeSpec}
        </span>
        <span className="text-black font-extrabold">
          ৳{item.totalPrice.toLocaleString()}
        </span>
      </div>
      <div className="text-[8.5px] text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded-xs mt-0.5 font-bold">
        Alloc: {item.orderRefs.join(' + ')}
      </div>
    </div>
  );
};
