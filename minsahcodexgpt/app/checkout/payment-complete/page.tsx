'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/LoadingState';
import { SuccessState } from '@/components/ui/SuccessState';
import { canRunClientTracking } from '@/lib/tracking/client-traffic-filter';
import { buildMetaBrowserEvent } from '@/lib/meta/browser/payload';
import { dispatchMetaBrowserEvent } from '@/lib/meta/browser/client';

type OnlinePurchaseResponse = {
  track?: boolean;
  reason?: string;
  eventId?: string;
  purchaseData?: Record<string, unknown>;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fireMetaBrowserPixel(
  purchaseData: Record<string, unknown>,
  eventId: string,
): Promise<boolean> {
  if (typeof window === 'undefined' || !canRunClientTracking()) return false;

  const event = buildMetaBrowserEvent({
    eventName: 'Purchase',
    eventId,
    payload: purchaseData,
  });
  const result = await dispatchMetaBrowserEvent(event, { sendCapi: false });
  return result.fired;
}

async function claimAndFireBrowserPurchase(
  orderId: string,
  maxPolls = 6,
  pollIntervalMs = 1500,
): Promise<{ ok: boolean; reason?: string }> {
  if (!orderId) return { ok: false, reason: 'ORDER_ID_REQUIRED' };
  if (typeof window === 'undefined' || !canRunClientTracking()) {
    return { ok: false, reason: 'CONSENT_NOT_GRANTED' };
  }

  for (let attempt = 0; attempt <= maxPolls; attempt += 1) {
    if (!canRunClientTracking()) {
      return { ok: false, reason: 'CONSENT_NOT_GRANTED' };
    }

    let payload: OnlinePurchaseResponse;
    try {
      const response = await fetch('/api/tracking/meta/online-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId }),
      });
      payload = (await response.json()) as OnlinePurchaseResponse;
    } catch {
      return { ok: false, reason: 'NETWORK_ERROR' };
    }

    if (payload.track && payload.eventId && payload.purchaseData) {
      const fired = await fireMetaBrowserPixel(payload.purchaseData, payload.eventId);
      return fired ? { ok: true } : { ok: false, reason: 'META_BROWSER_PIXEL_NOT_READY' };
    }

    if (payload.reason === 'PAYMENT_NOT_VERIFIED_PAID' && attempt < maxPolls) {
      await wait(pollIntervalMs);
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

    void claimAndFireBrowserPurchase(orderId).then((result) => {
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
    <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4 py-12">
      <div className="w-full max-w-md">
        {status === 'loading' ? (
          <LoadingState
            label="পেমেন্ট নিশ্চিত করা হচ্ছে…"
            description="যাচাইকৃত পেমেন্টটি অর্ডারের সঙ্গে যুক্ত হওয়া পর্যন্ত এই পেজটি খোলা রাখুন।"
          />
        ) : (
          <SuccessState
            title="পেমেন্ট যাচাই হয়েছে"
            description="আপনার পেমেন্ট যাচাই হয়েছে। অর্ডার নিশ্চিতকরণ পেজে নেওয়া হচ্ছে।"
            action={
              <Link
                href={confirmationHref}
                className="minsah-control inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-minsah-border-default bg-minsah-surface-panel px-5 py-3 text-base font-bold text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle"
              >
                <Home className="h-5 w-5" aria-hidden="true" />
                অর্ডার নিশ্চিতকরণ দেখুন
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4">
          <LoadingState label="পেমেন্টের তথ্য লোড হচ্ছে…" />
        </main>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
