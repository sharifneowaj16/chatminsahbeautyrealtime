'use client';

import React, { useState } from 'react';
import { MapPin, Copy, Check, ExternalLink, Edit3 } from 'lucide-react';
import { QuickPhoneAction } from './QuickPhoneAction';

export interface ShippingAddressDisplayProps {
  recipientName?: string;
  phone?: string;
  street: string;
  street2?: string;
  city: string;
  zone?: string;
  postalCode?: string;
  pathaoAreaName?: string;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}

export const ShippingAddressDisplay: React.FC<ShippingAddressDisplayProps> = ({
  recipientName,
  phone,
  street,
  street2,
  city,
  zone,
  postalCode,
  pathaoAreaName,
  editable = false,
  onEdit,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Full address line
  const fullAddress = [
    recipientName ? `Name: ${recipientName}` : '',
    phone ? `Phone: ${phone}` : '',
    street,
    street2,
    pathaoAreaName ? `Area: ${pathaoAreaName}` : '',
    zone ? `Zone: ${zone}` : '',
    city ? `City: ${city}` : '',
    postalCode ? `Postal Code: ${postalCode}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopyCourierFormat = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [street, zone, city, 'Bangladesh'].filter(Boolean).join(', ')
  )}`;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          Shipping Destination
        </span>
        <div className="flex items-center gap-2">
          {editable && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyCourierFormat}
            title="Copy formatted address for courier manual entry"
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Address</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-slate-300">
        {recipientName && (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{recipientName}</span>
            {phone && <QuickPhoneAction phone={phone} size="sm" />}
          </div>
        )}

        <p className="leading-relaxed text-slate-300 whitespace-pre-line">
          {street}
          {street2 && <span className="block text-slate-400">{street2}</span>}
        </p>

        {/* Location Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {city && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
              {city}
            </span>
          )}
          {zone && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Zone: {zone}
            </span>
          )}
          {pathaoAreaName && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Pathao Area: {pathaoAreaName}
            </span>
          )}
          {postalCode && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400">
              ZIP: {postalCode}
            </span>
          )}

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 ml-auto transition-colors"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ShippingAddressDisplay;
