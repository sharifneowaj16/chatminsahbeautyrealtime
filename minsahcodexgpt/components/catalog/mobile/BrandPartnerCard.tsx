'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export interface BrandPartner {
  id: string;
  name: string;
  origin: string;
  specialty: string;
  slug: string;
}

interface BrandPartnerCardProps {
  brand: BrandPartner;
}

export function BrandPartnerCard({ brand }: BrandPartnerCardProps) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="min-w-[110px] w-[110px] snap-start rounded-[18px] bg-white p-2.5 shadow-sm border border-[#E2DED8]/60 flex flex-col justify-between shrink-0 active:scale-95 transition-all select-none"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#516d29] text-[9px] font-bold">
          <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
          <span>{brand.origin}</span>
        </span>
      </div>

      <div className="my-0.5">
        <h4 className="text-xs font-bold tracking-tight text-[#062402] truncate">
          {brand.name}
        </h4>
        <p className="text-[10px] text-[#43483f] truncate">
          {brand.specialty}
        </p>
      </div>

      <div className="pt-1.5 mt-1 border-t border-[#E2DED8]/40 flex items-center justify-between text-[10px] text-[#4b6723] font-semibold">
        <span className="text-[9px] text-[#4b6723] font-medium truncate">
          Genuine
        </span>
        <ArrowRight className="w-3 h-3 text-[#43483f] shrink-0" />
      </div>
    </Link>
  );
}
