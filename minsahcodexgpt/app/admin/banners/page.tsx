'use client';


import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';

export default function BannersPage() {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return <div className="flex items-center justify-center h-64"><p className="text-[#8a8f98]">No permission</p></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Banners & Sliders</h1>
          <p className="text-[#8A8F98]">Manage homepage banners and promotional sliders</p>
        </div>
        <Button className="inline-flex items-center px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Banner
        </Button>
      </div>

      <div className="bg-[#161824] rounded-xl border border-[#232636] p-12 text-center">
        <ImageIcon className="w-16 h-16 text-[#62666D] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#F7F8F8] mb-2">No Banners Yet</h3>
        <p className="text-[#8a8f98] mb-6">Create your first homepage banner</p>
        <Button className="px-6 py-3 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
          Add Banner
        </Button>
      </div>
    </div>
  );
}
