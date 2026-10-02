'use client';

import React from 'react';
import { Percent } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductDiscountOffersCardProps {
  discountPercentage: string;
  salePrice: string;
  offerStartDate: string;
  offerEndDate: string;
  onChangeDiscount: (value: string) => void;
  onChangeSalePrice: (value: string) => void;
  onChangeStartDate: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  children?: React.ReactNode;
}

export function ProductDiscountOffersCard({
  discountPercentage,
  salePrice,
  offerStartDate,
  offerEndDate,
  onChangeDiscount,
  onChangeSalePrice,
  onChangeStartDate,
  onChangeEndDate,
  children,
}: ProductDiscountOffersCardProps) {
  return (
    <ProductFormCardContainer
      icon={Percent}
      title="Discount & Offers"
      subtitle="Set temporary promotional discounts, sale prices, and flash sale windows"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Discount Percentage (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountPercentage}
              onChange={(e) => onChangeDiscount(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Promotional Sale Price (BDT ৳)
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={salePrice}
              onChange={(e) => onChangeSalePrice(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
              placeholder="Calculated or manual price"
            />
          </div>

          <div className="flex items-center pt-5">{children}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Offer Start Date & Time
            </label>
            <Input
              type="datetime-local"
              value={offerStartDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-white/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Offer End Date & Time
            </label>
            <Input
              type="datetime-local"
              value={offerEndDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
      </div>
    </ProductFormCardContainer>
  );
}
