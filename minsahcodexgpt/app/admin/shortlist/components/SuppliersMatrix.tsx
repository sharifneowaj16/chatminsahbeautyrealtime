// app/admin/shortlist/components/SuppliersMatrix.tsx
// High-Density Wholesale Bazaar Stall & Vendor Directory View
// Groups demand by Merchant Stall for organized stall-by-stall procurement

'use client';

import React, { useMemo } from 'react';
import { WholesaleSkuRow } from '../types';

interface SuppliersMatrixProps {
  skus: WholesaleSkuRow[];
  onSelectVendorSkus: (vendorSkus: WholesaleSkuRow[]) => void;
  onAcquireSku: (skuId: string) => void;
  onMarkBatchAcquiredVendor: (skuIds: string[]) => void;
}

interface VendorGroup {
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

export default function SuppliersMatrix({
  skus,
  onSelectVendorSkus,
  onAcquireSku,
  onMarkBatchAcquiredVendor,
}: SuppliersMatrixProps) {
  const vendorGroups = useMemo(() => {
    const map = new Map<string, VendorGroup>();

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
      <div className="p-12 text-center rounded-lg border border-[#142336] bg-[#071321] text-slate-400 font-mono text-xs">
        No suppliers found matching the current search criteria.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{vendorGroups.length}</strong> Wholesale Merchant Stalls across Dhaka hubs
        </span>
        <span className="text-indigo-400">Grouped by Vendor Stall</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendorGroups.map((vendor) => {
          const isFullyAcquired = vendor.acquiredCount === vendor.totalSkus && vendor.totalSkus > 0;
          const progressPercent = vendor.totalSkus > 0 ? Math.round((vendor.acquiredCount / vendor.totalSkus) * 100) : 0;

          return (
            <div
              key={`${vendor.zone}-${vendor.stallName}`}
              className="rounded-xl border border-[#16263b] bg-[#071321] p-4 flex flex-col justify-between shadow-md transition-all hover:border-[#213a5a]"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#112134]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold uppercase">
                        {vendor.zone}
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {vendor.stallName}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                      <span>📍</span> {vendor.standLocation}
                    </p>
                  </div>

                  <div className="text-right">
                    <a
                      href={`tel:${vendor.phone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0d1e32] border border-[#193352] text-indigo-300 hover:text-white font-mono text-xs transition-colors"
                      title="Call Stall"
                    >
                      <span>📞</span> {vendor.phone}
                    </a>
                    <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">
                      Rep: {vendor.contactPerson}
                    </span>
                  </div>
                </div>

                {/* Vendor Sourcing KPIs */}
                <div className="grid grid-cols-3 gap-2 my-3 font-mono text-xs">
                  <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">
                      To Source
                    </span>
                    <span className="text-white font-bold text-xs mt-0.5 block">
                      {vendor.totalUnits} pcs ({vendor.totalSkus} SKUs)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">
                      Cash Float
                    </span>
                    <span className="text-amber-400 font-bold text-xs mt-0.5 block">
                      ৳{vendor.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">
                      Status
                    </span>
                    <span
                      className={`text-xs font-bold mt-0.5 block ${
                        isFullyAcquired ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {vendor.acquiredCount}/{vendor.totalSkus} Acquired
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#040b14] h-1.5 rounded-full overflow-hidden border border-[#142336] mb-3">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {/* Sku Line Item List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {vendor.items.map((sku) => (
                    <div
                      key={sku.id}
                      className="flex items-center justify-between p-2 rounded bg-[#050e18] border border-[#122134] text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-indigo-400 font-bold truncate">
                          {sku.sku}
                        </span>
                        <span className="text-white truncate">{sku.title}</span>
                        <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] uppercase">
                          {sku.variantOrShade}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-slate-300 font-bold">
                          {sku.requiredQuantity} pcs
                        </span>
                        <span className="text-amber-300">
                          ৳{sku.financials.totalCost.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAcquireSku(sku.id)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                            sku.isAcquired
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#0f2136] hover:bg-indigo-600 text-slate-300 hover:text-white border border-[#1b3452]'
                          }`}
                        >
                          {sku.isAcquired ? '✓' : 'Acquire'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 mt-3 border-t border-[#112134] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectVendorSkus(vendor.items)}
                  className="flex-1 py-1.5 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>🧾</span>
                  <span>Open Pick List for this Stall</span>
                </button>

                {!isFullyAcquired && (
                  <button
                    type="button"
                    onClick={() =>
                      onMarkBatchAcquiredVendor(vendor.items.map((i) => i.id))
                    }
                    className="py-1.5 px-2.5 rounded bg-[#0f233a] hover:bg-[#163558] border border-[#1f426e] text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Mark all items from this stall as acquired"
                  >
                    <span>✓✓</span>
                    <span>Acquire Stall</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
