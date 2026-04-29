'use client';

/**
 * app/track/page.tsx
 *
 * Public order tracking page — no login required.
 * Customers can track by:
 *   1. Courier tracking/consignment code
 *   2. Order number + phone number
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Search,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  ShoppingBag,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TrackingTimeline {
  status: string;
  message: string;
  timestamp: string;
  source: 'pathao' | 'steadfast';
}

interface TrackingResult {
  found: boolean;
  orderId?: string;
  courier?: 'pathao' | 'steadfast';
  trackingId?: string | null;
  consignmentId?: string | null;
  orderNumber?: string;
  currentStatus?: string;
  lastUpdatedAt?: string | null;
  deliveryCharge?: number;
  timeline?: TrackingTimeline[];
  deliveryCity?: string;
  itemCount?: number;
  items?: Array<{ name: string; quantity: number }>;
  error?: string;
}

// ─── Timeline Step ─────────────────────────────────────────────────────────

function TimelineStep({
  step,
  isLast,
}: {
  step: TrackingTimeline;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            'bg-violet-600 text-white shadow-lg shadow-violet-200'
          }`}
        >
          {step.status.toLowerCase().includes('deliver') ? (
            <CheckCircle className="w-5 h-5" />
          ) : step.status.toLowerCase().includes('transit') || step.status.toLowerCase().includes('pickup') ? (
            <Truck className="w-5 h-5" />
          ) : (
            <Package className="w-5 h-5" />
          )}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1 bg-violet-300" style={{ minHeight: '2rem' }} />
        )}
      </div>
      <div className="pb-6 pt-2">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-900 capitalize">{step.status.replace(/_/g, ' ')}</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            {step.source}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{step.message}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(step.timestamp).toLocaleString('en-BD', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function TrackPageContent() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'code' | 'order'>('order');
  const [trackingCode, setTrackingCode] = useState(searchParams.get('code') || '');
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doTrack = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let url: string;
      if (mode === 'code') {
        if (!trackingCode.trim()) {
          setError('Please enter a tracking code');
          return;
        }
        url = `/api/track?code=${encodeURIComponent(trackingCode.trim())}`;
      } else {
        if (!orderNumber.trim() || !phone.trim()) {
          setError('Please enter both order number and phone number');
          return;
        }
        url = `/api/track?order=${encodeURIComponent(
          orderNumber.trim()
        )}&phone=${encodeURIComponent(phone.trim())}`;
      }

      const res = await fetch(url);
      const data: TrackingResult = await res.json();

      if (!res.ok || !data.found) {
        setError(data.error || 'Order not found. Please check your details.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, trackingCode, orderNumber, phone]);

  // Auto-search if URL has params
  useEffect(() => {
    const code = searchParams.get('code');
    const order = searchParams.get('order');
    const ph = searchParams.get('phone');
    if (code) {
      setMode('code');
      setTrackingCode(code);
    } else if (order && ph) {
      setMode('order');
      setOrderNumber(order);
      setPhone(ph);
    }
    if (code || (order && ph)) {
      setTimeout(doTrack, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doTrack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">Minsah Beauty</span>
          </Link>
          <Link
            href="/shop"
            className="text-sm text-violet-600 hover:text-violet-800 font-medium"
          >
            Continue Shopping →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-200">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500">
            Enter your order details to get real-time delivery updates
          </p>
        </div>

        {/* Search card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-6 mb-6">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
            <button
              onClick={() => { setMode('order'); setResult(null); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'order'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Order Number
            </button>
            <button
              onClick={() => { setMode('code'); setResult(null); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'code'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tracking Code
            </button>
          </div>

          {mode === 'order' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  ORDER NUMBER
                </label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. MB1234567890ABCD"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                COURIER TRACKING CODE
              </label>
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. SFB12345678 or PTH123456"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
              />
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={doTrack}
            disabled={loading}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Track Order
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden">
            {/* Status header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/70 text-xs font-medium">ORDER NUMBER</p>
                  <p className="text-white font-bold text-lg font-mono">
                    {result.orderNumber || '—'}
                  </p>
                </div>
                {result.trackingId && (
                  <div className="text-right">
                    <p className="text-white/70 text-xs font-medium">TRACKING ID</p>
                    <p className="text-white font-bold font-mono text-sm">
                      {result.trackingId}
                    </p>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30`}>
                  {result.currentStatus?.toLowerCase().includes('deliver') ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : result.currentStatus?.toLowerCase().includes('cancel') || result.currentStatus?.toLowerCase().includes('fail') ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                  )}
                  {result.currentStatus || 'Unknown'}
                </span>
                {result.courier && (
                  <span className="text-white/70 text-xs uppercase tracking-wide">
                    {result.courier}
                  </span>
                )}
                {result.deliveryCity && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {result.deliveryCity}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Consignment</p>
                  <p className="mt-1 text-sm leading-relaxed text-white">{result.consignmentId || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Delivery Charge</p>
                  <p className="mt-1 text-sm leading-relaxed text-white">
                    {typeof result.deliveryCharge === 'number' ? `৳${result.deliveryCharge}` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Last Updated</p>
                  <p className="mt-1 text-sm leading-relaxed text-white">
                    {result.lastUpdatedAt
                      ? new Date(result.lastUpdatedAt).toLocaleString('en-BD')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {result.timeline && result.timeline.length > 0 && (
              <div className="px-6 py-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Delivery Timeline
                </h3>
                <div>
                  {result.timeline.map((step, idx) => (
                    <TimelineStep
                      key={`${step.source}-${step.timestamp}-${idx}`}
                      step={step}
                      isLast={idx === result.timeline!.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {result.items && result.items.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Items ({result.itemCount})
                </h3>
                <div className="space-y-1.5">
                  {result.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm text-gray-600"
                    >
                      <span>{item.name}</span>
                      <span className="text-gray-400">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Need help?{' '}
                <Link href="/contact" className="text-violet-600 hover:underline font-medium">
                  Contact Support
                </Link>{' '}
                or call us at{' '}
                <a href="tel:+8801XXXXXXXXX" className="text-violet-600 hover:underline font-medium">
                  01XXXXXXXXX
                </a>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Tracking updates are built from courier webhook events stored by Minsah Beauty.
        </p>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}
