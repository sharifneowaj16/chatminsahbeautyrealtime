'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  X,
  ShoppingBag,
  Layers,
  Zap,
  Search,
  User,
  Heart,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Tag,
  Truck,
  Copy,
  Check,
  MapPin,
} from 'lucide-react';
import { safeImageUrl } from '@/lib/safe-image';
import { formatPrice } from '@/utils/currency';

export interface MobileDrawerCategory {
  id: string;
  name: string;
  href: string;
  image?: string;
  slug?: string;
}

export interface MobileDrawerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category?: string;
  code?: string;
  badge?: string;
}

const defaultFeaturedProducts: MobileDrawerProduct[] = [
  {
    id: 'prod-ds-serum',
    name: 'Advanced Niacinamide Glow Serum',
    slug: 'advanced-niacinamide-glow-serum',
    price: 1450,
    image: '/images/categories/Serum.png',
    category: 'Serum Formula',
    code: 'NS-01®',
    badge: 'Best Seller',
  },
  {
    id: 'prod-sunscreen',
    name: 'Ultra-Light Invisible Sunscreen SPF50+',
    slug: 'ultra-light-invisible-sunscreen-spf50',
    price: 1250,
    image: '/images/categories/Sunscreen.png',
    category: 'UV Protection',
    code: 'SP-50®',
    badge: 'Popular',
  },
  {
    id: 'prod-lip-tint',
    name: 'Velvet Hydrating Lip Tint',
    slug: 'velvet-hydrating-lip-tint',
    price: 850,
    image: '/images/categories/Lip_Care.png',
    category: 'Lip Care',
    code: 'LT-03®',
    badge: 'Trending',
  },
];

const fallbackCategories: MobileDrawerCategory[] = [
  { id: 'cat-skincare', name: 'Skincare', href: '/shop?category=Skincare', image: '/images/categories/Skincare.png' },
  { id: 'cat-makeup', name: 'Makeup', href: '/shop?category=Makeup', image: '/images/categories/Makeup.png' },
  { id: 'cat-hair-care', name: 'Hair Care', href: '/shop?category=Hair%20Care', image: '/images/categories/Hair_Care.png' },
  { id: 'cat-fragrance', name: 'Fragrance', href: '/shop?category=Fragrance', image: '/images/categories/Fragrance.png' },
  { id: 'cat-bath-body', name: 'Bath & Body', href: '/shop?category=Bath%20%26%20Body', image: '/images/categories/Bath_&_Body.png' },
  { id: 'cat-lip-care', name: 'Lip Care', href: '/shop?category=Lip%20Care', image: '/images/categories/Lip_Care.png' },
  { id: 'cat-sunscreen', name: 'Sunscreen', href: '/shop?category=Sunscreen', image: '/images/categories/Sunscreen.png' },
  { id: 'cat-serum', name: 'Serum', href: '/shop?category=Serum', image: '/images/categories/Serum.png' },
];

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryDisplayCity?: string;
  onOpenDelivery?: () => void;
  categories?: MobileDrawerCategory[];
  user?: { name?: string | null; email?: string | null } | null;
}

type ActiveTab = 'shop' | 'categories' | 'offers';

export default function MobileNavDrawer({
  isOpen,
  onClose,
  deliveryDisplayCity = 'Bangladesh',
  onOpenDelivery,
  categories = fallbackCategories,
  user,
}: MobileNavDrawerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shop');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const copyVoucher = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  if (!isOpen) return null;

  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Drawer"
      className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
    >
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Bottom Sheet Container */}
      <div className="relative z-10 w-full max-h-[88vh] flex flex-col rounded-t-[32px] border-t border-white/20 bg-[#122416]/98 backdrop-blur-2xl text-white shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <Link
            href="/"
            onClick={onClose}
            className="font-serif text-lg font-bold tracking-tight text-white flex items-center gap-1.5"
          >
            <span>Minsah</span>
            <span className="text-emerald-400">Beauty</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Deliver To Action Bar */}
        {onOpenDelivery && (
          <div className="border-b border-white/10 px-4 py-2 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDelivery();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
            >
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-emerald-400" />
                <span>Deliver to: <span className="text-emerald-200 font-bold">{deliveryDisplayCity}</span></span>
              </span>
              <span className="text-[11px] font-normal text-white/60 underline underline-offset-2">Change</span>
            </button>
          </div>
        )}

        {/* 3 Pill Tabs: Shop | Categories | Offers */}
        <div className="flex items-center gap-1.5 p-3 border-b border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'shop'
                ? 'bg-white text-[#122416] shadow-sm'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-white text-[#122416] shadow-sm'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Layers size={13} />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'offers'
                ? 'bg-white text-[#122416] shadow-sm'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Zap size={13} />
            <span>Offers</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2 max-h-[50vh]"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
          }}
        >
          {/* 1. SHOP TAB */}
          {activeTab === 'shop' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-semibold mb-2 flex items-center gap-1">
                <Sparkles size={11} /> Featured Formulations
              </div>
              {defaultFeaturedProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug || item.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-all"
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white/10 p-1 flex items-center justify-center">
                    <Image
                      src={safeImageUrl(item.image)}
                      alt={item.name || 'Product'}
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-300 font-medium truncate">
                        {item.code || item.category || 'Formulation'}
                      </span>
                      {item.badge && (
                        <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-200">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs font-semibold text-white mt-0.5">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-emerald-300 font-price font-semibold mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
                </Link>
              ))}

              <div className="pt-2">
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  <span>Shop all products</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}

          {/* 2. CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-2 gap-2">
              {displayCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={onClose}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 active:bg-white/15 transition text-center"
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white/10 p-1 flex items-center justify-center mb-1">
                    <Image
                      src={safeImageUrl(cat.image || `/images/categories/${cat.slug || cat.id}.png`)}
                      alt={cat.name || 'Category'}
                      width={36}
                      height={36}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white line-clamp-1">
                    {cat.name}
                  </span>
                </Link>
              ))}
              <div className="col-span-2 pt-1">
                <Link
                  href="/categories"
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/10 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/15 transition"
                >
                  <span>All Categories</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}

          {/* 3. OFFERS TAB */}
          {activeTab === 'offers' && (
            <div className="space-y-2.5">
              <Link
                href="/flash-sale"
                onClick={onClose}
                className="block p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/30 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="fill-amber-400" /> Flash Sale
                  </span>
                  <span className="bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full text-[10px]">
                    Up to 30% OFF
                  </span>
                </div>
                <p className="text-white mt-1 text-[11px]">
                  Special seasonal discounts across bestselling beauty formulations.
                </p>
              </Link>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-300">
                    <Tag size={12} /> WELCOME10
                  </div>
                  <p className="text-[10.5px] text-white/70">10% off on your first order</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyVoucher('WELCOME10')}
                  className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full text-white hover:bg-white/20 transition active:scale-95"
                >
                  {copiedCode === 'WELCOME10' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCode === 'WELCOME10' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Truck size={18} className="text-emerald-400 flex-shrink-0" />
                <p className="text-[11px] text-white/90">
                  Free nationwide shipping on orders over <span className="font-price font-bold text-emerald-300">৳999</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Footer: Search, Account & Wishlist */}
        <div className="border-t border-white/10 p-3 px-5 flex items-center justify-between gap-3 bg-white/[0.03]">
          <Link
            href="/search"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition"
          >
            <Search size={14} />
            <span>Search</span>
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition"
          >
            <Heart size={14} />
            <span>Wishlist</span>
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition"
          >
            <User size={14} />
            <span>{user ? 'Account' : 'Sign In'}</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
