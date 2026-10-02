'use client';

import React from 'react';
import { Star } from 'lucide-react';
import Link from 'next/link';

export interface ProductTitleCellProps {
  name: string;
  sku: string;
  slugOrId: string;
  isFeatured?: boolean;
  isNew?: boolean;
  deliveryOfferLabel?: string;
  href?: string;
}

export function ProductTitleCell({
  name,
  sku,
  slugOrId,
  isFeatured = false,
  isNew = false,
  deliveryOfferLabel,
  href,
}: ProductTitleCellProps) {
  const titleContent = (
    <span className="text-xs font-medium text-[#F7F8F8] tracking-tight truncate max-w-xs sm:max-w-sm hover:text-white transition-colors">
      {name}
    </span>
  );

  return (
    <div className="min-w-0">
      <div className="flex items-center flex-wrap gap-1.5">
        {href ? (
          <Link href={href} className="inline-block truncate">
            {titleContent}
          </Link>
        ) : (
          titleContent
        )}

        {isFeatured && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/[0.08] text-white/90 border border-white/[0.12]">
            <Star className="w-2.5 h-2.5 mr-0.5 text-white/80 fill-white/80" />
            Featured
          </span>
        )}

        {isNew && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/[0.10] text-white border border-white/[0.15]">
            New
          </span>
        )}
      </div>

      <div className="text-[10px] text-white/40 font-mono flex items-center gap-2 mt-0.5">
        <span>SKU: {sku || 'N/A'}</span>
        <span>•</span>
        <span className="truncate max-w-[120px]">{slugOrId}</span>
      </div>

      {deliveryOfferLabel && (
        <span className="mt-1 inline-flex w-fit items-center rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[9px] font-semibold text-white/90 border border-white/[0.12]">
          {deliveryOfferLabel}
        </span>
      )}
    </div>
  );
}
