'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, Truck } from 'lucide-react';
import { WelcomeCollageProduct } from './types';

const defaultCollageProducts: WelcomeCollageProduct[] = [
  {
    id: 'anua',
    name: 'Anua Heartleaf',
    image: '/images/categories/Skincare.png',
    tag: 'CALM',
  },
  {
    id: 'laneige',
    name: 'Laneige Berry',
    image: '/images/categories/Lip_Care.png',
    tag: 'TOP',
    isCenterHighlight: true,
  },
  {
    id: 'elixir',
    name: 'Elixir Vital',
    image: '/images/categories/Serum.png',
    tag: 'GLOW',
  },
];

interface WelcomeProductCollageProps {
  products?: WelcomeCollageProduct[];
}

function CollageItem({ item }: { item: WelcomeCollageProduct }) {
  const [imgSrc, setImgSrc] = useState(item.image);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-white p-1 border border-[#E2DED8] flex flex-col items-center shadow-xs transition-transform ${
        item.isCenterHighlight ? 'border-2 border-[#C59A27] scale-105 z-10 p-1.5' : ''
      }`}
    >
      <div
        className={`w-full aspect-square rounded-lg overflow-hidden relative ${
          item.isCenterHighlight ? 'bg-[#FDF6E2]' : 'bg-[#F4F6F2]'
        }`}
      >
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          sizes="(max-width: 400px) 100px, 120px"
          className="object-contain p-1"
          onError={() => setImgSrc('/images/placeholder.png')}
        />
        <span
          className={`absolute top-1 ${
            item.isCenterHighlight ? 'right-1 bg-[#C59A27] text-white' : 'left-1 bg-white/90 text-[#1c3a13]'
          } backdrop-blur-xs text-[8px] font-extrabold px-1 rounded shadow-xs z-10`}
        >
          {item.tag}
        </span>
      </div>
      <span
        className={`text-[9px] text-[#1c3a13] truncate w-full text-center mt-1 ${
          item.isCenterHighlight ? 'font-bold text-[10px]' : 'font-medium'
        }`}
      >
        {item.name}
      </span>
    </div>
  );
}

export default function WelcomeProductCollage({
  products = defaultCollageProducts,
}: WelcomeProductCollageProps) {
  return (
    <div className="relative w-full rounded-[20px] overflow-hidden p-2 sm:p-2.5 bg-[#FAF9F6] border border-[#E2DED8] mb-2.5 sm:mb-3.5">
      {/* Collage Grid of 3 Authentic Best-Sellers */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 items-center">
        {products.map((item) => (
          <CollageItem key={item.id} item={item} />
        ))}
      </div>

      {/* Authenticity Micro Stamp Bar */}
      <div className="flex items-center justify-between mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-[#E2DED8] text-[9.5px] sm:text-[10px] text-[#5A615D] px-0.5">
        <div className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1c3a13]" />
          <span>100% Certified Genuine</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-[#1c3a13]">
          <Truck className="w-3.5 h-3.5 text-[#4b6723]" />
          <span>Nationwide 24-48h Delivery</span>
        </div>
      </div>
    </div>
  );
}
