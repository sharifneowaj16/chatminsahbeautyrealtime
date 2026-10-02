'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface ProductMetaTitleDescriptionInputsProps {
  metaTitle: string;
  metaDescription: string;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
}

export function ProductMetaTitleDescriptionInputs({
  metaTitle,
  metaDescription,
  onChangeTitle,
  onChangeDescription,
}: ProductMetaTitleDescriptionInputsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-[#d0d6e0]">
            Meta Title (SERP)
          </label>
          <span
            className={`text-[10px] font-mono ${
              metaTitle.length > 60 ? 'text-rose-400' : 'text-white/40'
            }`}
          >
            {metaTitle.length}/60 chars
          </span>
        </div>
        <Input
          type="text"
          maxLength={70}
          value={metaTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
          placeholder="SEO title — include primary focus keyword"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-[#d0d6e0]">
            Meta Description
          </label>
          <span
            className={`text-[10px] font-mono ${
              metaDescription.length > 160 ? 'text-rose-400' : 'text-white/40'
            }`}
          >
            {metaDescription.length}/160 chars
          </span>
        </div>
        <Textarea
          rows={3}
          maxLength={180}
          value={metaDescription}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 leading-relaxed"
          placeholder="150–160 chars. Include primary keyword, price in BD, and Cash on Delivery guarantee."
        />
      </div>
    </div>
  );
}
