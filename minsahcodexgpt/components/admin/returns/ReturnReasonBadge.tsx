'use client';

import React from 'react';
import { AlertTriangle, PackageX, Sparkles, HelpCircle } from 'lucide-react';

export interface ReturnReasonBadgeProps {
  reason: string;
  size?: 'sm' | 'md';
  className?: string;
}

const REASON_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  defective: { label: 'Defective Product', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertTriangle },
  damaged: { label: 'Damaged in Courier', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: PackageX },
  wrong_item: { label: 'Wrong Item Sent', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: AlertTriangle },
  customer_rejected: { label: 'Customer Rejected COD', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: PackageX },
  mind_change: { label: 'Customer Changed Mind', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Sparkles },
};

export const ReturnReasonBadge: React.FC<ReturnReasonBadgeProps> = ({
  reason,
  size = 'md',
  className = '',
}) => {
  const norm = (reason || '').toLowerCase().trim().replace(/\s+/g, '_');
  const conf = REASON_MAP[norm] || {
    label: reason || 'Return Request',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: HelpCircle,
  };

  const Icon = conf.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${conf.color} ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{conf.label}</span>
    </span>
  );
};

export default ReturnReasonBadge;
