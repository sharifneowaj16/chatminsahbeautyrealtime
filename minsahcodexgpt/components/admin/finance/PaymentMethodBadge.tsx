'use client';

import React, { useState } from 'react';
import { CreditCard, Banknote, Smartphone, Check, Copy } from 'lucide-react';

export type PaymentMethodType =
  | 'cash_on_delivery'
  | 'cod'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'sslcommerz'
  | 'card'
  | string;

export interface PaymentMethodBadgeProps {
  method: PaymentMethodType;
  trxId?: string | null;
  status?: 'pending' | 'completed' | 'paid' | 'refunded' | 'failed' | string;
  size?: 'sm' | 'md';
  showTrxId?: boolean;
}

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  bkash: {
    label: 'bKash',
    icon: Smartphone,
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  nagad: {
    label: 'Nagad',
    icon: Smartphone,
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  rocket: {
    label: 'Rocket',
    icon: Smartphone,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  cash_on_delivery: {
    label: 'Cash on Delivery',
    icon: Banknote,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  cod: {
    label: 'COD',
    icon: Banknote,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  card: {
    label: 'Debit/Credit Card',
    icon: CreditCard,
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  sslcommerz: {
    label: 'SSLCommerz',
    icon: CreditCard,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
};

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({
  method,
  trxId,
  status,
  size = 'md',
  showTrxId = true,
}) => {
  const [copied, setCopied] = useState(false);

  const normalized = (method || '').toLowerCase().replace(/-/g, '_');
  const config = METHOD_CONFIG[normalized] || {
    label: method || 'Payment',
    icon: CreditCard,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trxId) return;
    navigator.clipboard.writeText(trxId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 border rounded-md font-medium ${config.color} ${
          isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{config.label}</span>
      </span>

      {status && (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${
            status === 'completed' || status === 'paid'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : status === 'pending'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : status === 'refunded'
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {status}
        </span>
      )}

      {showTrxId && trxId && (
        <button
          type="button"
          onClick={handleCopy}
          title="Click to copy Transaction ID"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors"
        >
          <span>{trxId}</span>
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-400 hover:text-white" />
          )}
        </button>
      )}
    </div>
  );
};

export default PaymentMethodBadge;
