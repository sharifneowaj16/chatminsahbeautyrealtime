'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ApiProduct } from '../types';

export interface ProductStatusBadgeProps {
  status: ApiProduct['status'];
  hasPendingShortlist?: boolean;
}

export function ProductStatusBadge({
  status,
  hasPendingShortlist = false,
}: ProductStatusBadgeProps) {
  const getStatusColor = (s: ApiProduct['status']) => {
    switch (s) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'inactive':
        return 'bg-white/[0.04] text-white/50 border border-[#232636]';
      case 'out_of_stock':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-white/[0.04] text-white/50 border border-[#232636]';
    }
  };

  const getDotColor = (s: ApiProduct['status']) => {
    switch (s) {
      case 'active':
        return 'bg-emerald-400';
      case 'inactive':
        return 'bg-white/40';
      case 'out_of_stock':
        return 'bg-rose-400';
      default:
        return 'bg-white/40';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span
        className={clsx(
          'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium w-fit gap-1.5 transition-all',
          getStatusColor(status)
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', getDotColor(status))} />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </span>

      {hasPendingShortlist && (
        <span
          className="inline-flex items-center h-4.5 px-1.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 w-fit"
          title="This product is unlisted but has pending orders in shortlist"
        >
          ⚠️ Unlisted Pending
        </span>
      )}
    </div>
  );
}
