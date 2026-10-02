'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Link2 } from 'lucide-react';

export interface ProductSlugInputProps {
  slug: string;
  onChange: (slug: string) => void;
  error?: string;
}

export function ProductSlugInput({ slug, onChange, error }: ProductSlugInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[#d0d6e0] flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-white/50" />
          URL Slug
        </label>
        <span className="text-[10px] text-white/40 font-mono">
          /products/<strong>{slug || 'product-slug'}</strong>
        </span>
      </div>
      <Input
        type="text"
        name="urlSlug"
        value={slug}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
        placeholder="e.g. cosrx-advanced-snail-96-mucin-power-essence"
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
