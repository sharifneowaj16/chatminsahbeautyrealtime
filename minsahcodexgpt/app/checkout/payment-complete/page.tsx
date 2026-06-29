'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Home, Loader2 } from 'lucide-react';
import Link from 'next/link';

type OnlinePurchaseResponse = {
  track?: boolean;
  reason?: string;
  eventId?: string;
  purchaseData?: Record<string, unknown>;
};

function fireMetaBrowserPixel(
  purchaseData: Record<string, unknown>,
  eventId: string,
  attempt = 0
) {
  if (typeof window === 'undefined') return;
  if (!window.fbq) {
    if (attempt < 50) {
      window.setTimeout(() => fireMetaBrowserPixel(purchaseData, eventId, attempt + 1), 100);
    }
    return;
  }
  window.fbq('track', 'Purchase', purchaseData, { eventID: eventId });
}

// This page is a signed payment-return tracking bridge, not a generic thank-you page.
// It only fires Browser Purchase after the server verifies:
// - orderId is UUID DB id
// - signed browser purchase token exists in HttpOnly cookie and is valid
// - payment is verified paid
// - amount/currency match
// - DB cross-browser claim succeeds
async function claimAndFireBrowserPurchase(
  orderId: string,
  maxPolls = 6,
  pollIntervalMs = 1500
): Promise<{ ok: boolean; reason?: string }> {
  if (!orderId) return { ok: false, reason: 'ORDER_ID_REQUIRED' };

  for (let attempt = 0; attempt <= maxPolls; attempt++) {
    let payload: OnlinePurchaseResponse;
    try {
      const res = await fetch('/api/tracking/meta/online-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId }),
      });
      payload = (await res.json()) as OnlinePurchaseResponse;
    } catch {
      return { ok: false, reason: 'NETWORK_ERROR' };
    }

    if (payload.track && payload.eventId && payload.purchaseData) {
      fireMetaBrowserPixel(payload.purchaseData, payload.eventId);
      return { ok: true };
    }

    if (payload.reason === 'PAYMENT_NOT_VERIFIED_PAID' && attempt < maxPolls) {
      await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
      continue;
    }

    return { ok: false, reason: payload.reason ?? 'TRACKING_SKIPPED' };
  }

  return { ok: false, reason: 'POLLING_EXHAUSTED' };
}

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const orderNumber = searchParams.get('orderNumber') || '';
  const [status, setStatus] = useState<'loading' | 'done' | 'skipped'>('loading');

  const confirmationHref = useMemo(() => {
    const params = new URLSearchParams();
    if (orderNumber) params.set('orderNumber', orderNumber);
    return `/checkout/order-confirmed${params.toString() ? `?${params.toString()}` : ''}`;
  }, [orderNumber]);

  useEffect(() => {
    let cancelled = false;

    claimAndFireBrowserPurchase(orderId).then((result) => {
      if (cancelled) return;
      setStatus(result.ok ? 'done' : 'skipped');
      window.setTimeout(() => {
        if (!cancelled) window.location.replace(confirmationHref);
      }, 600);
    });

    return () => {
      cancelled = true;
    };
  }, [confirmationHref, orderId]);

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E9DC] text-[#3D1F0E]">
          {status === 'loading' ? <Loader2 className="animate-spin" size={30} /> : <Check size={32} />}
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[#1A0D06]">Payment verified</h1>
        <p className="mb-6 text-sm text-[#8B5E3C]">
          {status === 'loading'
            ? 'Finalising your payment confirmation...'
            : 'Your payment has been verified. Redirecting to your order confirmation.'}
        </p>
        <Link
          href={confirmationHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#E8D5C0] bg-white py-4 text-base font-bold text-[#3D1F0E] transition hover:border-[#3D1F0E]"
        >
          <Home size={18} />
          Go to order confirmation
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#3D1F0E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
