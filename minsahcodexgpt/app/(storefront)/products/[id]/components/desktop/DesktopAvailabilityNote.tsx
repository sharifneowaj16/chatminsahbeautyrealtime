'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopAvailabilityNoteProps {
  className?: string;
}

export function DesktopAvailabilityNote({ className = '' }: DesktopAvailabilityNoteProps) {
  const { offer } = useProductOffer();

  if (offer.availability === 'in stock') {
    return null;
  }

  let note = '';
  if (offer.availability === 'out of stock') {
    note = 'Currently unavailable for order. Check back soon or request restock notification.';
  } else if (offer.availability === 'preorder') {
    note = 'Advance reservation: reserve your unit now for prioritized fulfillment on arrival.';
  } else if (offer.availability === 'available for order') {
    note = 'On backorder: item is being procured from official distributors and will dispatch upon receipt.';
  } else if (offer.availability === 'discontinued') {
    note = 'This product has been discontinued by the brand.';
  }

  if (!note) return null;

  return (
    <p className={`text-xs text-stone-500 dark:text-stone-400 leading-relaxed ${className}`}>
      {note}
    </p>
  );
}

export default DesktopAvailabilityNote;
