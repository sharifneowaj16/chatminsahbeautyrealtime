'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowLeft, Check, CheckCheck, Video, Phone, MoreVertical, Zap, ExternalLink } from 'lucide-react';
import { NotificationPreviewProduct } from './types';

interface WhatsAppMessageBubbleProps {
  product: NotificationPreviewProduct;
  onQuickCheckout?: () => void;
  onViewWishlist?: () => void;
}

export default function WhatsAppMessageBubble({
  product,
  onQuickCheckout,
  onViewWishlist,
}: WhatsAppMessageBubbleProps) {
  return (
    <div className="flex flex-col w-full rounded-[24px] overflow-hidden border border-[#E2DED8] shadow-inner bg-[#ECE5DD]">
      {/* WhatsApp Header Bar */}
      <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <ArrowLeft className="w-4 h-4 text-white/80" />
          <div className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-white/30 overflow-hidden text-[#1c3a13] font-black text-xs">
            M
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#25D366] text-white flex items-center justify-center border border-white">
              <Check className="w-2.5 h-2.5 font-bold" />
            </span>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white tracking-wide">
                Minsah Beauty Official
              </span>
              <Check className="w-3 h-3 text-[#25D366] stroke-[3]" />
            </div>
            <span className="text-[10px] text-white/80">
              Official Business Account • Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/90">
          <Video className="w-4 h-4" />
          <Phone className="w-4 h-4" />
          <MoreVertical className="w-4 h-4" />
        </div>
      </div>

      {/* WhatsApp Conversation Wallpaper */}
      <div className="p-3 sm:p-4 flex flex-col gap-2.5 bg-[#e5ddd5]/60 min-h-[300px]">
        {/* Date Pill */}
        <div className="self-center bg-white/80 backdrop-blur-xs text-[#54656f] text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs">
          TODAY
        </div>

        {/* Incoming Message Bubble */}
        <div className="self-start max-w-[94%] bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm border border-black/5 flex flex-col gap-2">
          {/* Product Mini Banner inside bubble */}
          <div className="rounded-xl overflow-hidden bg-[#F8FAF7] border border-[#E2DED8] p-2 flex gap-2.5 items-center">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-[#E2DED8]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="50px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase text-[#4b6723]">
                Back In Stock • {product.hub}
              </span>
              <p className="text-xs font-bold text-[#1c3a13] truncate">
                {product.name}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#5A615D] font-medium">
                <span>৳{product.price.toLocaleString()}</span> •{' '}
                <span className="text-[#4b6723] font-bold">Batch #{product.batchNumber}</span>
              </div>
            </div>
          </div>

          {/* Rich Text Copy */}
          <div className="text-xs text-[#111b21] leading-relaxed space-y-1.5 font-normal">
            <p>
              ✨ <strong>Good news!</strong> {product.name} is back in stock at {product.hub}.
            </p>
            <p className="text-[11px] text-[#41525d]">
              📦 Fresh Import Batch <strong className="text-[#1c3a13] font-bold">#{product.batchNumber}</strong> restocked at Banani Hub.<br />
              🏷️ Price: <strong>৳{product.price.toLocaleString()}</strong> · Only <strong>{product.stockCount} units</strong> available.
            </p>
            <p className="text-[11px] text-[#1c3a13] font-semibold">
              👉 Tap below for Instant 1-Tap Checkout with Minsah Authenticity Guarantee.
            </p>
          </div>

          {/* WhatsApp Message Meta */}
          <div className="self-end flex items-center gap-1 -mt-1 text-[10px] text-[#667781]">
            <span>10:42 AM</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
          </div>

          {/* Interactive WhatsApp Button Bubbles */}
          <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onQuickCheckout}
              className="w-full py-2 px-3 rounded-lg bg-[#E7F8E8] hover:bg-[#d5f3d7] text-[#0b6528] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Quick Claim Order (1-Tap)</span>
            </button>
            <button
              type="button"
              onClick={onViewWishlist}
              className="w-full py-1.5 px-3 rounded-lg bg-[#F2F6F0] hover:bg-[#E8F0E5] text-[#1c3a13] text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View in App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
