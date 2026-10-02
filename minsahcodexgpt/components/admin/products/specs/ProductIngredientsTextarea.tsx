'use client';

import React from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { ShieldCheck } from 'lucide-react';

export interface ProductIngredientsTextareaProps {
  ingredients: string;
  verificationStatus?: string;
  onChangeIngredients: (val: string) => void;
  onChangeStatus?: (val: string) => void;
  error?: string;
}

export function ProductIngredientsTextarea({
  ingredients,
  verificationStatus = 'Verified',
  onChangeIngredients,
  onChangeStatus,
  error,
}: ProductIngredientsTextareaProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="block text-xs font-medium text-[#d0d6e0]">
          Formula Ingredients (Full INCI List)
        </label>

        {onChangeStatus && (
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-white/50">Verification Status:</span>
            <Select
              value={verificationStatus}
              onChange={(e) => onChangeStatus(e.target.value)}
              className="h-7 px-2 bg-[#10121b] border border-[#232636] text-white text-[11px] rounded"
            >
              <option value="Verified">Verified Safe</option>
              <option value="Pending">Pending Review</option>
              <option value="Not Applicable">Not Applicable</option>
            </Select>
          </div>
        )}
      </div>

      <Textarea
        name="ingredients"
        value={ingredients}
        onChange={(e) => onChangeIngredients(e.target.value)}
        rows={4}
        className="w-full px-3.5 py-2.5 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono leading-relaxed"
        placeholder="Aqua/Water/Eau, Glycerin, Niacinamide, Butylene Glycol, Centella Asiatica Extract..."
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
