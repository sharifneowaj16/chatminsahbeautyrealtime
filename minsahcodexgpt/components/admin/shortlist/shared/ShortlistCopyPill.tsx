'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ShortlistCopyPillProps {
  text: string;
  label?: string;
  displayValue?: string;
  className?: string;
}

export const ShortlistCopyPill: React.FC<ShortlistCopyPillProps> = ({
  text,
  label,
  displayValue,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label ? `Copy ${label}: ${text}` : `Copy: ${text}`}
      className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#0b1726] border border-[#16273c] text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer select-all ${className}`}
    >
      <span>{displayValue || text}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300 shrink-0" />
      )}
    </button>
  );
};
