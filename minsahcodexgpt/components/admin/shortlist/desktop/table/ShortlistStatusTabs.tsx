// components/admin/shortlist/desktop/table/ShortlistStatusTabs.tsx
'use client';

import React from 'react';
import { WholesaleStatusTab } from '@/app/admin/shortlist/types';

export interface ShortlistStatusTabsProps {
  activeTab: WholesaleStatusTab;
  onTabChange: (tab: WholesaleStatusTab) => void;
  skuCount?: number;
  totalSkus?: number;
  pendingCount: number;
  urgentCount: number;
  suppliersCount: number;
}

export const ShortlistStatusTabs: React.FC<ShortlistStatusTabsProps> = ({
  activeTab,
  onTabChange,
  skuCount,
  totalSkus,
  pendingCount,
  urgentCount,
  suppliersCount,
}) => {
  const total = totalSkus ?? skuCount ?? 0;

  return (
    <div className="flex items-center gap-1 bg-[#091524] p-1 rounded-lg border border-[#152538] select-none">
      <button
        type="button"
        onClick={() => onTabChange('SKU_MATRIX')}
        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
          activeTab === 'SKU_MATRIX'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        SKU Matrix ({total})
      </button>

      <button
        type="button"
        onClick={() => onTabChange('PENDING')}
        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
          activeTab === 'PENDING'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Pending ({pendingCount})
      </button>

      <button
        type="button"
        onClick={() => onTabChange('URGENT')}
        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
          activeTab === 'URGENT'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Urgent ({urgentCount})
      </button>

      <button
        type="button"
        onClick={() => onTabChange('SUPPLIERS')}
        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
          activeTab === 'SUPPLIERS'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Suppliers ({suppliersCount})
      </button>
    </div>
  );
};
export default ShortlistStatusTabs;
