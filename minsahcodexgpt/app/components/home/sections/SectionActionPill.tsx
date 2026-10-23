'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionActionPillProps {
  href: string;
  cta?: string;
  title?: string;
  className?: string;
}

export default function SectionActionPill({
  href,
  cta = 'View all',
  title = '',
  className = '',
}: SectionActionPillProps) {
  return (
    <Link
      href={href}
      aria-label={`${cta} ${title}`.trim()}
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1c3a13]/15 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-[#1c3a13] shadow-2xs transition-all duration-200 hover:border-[#1c3a13] hover:bg-[#1c3a13] hover:text-[#D4F6A2] hover:shadow-sm active:scale-95 minsah-touch-target ${className}`}
    >
      <span>{cta}</span>
      <ArrowRight
        size={14}
        strokeWidth={2.5}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
