// app/admin/shortlist/components/WholesaleTable.tsx
// High-Density 6-Column Wholesale SKU Data Matrix matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)

'use client';

import React from 'react';
import { WholesaleSkuRow } from '../types';

interface WholesaleTableProps {
  skus: WholesaleSkuRow[];
  selectedSkuIds: Set<string>;
  onToggleSelectRow: (skuId: string) => void;
  onAcquireSku: (skuId: string) => void;
  onAssignRunner?: (skuId: string) => void;
  onTogglePriority?: (skuId: string) => void;
  onCopyText?: (text: string, label: string) => void;
}

export default function WholesaleTable({
  skus,
  selectedSkuIds,
  onToggleSelectRow,
  onAcquireSku,
  onAssignRunner,
  onTogglePriority,
  onCopyText,
}: WholesaleTableProps) {
  const [openMenuSkuId, setOpenMenuSkuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleGlobalClick = () => setOpenMenuSkuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#142336] bg-[#071321] shadow-md">
      <table className="w-full table-fixed text-left border-collapse">
        <thead>
          <tr className="bg-[#050f1a] border-b border-[#142336] text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none">
            <th className="py-2.5 px-3 w-[26%] text-slate-300 font-bold" scope="col">
              Product &amp; SKU Spec
            </th>
            <th className="py-2.5 px-3 w-[18%] text-slate-300 font-bold" scope="col">
              Demand &amp; Order Mapping
            </th>
            <th className="py-2.5 px-3 w-[22%] text-slate-300 font-bold" scope="col">
              Wholesale Stand &amp; Vendor
            </th>
            <th className="py-2.5 px-3 w-[16%] text-slate-300 font-bold" scope="col">
              Cost &amp; Profit
            </th>
            <th className="py-2.5 px-3 w-[10%] text-slate-300 font-bold" scope="col">
              Acquisition
            </th>
            <th className="py-2.5 px-3 w-[8%] text-right text-slate-300 font-bold" scope="col">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#101d2c] text-xs text-slate-200">
          {skus.map((sku) => {
            const isSelected = selectedSkuIds.has(sku.id);
            return (
              <tr
                key={sku.id}
                className={`transition-colors group ${
                  isSelected ? 'bg-[#0a192a]/80' : 'hover:bg-[#0a192a]/50'
                }`}
              >
                {/* 1. Product & SKU Spec */}
                <td className="py-2.5 px-3 align-top">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(sku.id)}
                      className="w-3.5 h-3.5 rounded bg-[#071321] border-slate-600 text-indigo-600 focus:outline-none cursor-pointer mt-1 flex-shrink-0 accent-indigo-600"
                    />
                    <div className="w-11 h-11 rounded-md bg-[#040b14] border border-[#17273a] overflow-hidden flex-shrink-0 relative">
                      {sku.thumbnailUrl ? (
                        <img
                          src={sku.thumbnailUrl}
                          alt={sku.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0d1c2d] text-indigo-400 font-mono text-[10px] font-bold">
                          {sku.sku.slice(0, 3)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 bg-[#040b14]/90 text-[8px] font-mono px-0.5 text-indigo-400 font-bold">
                        {sku.volumeSpec}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white leading-tight truncate text-xs">
                          {sku.title}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[9px] font-semibold uppercase">
                          {sku.variantOrShade}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-slate-400">
                        <span className="text-indigo-400 font-semibold">{sku.sku}</span>
                        <span>•</span>
                        <span>{sku.barcode}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1 py-0.2 rounded bg-[#0d1d2e] border border-[#16273b] text-[9px] text-slate-300 font-mono">
                          {sku.categoryTag}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {sku.batchFormulaNote}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Demand & Order Mapping */}
                <td className="py-2.5 px-3 align-top">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white font-mono">
                        {sku.requiredQuantity} pcs
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase ${
                          sku.demandTag === 'Urgent Stock'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : sku.demandTag === 'Bulk Source'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {sku.demandTag}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {sku.linkedOrders.map((ord, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#050e18] border border-[#142336] font-mono text-[10px]"
                        >
                          <span className="text-indigo-400 truncate">{ord.orderNumber}</span>
                          <span
                            className={
                              ord.shippingType === 'Express'
                                ? 'text-rose-400 font-bold text-[9px]'
                                : 'text-slate-400 text-[9px]'
                            }
                          >
                            {ord.quantity} pc{ord.quantity > 1 ? 's' : ''}{' '}
                            {ord.shippingType || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>

                {/* 3. Wholesale Stand & Vendor */}
                <td className="py-2.5 px-3 align-top">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-white text-xs truncate">
                      {sku.vendor.stallName}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 text-slate-300 text-[10px] truncate">
                      <span className="text-slate-400 text-[11px] flex-shrink-0">📍</span>
                      <span className="truncate">{sku.vendor.standLocation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                      <a
                        href={`tel:${sku.vendor.phone.replace(/[^0-9+]/g, '')}`}
                        className="text-indigo-400 hover:underline flex items-center gap-0.5 truncate"
                      >
                        <span className="text-[10px] flex-shrink-0">📞</span>
                        {sku.vendor.phone}
                      </a>
                      <span className="text-slate-400 text-[9px]">
                        ({sku.vendor.contactPerson})
                      </span>
                    </div>

                    {sku.vendor.statusTag && (
                      <span
                        className={`mt-1 text-[9px] font-mono uppercase flex items-center gap-1 ${
                          sku.vendor.statusTagType === 'verified'
                            ? 'text-emerald-400'
                            : sku.vendor.statusTagType === 'urgent'
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-300'
                        }`}
                      >
                        {sku.vendor.statusTagType === 'verified' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        ) : sku.vendor.statusTagType === 'urgent' ? (
                          <span className="text-[10px]">⏱️</span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                        )}
                        {sku.vendor.statusTag}
                      </span>
                    )}
                  </div>
                </td>

                {/* 4. Cost & Profit */}
                <td className="py-2.5 px-3 align-top font-mono text-[11px]">
                  <div className="space-y-0.5 bg-[#050e18] p-1.5 rounded-md border border-[#142436]">
                    <div className="flex justify-between text-slate-400">
                      <span className="text-[10px]">Wholesale:</span>
                      <span className="text-white font-bold">
                        ৳{sku.financials.unitCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span className="text-[10px]">
                        Batch ({sku.requiredQuantity}x):
                      </span>
                      <span className="text-amber-400 font-bold">
                        ৳{sku.financials.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span className="text-[10px]">Retail:</span>
                      <span className="text-slate-200">
                        ৳{sku.financials.retailValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-1 mt-0.5 border-t border-[#142436] flex justify-between">
                      <span className="text-emerald-400 font-bold text-[10px]">Net:</span>
                      <span className="text-emerald-400 font-bold">
                        +৳{sku.financials.netProfit.toLocaleString()} (
                        {Math.round(sku.financials.marginPercent)}%)
                      </span>
                    </div>
                  </div>
                </td>

                {/* 5. Acquisition */}
                <td className="py-2.5 px-3 align-top">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-400 font-bold">
                        {sku.pickedQuantity} of {sku.requiredQuantity}
                      </span>
                      <span className="text-slate-400">{sku.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#040b14] h-1.5 rounded-full overflow-hidden border border-[#142336]">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${sku.progressPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                      <span className="text-emerald-400 text-[10px]">✓</span>
                      {sku.statusNote}
                    </span>
                  </div>
                </td>

                {/* 6. Action */}
                <td className="py-2.5 px-3 align-top text-right">
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => onAcquireSku(sku.id)}
                      className={`w-full py-1 px-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 shadow-xs transition-all cursor-pointer ${
                        sku.isAcquired
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                      }`}
                    >
                      <span className="text-[11px]">✓</span>
                      <span>{sku.isAcquired ? 'Acquired' : 'Acquire'}</span>
                    </button>

                    <div className="flex items-center gap-1 w-full relative">
                      <button
                        type="button"
                        onClick={() => onAssignRunner && onAssignRunner(sku.id)}
                        className="flex-1 py-0.5 px-1 rounded bg-[#0c1a29] hover:bg-[#13263b] border border-[#182a3d] text-slate-300 text-[9px] font-mono flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title="Assign Runner"
                      >
                        <span className="text-[10px]">👤+</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuSkuId(openMenuSkuId === sku.id ? null : sku.id);
                        }}
                        className={`p-0.5 px-1.5 rounded border transition-colors cursor-pointer ${
                          openMenuSkuId === sku.id
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-[#0c1a29] hover:bg-[#13263b] border-[#182a3d] text-indigo-400'
                        }`}
                        title="Options"
                      >
                        <span className="text-[10px]">⋮</span>
                      </button>

                      {/* Dropdown Popover */}
                      {openMenuSkuId === sku.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg bg-[#0a1626] border border-[#1d3350] shadow-2xl py-1 text-left font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onTogglePriority && onTogglePriority(sku.id);
                              setOpenMenuSkuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-[#11243d] flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <span>⭐</span>
                            <span>{sku.priority === 'URGENT' ? 'Set Normal Priority' : 'Mark URGENT Priority'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onCopyText && onCopyText(sku.sku, 'SKU Code');
                              setOpenMenuSkuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-[#11243d] flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <span>📋</span>
                            <span>Copy SKU ({sku.sku})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onCopyText && onCopyText(sku.barcode, 'Barcode');
                              setOpenMenuSkuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-[#11243d] flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <span>🔢</span>
                            <span>Copy Barcode</span>
                          </button>
                          <a
                            href={`tel:${sku.vendor.phone.replace(/[^0-9+]/g, '')}`}
                            onClick={() => setOpenMenuSkuId(null)}
                            className="w-full px-2.5 py-1.5 text-left text-indigo-300 hover:bg-[#11243d] flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <span>📞</span>
                            <span>Call Vendor Rep</span>
                          </a>
                          <div className="h-px bg-[#16273f] my-1"></div>
                          <button
                            type="button"
                            onClick={() => {
                              onAssignRunner && onAssignRunner(sku.id);
                              setOpenMenuSkuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-emerald-400 hover:bg-[#11243d] flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <span>🧾</span>
                            <span>Open in Pick List</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
