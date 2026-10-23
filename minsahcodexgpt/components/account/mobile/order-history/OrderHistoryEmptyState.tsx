'use client';

import React from 'react';
import { PackageX } from 'lucide-react';

interface OrderHistoryEmptyStateProps {
  onResetSearch: () => void;
}

export default function OrderHistoryEmptyState({ onResetSearch }: OrderHistoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-[#F8FAF7] my-4 border border-[#E2DED8]/60">
      <div className="w-16 h-16 rounded-full bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center mb-3">
        <PackageX className="w-8 h-8" />
      </div>
      <h3 className="text-lg text-[#062402] font-bold">No Matching Orders Found</h3>
      <p className="text-xs text-[#43483f] max-w-xs mt-1 mb-4 leading-relaxed">
        We couldn&apos;t locate any orders matching your criteria. Try adjusting your query or filter tab.
      </p>
      <button
        type="button"
        onClick={onResetSearch}
        className="px-5 py-2.5 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
      >
        Reset Filter
      </button>
    </div>
  );
}
