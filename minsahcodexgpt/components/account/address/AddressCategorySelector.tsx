"use client";

import React from "react";
import { AddressCategory } from "./types";

interface AddressCategorySelectorProps {
  selectedCategory: AddressCategory;
  onSelectCategory: (category: AddressCategory) => void;
}

export function AddressCategorySelector({
  selectedCategory,
  onSelectCategory,
}: AddressCategorySelectorProps) {
  const categories: { tag: AddressCategory; label: string; icon: string }[] = [
    { tag: "Home", label: "Home", icon: "home" },
    { tag: "Office", label: "Office", icon: "apartment" },
    { tag: "Other", label: "Other", icon: "favorite" },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#062402]">Address Category</label>
        <span className="text-[10px] text-[#43483f]">Choose label for quick checkout</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.tag;
          return (
            <button
              key={cat.tag}
              type="button"
              onClick={() => onSelectCategory(cat.tag)}
              className={`py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                isActive
                  ? "bg-[#062402] text-white"
                  : "bg-[#efeeeb] text-[#1a1c1a] hover:bg-[#e9e8e5]"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isActive ? "text-[#ccee9b]" : "text-[#43483f]"
                }`}
              >
                {cat.icon}
              </span>
              <span className="text-xs font-bold">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
