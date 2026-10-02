'use client';

import React, { useState } from 'react';
import { Phone, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';

export interface QuickPhoneActionProps {
  phone: string | null | undefined;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function sanitizeBDPhone(phone: string): { display: string; international: string; waUrl: string } {
  // Remove non-digit characters
  const cleaned = (phone || '').replace(/\D/g, '');
  
  // Format for WhatsApp & International
  let digits = cleaned;
  if (digits.startsWith('880')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const international = `+880${digits}`;
  const display = `0${digits}`;
  const waUrl = `https://wa.me/880${digits}`;

  return { display, international, waUrl };
}

export const QuickPhoneAction: React.FC<QuickPhoneActionProps> = ({
  phone,
  showLabel = false,
  size = 'md',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!phone) {
    return <span className="text-slate-500 text-xs italic">No phone</span>;
  }

  const { display, international, waUrl } = sanitizeBDPhone(phone);
  const isSm = size === 'sm';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Click-to-call link */}
      <a
        href={`tel:${international}`}
        onClick={(e) => e.stopPropagation()}
        title={`Call ${display}`}
        className={`inline-flex items-center gap-1.5 font-mono text-slate-200 hover:text-emerald-400 transition-colors ${
          isSm ? 'text-xs' : 'text-sm font-medium'
        }`}
      >
        <Phone className={isSm ? 'w-3 h-3 text-slate-400' : 'w-3.5 h-3.5 text-slate-400'} />
        {showLabel && <span className="font-sans text-slate-400 text-xs">Tel:</span>}
        <span>{display}</span>
      </a>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        title="Copy phone number"
        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>

      {/* WhatsApp Quick Link */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open in WhatsApp"
        className="p-1 rounded text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
      >
        <MessageCircle className="w-3 h-3" />
      </a>
    </div>
  );
};

export default QuickPhoneAction;
