'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';
import { ProductKeywordChipsInput } from './ProductKeywordChipsInput';

export interface ProductSemanticSeoCardProps {
  searchIntent: string;
  targetAudience: string;
  primaryConcern: string;
  keyBenefits: string[];
  searchTags: string[];
  onChangeSearchIntent: (val: string) => void;
  onChangeTargetAudience: (val: string) => void;
  onChangePrimaryConcern: (val: string) => void;
  onChangeKeyBenefits: (benefits: string[]) => void;
  onChangeSearchTags: (tags: string[]) => void;
  children?: React.ReactNode;
}

export function ProductSemanticSeoCard({
  searchIntent,
  targetAudience,
  primaryConcern,
  keyBenefits,
  searchTags,
  onChangeSearchIntent,
  onChangeTargetAudience,
  onChangePrimaryConcern,
  onChangeKeyBenefits,
  onChangeSearchTags,
  children,
}: ProductSemanticSeoCardProps) {
  return (
    <ProductFormCardContainer
      icon={Sparkles}
      title="Semantic Search & AI Indexing"
      subtitle="Contextual user intent, audience demographics, skin concerns, and keyword clusters"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Search Intent (User Purpose)
            </label>
            <Input
              type="text"
              value={searchIntent}
              onChange={(e) => onChangeSearchIntent(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
              placeholder="e.g. Transactional (Buy authentic)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Target Audience
            </label>
            <Input
              type="text"
              value={targetAudience}
              onChange={(e) => onChangeTargetAudience(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
              placeholder="e.g. Women 18-35, Skincare enthusiasts"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Primary Skin Concern
            </label>
            <Input
              type="text"
              value={primaryConcern}
              onChange={(e) => onChangePrimaryConcern(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
              placeholder="e.g. Dehydration, Acne scars, Dullness"
            />
          </div>
        </div>

        <ProductKeywordChipsInput
          label="Key Product Benefits (Bullet points for SERP and AI summaries)"
          keywords={keyBenefits}
          onChange={onChangeKeyBenefits}
          placeholder="e.g. Intense 24H hydration, Non-greasy finish..."
        />

        <ProductKeywordChipsInput
          label="Search Tags & Regional Synonyms"
          keywords={searchTags}
          onChange={onChangeSearchTags}
          placeholder="e.g. snail cream, mucin essence, korean glow..."
        />

        {children}
      </div>
    </ProductFormCardContainer>
  );
}
