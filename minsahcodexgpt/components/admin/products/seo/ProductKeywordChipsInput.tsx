'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface ProductKeywordChipsInputProps {
  label: string;
  subtitle?: string;
  keywords: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
}

export function ProductKeywordChipsInput({
  label,
  subtitle,
  keywords,
  onChange,
  placeholder = 'Add keyword and press enter or comma...',
}: ProductKeywordChipsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    const split = inputValue
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && !keywords.includes(k));
    if (split.length > 0) {
      onChange([...keywords, ...split]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[#d0d6e0]">{label}</label>
        {subtitle && <span className="text-[11px] text-white/40">{subtitle}</span>}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
          placeholder={placeholder}
        />
        <Button
          type="button"
          onClick={handleAdd}
          className="h-8.5 px-3 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#10121b] border border-[#232636] rounded-full text-xs text-white/90 shadow-sm"
            >
              <span>{kw}</span>
              <button
                type="button"
                aria-label={`Remove keyword ${kw}`}
                onClick={() => handleRemove(i)}
                className="text-white/40 hover:text-rose-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
