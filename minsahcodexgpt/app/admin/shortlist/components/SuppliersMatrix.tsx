// app/admin/shortlist/components/SuppliersMatrix.tsx
// High-Density Wholesale Bazaar Stall & Vendor Directory View
// Decomposed into declarative atomic components (Loop 5)

'use client';

import React, { useMemo } from 'react';
import { WholesaleSkuRow } from '../types';
import { SupplierStallCard, VendorGroupData } from '@/components/admin/shortlist/desktop/suppliers/SupplierStallCard';

interface SuppliersMatrixProps {
  skus: WholesaleSkuRow[];
  onSelectVendorSkus: (vendorSkus: WholesaleSkuRow[]) => void;
  onAcquireSku: (skuId: string) => void;
  onMarkBatchAcquiredVendor: (skuIds: string[]) => void;
}

export default function SuppliersMatrix({
  skus,
  onSelectVendorSkus,
  onAcquireSku,
  onMarkBatchAcquiredVendor,
}: SuppliersMatrixProps) {
  const vendorGroups = useMemo(() => {
    const map = new Map<string, VendorGroupData>();

    for (const item of skus) {
      const key = `${item.vendor.zone}:::${item.vendor.stallName}`;
      let group = map.get(key);
      if (!group) {
        group = {
          stallName: item.vendor.stallName,
          zone: item.vendor.zone,
          standLocation: item.vendor.standLocation,
          contactPerson: item.vendor.contactPerson,
          phone: item.vendor.phone,
          statusTag: item.vendor.statusTag,
          statusTagType: item.vendor.statusTagType,
          items: [],
          totalSkus: 0,
          totalUnits: 0,
          totalCost: 0,
          acquiredCount: 0,
        };
        map.set(key, group);
      }
      group.items.push(item);
      group.totalSkus += 1;
      group.totalUnits += item.requiredQuantity;
      group.totalCost += item.financials.totalCost;
      if (item.isAcquired) {
        group.acquiredCount += 1;
      }
    }

    return Array.from(map.values());
  }, [skus]);

  if (vendorGroups.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border border-[#142336] bg-[#071321] text-slate-400 font-mono text-xs select-none">
        No suppliers found matching the current search criteria.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 select-none">
        <span>
          Showing <strong className="text-white">{vendorGroups.length}</strong> Wholesale Merchant Stalls across Dhaka hubs
        </span>
        <span className="text-indigo-400">Grouped by Vendor Stall</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendorGroups.map((vendor) => (
          <SupplierStallCard
            key={`${vendor.zone}-${vendor.stallName}`}
            vendor={vendor}
            onSelectVendorSkus={onSelectVendorSkus}
            onAcquireSku={onAcquireSku}
            onMarkBatchAcquiredVendor={onMarkBatchAcquiredVendor}
          />
        ))}
      </div>
    </div>
  );
}
