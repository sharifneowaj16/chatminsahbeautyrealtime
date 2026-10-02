'use client';

import React from 'react';
import { Settings, RefreshCw, Banknote, Clock, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductPolicyTogglesCardProps {
  returnEligible: boolean;
  codAvailable: boolean;
  preOrderOption: boolean;
  relatedProducts: string;
  onToggleReturn: (checked: boolean) => void;
  onToggleCod: (checked: boolean) => void;
  onTogglePreOrder: (checked: boolean) => void;
  onChangeRelatedProducts: (value: string) => void;
}

export function ProductPolicyTogglesCard({
  returnEligible,
  codAvailable,
  preOrderOption,
  relatedProducts,
  onToggleReturn,
  onToggleCod,
  onTogglePreOrder,
  onChangeRelatedProducts,
}: ProductPolicyTogglesCardProps) {
  const policies = [
    {
      id: 'returnEligible',
      label: '7-Day Return Eligible',
      description: 'Customer can file returns if damaged or authentic issue',
      checked: returnEligible,
      onChange: onToggleReturn,
      icon: RefreshCw,
    },
    {
      id: 'codAvailable',
      label: 'Cash on Delivery (COD)',
      description: 'Allows order placement without advance payment',
      checked: codAvailable,
      onChange: onToggleCod,
      icon: Banknote,
    },
    {
      id: 'preOrderOption',
      label: 'Pre-Order Available',
      description: 'Permits ordering when item is temporarily out of stock',
      checked: preOrderOption,
      onChange: onTogglePreOrder,
      icon: Clock,
    },
  ];

  return (
    <ProductFormCardContainer
      icon={Settings}
      title="Policies & Additional Options"
      subtitle="Configure return eligibility, payment options, and related product associations"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {policies.map((policy) => {
            const Icon = policy.icon;
            return (
              <label
                key={policy.id}
                className="flex items-start p-3 border border-[#232636] rounded-lg bg-[#10121b] hover:bg-[#131522] cursor-pointer transition-all space-x-3"
              >
                <Input
                  type="checkbox"
                  checked={policy.checked}
                  onChange={(e) => policy.onChange(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#161824] text-[#5e6ad2] focus:ring-white/20 cursor-pointer mt-0.5"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Icon className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-xs font-medium text-[#F7F8F8]">{policy.label}</span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">
                    {policy.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-white/50" />
            Related Products (Cross-sell / Upsell)
          </label>
          <Input
            type="text"
            value={relatedProducts}
            onChange={(e) => onChangeRelatedProducts(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
            placeholder="Product IDs or Slugs separated by commas (e.g. prod_123, prod_456)"
          />
        </div>
      </div>
    </ProductFormCardContainer>
  );
}
