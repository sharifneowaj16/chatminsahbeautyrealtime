'use client';

import React from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { clsx } from 'clsx';

export interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  placeholder?: string;
}

export function ProductDescriptionEditor({
  value,
  onChange,
  error,
  rows = 6,
  placeholder = 'Detailed product description with key benefits, application guide, and results...',
}: ProductDescriptionEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[#d0d6e0]">
          Product Description <span className="text-rose-400">*</span>
        </label>
        <span className="text-[11px] text-white/40">{value.length} characters</span>
      </div>
      <Textarea
        name="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={clsx(
          'w-full px-3.5 py-2.5 bg-[#10121b] border rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/35 focus:ring-1 focus:ring-white/20 transition-all font-sans leading-relaxed',
          error ? 'border-rose-500/80 focus:border-rose-500' : 'border-[#232636] focus:border-white/30'
        )}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
