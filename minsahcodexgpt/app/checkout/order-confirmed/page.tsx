'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home, MessageCircle, Package } from 'lucide-react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/LoadingState';
import { SuccessState } from '@/components/ui/SuccessState';
import { SOCIAL_PLATFORM_COLORS } from '@/lib/design-token-exceptions';

const ADMIN_WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '8801700000000')
  .replace(/[^\d]/g, '');

function buildTrackOrderUrl(orderNumber: string) {
  const message = `Order ID: ${orderNumber}\nPlease share my order status`;
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || '-';
  const trackOrderUrl = buildTrackOrderUrl(orderNumber);

  return (
    <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4 py-12">
      <div className="w-full max-w-md space-y-5">
        <SuccessState
          title="Thank you for your order"
          description="Your order has been confirmed successfully."
          headingLevel={1}
        />

        <section className="minsah-panel p-5 text-center" aria-labelledby="confirmed-order-id">
          <p id="confirmed-order-id" className="text-xs font-bold uppercase tracking-[0.18em] text-minsah-text-muted">
            Order ID
          </p>
          <p className="mt-2 break-all text-2xl font-black tracking-wide text-minsah-action-primary">
            {orderNumber}
          </p>
        </section>

        <section className="minsah-panel flex items-start gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-minsah-surface-accent text-minsah-action-primary">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-minsah-text-primary">Order Confirmed</h2>
            <p className="mt-1 text-xs leading-5 text-minsah-text-muted">
              Tap below to receive live delivery updates on WhatsApp.
            </p>
          </div>
        </section>

        <div className="space-y-3">
          <a
            href={trackOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="minsah-control inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold text-minsah-text-inverse hover:brightness-95"
            style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.whatsapp }}
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Track Order
          </a>

          <Link
            href="/"
            className="minsah-control inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-minsah-border-default bg-minsah-surface-panel px-5 py-3 text-base font-bold text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4">
          <LoadingState label="Loading order details…" />
        </main>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
