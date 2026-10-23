'use client';

import React from 'react';
import { Bookmark, Home, Building2, Check } from 'lucide-react';
import { SavedAddressItem } from './types';

interface SavedAddressOptionListProps {
  addresses: SavedAddressItem[];
  selectedAddressId: string;
  onSelect: (addr: SavedAddressItem) => void;
  onAddNew?: () => void;
}

export default function SavedAddressOptionList({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
}: SavedAddressOptionListProps) {
  return (
    <div className="flex flex-col gap-2 pt-0.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wider font-bold text-[#5A615D] flex items-center gap-1">
          <Bookmark className="w-3.5 h-3.5 text-[#4b6723]" />
          Saved Addresses
        </span>
        <button
          type="button"
          onClick={onAddNew}
          className="text-[10px] text-[#4b6723] font-bold hover:underline cursor-pointer"
        >
          + Add New
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {addresses.map((item) => {
          const isSelected = item.id === selectedAddressId;
          const isHome = item.label.toLowerCase().includes('home');
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`p-3.5 rounded-[20px] flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                isSelected
                  ? 'bg-[#EAF7D8]/50 border-2 border-[#4b6723]'
                  : 'bg-white border border-[#E2DED8]/60 hover:border-[#4b6723]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#EAF7D8] text-[#4b6723]'
                      : 'bg-[#efeeeb] text-[#5A615D]'
                  }`}
                >
                  {isHome ? <Home className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#062402]">
                      {item.label} ({item.area})
                    </span>
                    {item.isDefault && (
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#062402] text-white">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5A615D] truncate mt-0.5">
                    {item.address}
                  </p>
                </div>
              </div>

              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-[#062402] text-[#D4F6A2] flex items-center justify-center shrink-0 ml-2 shadow-sm">
                  <Check className="w-4 h-4 font-bold" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[#c3c8bc] shrink-0 ml-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
