'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Tag, Zap, Gift, Truck, Check, Copy } from 'lucide-react';

interface ProductOffersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductOffersDrawer({
  isOpen,
  onClose,
}: ProductOffersDrawerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const copyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Offers and promotions menu"
      className="absolute top-[calc(100%+8px)] left-0 z-50 w-[330px] sm:w-[360px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
      onMouseLeave={onClose}
    >
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#122416]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 text-white ring-1 ring-black/10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/[0.02]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-semibold flex items-center gap-1.5">
            <Zap size={11} className="text-amber-400" />
            Active Offers & Perks
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
            Live Deals
          </span>
        </div>

        {/* Scrollable Deals & Vouchers */}
        <div
          className="max-h-[360px] overflow-y-auto overscroll-contain p-3 space-y-2.5"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.35) transparent',
          }}
        >
          {/* Flash Sale Banner Card */}
          <Link
            href="/flash-sale"
            onClick={onClose}
            className="group block p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/30 hover:border-amber-400/60 transition-all duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                <Zap size={12} className="text-amber-400 fill-amber-400" />
                Flash Sale
              </span>
              <span className="text-[10px] font-bold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full">
                Up to 30% OFF
              </span>
            </div>
            <p className="text-xs font-semibold text-white mt-1 group-hover:text-amber-200 transition-colors">
              Limited-time seasonal markdowns on bestselling lines.
            </p>
          </Link>

          {/* Voucher 1: WELCOME10 */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Tag size={12} className="text-emerald-400" />
                <span className="font-mono text-xs font-bold text-emerald-300">
                  WELCOME10
                </span>
              </div>
              <p className="text-[11px] text-white/70 mt-0.5">
                10% off on your first order
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyVoucher('WELCOME10')}
              className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-1 rounded-full text-white transition-all flex-shrink-0"
            >
              {copiedCode === 'WELCOME10' ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="text-white/70" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Delivery Perk Card */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-300">
              <Truck size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Free Nationwide Shipping</p>
              <p className="text-[11px] text-white/60">On all prepaid orders over ৳999</p>
            </div>
          </div>

          {/* Combo Offer Link */}
          <Link
            href="/combos"
            onClick={onClose}
            className="group flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-xs"
          >
            <div className="flex items-center gap-2">
              <Gift size={14} className="text-pink-400" />
              <span className="text-white font-medium group-hover:text-pink-200">
                Explore Value Combo Bundles
              </span>
            </div>
            <ArrowRight size={13} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Pinned Bottom Footer Link */}
        <div className="border-t border-white/10 bg-white/[0.03] p-3 px-4">
          <Link
            href="/offers"
            onClick={onClose}
            className="group flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white hover:text-amber-300 transition-colors"
          >
            <span>View All Offers</span>
            <ArrowRight
              size={14}
              className="text-white/70 group-hover:text-amber-300 group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

      </div>
    </div>
  );
}
