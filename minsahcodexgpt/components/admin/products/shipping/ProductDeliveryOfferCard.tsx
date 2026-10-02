'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Gift } from 'lucide-react';
import { DeliveryOfferType } from '../types';

export interface ProductDeliveryOfferCardProps {
  enabled: boolean;
  type: DeliveryOfferType;
  badgeText: string;
  onToggleEnabled: (enabled: boolean) => void;
  onChangeType: (type: DeliveryOfferType) => void;
  onChangeBadgeText: (text: string) => void;
  children?: React.ReactNode;
}

export function ProductDeliveryOfferCard({
  enabled,
  type,
  badgeText,
  onToggleEnabled,
  onChangeType,
  onChangeBadgeText,
  children,
}: ProductDeliveryOfferCardProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-emerald-300">
              Customer Promotional Delivery Offer
            </h3>
            <p className="text-[11px] text-white/50">
              Special consumer delivery subsidized pricing displayed on product pages & checkout.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-lg bg-[#161824] border border-[#232636] px-3 py-1.5 text-xs font-medium text-emerald-300 cursor-pointer w-fit">
          <Input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="w-4 h-4 text-emerald-500 border-white/20 rounded cursor-pointer"
          />
          Enable Delivery Offer
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 pt-2 border-t border-emerald-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
                Promotional Delivery Offer Type
              </label>
              <Select
                value={type}
                onChange={(e) => onChangeType(e.target.value as DeliveryOfferType)}
                className="w-full px-3 py-2 border border-[#232636] rounded-lg text-xs bg-[#161824] text-[#F7F8F8] focus:ring-1 focus:ring-emerald-500"
              >
                <option value="DEFAULT">Courier Standard (No product discount)</option>
                <option value="FREE">Full Free Delivery (সারা দেশে ১০০% ফ্রি ডেলিভারি)</option>
                <option value="FIXED">Custom City Delivery (ঢাকার ভেতরে ও বাইরে নির্ধারিত চার্জ)</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
                Offer Badge Text
              </label>
              <Input
                type="text"
                value={badgeText}
                onChange={(e) => onChangeBadgeText(e.target.value)}
                className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Free Delivery All Over Bangladesh"
              />
            </div>
          </div>

          {children}
        </div>
      )}
    </div>
  );
}
