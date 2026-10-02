'use client';

import React from 'react';
import { Truck, CheckCircle2, Clock, AlertTriangle, XCircle, RotateCcw, Package } from 'lucide-react';

export interface CourierStatusBadgeProps {
  courier?: 'steadfast' | 'pathao' | 'custom' | string | null;
  status?: string | null;
  trackingCode?: string | null;
  size?: 'sm' | 'md';
  showCourierName?: boolean;
  className?: string;
}

interface StatusStyle {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COURIER_STATUS_MAP: Record<string, StatusStyle> = {
  // Delivered states
  delivered: {
    label: 'Delivered',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
  successful: {
    label: 'Delivered',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },

  // In Transit / Active Delivery
  in_transit: {
    label: 'In Transit',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Truck,
  },
  dispatched: {
    label: 'Dispatched',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: Truck,
  },
  on_the_way: {
    label: 'On The Way',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Truck,
  },
  partial_delivered: {
    label: 'Partial Delivered',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: Truck,
  },
  picked: {
    label: 'Picked Up',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    icon: Package,
  },

  // Pending / Pickup States
  pending: {
    label: 'Pending Pickup',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  pickup_requested: {
    label: 'Pickup Requested',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  in_review: {
    label: 'In Review',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  hold: {
    label: 'On Hold',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: AlertTriangle,
  },

  // Return / Cancelled States
  returned: {
    label: 'Returned',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: RotateCcw,
  },
  return_in_transit: {
    label: 'Return Transit',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: RotateCcw,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: XCircle,
  },
  failed: {
    label: 'Delivery Failed',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: XCircle,
  },
};

export const CourierStatusBadge: React.FC<CourierStatusBadgeProps> = ({
  courier,
  status,
  trackingCode,
  size = 'md',
  showCourierName = false,
  className = '',
}) => {
  if (!status && !trackingCode) {
    return (
      <span className="text-[11px] text-slate-500 italic">Not Shipped</span>
    );
  }

  const normalizedStatus = (status || (trackingCode ? 'dispatched' : 'pending'))
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');

  const config = COURIER_STATUS_MAP[normalizedStatus] || {
    label: status ? status.replace(/_/g, ' ') : 'Dispatched',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: Truck,
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  const courierLabel =
    courier === 'pathao'
      ? 'Pathao'
      : courier === 'steadfast'
      ? 'Steadfast'
      : courier || null;

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {showCourierName && courierLabel && (
        <span className="text-[10px] uppercase font-bold text-slate-400">
          {courierLabel}:
        </span>
      )}
      <span
        title={trackingCode ? `Tracking: ${trackingCode}` : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border uppercase tracking-wider ${
          config.color
        } ${isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      >
        <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{config.label}</span>
      </span>
    </div>
  );
};

export default CourierStatusBadge;
