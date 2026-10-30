'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface ProductBilingualMetaCardProps {
  bengaliName: string;
  bengaliMetaDescription: string;
  bengaliFocusKeyword: string;
  focusKeyword: string;
  onChangeName: (val: string) => void;
  onChangeDescription: (val: string) => void;
  onChangeBengaliKeyword: (val: string) => void;
  onChangeFocusKeyword: (val: string) => void;
}

export function ProductBilingualMetaCard({
  bengaliName,
  bengaliMetaDescription,
  bengaliFocusKeyword,
  focusKeyword,
  onChangeName,
  onChangeDescription,
  onChangeBengaliKeyword,
  onChangeFocusKeyword,
}: ProductBilingualMetaCardProps) {
  return (
    <div className="p-4 rounded-lg border border-[#232636] bg-[#10121b] space-y-4">
      <div className="flex items-center space-x-2 pb-1 border-b border-[#232636]">
        <Globe className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-semibold text-[#F7F8F8]">
          Secondary Search & Localization Optimization
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Secondary Product Name
          </label>
          <Input
            type="text"
            lang="en"
            value={bengaliName}
            onChange={(e) => onChangeName(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-bengali"
            placeholder="e.g. COSRX Advanced Snail 96 Mucin Essence"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            English Focus Keyword
          </label>
          <Input
            type="text"
            value={focusKeyword}
            onChange={(e) => onChangeFocusKeyword(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="e.g. cosrx snail mucin essence price in bd"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Secondary Focus Keyword
          </label>
          <Input
            type="text"
            lang="en"
            value={bengaliFocusKeyword}
            onChange={(e) => onChangeBengaliKeyword(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-bengali"
            placeholder="e.g. snail mucin essence price bd"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Secondary Meta Description
          </label>
          <Textarea
            rows={2}
            lang="en"
            value={bengaliMetaDescription}
            onChange={(e) => onChangeDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-bengali leading-relaxed"
            placeholder="e.g. Authentic Korean COSRX Snail Essence with fast delivery..."
          />
        </div>
      </div>
    </div>
  );
}
