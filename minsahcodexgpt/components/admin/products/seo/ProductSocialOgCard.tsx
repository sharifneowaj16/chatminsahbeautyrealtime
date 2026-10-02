'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ProductOgImageUploader } from './ProductOgImageUploader';

export interface ProductSocialOgCardProps {
  ogTitle: string;
  ogDescription: string;
  ogImageUrl?: string;
  ogImagePreview?: string;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onChangeImageUrl: (url: string) => void;
  onFileSelected: (file: File) => void;
  onClearImage: () => void;
}

export function ProductSocialOgCard({
  ogTitle,
  ogDescription,
  ogImageUrl = '',
  ogImagePreview,
  onChangeTitle,
  onChangeDescription,
  onChangeImageUrl,
  onFileSelected,
  onClearImage,
}: ProductSocialOgCardProps) {
  return (
    <div className="p-4 rounded-lg border border-[#232636] bg-[#10121b] space-y-4">
      <div className="flex items-center space-x-2 pb-1 border-b border-[#232636]">
        <Share2 className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-[#F7F8F8]">
          OpenGraph & Social Share Preview (Facebook, WhatsApp, Twitter)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            OpenGraph Title
          </label>
          <Input
            type="text"
            value={ogTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="Leave blank to default to Meta Title"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-[#d0d6e0]">
              OpenGraph Description
            </label>
            <span
              className={`text-[10px] font-mono ${
                ogDescription.length > 130 ? 'text-rose-400' : 'text-white/40'
              }`}
            >
              {ogDescription.length}/130
            </span>
          </div>
          <Input
            type="text"
            maxLength={140}
            value={ogDescription}
            onChange={(e) => onChangeDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="Catchy social snippet for Facebook and WhatsApp sharing"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Direct OG Image URL (Optional CDN link)
        </label>
        <Input
          type="text"
          value={ogImageUrl}
          onChange={(e) => onChangeImageUrl(e.target.value)}
          className="w-full px-3 py-2 bg-[#161824] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
          placeholder="https://cdn.example.com/products/og-image.webp"
        />
      </div>

      <ProductOgImageUploader
        previewUrl={ogImagePreview || ogImageUrl}
        onFileSelected={onFileSelected}
        onClear={onClearImage}
      />
    </div>
  );
}
