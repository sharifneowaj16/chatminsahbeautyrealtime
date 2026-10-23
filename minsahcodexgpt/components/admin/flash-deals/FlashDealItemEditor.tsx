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
      </div>
    </div>
  );
}
