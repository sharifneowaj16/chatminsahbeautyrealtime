import React from 'react';
import AdminHeroSlidesManager from '@/components/admin/hero/AdminHeroSlidesManager';

export const metadata = {
  title: 'Hero Banners & Slides | Minsah Admin',
};

export default function HomeSectionSlidesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <AdminHeroSlidesManager />
    </div>
  );
}
