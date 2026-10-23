import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import prisma from '@/lib/prisma';
import { normalizeFlashDealsConfig } from '@/lib/homepageConfig';
import FlashDealsAdminManager from '@/components/admin/flash-deals/FlashDealsAdminManager';

export const metadata = {
  title: 'Flash Deals Management | Minsah Beauty Admin',
};

export const revalidate = 0;

export default async function AdminFlashDealsPage() {
  const configRecord = await prisma.siteConfig.findUnique({
    where: { key: 'flashDeals' },
  });

  const initialConfig = normalizeFlashDealsConfig(configRecord?.value);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#8a8f98]">
        <Link
          href="/admin/home-sections"
          className="inline-flex items-center gap-1.5 text-[#8a8f98] hover:text-[#f7f8f8] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home Sections</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#8a8f98]/50" />
        <span className="font-semibold text-[#f7f8f8]">
          Flash Deals (5-Column Suite)
        </span>
      </div>

      {/* Admin Manager Hub */}
      <FlashDealsAdminManager initialConfig={initialConfig} />
    </div>
  );
}
