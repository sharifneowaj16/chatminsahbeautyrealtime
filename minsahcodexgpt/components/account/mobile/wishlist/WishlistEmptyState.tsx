'use client';

import React from 'react';
import Link from 'next/link';
import { HeartOff } from 'lucide-react';

interface WishlistEmptyStateProps {
  onResetFilter?: () => void;
  isFiltered?: boolean;
}

export default function WishlistEmptyState({
  onResetFilter,
  isFiltered,
}: WishlistEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-[#F8FAF7] border border-[#E2DED8]/60 my-4">
      <div className="w-16 h-16 rounded-full bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center mb-3">
        <HeartOff className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[#062402]">Your Wishlist is Empty</h3>
      <p className="text-xs text-[#43483f] max-w-xs mt-1 mb-4 leading-relaxed">
        {isFiltered
          ? 'No items match the selected category filter. Try clearing the filter.'
          : 'Save your favorite Korean skincare products to track price drops and batch restocks.'}
      </p>

      {isFiltered ? (
        <button
          type="button"
          onClick={onResetFilter}
          className="px-5 py-2.5 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
        >
          Reset Filter
        </button>
      ) : (
        <Link
          href="/categories"
          className="px-5 py-2.5 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
        >
          Discover K-Beauty
        </Link>
      )}
    </div>
  );
}
