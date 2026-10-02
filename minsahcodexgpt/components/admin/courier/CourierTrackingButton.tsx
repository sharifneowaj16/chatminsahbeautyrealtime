'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

export interface CourierTrackingButtonProps {
  courier?: 'steadfast' | 'pathao' | 'custom' | string | null;
  trackingCode: string | null | undefined;
  consignmentId?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function getCourierTrackingUrl(
  courier: string | null | undefined,
  trackingCode: string,
  consignmentId?: string | null
): string | null {
  const norm = (courier || '').toLowerCase();
  if (norm.includes('steadfast')) {
    return `https://steadfast.com.bd/tracking?tracking_code=${encodeURIComponent(trackingCode)}`;
  }
  if (norm.includes('pathao')) {
    const query = consignmentId || trackingCode;
    return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(query)}`;
  }
  return null;
}

export const CourierTrackingButton: React.FC<CourierTrackingButtonProps> = ({
  courier,
  trackingCode,
  consignmentId,
  size = 'md',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!trackingCode) {
    return null;
  }

  const isSm = size === 'sm';
  const trackingUrl = getCourierTrackingUrl(courier, trackingCode, consignmentId);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-lg p-0.5 ${
        isSm ? 'text-[11px]' : 'text-xs'
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleCopy}
        title="Click to copy tracking code"
        className={`inline-flex items-center gap-1 font-mono text-slate-300 hover:text-white px-2 py-0.5 rounded transition-colors ${
          isSm ? 'text-[10px]' : 'text-xs'
        }`}
      >
        <span>{trackingCode}</span>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
        )}
      </button>

      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Track parcel on courier website"
          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

export default CourierTrackingButton;
