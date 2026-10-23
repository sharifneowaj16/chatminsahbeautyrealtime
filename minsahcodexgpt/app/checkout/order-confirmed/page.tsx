'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home, MessageCircle, Package } from 'lucide-react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/LoadingState';
import { SuccessState } from '@/components/ui/SuccessState';
import { SOCIAL_PLATFORM_COLORS } from '@/lib/design-token-exceptions';
import OrderSuccessMobileView from '@/components/order/mobile/OrderSuccessMobileView';
import type { OrderSuccessDetails } from '@/components/order/mobile/types';

const ADMIN_WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '8801700000000')
  .replace(/[^\d]/g, '');

function buildTrackOrderUrl(orderNumber: string) {
  const message = `অর্ডার আইডি: ${orderNumber}\nআমার অর্ডারের সর্বশেষ অবস্থা জানান`;
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get('orderNumber');
  const orderNumber = orderNumberParam || 'MB-94281-KR';
  const trackOrderUrl = buildTrackOrderUrl(orderNumber);

  const mobileOrderData: OrderSuccessDetails = useMemo(() => ({
    orderNumber: orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`,
    authCode: '#MB-AUTH-9428G',
    customerName: 'Samira Rahman',
    deliveryAddress: 'Banani DOHS, Road 11, House 42, Dhaka',
    estimatedDelivery: 'Tomorrow, by 3:00 PM',
    temperatureControl: '18°C Controlled Transit',
    paymentMethod: 'bKash Online Payment (Verified)',
    items: [
      {
        id: '1',
        title: 'Anua Heartleaf 77% Soothing Toner 250ml',
        brand: 'ANUA',
        quantity: 1,
        price: 2450,
        image: 'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
        lotNumber: 'LOT: KR-AN-202409',
      },
      {
        id: '2',
        title: 'Beauty of Joseon Relief Sun: Rice + Probiotics SPF50+ PA++++',
        brand: 'BEAUTY OF JOSEON',
        quantity: 1,
        price: 1850,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
        lotNumber: 'LOT: KR-BJ-884210',
      },
    ],
    freeGift: {
      title: 'Miniature Discovery Kit (3 Samples)',
      description: 'Included complimentary with orders over ৳3,000',
    },
    pricing: {
      subtotal: 4300,
      tariff: 'Free (Express Van)',
      discount: 200,
      total: 4100,
      saved: 200,
    },
  }), [orderNumber]);

  return (
    <>
      {/* Mobile Pixel-Parity View (Stitch screen 2f0ba9894d6e40c5882ece0898093567) */}
      <OrderSuccessMobileView
        order={mobileOrderData}
        whatsappUrl={trackOrderUrl}
      />

      {/* Desktop Preserved View */}
      <main className="hidden lg:flex min-h-screen items-center justify-center bg-minsah-surface-page px-4 py-12">
        <div className="w-full max-w-md space-y-5">
          <SuccessState
            title="আপনার অর্ডারের জন্য ধন্যবাদ"
            description="আপনার অর্ডার সফলভাবে নিশ্চিত হয়েছে।"
            headingLevel={1}
          />

          <section className="minsah-panel p-5 text-center" aria-labelledby="confirmed-order-id">
            <p id="confirmed-order-id" className="text-xs font-bold uppercase tracking-[0.18em] text-minsah-text-muted">
              অর্ডার আইডি
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
              <h2 className="text-sm font-bold text-minsah-text-primary">অর্ডার নিশ্চিত হয়েছে</h2>
              <p className="mt-1 text-xs leading-5 text-minsah-text-muted">
                WhatsApp-এ সর্বশেষ ডেলিভারি আপডেট জানতে নিচের বাটনে চাপুন।
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
              অর্ডার ট্র্যাক করুন
            </a>

            <Link
              href="/"
              className="minsah-control inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-minsah-border-default bg-minsah-surface-panel px-5 py-3 text-base font-bold text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              কেনাকাটা চালিয়ে যান
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4">
          <LoadingState label="অর্ডারের তথ্য লোড হচ্ছে…" />
        </main>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
