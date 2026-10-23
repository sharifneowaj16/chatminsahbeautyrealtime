'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface ReturnItemPickupCardProps {
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  issueDescription?: string;
}

export function ReturnItemPickupCard({
  name,
  price,
  quantity,
  image,
  issueDescription = 'Validation Confirmed • 100% Covered under Warranty',
}: ReturnItemPickupCardProps) {
  return (
    <section className="w-full bg-white rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#43483f] uppercase tracking-wider">
          Item for Pickup
        </span>
        <span className="text-xs text-[#4b6723] font-bold">
          {quantity} {quantity === 1 ? 'Item' : 'Items'} (100% Covered)
        </span>
      </div>

      <div className="flex gap-3.5 p-3 rounded-[22px] bg-[#f4f3f1] items-center border border-[#E2DED8]/60">
        <div className="w-18 h-18 rounded-[18px] overflow-hidden bg-white shrink-0 flex items-center justify-center border border-[#E2DED8]/50 relative">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              sizes="72px"
            />
          ) : (
            <Package className="w-7 h-7 text-[#43483f]" />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-xs font-bold text-[#1a1c1a] leading-tight line-clamp-1">
              {name}
            </h3>
            <span className="text-xs font-bold text-[#1a1c1a] shrink-0">
              {formatPrice(price * quantity)}
            </span>
          </div>

          <p className="text-[11px] text-rose-600 font-medium line-clamp-1">
            {issueDescription}
          </p>

          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="px-2 py-0.5 rounded-full bg-[#ccee9b] text-[#516d29] text-[9px] font-bold uppercase tracking-wider">
              Free Courier Pickup
            </span>
            <span className="text-[10px] text-[#43483f] font-medium">
              Qty: {quantity}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
