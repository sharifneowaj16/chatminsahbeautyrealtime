'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileAvailabilityNoteProps {
  className?: string;
}

export function MobileAvailabilityNote({ className = '' }: MobileAvailabilityNoteProps) {
  const { offer } = useProductOffer();

  if (offer.availability === 'in stock') {
    if (offer.availableQuantity > 0 && offer.availableQuantity <= 5) {
      return (
        <div
          className={`flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium ${className}`}
        >
          <AlertCircle size={13} className="shrink-0" />
          <span>Low stock: Only {offer.availableQuantity} units left in warehouse</span>
        </div>
      );
    }
    return null;
  }

  if (offer.availability === 'preorder') {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium ${className}`}
      >
        <AlertCircle size={13} className="shrink-0" />
        <span>
          Pre-order product
          {offer.preorderAvailableOn
            ? ` • Dispatches on ${new Date(offer.preorderAvailableOn).toLocaleDateString()}`
            : ''}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium ${className}`}
    >
      <AlertCircle size={13} className="shrink-0" />
      <span>Currently unavailable for immediate dispatch</span>
    </div>
  );
}

export default MobileAvailabilityNote;
