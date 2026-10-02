'use client';

import React from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { AlertCircle, FileCode, CheckCircle2 } from 'lucide-react';

export interface ProductImportJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  sampleJson?: string;
  onLoadSample?: () => void;
}

export function ProductImportJsonEditor({
  value,
  onChange,
  error,
  rows = 16,
  onLoadSample,
}: ProductImportJsonEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#d0d6e0] flex items-center gap-1.5">
          <FileCode className="w-4 h-4 text-emerald-400" />
          JSON or [IMPORT_DATA] Payload
        </label>

        {onLoadSample && (
          <button
            type="button"
            onClick={onLoadSample}
            className="text-[11px] text-[#5e6ad2] hover:text-[#8590ea] underline transition-colors"
          >
            Load Sample Template
          </button>
        )}
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-3 border border-[#232636] bg-[#10121b] rounded-lg text-xs font-mono text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 leading-relaxed resize-y"
        placeholder={`Paste here:\n\n[IMPORT_DATA]\n{\n  "name": "COSRX Advanced Snail 96 Mucin Power Essence",\n  "category": "Skin care",\n  "brand": "COSRX",\n  "price": 1850,\n  "pageH1": "COSRX Snail Mucin Essence Price in Bangladesh"\n}\n[/IMPORT_DATA]\n\nOr paste complete final SEO JSON.`}
      />

      {error && (
        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5 text-xs text-rose-400 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
