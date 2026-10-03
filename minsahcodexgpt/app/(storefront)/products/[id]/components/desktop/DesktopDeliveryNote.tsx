'use client';

import React from 'react';
import useDeliveryPromise from '@/components/offer/useDeliveryPromise';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopDeliveryNoteProps {
  className?: string;
}

export function DesktopDeliveryNote({ className = '' }: DesktopDeliveryNoteProps) {
  const deliveryPromise = useDeliveryPromise();
  const { offer } = useProductOffer();

  const isAvailable = offer.availability === 'in stock';

  return (
    <div
      className={`rounded-2xl border border-[#1c3a13]/12 dark:border-white/12 bg-white dark:bg-zinc-800/80 p-3 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold text-[#1c3a13] dark:text-emerald-300">
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${
            isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <span>
          {offer.availability === 'in stock'
            ? 'In Stock'
            : offer.availability === 'preorder'
            ? 'Preorder'
            : offer.availability === 'available for order'
            ? 'Available for Order'
            : 'Out of Stock'}{' '}
          • {deliveryPromise.primaryNote.en}
        </span>
      </div>
      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 pl-4">
        {deliveryPromise.outsideDhakaNote.en} • {deliveryPromise.fridayNote.en}
      </p>
    </div>
  );
}

export default DesktopDeliveryNote;
