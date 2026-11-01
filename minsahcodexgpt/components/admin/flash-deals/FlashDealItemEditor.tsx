'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Tag, Sparkles } from 'lucide-react';
import type { FlashDealItem } from '@/components/home/flash-deals/types';

interface FlashDealItemEditorProps {
  deal: FlashDealItem;
  index: number;
  totalDeals: number;
  onUpdate: (updated: FlashDealItem) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export default function FlashDealItemEditor({
  deal,
  index,
  totalDeals,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FlashDealItemEditorProps) {
  const handleChange = (field: keyof FlashDealItem, value: unknown) => {
    onUpdate({
      ...deal,
      [field]: value,
    });
  };

  // Auto calculate discount badge if prices change and no custom badge
  const handlePriceChange = (salePriceVal: number) => {
    const diff = (deal.originalPrice || 0) - salePriceVal;
    const autoBadge = diff > 0 ? `৳${diff} OFF` : deal.discountBadge;
    onUpdate({
      ...deal,
      salePrice: salePriceVal,
      discountBadge: autoBadge,
    });
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        deal.isActive
          ? 'bg-[#161824] border-[#232636] shadow-sm'
          : 'bg-[#10121b]/80 border-dashed border-[#232636] opacity-60'
      }`}
    >
      {/* Top Row: Thumbnail, Title, Slot & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#232636]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#0b0c14] shrink-0 border border-[#232636]">
            <Image
              src={deal.imageUrl || '/images/hero-image.jpg'}
              alt={deal.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                Slot #{index + 1}
              </span>
              {!deal.isActive && (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Disabled
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-[#f7f8f8] truncate mt-1 max-w-sm sm:max-w-md">
              {deal.title}
            </h4>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            aria-label="Move Up"
            title="Move deal up"
            className="p-1.5 rounded-lg border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalDeals - 1}
            onClick={() => onMoveDown(index)}
            aria-label="Move Down"
            title="Move deal down"
            className="p-1.5 rounded-lg border border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleChange('isActive', !deal.isActive)}
            aria-label={deal.isActive ? 'Disable Deal' : 'Enable Deal'}
            title={deal.isActive ? 'Disable Deal' : 'Enable Deal'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              deal.isActive
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.05]'
            }`}
          >
            {deal.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(deal.id)}
            aria-label="Delete Deal"
            title="Delete this deal"
            className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-xs">
        {/* Offer Sale Price */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Offer Sale Price (৳)
          </label>
          <input
            type="number"
            value={deal.salePrice}
            onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#f7f8f8] font-bold font-mono text-emerald-400 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. 2100"
          />
        </div>

        {/* Original Price */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Original Price (৳)
          </label>
          <input
            type="number"
            value={deal.originalPrice}
            onChange={(e) => handleChange('originalPrice', Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#8a8f98] font-mono focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. 2450"
          />
        </div>

        {/* Discount Badge */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Discount Badge
          </label>
          <input
            type="text"
            value={deal.discountBadge || ''}
            onChange={(e) => handleChange('discountBadge', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. ৳350 OFF"
          />
        </div>

        {/* Stock Urgency Text */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Stock Urgency Text
          </label>
          <input
            type="text"
            value={deal.stockUrgencyText || ''}
            onChange={(e) => handleChange('stockUrgencyText', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-rose-400 font-medium focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. Only 3 units left!"
          />
        </div>

        {/* Claimed Percentage */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Claimed % (0-100)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={deal.claimedPercentage ?? 80}
            onChange={(e) => handleChange('claimedPercentage', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#f7f8f8] font-mono focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. 91"
          />
        </div>

        {/* Rating Score */}
        <div>
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Rating Score
          </label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={deal.rating ?? 4.9}
            onChange={(e) => handleChange('rating', Number(e.target.value) || 4.9)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#f7f8f8] font-mono focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. 4.9"
          />
        </div>

        {/* Volume / Subtext */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
            Volume / Benefit Subtext
          </label>
          <input
            type="text"
            value={deal.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all"
            placeholder="e.g. Pore calming toner for acne-prone skin • 250ml"
          />
        </div>

        {/* Campaign Ref & Purchase Limit Controls */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-1 pt-3 border-t border-[#232636]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0c14] p-3 rounded-xl border border-[#232636]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#f7f8f8]">Customer Purchase Limit</span>
                {deal.campaignRef && (
                  <span className="text-[10px] font-mono text-[#8a8f98] bg-[#161824] px-1.5 py-0.5 rounded border border-[#232636]">
                    Ref: {deal.campaignRef}
                  </span>
                )}
                {deal.limitType === 'LEGACY_UNCONFIGURED' && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                    ⚠️ Unconfigured (Active 1-Unit Fallback)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8a8f98]">
                {deal.limitType === 'LIMITED'
                  ? `Verified customer quota: max ${deal.maxUnitsPerCustomer || 1} unit(s) across all variants.`
                  : deal.limitType === 'UNLIMITED'
                  ? 'Customers can purchase unlimited units. Purchases recorded for future limit changes.'
                  : 'Historical campaign without quota settings. Operating under safe 1-unit customer promise until configured.'}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
              {/* Limit Mode Selector */}
              <div className="flex rounded-lg bg-[#161824] p-0.5 border border-[#232636]">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({
                      ...deal,
                      limitType: 'LIMITED',
                      maxUnitsPerCustomer: deal.maxUnitsPerCustomer && deal.maxUnitsPerCustomer > 0 ? deal.maxUnitsPerCustomer : 1,
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all ${
                    deal.limitType === 'LIMITED'
                      ? 'bg-[#5e6ad2] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  LIMITED
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({
                      ...deal,
                      limitType: 'UNLIMITED',
                      maxUnitsPerCustomer: undefined,
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all ${
                    deal.limitType === 'UNLIMITED'
                      ? 'bg-[#5e6ad2] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  UNLIMITED
                </button>
              </div>

              {/* Max Units Input */}
              {deal.limitType !== 'UNLIMITED' && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-[#8a8f98] whitespace-nowrap">
                    Max Units:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={deal.maxUnitsPerCustomer ?? 1}
                    onChange={(e) => {
                      const val = Math.max(1, Math.trunc(Number(e.target.value) || 1));
                      onUpdate({
                        ...deal,
                        limitType: 'LIMITED',
                        maxUnitsPerCustomer: val,
                      });
                    }}
                    className="w-16 px-2 py-1 text-xs rounded-lg bg-[#161824] border border-[#232636] text-[#f7f8f8] font-bold font-mono focus:border-[#5e6ad2] outline-none text-center"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

