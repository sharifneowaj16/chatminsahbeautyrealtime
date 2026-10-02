'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { ApiProduct } from '../types';
import { ProductThumbnailCell } from './ProductThumbnailCell';
import { ProductTitleCell } from './ProductTitleCell';
import { ProductPriceCell } from './ProductPriceCell';
import { ProductStockCell } from './ProductStockCell';
import { ProductStatusBadge } from './ProductStatusBadge';
import { ProductRatingBadge } from './ProductRatingBadge';
import { ProductRowActions } from './ProductRowActions';
import { formatPrice } from '@/utils/currency';

export interface ProductTableRowProps {
  product: ApiProduct;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string, name: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProductTableRow({
  product,
  isSelected,
  onToggleSelect,
  onDelete,
  canEdit = true,
  canDelete = true,
}: ProductTableRowProps) {
  const productKey = product.slug || product.id;

  const getDeliveryOfferLabel = () => {
    if (!product.deliveryOfferEnabled || product.deliveryOfferType === 'DEFAULT') return undefined;
    if (product.deliveryOfferType === 'FREE') return product.deliveryOfferBadgeText || 'Free Delivery';
    if (product.deliveryOfferType === 'FIXED') {
      return product.deliveryOfferBadgeText || `Fixed Delivery ${formatPrice(product.deliveryOfferAmount || 0)}`;
    }
    return undefined;
  };

  return (
    <tr className="hover:bg-white/[0.025] transition-colors duration-100 group">
      <td className="px-3.5 py-2.5">
        <Input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(product.id, e.target.checked)}
          className="rounded border-white/[0.15] bg-[#10121b] text-white focus:ring-white/20 w-3.5 h-3.5 cursor-pointer"
        />
      </td>

      <td className="px-3 py-2.5">
        <div className="flex items-center space-x-2.5">
          <ProductThumbnailCell src={product.image} alt={product.name} />
          <ProductTitleCell
            name={product.name}
            sku={product.sku}
            slugOrId={productKey}
            isFeatured={product.featured || product.isFeatured}
            isNew={product.isNew}
            deliveryOfferLabel={getDeliveryOfferLabel()}
            href={`/admin/products/${productKey}`}
          />
        </div>
      </td>

      <td className="px-3 py-2.5 text-xs text-white/80 whitespace-nowrap">
        {product.category || 'Uncategorized'}
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <ProductPriceCell
          price={product.price}
          originalPrice={product.originalPrice}
          costPrice={product.costPrice}
          productSlugOrId={productKey}
        />
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <ProductStockCell
          stock={product.stock}
          variantCount={product.variants?.length || 0}
        />
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <ProductStatusBadge
          status={product.status}
          hasPendingShortlist={product.hasPendingShortlist}
        />
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <ProductRatingBadge
          rating={product.rating || product.averageRating || 0}
          reviews={product.reviews || product.reviewCount || 0}
        />
      </td>

      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <ProductRowActions
          productSlugOrId={productKey}
          productId={product.id}
          productName={product.name}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}
