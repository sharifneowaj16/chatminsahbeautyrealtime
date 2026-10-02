'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ManifestCancellationAlertBannerProps {
  cancelledOrders: string[];
  cancelledSkus: string[];
  syncingManifest: boolean;
  onRefreshSync?: () => void;
}

export const ManifestCancellationAlertBanner: React.FC<ManifestCancellationAlertBannerProps> = ({
  cancelledOrders,
  cancelledSkus,
  syncingManifest,
  onRefreshSync,
}) => {
  if (cancelledOrders.length === 0 && cancelledSkus.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 font-mono text-xs flex items-start gap-2.5 animate-pulse shadow-md">
      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold flex items-center justify-between">
          <span>⚠️ Live Order Cancellation Detected!</span>
          {onRefreshSync && (
            <button
              type="button"
              onClick={onRefreshSync}
              disabled={syncingManifest}
              className="text-[10px] text-rose-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncingManifest ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-rose-300/90 mt-0.5">
          {cancelledOrders.length} order(s) cancelled in backend: {cancelledOrders.slice(0, 3).join(', ')}
          {cancelledOrders.length > 3 ? '...' : ''}. Do not purchase allocated units!
        </p>
      </div>
    </div>
  );
};
