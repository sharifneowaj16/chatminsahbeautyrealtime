'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

export interface ProductJsonLdAccordionProps {
  title: string;
  subtitle?: string;
  jsonString: string;
  onChange: (newJson: string) => void;
  defaultOpen?: boolean;
}

export function ProductJsonLdAccordion({
  title,
  subtitle = 'Valid Schema.org JSON-LD structured data payload',
  jsonString,
  onChange,
  defaultOpen = false,
}: ProductJsonLdAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#232636] rounded-lg bg-[#10121b] overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <div>
            <h4 className="text-xs font-semibold text-[#F7F8F8]">{title}</h4>
            <p className="text-[10px] text-white/40">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-white/40">
          <span className="text-[10px] font-mono">
            {jsonString ? `${jsonString.length} bytes` : 'Empty'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#232636] bg-[#161824]">
          <Textarea
            rows={5}
            value={jsonString}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-md text-[11px] font-mono text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 leading-relaxed"
            placeholder='{"@context": "https://schema.org/", "@type": "Product", ...}'
          />
        </div>
      )}
    </div>
  );
}
