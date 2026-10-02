'use client';

import React, { useState } from 'react';
import { Truck, CheckCircle2, AlertTriangle, Loader2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CourierProviderSelector, CourierProvider } from './CourierProviderSelector';

export interface BulkDispatchResult {
  dispatched: number;
  failed: number;
  skipped: number;
}

export interface CourierBulkDispatchModalProps {
  isOpen: boolean;
  selectedIds: Set<string>;
  onClose: () => void;
  onComplete?: (results: BulkDispatchResult) => void;
}

export const CourierBulkDispatchModal: React.FC<CourierBulkDispatchModalProps> = ({
  isOpen,
  selectedIds,
  onClose,
  onComplete,
}) => {
  const [provider, setProvider] = useState<CourierProvider>('steadfast');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkDispatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalOrders = selectedIds.size;

  const handleExecuteBulk = async () => {
    if (totalOrders === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      if (provider === 'steadfast') {
        const res = await fetch('/api/admin/shipping/steadfast/send-bulk', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: Array.from(selectedIds) }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk dispatch failed');

        const summary: BulkDispatchResult = {
          dispatched: data.dispatched || 0,
          failed: data.failed || 0,
          skipped: data.skipped || 0,
        };
        setProgress(100);
        setResult(summary);
        onComplete?.(summary);
      } else {
        // Pathao iterative bulk dispatch
        const orderIds = Array.from(selectedIds);
        let dispatched = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < orderIds.length; i++) {
          try {
            const res = await fetch('/api/admin/shipping/pathao/send', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: orderIds[i] }),
            });
            const data = await res.json();
            if (res.ok) {
              if (data.alreadyDispatched) skipped++;
              else dispatched++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
          setProgress(Math.round(((i + 1) / orderIds.length) * 100));
        }

        const summary: BulkDispatchResult = { dispatched, failed, skipped };
        setResult(summary);
        onComplete?.(summary);
      }
    } catch (err: any) {
      setError(err.message || 'Bulk dispatch error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bulk Courier Dispatch</h3>
              <p className="text-[11px] text-slate-400">
                Dispatch {totalOrders} selected order{totalOrders > 1 ? 's' : ''} in one batch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Courier Provider Choice */}
        <CourierProviderSelector
          selected={provider}
          onSelect={setProvider}
          disabled={loading}
        />

        {/* Progress Bar */}
        {loading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dispatching parcels...</span>
              <span className="font-mono text-emerald-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Execution Result Summary */}
        {result && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h5 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Batch Dispatch Complete
            </h5>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {result.dispatched} Dispatched
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {result.skipped} Skipped
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                {result.failed} Failed
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800 text-slate-300"
          >
            {result ? 'Done' : 'Cancel'}
          </Button>

          {!result && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExecuteBulk}
              disabled={loading || totalOrders === 0}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
              <span>Dispatch All ({totalOrders})</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierBulkDispatchModal;
