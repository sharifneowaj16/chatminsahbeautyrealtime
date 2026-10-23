'use client';

import Image from 'next/image';
import { ShieldCheck, Sparkles, Tag } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { ReturnItemInfo } from './types';

interface ReturnItemSummaryCardProps {
  item: ReturnItemInfo;
  orderNumber: string;
}

export function ReturnItemSummaryCard({ item, orderNumber }: ReturnItemSummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mx-4 mt-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
        <span className="font-semibold text-slate-800">
          Order #{orderNumber}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Free 7-Day Return Active
        </span>
      </div>

      <div className="flex gap-3.5 pt-3">
        <div className="relative w-18 h-18 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden">
          {item.productImage ? (
            <Image
              src={item.productImage}
              alt={item.productName}
              fill
              className="object-cover"
              sizes="72px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Tag className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
            {item.productName}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            SKU: <span className="font-mono text-slate-600">{item.sku || 'N/A'}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-slate-900">
              {formatPrice(item.price)}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-600 font-medium">
              Qty: {item.quantity}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-dashed border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600">
        <ShieldCheck className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
        <span>100% Genuine Hologram Seal protected order item</span>
      </div>
    </div>
  );
}
