'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { SupplierStallCardHeader } from './SupplierStallCardHeader';
import { SupplierDemandMetricPills } from './SupplierDemandMetricPills';
import { SupplierSkuItemRow } from './SupplierSkuItemRow';
import { SupplierBatchActions } from './SupplierBatchActions';

export interface VendorGroupData {
  stallName: string;
  zone: string;
  standLocation: string;
  contactPerson: string;
  phone: string;
  statusTag?: string;
  statusTagType?: string;
  items: WholesaleSkuRow[];
  totalSkus: number;
  totalUnits: number;
  totalCost: number;
  acquiredCount: number;
}

interface SupplierStallCardProps {
  vendor: VendorGroupData;
  onSelectVendorSkus: (vendorSkus: WholesaleSkuRow[]) => void;
  onAcquireSku: (skuId: string) => void;
  onMarkBatchAcquiredVendor: (skuIds: string[]) => void;
}

export const SupplierStallCard: React.FC<SupplierStallCardProps> = ({
  vendor,
  onSelectVendorSkus,
  onAcquireSku,
  onMarkBatchAcquiredVendor,
}) => {
  const isFullyAcquired = vendor.acquiredCount === vendor.totalSkus && vendor.totalSkus > 0;
  const progressPercent = vendor.totalSkus > 0 ? Math.round((vendor.acquiredCount / vendor.totalSkus) * 100) : 0;

  return (
    <div className="rounded-xl border border-[#16263b] bg-[#071321] p-4 flex flex-col justify-between shadow-md transition-all hover:border-[#213a5a]">
      <div>
        {/* Stall Header */}
        <SupplierStallCardHeader
          stallName={vendor.stallName}
          zone={vendor.zone}
          standLocation={vendor.standLocation}
          phone={vendor.phone}
          contactPerson={vendor.contactPerson}
        />

        {/* Demand KPIs */}
        <SupplierDemandMetricPills
          totalUnits={vendor.totalUnits}
          totalSkus={vendor.totalSkus}
          totalCost={vendor.totalCost}
          acquiredCount={vendor.acquiredCount}
          isFullyAcquired={isFullyAcquired}
        />

        {/* Progress Bar */}
        <div className="w-full bg-[#040b14] h-1.5 rounded-full overflow-hidden border border-[#142336] mb-3">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Sku Line Item List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {vendor.items.map((sku) => (
            <SupplierSkuItemRow
              key={sku.id}
              sku={sku}
              onAcquireSku={onAcquireSku}
            />
          ))}
        </div>
      </div>

      {/* Batch Actions Footer */}
      <SupplierBatchActions
        items={vendor.items}
        isFullyAcquired={isFullyAcquired}
        onSelectVendorSkus={onSelectVendorSkus}
        onMarkBatchAcquiredVendor={onMarkBatchAcquiredVendor}
      />
    </div>
  );
};
