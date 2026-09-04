'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Layers, Sparkles, ChevronRight } from 'lucide-react';
import { safeImageUrl } from '@/lib/safe-image';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  href: string;
  image: string;
  itemCount?: number;
}

interface ProductCategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: CategoryItem[];
}

const defaultCategories: CategoryItem[] = [
  { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', href: '/shop?category=Skincare', image: '/images/categories/Skincare.png', itemCount: 24 },
  { id: 'cat-hair-care', name: 'Hair Care', slug: 'hair-care', href: '/shop?category=Hair%20Care', image: '/images/categories/Hair_Care.png', itemCount: 18 },
  { id: 'cat-lip-care', name: 'Lip Care', slug: 'lip-care', href: '/shop?category=Lip%20Care', image: '/images/categories/Lip_Care.png', itemCount: 12 },
  { id: 'cat-sunscreen', name: 'Sunscreen', slug: 'sunscreen', href: '/shop?category=Sunscreen', image: '/images/categories/Sunscreen.png', itemCount: 8 },
  { id: 'cat-serum', name: 'Serums', slug: 'serum', href: '/shop?category=Serum', image: '/images/categories/Serum.png', itemCount: 15 },
  { id: 'cat-combos', name: 'Combo Sets', slug: 'combos', href: '/combos', image: '/images/categories/Offers.png', itemCount: 10 },
  { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', href: '/shop?category=Makeup', image: '/images/categories/Makeup.png', itemCount: 14 },
  { id: 'cat-fragrance', name: 'Fragrance', slug: 'fragrance', href: '/shop?category=Fragrance', image: '/images/categories/Fragrance.png', itemCount: 6 },
];

export default function ProductCategoriesDrawer({
  isOpen,
  onClose,
  categories = defaultCategories,
}: ProductCategoriesDrawerProps) {
  const [items, setItems] = useState<CategoryItem[]>(categories);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize dynamic categories if fetched from /api/categories
  useEffect(() => {
    let isMounted = true;
    fetch('/api/categories?activeOnly=true')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          const apiCats: CategoryItem[] = data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            href: `/shop?category=${encodeURIComponent(c.name)}`,
            image: safeImageUrl(c.image || c.icon || `/images/categories/${c.slug}.png`),
            itemCount: c._count?.products || undefined,
          }));
          setItems(apiCats);
        }
      })
      .catch(() => {
        // Fallback to default
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      aria-label="Shop categories menu"
      className="absolute top-[calc(100%+8px)] left-0 z-50 w-[330px] sm:w-[360px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#122416]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 text-white ring-1 ring-black/10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/[0.02]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80 font-semibold flex items-center gap-1.5">
            <Layers size={11} className="text-emerald-400" />
            Product Categories
          </span>
          <span className="text-[10px] font-mono text-white/40">
            {items.length} lines
          </span>
        </div>

        {/* Scrollable Categories Grid */}
        <div
          className="max-h-[360px] overflow-y-auto overscroll-contain p-2.5 grid grid-cols-2 gap-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.35) transparent',
          }}
        >
          {items.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              onClick={onClose}
              className="group flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-400/30 transition-all duration-150 text-center"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white/10 p-1 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                <Image
                  src={safeImageUrl(cat.image)}
                  alt={cat.name || 'Category'}
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-white/95 group-hover:text-emerald-200 transition-colors line-clamp-1">
                {cat.name}
              </span>
              {cat.itemCount !== undefined && (
                <span className="text-[10px] text-white/50 font-mono">
                  {cat.itemCount} items
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Pinned Bottom Footer Link */}
        <div className="border-t border-white/10 bg-white/[0.03] p-3 px-4">
          <Link
            href="/categories"
            onClick={onClose}
            className="group flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white hover:text-emerald-300 transition-colors"
          >
            <span>All Categories</span>
            <ArrowRight
              size={14}
              className="text-white/70 group-hover:text-emerald-300 group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

      </div>
    </div>
  );
}
