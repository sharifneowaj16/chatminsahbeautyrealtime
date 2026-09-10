'use client';


import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';

export default function PagesManagementPage() {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return <div className="flex items-center justify-center h-64"><p className="text-[#8a8f98]">No permission</p></div>;
  }

  const pages = [
    { id: '1', title: 'About Us', slug: '/about', status: 'published', lastModified: '2024-01-15' },
    { id: '2', title: 'Contact', slug: '/contact', status: 'published', lastModified: '2024-01-15' },
    { id: '3', title: 'FAQ', slug: '/faq', status: 'published', lastModified: '2024-01-15' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-[#8a8f98]">Manage static pages</p>
        </div>
        <Button className="inline-flex items-center px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg">
          <Plus className="w-5 h-5 mr-2" />
          New Page
        </Button>
      </div>

      <div className="bg-[#161824] rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#10121b]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8a8f98] uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8a8f98] uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8a8f98] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8a8f98] uppercase">Last Modified</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8a8f98] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-[#10121b]">
                <td className="px-6 py-4 text-sm font-medium">{page.title}</td>
                <td className="px-6 py-4 text-sm text-[#8a8f98]">{page.slug}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-300 rounded-full text-xs">{page.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-[#8a8f98]">{page.lastModified}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Button className="text-[#5e6ad2]"><Edit className="w-4 h-4" /></Button>
                    <Button className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
