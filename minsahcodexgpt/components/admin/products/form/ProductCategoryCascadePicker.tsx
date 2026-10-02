'use client';

import React, { useMemo } from 'react';
import { Select } from '@/components/ui/Select';
import { useCategories } from '@/contexts/CategoriesContext';

export interface ProductCategoryCascadePickerProps {
  category: string;
  subcategory: string;
  item: string;
  onChange: (values: { category: string; subcategory: string; item: string }) => void;
  error?: string;
}

export function ProductCategoryCascadePicker({
  category,
  subcategory,
  item,
  onChange,
  error,
}: ProductCategoryCascadePickerProps) {
  const { categories } = useCategories();

  const currentCategoryObj = useMemo(() => {
    return categories.find((c) => c.name.toLowerCase() === category.toLowerCase());
  }, [categories, category]);

  const subcategories = useMemo(() => {
    return currentCategoryObj?.subcategories || [];
  }, [currentCategoryObj]);

  const currentSubcategoryObj = useMemo(() => {
    return subcategories.find((s) => s.name.toLowerCase() === subcategory.toLowerCase());
  }, [subcategories, subcategory]);

  const items = useMemo(() => {
    return currentSubcategoryObj?.items || [];
  }, [currentSubcategoryObj]);

  const handleCategoryChange = (newCat: string) => {
    onChange({ category: newCat, subcategory: '', item: '' });
  };

  const handleSubcategoryChange = (newSub: string) => {
    onChange({ category, subcategory: newSub, item: '' });
  };

  const handleItemChange = (newItem: string) => {
    onChange({ category, subcategory, item: newItem });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Category <span className="text-rose-400">*</span>
          </label>
          <Select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#F7F8F8] text-xs rounded-lg focus:ring-1 focus:ring-white/20"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id || cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </Select>
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Subcategory</label>
          <Select
            value={subcategory}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!category || subcategories.length === 0}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#F7F8F8] text-xs rounded-lg focus:ring-1 focus:ring-white/20 disabled:opacity-40"
          >
            <option value="">Select Subcategory</option>
            {subcategories.map((sub) => (
              <option key={sub.name} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Product Type / Item</label>
        <Select
          value={item}
          onChange={(e) => handleItemChange(e.target.value)}
          disabled={!subcategory || items.length === 0}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#F7F8F8] text-xs rounded-lg focus:ring-1 focus:ring-white/20 disabled:opacity-40"
        >
          <option value="">Select Item</option>
          {items.map((it) => (
            <option key={it} value={it}>
              {it}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
