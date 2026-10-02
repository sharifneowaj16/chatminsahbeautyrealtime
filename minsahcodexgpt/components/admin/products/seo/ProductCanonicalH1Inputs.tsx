'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface ProductCanonicalH1InputsProps {
  pageH1: string;
  seoIntro: string;
  canonicalUrl: string;
  onChangeH1: (val: string) => void;
  onChangeSeoIntro: (val: string) => void;
  onChangeCanonicalUrl: (val: string) => void;
}

export function ProductCanonicalH1Inputs({
  pageH1,
  seoIntro,
  canonicalUrl,
  onChangeH1,
  onChangeSeoIntro,
  onChangeCanonicalUrl,
}: ProductCanonicalH1InputsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Page H1 Heading Override
          </label>
          <Input
            type="text"
            value={pageH1}
            onChange={(e) => onChangeH1(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="e.g. Authentic Cosrx Snail Mucin Price in Bangladesh"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Canonical URL Override
          </label>
          <Input
            type="text"
            value={canonicalUrl}
            onChange={(e) => onChangeCanonicalUrl(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
            placeholder="Leave blank to default to /products/[slug]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          SEO Intro / Top Visible Category Description
        </label>
        <Textarea
          rows={3}
          value={seoIntro}
          onChange={(e) => onChangeSeoIntro(e.target.value)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 leading-relaxed"
          placeholder="Short visible intro with buying intent, shade details, and delivery terms."
        />
      </div>
    </div>
  );
}
