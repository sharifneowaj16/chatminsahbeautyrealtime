'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { generateOrderWarrantyToken, getOrderWarrantyUrl } from '@/lib/warranty/qr-token';
import { ExternalLink, Copy, Check } from 'lucide-react';

export interface MarklifeLabelStickerProps {
  orderId: string;
  orderNumber: string;
  itemId?: string;
  productName?: string;
  className?: string;
  showActions?: boolean;
}

export const MarklifeLabelSticker: React.FC<MarklifeLabelStickerProps> = ({
  orderId,
  orderNumber,
  itemId,
  productName,
  className = '',
  showActions = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const cleanOrderNum = (orderNumber || orderId || '').slice(-6).toUpperCase();
  const token = generateOrderWarrantyToken({ orderId, orderNumber, itemId });
  const qrUrl = getOrderWarrantyUrl(token);

  useEffect(() => {
    setMounted(true);
    let isCancelled = false;

    QRCode.toDataURL(qrUrl, {
      margin: 0,
      width: 140,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!isCancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate Marklife QR', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [qrUrl]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Physical 40mm x 12mm Marklife Label Preview / Print Target */}
      <div
        id="marklife-label-print"
        style={{
          width: '40mm',
          height: '12mm',
          minWidth: '40mm',
          minHeight: '12mm',
          maxWidth: '40mm',
          maxHeight: '12mm',
          boxSizing: 'border-box',
        }}
        className="bg-white text-black flex items-center justify-between px-[1.2mm] py-[0.8mm] border border-black overflow-hidden select-none print:border-none print:m-0"
      >
        {/* Left: QR Code (Approx 10.4mm x 10.4mm) */}
        <div className="shrink-0 flex items-center justify-center bg-white" style={{ width: '10.4mm', height: '10.4mm' }}>
          {mounted && qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Warranty & Slip QR"
              className="w-full h-full object-contain block image-rendering-pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full bg-black/10 animate-pulse" />
          )}
        </div>

        {/* Right: MINSAH Branding + Slip & Warranty Micro Text */}
        <div
          className="flex flex-col justify-between text-left pl-[1.2mm] overflow-hidden"
          style={{ width: '27.2mm', height: '10.4mm' }}
        >
          {/* Top Brand Line: [{QR} MINSAH] */}
          <div className="flex items-center justify-between leading-none">
            <span
              className="font-black tracking-widest text-black uppercase"
              style={{ fontSize: '8.5pt', lineHeight: 1 }}
            >
              MINSAH
            </span>
            <span
              className="text-[4.5pt] font-mono font-bold text-black border border-black px-[1px] leading-tight"
            >
              GENUINE
            </span>
          </div>

          {/* Middle: Linked Dual Function */}
          <div className="leading-none flex items-center gap-0.5 text-black">
            <span
              className="font-bold tracking-tight uppercase"
              style={{ fontSize: '4.8pt', lineHeight: 1 }}
            >
              ORDER SLIP • WARRANTY
            </span>
          </div>

          {/* Bottom: Order Reference & Scan Callout */}
          <div className="flex items-center justify-between text-black font-mono leading-none">
            <span
              className="font-bold truncate"
              style={{ fontSize: '4.6pt', lineHeight: 1 }}
            >
              #{cleanOrderNum}
            </span>
            <span
              className="tracking-tighter uppercase font-semibold"
              style={{ fontSize: '4.2pt', lineHeight: 1 }}
            >
              SCAN TO VIEW
            </span>
          </div>
        </div>
      </div>

      {/* Screen Helper Actions (Hidden during print) */}
      {showActions && (
        <div className="flex items-center gap-2 text-xs print:hidden">
          <span className="text-[11px] text-slate-400 font-mono">Size: 40mm × 12mm</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
            title="Copy Public QR Link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs border border-rose-500/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test Landing</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default MarklifeLabelSticker;

