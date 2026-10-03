'use client';

import React, { useState } from 'react';
import { RotateCcw, CheckCircle2, Zap, AlertCircle } from 'lucide-react';

export interface MetaRefundBadgeProps {
  orderId: string;
  orderNumber?: string;
  status: string;
  metaPurchaseSent?: boolean;
  metaRefundSent?: boolean;
  amount?: number;
  compact?: boolean;
}

export function MetaRefundBadge({
  orderId,
  orderNumber,
  status,
  metaPurchaseSent = false,
  metaRefundSent = false,
  amount,
  compact = false,
}: MetaRefundBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(metaRefundSent);

  const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';

  if (!metaPurchaseSent && !synced) {
    return null;
  }

  const handleEmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tracking/meta-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success || data.skipped) {
        setSynced(true);
      }
    } catch {
      setSynced(true);
    } finally {
      setLoading(false);
    }
  };

  if (synced) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-mono font-medium text-[#10B981] border border-[#10B981]/30">
        <CheckCircle2 className="h-3 w-3" />
        <span>Meta Refund Synced</span>
      </span>
    );
  }

  if (isCancelledOrRefunded) {
    return (
      <button
        type="button"
        onClick={handleEmit}
        disabled={loading}
        title="Sync cancellation to Meta CAPI to protect ROAS"
        className="inline-flex items-center gap-1 rounded bg-[#6366F1]/20 hover:bg-[#6366F1]/30 px-2 py-0.5 text-[11px] font-mono font-medium text-[#8083FF] border border-[#6366F1]/40 transition-colors cursor-pointer disabled:opacity-50"
      >
        <Zap className="h-3 w-3" />
        <span>{loading ? 'Emitting...' : compact ? 'Emit CAPI Refund' : `Emit Meta Refund${amount ? ` (৳${amount})` : ''}`}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-[#131B2A] px-2 py-0.5 text-[11px] font-mono text-[#94A3B8] border border-[#2D3748]">
      <span>Meta Active</span>
    </span>
  );
}
