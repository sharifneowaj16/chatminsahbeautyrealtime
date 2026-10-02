'use client';

import React from 'react';
import { Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface AdvancePaymentData {
  amount: number;
  method: 'bkash' | 'nagad' | 'bank' | 'cash';
  trxId?: string;
  isVerified?: boolean;
}

export interface AdvancePaymentInputProps {
  value: AdvancePaymentData;
  onChange: (updated: AdvancePaymentData) => void;
  orderTotal?: number;
  deliveryFee?: number;
  disabled?: boolean;
  className?: string;
}

export const AdvancePaymentInput: React.FC<AdvancePaymentInputProps> = ({
  value,
  onChange,
  orderTotal = 0,
  deliveryFee = 0,
  disabled = false,
  className = '',
}) => {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    const amount = isNaN(raw) ? 0 : Math.max(0, raw);
    onChange({ ...value, amount });
  };

  const handleTrxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, trxId: e.target.value.toUpperCase().trim() });
  };

  const handleMethodChange = (method: AdvancePaymentData['method']) => {
    onChange({ ...value, method });
  };

  const setPreset = (presetAmount: number) => {
    onChange({ ...value, amount: presetAmount });
  };

  return (
    <div className={`space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-pink-400" />
          Advance Payment / Booking Deposit
        </label>
        {value.amount > 0 && (
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            ৳{value.amount} Deducted from COD
          </span>
        )}
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500">Quick Fill:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPreset(0)}
          className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
            value.amount === 0
              ? 'bg-slate-800 text-white border-slate-600'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          None (৳0)
        </button>
        {deliveryFee > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPreset(deliveryFee)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
              value.amount === deliveryFee
                ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 font-medium'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-pink-300'
            }`}
          >
            Delivery Charge (৳{deliveryFee})
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPreset(100)}
          className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
            value.amount === 100
              ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 font-medium'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          ৳100 Deposit
        </button>
        {orderTotal > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPreset(orderTotal)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
              value.amount === orderTotal
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-emerald-300'
            }`}
          >
            Full Paid (৳{orderTotal})
          </button>
        )}
      </div>

      {/* Method Selection + Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Advance Amount (৳)</label>
          <Input
            type="number"
            min={0}
            disabled={disabled}
            value={value.amount || ''}
            onChange={handleAmountChange}
            placeholder="0"
            className="h-9 text-sm font-semibold tabular-nums"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Payment Method</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['bkash', 'nagad', 'bank'] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => handleMethodChange(m)}
                className={`h-9 rounded-md text-xs font-medium border uppercase tracking-wider transition-colors ${
                  value.method === m
                    ? m === 'bkash'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                      : m === 'nagad'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TrxID Field */}
      {value.amount > 0 && (
        <div className="pt-1">
          <label className="text-[11px] text-slate-400 block mb-1">
            Transaction ID (TRX ID)
          </label>
          <div className="relative">
            <Input
              type="text"
              disabled={disabled}
              value={value.trxId || ''}
              onChange={handleTrxChange}
              placeholder="e.g. 9BKS1287XA"
              className="h-9 text-xs font-mono uppercase tracking-wider"
            />
            {value.trxId && value.trxId.length >= 6 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5" />
            ) : value.amount > 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-400 absolute right-3 top-2.5" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePaymentInput;
