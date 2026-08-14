'use client';

/**
 * components/admin/SteadfastStatusBadge.tsx
 *
 * Compact status badge for the orders table row.
 * Shows Steadfast delivery status with color coding.
 */

import { Truck, Package, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { normalizeSteadfastDeliveryStatus } from '@/lib/steadfast/client';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

interface SteadfastStatusBadgeProps {
  status?: string | null;
  trackingCode?: string | null;
  className?: string;
}

const STATUS_MAP: Record<
  string,
  { label: string; tone: BadgeTone; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    icon: <Clock className="w-3 h-3" aria-hidden="true" />,
  },
  hold: {
    label: 'On Hold',
    tone: 'warning',
    icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />,
  },
  in_review: {
    label: 'In Review',
    tone: 'info',
    icon: <Package className="w-3 h-3" aria-hidden="true" />,
  },
  partial_delivered: {
    label: 'Partial',
    tone: 'info',
    icon: <Truck className="w-3 h-3" aria-hidden="true" />,
  },
  delivered: {
    label: 'Delivered',
    tone: 'success',
    icon: <CheckCircle className="w-3 h-3" aria-hidden="true" />,
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'danger',
    icon: <XCircle className="w-3 h-3" aria-hidden="true" />,
  },
  unknown: {
    label: 'Unknown',
    tone: 'neutral',
    icon: <Package className="w-3 h-3" aria-hidden="true" />,
  },
};

export default function SteadfastStatusBadge({
  status,
  trackingCode,
  className = '',
}: SteadfastStatusBadgeProps) {
  if (!status && !trackingCode) return null;

  if (!status && trackingCode) {
    // Has tracking code but no status yet — show as dispatched
    return (
      <Badge tone="info" leadingVisual={<Truck className="w-3 h-3" aria-hidden="true" />} title={trackingCode} className={className}>
        Dispatched
      </Badge>
    );
  }

  const key = status ? normalizeSteadfastDeliveryStatus(status) : '';
  const cfg = key ? STATUS_MAP[key] : null;

  if (!cfg) {
    return (
      <Badge tone="neutral" leadingVisual={<Package className="w-3 h-3" aria-hidden="true" />} className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge tone={cfg.tone} leadingVisual={cfg.icon} title={trackingCode ?? undefined} className={className}>
      {cfg.label}
    </Badge>
  );
}
