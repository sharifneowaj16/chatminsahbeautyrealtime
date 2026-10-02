'use client';

import React from 'react';
import { ApiProduct } from '../types';
import { ProductTableHeader } from './ProductTableHeader';
import { ProductTableRow } from './ProductTableRow';
import { ProductTableLoadingSkeleton } from './ProductTableLoadingSkeleton';
import { ProductTableEmptyState } from './ProductTableEmptyState';

export interface ProductTableProps {
  products: ApiProduct[];
  loading: boolean;
  selectedProducts: string[];
  onSelectAll: (checked: boolean) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onDeleteProduct: (id: string, name: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onResetFilters?: () => void;
}

export function ProductTable({
  products,
  loading,
  selectedProducts,
  onSelectAll,
  onToggleSelect,
  onDeleteProduct,
  canEdit = true,
  canDelete = true,
  onResetFilters,
}: ProductTableProps) {
  const allSelected = selectedProducts.length === products.length && products.length > 0;

  return (
    <div className="linear-card bg-[#161824] rounded-lg border border-[#232636] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <ProductTableHeader
            allSelected={allSelected}
            onSelectAll={onSelectAll}
            hasProducts={products.length > 0}
          />

          {loading ? (
            <ProductTableLoadingSkeleton rowCount={8} />
          ) : products.length > 0 ? (
            <tbody className="bg-[#161824] divide-y divide-[#232636]">
              {products.map((product) => (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.includes(product.id)}
                  onToggleSelect={onToggleSelect}
                  onDelete={onDeleteProduct}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </tbody>
          ) : null}
        </table>
      </div>

      {!loading && products.length === 0 && (
        <ProductTableEmptyState onResetFilters={onResetFilters} />
      )}
    </div>
  );
}
