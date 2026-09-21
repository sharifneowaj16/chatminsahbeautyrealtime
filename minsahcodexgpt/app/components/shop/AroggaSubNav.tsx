'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export interface AroggaSubNavTab {
  id: string;
  label: string;
  href: string;
  isActive: (searchParams: URLSearchParams) => boolean;
}

const DEFAULT_TABS: AroggaSubNavTab[] = [
  {
    id: 'all',
    label: 'All Formulations',
    href: '/shop',
    isActive: (params) => {
      const category = params.get('category');
      const saleOnly = params.get('saleOnly');
      const sort = params.get('sort');
      return !category && saleOnly !== 'true' && sort !== 'best-selling';
    },
  },
  {
    id: 'skincare',
    label: 'Skincare',
    href: '/shop?category=Skincare',
    isActive: (params) => params.get('category')?.toLowerCase() === 'skincare',
  },
  {
    id: 'makeup',
    label: 'Makeup',
    href: '/shop?category=Makeup',
    isActive: (params) => params.get('category')?.toLowerCase() === 'makeup',
  },
  {
    id: 'hair-care',
    label: 'Hair Care',
    href: '/shop?category=Hair%20Care',
    isActive: (params) => {
      const cat = params.get('category')?.toLowerCase();
      return cat === 'hair care' || cat === 'hair-care';
    },
  },
  {
    id: 'combos',
    label: 'Offers & Combos',
    href: '/shop?saleOnly=true',
    isActive: (params) => params.get('saleOnly') === 'true',
  },
  {
    id: 'best-sellers',
    label: 'Best Sellers',
    href: '/shop?sort=best-selling',
    isActive: (params) => params.get('sort') === 'best-selling',
  },
];

export default function AroggaSubNav() {
  const searchParams = useSearchParams();

  return (
    <div className="w-full border-b border-stone-200/90 bg-white" aria-label="Catalog sub-navigation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          className="flex items-center gap-6 md:gap-8 overflow-x-auto scrollbar-hide text-sm md:text-[15px]"
          aria-label="Product categories tabs"
        >
          {DEFAULT_TABS.map((tab) => {
            const active = tab.isActive(searchParams);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`relative py-3.5 whitespace-nowrap transition-colors select-none ${
                  active
                    ? 'font-bold text-[#1c3a13] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3.5px] after:rounded-t-full after:bg-[#1c3a13]'
                    : 'font-medium text-stone-600 hover:text-[#1c3a13]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
