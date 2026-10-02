'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { MapPin, Navigation } from 'lucide-react';

export interface ProductCityDeliveryRatesInputProps {
  chargeInsideDhaka: string;
  chargeOutsideDhaka: string;
  onChangeInside: (val: string) => void;
  onChangeOutside: (val: string) => void;
  onApplyPreset?: (inside: string, outside: string, badge: string) => void;
  errors?: Record<string, string>;
}

export function ProductCityDeliveryRatesInput({
  chargeInsideDhaka,
  chargeOutsideDhaka,
  onChangeInside,
  onChangeOutside,
  onApplyPreset,
  errors = {},
}: ProductCityDeliveryRatesInputProps) {
  return (
    <div className="p-3.5 rounded-lg bg-[#10121b] border border-[#232636] space-y-3">
      <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
        Regional City Rates (শহরভিত্তিক ডেলিভারি চার্জ নির্ধারণ):
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            ঢাকার ভেতরে ডেলিভারি চার্জ (BDT ৳)
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            value={chargeInsideDhaka}
            onChange={(e) => onChangeInside(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-emerald-500"
            placeholder="যেমন: ৬০ (ফ্রি হলে ০)"
          />
          {errors.deliveryChargeInsideDhaka && (
            <p className="mt-1 text-[10px] text-rose-400">{errors.deliveryChargeInsideDhaka}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            ঢাকার বাইরে ডেলিভারি চার্জ (BDT ৳)
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            value={chargeOutsideDhaka}
            onChange={(e) => onChangeOutside(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-emerald-500"
            placeholder="যেমন: ১২০"
          />
          {errors.deliveryChargeOutsideDhaka && (
            <p className="mt-1 text-[10px] text-rose-400">{errors.deliveryChargeOutsideDhaka}</p>
          )}
        </div>
      </div>

      {onApplyPreset && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApplyPreset('0', '120', 'ঢাকার ভেতরে ফ্রি ডেলিভারি')}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[#161824] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 transition active:scale-[0.98]"
          >
            ⚡ ঢাকার ভেতরে ফ্রি (৳০) + বাইরে ১২০৳
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('60', '120', 'স্পেশাল ডেলিভারি অফার')}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[#161824] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 transition active:scale-[0.98]"
          >
            ⚡ ভেতরে ৬০৳ + বাইরে ১২০৳
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('0', '0', 'সারা দেশে সম্পূর্ণ ফ্রি ডেলিভারি')}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[#161824] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 transition active:scale-[0.98]"
          >
            ⚡ সারা দেশে ১০০% ফ্রি (৳০)
          </button>
        </div>
      )}
    </div>
  );
}
