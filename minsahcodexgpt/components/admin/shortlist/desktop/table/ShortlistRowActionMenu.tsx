'use client';

import React, { useState } from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { Check, UserPlus, MoreVertical, Copy, Star } from 'lucide-react';

interface ShortlistRowActionMenuProps {
  sku: WholesaleSkuRow;
  onAcquireSku: (skuId: string) => void;
  onAssignRunner?: (skuId: string) => void;
  onTogglePriority?: (skuId: string) => void;
  onCopyText?: (text: string, label: string) => void;
}

export const ShortlistRowActionMenu: React.FC<ShortlistRowActionMenuProps> = ({
  sku,
  onAcquireSku,
  onAssignRunner,
  onTogglePriority,
  onCopyText,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
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
          <Check className="w-3 h-3" />
          <span>{sku.isAcquired ? 'Acquired' : 'Acquire'}</span>
        </button>

        <div className="flex items-center gap-1 w-full relative">
          {onAssignRunner && (
            <button
              type="button"
              onClick={() => onAssignRunner(sku.id)}
              className="flex-1 py-0.5 px-1 rounded bg-[#0c1a29] hover:bg-[#13263b] border border-[#182a3d] text-slate-300 text-[9px] font-mono flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              title="Assign Runner"
            >
              <UserPlus className="w-2.5 h-2.5" />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={`p-0.5 px-1.5 rounded border transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-[#0c1a29] hover:bg-[#13263b] border-[#182a3d] text-indigo-400'
              }`}
              title="Options"
            >
              <MoreVertical className="w-3 h-3" />
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-md bg-[#091522] border border-[#1b3149] shadow-xl z-50 py-1 font-mono text-[10px] text-left">
                  {onCopyText && (
                    <button
                      type="button"
                      onClick={() => {
                        onCopyText(sku.sku, 'SKU Code');
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 hover:bg-[#13273e] text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy SKU Code</span>
                    </button>
                  )}

                  {onTogglePriority && (
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePriority(sku.id);
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 hover:bg-[#13273e] text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Star className="w-3 h-3 text-amber-400" />
                      <span>{sku.priority === 'URGENT' ? 'Mark as Normal' : 'Mark as Urgent'}</span>
                    </button>
                  )}

                  {sku.vendor.phone && onCopyText && (
                    <button
                      type="button"
                      onClick={() => {
                        onCopyText(sku.vendor.phone, 'Supplier Phone');
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 hover:bg-[#13273e] text-slate-300 hover:text-white flex items-center gap-2 border-t border-[#13273e] cursor-pointer"
                    >
                      <span className="text-[10px]">📞</span>
                      <span>Copy Vendor Phone</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </td>
  );
};
