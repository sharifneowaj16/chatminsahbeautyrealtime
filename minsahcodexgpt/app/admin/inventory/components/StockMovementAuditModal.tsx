// app/admin/inventory/components/StockMovementAuditModal.tsx
// Real-time Stock Movement & Reconciliation Audit Trail Modal

'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { formatPrice } from '@/utils/currency';

interface StockMovementItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  delta: number;
  type: 'PURCHASE' | 'ORDER_FULFILLMENT' | 'RETURN_RESTOCK' | 'MANUAL_ADJUSTMENT';
  referenceId: string | null;
  costPriceAtTime: number | null;
  notes: string | null;
  createdAt: string;
  createdByAdminId?: string | null;
  createdByAdminName?: string | null;
}

interface StockMovementAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string | null;
}

export default function StockMovementAuditModal({
  isOpen,
  onClose,
  productId,
  productName,
}: StockMovementAuditModalProps) {
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) return;
    const fetchMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/inventory/movements?productId=${productId}&limit=50`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) {
          setMovements(json.data.movements);
        } else {
          setError(json.error || 'Failed to load movements');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchMovements();
  }, [isOpen, productId]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" />
          <span>Stock Movement Audit Ledger — {productName || 'Product'}</span>
        </div>
      }
      size="lg"
    >
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <History className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">No stock movements recorded yet for this product.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Movements will be logged automatically on wholesale purchase, order delivery, or manual adjustment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#232636]">
            <table className="w-full text-left text-xs text-[#D0D6E0]">
              <thead className="bg-[#10121b] border-b border-[#232636] text-[11px] font-mono text-[#8A8F98] uppercase">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Delta</th>
                  <th className="px-3 py-2">Cost Rate</th>
                  <th className="px-3 py-2">Admin / Actor</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2230] bg-[#0c0e17]">
                {movements.map((m) => {
                  const isPositive = m.delta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold font-mono',
                            m.type === 'PURCHASE'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : m.type === 'ORDER_FULFILLMENT'
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : m.type === 'RETURN_RESTOCK'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                          )}
                        >
                          {m.type === 'PURCHASE' && '🛒 PROCUREMENT'}
                          {m.type === 'ORDER_FULFILLMENT' && '📦 DELIVERED'}
                          {m.type === 'RETURN_RESTOCK' && '🔄 RESTOCKED'}
                          {m.type === 'MANUAL_ADJUSTMENT' && '✏️ ADJUSTMENT'}
                        </span>
                      </td>
                      <td
                        className={clsx(
                          'px-3 py-2 text-right font-mono font-bold text-xs',
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3 inline" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 inline" />
                          )}
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                        {m.costPriceAtTime ? formatPrice(m.costPriceAtTime) : '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-[11px] text-slate-300">
                        {m.createdByAdminName || 'System'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-indigo-400">
                        {m.referenceId || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-400 max-w-xs truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white px-4"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
