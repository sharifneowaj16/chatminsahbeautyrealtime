'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface ShortlistVendorStandCellProps {
  sku: WholesaleSkuRow;
}

export const ShortlistVendorStandCell: React.FC<ShortlistVendorStandCellProps> = ({ sku }) => {
  return (
    <td className="py-2.5 px-3 align-top">
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-white text-xs truncate">
          {sku.vendor.stallName}
        </span>
        <div className="flex items-center gap-1 mt-0.5 text-slate-300 text-[10px] truncate">
          <span className="text-slate-400 text-[11px] shrink-0">📍</span>
          <span className="truncate">{sku.vendor.standLocation}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
          <a
            href={`tel:${sku.vendor.phone.replace(/[^0-9+]/g, '')}`}
            className="text-indigo-400 hover:underline flex items-center gap-0.5 truncate"
          >
            <span className="text-[10px] shrink-0">📞</span>
            {sku.vendor.phone}
          </a>
          <span className="text-slate-400 text-[9px]">
            ({sku.vendor.contactPerson})
          </span>
        </div>

        {sku.vendor.statusTag && (
          <span
            className={`mt-1 text-[9px] font-mono uppercase flex items-center gap-1 ${
              sku.vendor.statusTagType === 'verified'
                ? 'text-emerald-400'
                : sku.vendor.statusTagType === 'urgent'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-300'
            }`}
          >
            {sku.vendor.statusTagType === 'verified' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            ) : sku.vendor.statusTagType === 'urgent' ? (
              <span className="text-[10px]">⏱️</span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            )}
            {sku.vendor.statusTag}
          </span>
        )}
      </div>
    </td>
  );
};
