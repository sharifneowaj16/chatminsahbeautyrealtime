'use client';

import React from 'react';
import Link from 'next/link';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductStickyActionsBarProps {
  isSubmitting: boolean;
  cancelHref?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  extraActions?: React.ReactNode;
}

export function ProductStickyActionsBar({
  isSubmitting,
  cancelHref = '/admin/products',
  onCancel,
  onSubmit,
  submitLabel = 'Save Product',
  submittingLabel = 'Saving...',
  extraActions,
}: ProductStickyActionsBarProps) {
  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between bg-[#161824]/95 backdrop-blur-md rounded-xl border border-[#232636] p-4 shadow-xl shadow-black/40">
      <div className="flex items-center space-x-2">
        {onCancel ? (
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2 border border-[#232636] bg-[#10121b] text-white/70 hover:text-white rounded-lg text-xs font-medium transition-all"
          >
            Cancel
          </Button>
        ) : (
          <Link
            href={cancelHref}
            className="inline-flex items-center px-5 py-2 border border-[#232636] bg-[#10121b] text-white/70 hover:text-white rounded-lg text-xs font-medium hover:bg-[#1b1e2c] transition-all"
          >
            Cancel
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {extraActions}

        <Button
          type={onSubmit ? 'button' : 'submit'}
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-2.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
