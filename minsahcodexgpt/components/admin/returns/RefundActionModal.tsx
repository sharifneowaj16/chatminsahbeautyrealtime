'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';

export interface RefundData {
  amount: number;
  method: 'bkash' | 'nagad' | 'store_credit' | 'cash';
  trxId?: string;
  note?: string;
}

export interface RefundActionModalProps {
  isOpen: boolean;
  orderId: string;
  customerName: string;
  maxRefundAmount: number;
  onClose: () => void;
  onProcessRefund: (refund: RefundData) => Promise<void>;
}

export const RefundActionModal: React.FC<RefundActionModalProps> = ({
  isOpen,
  orderId,
  customerName,
  maxRefundAmount,
  onClose,
  onProcessRefund,
}) => {
  const [amount, setAmount] = useState<number>(maxRefundAmount);
  const [method, setMethod] = useState<RefundData['method']>('bkash');
  const [trxId, setTrxId] = useState('');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > maxRefundAmount) {
      setError(`Refund amount must be between ৳1 and ৳${maxRefundAmount}`);
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await onProcessRefund({
        amount,
        method,
        trxId: trxId.trim() || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Refund failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Execute Customer Refund</h3>
              <p className="text-[11px] text-slate-400">Order #{orderId} • {customerName}</p>
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
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Refund Amount (৳)
              </label>
              <button
                type="button"
                onClick={() => setAmount(maxRefundAmount)}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium"
              >
                Max Full: ৳{maxRefundAmount}
              </button>
            </div>
            <Input
              type="number"
              min={1}
              max={maxRefundAmount}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value) || 0);
                setError(null);
              }}
              className="h-9 text-sm font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Disbursement Channel
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['bkash', 'nagad', 'store_credit', 'cash'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`h-8 rounded-md text-[11px] font-medium border uppercase tracking-wider transition-colors ${
                    method === m
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Transaction ID / Reference
            </label>
            <Input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. 9BKS1287XA"
              className="h-9 text-xs font-mono uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Accounting Note
            </label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Damaged shade bottle refunded via bKash"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={processing}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Disburse ৳{amount}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundActionModal;
