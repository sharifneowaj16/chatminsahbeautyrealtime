'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2 } from 'lucide-react';

export interface ProductRowActionsProps {
  productSlugOrId: string;
  productId: string;
  productName: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onDelete: (id: string, name: string) => void;
}

export function ProductRowActions({
  productSlugOrId,
  productId,
  productName,
  canEdit = true,
  canDelete = true,
  onDelete,
}: ProductRowActionsProps) {
  return (
    <div className="inline-flex items-center space-x-1">
      <Link
        href={`/admin/products/${productSlugOrId}`}
        className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white rounded-md hover:bg-white/[0.08] active:scale-[0.96] transition-all"
        title="View Product"
      >
        <Eye className="w-3.5 h-3.5" />
      </Link>

      {canEdit && (
        <Link
          href={`/admin/products/${productSlugOrId}/edit`}
          className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white rounded-md hover:bg-white/[0.08] active:scale-[0.96] transition-all"
          title="Edit Product"
        >
          <Edit className="w-3.5 h-3.5" />
        </Link>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(productId, productName)}
          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-rose-400 rounded-md hover:bg-rose-500/10 active:scale-[0.96] transition-all"
          title="Delete Product"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
