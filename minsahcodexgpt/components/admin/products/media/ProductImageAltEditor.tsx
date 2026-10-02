'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductImageAltEditorProps {
  imageAltTexts: string[];
  images: Array<{
    id: string;
    preview: string;
    isMain: boolean;
  }>;
  onChangeAlt: (index: number, alt: string) => void;
}

export function ProductImageAltEditor({
  imageAltTexts,
  images,
  onChangeAlt,
}: ProductImageAltEditorProps) {
  if (images.length === 0) return null;

  return (
    <div className="border-t border-[#232636] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-[#F7F8F8] tracking-tight">
            Image Alt Texts (SEO Optimization)
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Descriptive alt text helps Google Image search and screen readers understand your products.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {images.map((img, index) => (
          <div
            key={img.id}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-[#232636] bg-[#10121b]"
          >
            <div className="w-12 h-12 rounded-md bg-[#161824] border border-[#232636] overflow-hidden shrink-0">
              <img
                src={img.preview}
                alt={`Product thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-white/70">
                  Image #{index + 1} {img.isMain && <span className="text-[#5e6ad2] font-semibold">(Main Display)</span>}
                </span>
                <span className="text-[10px] text-white/40">
                  {(imageAltTexts[index] || '').length}/100
                </span>
              </div>
              <Input
                type="text"
                value={imageAltTexts[index] || ''}
                onChange={(e) => onChangeAlt(index, e.target.value)}
                className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
                placeholder="e.g. Cosrx Advanced Snail 96 Mucin Power Essence Bangladesh"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
