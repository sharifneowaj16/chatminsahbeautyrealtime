'use client';

/**
 * components/admin/SteadfastShipPanel.tsx
 *
 * Slide-in panel to dispatch an order to Steadfast courier.
 * Used inside /admin/orders page.
 *
 * Features:
 * - Pre-filled recipient & COD info
 * - Editable note
 * - Live status badge
 * - Re-sync button
 * - Wallet balance display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Truck,
  Package,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wallet,
  Copy,
  ExternalLink,
  Send,
  MapPin,
  Phone,
  User,
  DollarSign,
  Webhook,
} from 'lucide-react';
import { normalizeSteadfastDeliveryStatus } from '@/lib/steadfast/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

// ─── Types ─────────────────────────────────────────────────────────────────

interface OrderForShipping {
  id: string;
  dbId: string;
  customer: { name: string; email: string; phone: string };
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  shipping?: {
    address: string;
    city: string;
    phone: string;
    name: string;
  };
  steadfastConsignmentId?: string;
  steadfastTrackingCode?: string;
  steadfastStatus?: string;
  steadfastSentAt?: string;
}

interface SteadfastShipPanelProps {
  order: OrderForShipping | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatched?: (orderNumber: string, trackingCode: string) => void;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending Pickup',
    color: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  hold: {
    label: 'On Hold',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  in_review: {
    label: 'In Review',
    color: 'bg-[#5e6ad2]/20 text-[#f7f8f8] border-[#5e6ad2]/20',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  partial_delivered: {
    label: 'Partially Delivered',
    color: 'bg-admin-panel text-white border-admin-border',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: 'Delivered ✓',
    color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-rose-300 border-rose-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  unknown: {
    label: 'Unknown',
    color: 'bg-[#10121b] text-[#8a8f98] border-[#232636]',
    icon: <Package className="w-3.5 h-3.5" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const key = normalizeSteadfastDeliveryStatus(status);
  const cfg = STATUS_CONFIG[key] ?? {
    label: status,
    color: 'bg-[#10121b] text-[#8a8f98] border-[#232636]',
    icon: <Package className="w-3.5 h-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function SteadfastShipPanel({
  order,
  isOpen,
  onClose,
  onDispatched,
}: SteadfastShipPanelProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [consignmentId, setConsignmentId] = useState<string | null>(null);

  const webhookBase = useMemo(() => {
    const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, []);

  // Init state when order changes
  useEffect(() => {
    if (order) {
      const isCOD =
        order.paymentMethod?.toLowerCase().includes('cod') ||
        order.paymentMethod?.toLowerCase().includes('cash') ||
        order.paymentStatus !== 'completed';
      setCodAmount(isCOD ? order.total : 0);
      setNote('');
      setError(null);
      setSuccess(null);
      setCurrentStatus(order.steadfastStatus ?? null);
      setTrackingCode(order.steadfastTrackingCode ?? null);
      setConsignmentId(order.steadfastConsignmentId ?? null);
    }
  }, [order]);

  // Fetch balance when panel opens
  useEffect(() => {
    if (isOpen) {
      setBalanceLoading(true);
      fetch('/api/admin/shipping/steadfast/balance', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setBalance(d.balance ?? null))
        .catch(() => setBalance(null))
        .finally(() => setBalanceLoading(false));
    }
  }, [isOpen]);

  const handleDispatch = useCallback(async () => {
    if (!order) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/shipping/steadfast/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.dbId,
          codAmount,
          note: note || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to dispatch order');
        return;
      }

      setTrackingCode(data.trackingCode);
      setConsignmentId(String(data.consignmentId));
      setCurrentStatus('pending');
      setSuccess(`✓ Dispatched! Tracking: ${data.trackingCode}`);
      onDispatched?.(order.id, data.trackingCode);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [order, codAmount, note, onDispatched]);

  const handleSync = useCallback(async () => {
    if (!order) return;
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/shipping/steadfast/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.dbId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentStatus(data.steadfastStatus);
        setSuccess(`Status refreshed: ${data.steadfastStatus}`);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSyncing(false);
    }
  }, [order]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (!isOpen || !order) return null;

  const alreadyDispatched = !!(consignmentId || order.steadfastConsignmentId);
  const webhookCallbackUrl = webhookBase ? `${webhookBase}/api/webhook/steadfast` : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#161824] shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-admin-primary to-admin-primary-hover px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Steadfast Courier</h2>
              <p className="text-white/70 text-sm">Order #{order.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Balance */}
            <div className="bg-white/15 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-white/80" />
              <span className="text-white text-sm font-medium">
                {balanceLoading ? (
                  <span className="animate-pulse">...</span>
                ) : balance !== null ? (
                  `৳${balance.toLocaleString()}`
                ) : (
                  'N/A'
                )}
              </span>
              {balance !== null && balance < 500 && (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-300" />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close panel"
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Webhook callback — same flow as “add parcel” in Steadfast portal */}
          {webhookCallbackUrl ? (
            <div className="rounded-2xl border border-admin-border bg-admin-panel p-4 space-y-2">
              <h3 className="text-sm font-semibold text-admin-text flex items-center gap-2">
                <Webhook className="w-4 h-4 shrink-0" />
                Webhook callback URL
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                In the Steadfast portal, set this callback URL and the same Bearer token as your server env (
                <code className="rounded bg-white/90 px-1 py-0.5 text-xs">STEADFAST_WEBHOOK_SECRET</code> or{' '}
                <code className="rounded bg-white/90 px-1 py-0.5 text-xs">STEADFAST_WEBHOOK_AUTHORIZATION</code>
                ). Delivery updates will sync to this order automatically.
              </p>
              <div className="flex items-start gap-2 rounded-xl bg-[#161824] border border-admin-border px-3 py-2">
                <code className="text-xs font-mono text-[#f7f8f8] flex-1 break-all leading-snug">
                  {webhookCallbackUrl}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(webhookCallbackUrl)}
                  className="shrink-0 text-[#62666d] hover:bg-admin-panel hover:text-white"
                  aria-label="Copy webhook callback URL"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
              <Link
                href="/admin/shipping/steadfast-webhooks"
                className="inline-flex text-xs font-medium text-white hover:text-admin-text"
              >
                View webhook log →
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
              Set <code className="font-mono">NEXT_PUBLIC_APP_URL</code> to your public site URL so the Steadfast
              webhook callback can be copied here.
            </div>
          )}

          {/* Status card — if already dispatched */}
          {alreadyDispatched && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-800">
                  📦 Dispatched to Steadfast
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="border-transparent bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Refresh
                </Button>
              </div>

              {currentStatus && <StatusBadge status={currentStatus} />}

              <div className="space-y-2">
                {(trackingCode || order.steadfastTrackingCode) && (
                  <div className="flex items-center justify-between bg-[#161824] rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs text-[#8a8f98]">Tracking Code</p>
                      <p className="text-sm font-mono font-semibold text-[#f7f8f8]">
                        {trackingCode || order.steadfastTrackingCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(trackingCode || order.steadfastTrackingCode || '')}
                        aria-label="Copy tracking code"
                        className="text-[#62666d] hover:bg-[#10121b] hover:text-[#8a8f98]"
                      >
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <a
                        href={`/track?code=${trackingCode || order.steadfastTrackingCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-[#62666d] hover:bg-[#10121b] hover:text-[#8a8f98]"
                        aria-label="Open tracking page"
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                )}
                {(consignmentId || order.steadfastConsignmentId) && (
                  <div className="flex items-center justify-between bg-[#161824] rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs text-[#8a8f98]">Consignment ID</p>
                      <p className="text-sm font-mono font-semibold text-[#f7f8f8]">
                        {consignmentId || order.steadfastConsignmentId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipient Info */}
          <div className="bg-[#10121b] rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#d0d6e0] flex items-center gap-2">
              <User className="w-4 h-4 text-white" />
              Recipient Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#8a8f98]">
                <User className="w-3.5 h-3.5 text-[#62666d]" />
                <span>{order.shipping?.name || order.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#8a8f98]">
                <Phone className="w-3.5 h-3.5 text-[#62666d]" />
                <span>{order.shipping?.phone || order.customer.phone || '—'}</span>
              </div>
              {order.shipping?.address && (
                <div className="flex items-start gap-2 text-sm text-[#8a8f98]">
                  <MapPin className="w-3.5 h-3.5 text-[#62666d] mt-0.5 flex-shrink-0" />
                  <span>
                    {order.shipping.address}
                    {order.shipping.city ? `, ${order.shipping.city}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* COD Amount */}
          {!alreadyDispatched && (
            <>
              <Input
                type="number"
                value={codAmount}
                onChange={(e) => setCodAmount(Number(e.target.value))}
                min={0}
                step={0.01}
                placeholder="0.00"
                label={
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-white" aria-hidden="true" />
                    COD Amount (৳)
                  </span>
                }
                leading={<span className="text-sm font-medium text-[#8a8f98]">৳</span>}
                description={
                  codAmount === 0
                    ? '💳 Prepaid — no cash collection'
                    : `💵 Collect ৳${codAmount.toFixed(2)} on delivery`
                }
                className="focus:ring-white/20"
              />

              {/* Optional note */}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Call before delivery, fragile items..."
                label={
                  <>
                    Delivery Note <span className="text-[#62666d] font-normal">(optional)</span>
                  </>
                }
                className="resize-none focus:ring-white/20"
              />
            </>
          )}

          {/* Feedback */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}
          {copied && (
            <div className="bg-admin-panel border border-admin-border rounded-xl px-4 py-3">
              <p className="text-sm text-white text-center">✓ Copied to clipboard</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#232636] p-5 space-y-3">
          {!alreadyDispatched ? (
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleDispatch}
              disabled={loading}
              aria-busy={loading || undefined}
              className="bg-gradient-to-r from-admin-primary to-admin-primary-hover py-3 shadow-lg shadow-black/20 hover:from-admin-primary-hover hover:to-admin-primary"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Adding parcel…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Add parcel (Steadfast)
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleSync}
                disabled={syncing}
                className="border-admin-border text-white hover:bg-admin-panel"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Sync Status
              </Button>
              <a
                href={`https://portal.steadfast.com.bd`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#232636] px-4 py-2.5 font-medium text-[#8a8f98] hover:bg-[#10121b]"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Portal
              </a>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            className="py-2 text-sm text-[#8a8f98] hover:text-[#d0d6e0]"
          >
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
