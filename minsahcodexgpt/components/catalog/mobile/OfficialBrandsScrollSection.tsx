'use client';

import { ShieldCheck, QrCode } from 'lucide-react';
import { BrandPartnerCard, BrandPartner } from './BrandPartnerCard';

const OFFICIAL_BRANDS: BrandPartner[] = [
  {
    id: 'b-cosrx',
    name: 'COSRX',
    origin: 'Korea',
    specialty: 'Snail & BHA',
    slug: 'cosrx',
  },
  {
    id: 'b-anua',
    name: 'ANUA',
    origin: 'Korea',
    specialty: 'Heartleaf',
    slug: 'anua',
  },
  {
    id: 'b-laneige',
    name: 'LANEIGE',
    origin: 'Korea',
    specialty: 'Water Science',
    slug: 'laneige',
  },
  {
    id: 'b-joseon',
    name: 'JOSEON',
    origin: 'Korea',
    specialty: 'Hanbang Care',
    slug: 'beauty-of-joseon',
  },
  {
    id: 'b-round-lab',
    name: 'ROUND LAB',
    origin: 'Gangwon',
    specialty: 'Dokdo 1025',
    slug: 'round-lab',
  },
  {
    id: 'b-somebymi',
    name: 'SOME BY MI',
    origin: 'Korea',
    specialty: 'Miracle Clear',
    slug: 'some-by-mi',
  },
];

interface OfficialBrandsScrollSectionProps {
  brands?: BrandPartner[];
}

export function OfficialBrandsScrollSection({
  brands = OFFICIAL_BRANDS,
}: OfficialBrandsScrollSectionProps) {
  return (
    <section className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-[#4b6723] font-bold">
              Direct Partners
            </span>
          </div>
          <h3 className="text-xl text-[#062402] font-bold tracking-tight">
            Official Brands
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#43483f] bg-[#F2F6F0] px-2.5 py-1 rounded-full border border-[#E2DED8]/60">
          {brands.length} Partners
        </span>
      </div>

      {/* Horizontal Snap Scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1">
        {brands.map((brand) => (
          <BrandPartnerCard key={brand.id} brand={brand} />
        ))}
      </div>

      {/* Ultra-Modern Holographic Customs Verification Card */}
      <div className="mt-3.5 rounded-[20px] bg-[#EAF7D8] text-[#1c3a13] p-3 flex items-center justify-between border border-[#ccee9b]/60 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#4b6723] flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold tracking-tight text-[#062402]">
              Holographic QR Certified
            </h4>
            <p className="text-[10px] text-[#516d29] opacity-90 truncate">
              Direct customs clearance &amp; authenticity on every parcel
            </p>
          </div>
        </div>
        <QrCode className="w-5 h-5 text-[#4b6723] shrink-0 ml-1" />
      </div>
    </section>
  );
}
