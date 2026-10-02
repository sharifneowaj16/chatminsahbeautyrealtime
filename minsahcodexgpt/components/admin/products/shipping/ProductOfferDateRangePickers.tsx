'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductOfferDateRangePickersProps {
  startDate: string;
  endDate: string;
  disabled?: boolean;
  error?: string;
  onChangeStart: (val: string) => void;
  onChangeEnd: (val: string) => void;
}

export function ProductOfferDateRangePickers({
  startDate,
  endDate,
  disabled = false,
  error,
  onChangeStart,
  onChangeEnd,
}: ProductOfferDateRangePickersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Delivery Offer Start Date & Time
        </label>
        <Input
          type="datetime-local"
          value={startDate}
          onChange={(e) => onChangeStart(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Delivery Offer End Date & Time
        </label>
        <Input
          type="datetime-local"
          value={endDate}
          onChange={(e) => onChangeEnd(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
        />
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
