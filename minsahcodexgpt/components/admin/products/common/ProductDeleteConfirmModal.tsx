'use client';

import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductDeleteConfirmModalProps {
  isOpen: boolean;
  productName?: string;
  isBulk?: boolean;
  bulkCount?: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProductDeleteConfirmModal({
  isOpen,
  productName,
  isBulk = false,
  bulkCount = 0,
  isDeleting = false,
  onConfirm,
  onCancel,
}: ProductDeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#161824] border border-[#232636] rounded-xl p-5 shadow-2xl shadow-black/60 animate-scaleUp">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F7F8F8]">
              {isBulk ? `Delete ${bulkCount} Products?` : 'Delete Product?'}
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="bg-[#10121b] border border-[#232636] rounded-lg p-3 mb-5">
          <p className="text-xs text-white/70">
            {isBulk ? (
              <span>
                You are about to permanently delete <strong className="text-white">{bulkCount}</strong> selected products and their associated variants from the catalogue.
              </span>
            ) : (
              <span>
                Are you sure you want to permanently delete <strong className="text-white">{productName}</strong>?
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-2.5">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-8 px-4 text-xs text-white/70 hover:text-white bg-[#1b1e2c] border border-[#232636] rounded-lg transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-8 px-4 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm active:scale-[0.97] transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting...' : isBulk ? 'Delete Selected' : 'Delete Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}
