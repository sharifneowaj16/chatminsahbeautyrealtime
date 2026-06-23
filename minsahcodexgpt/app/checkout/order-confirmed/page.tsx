'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Home, MessageCircle, Package } from 'lucide-react';
import Link from 'next/link';

const ADMIN_WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '8801700000000')
  .replace(/[^\d]/g, '');

function buildTrackOrderUrl(orderNumber: string) {
  const message = `Order ID: ${orderNumber}\nTrack my order`;
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || '-';
  const trackOrderUrl = buildTrackOrderUrl(orderNumber);

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-4 py-12">
      <div className="relative mb-8">
        <span className="absolute inset-0 rounded-full bg-[#3D1F0E]/10 animate-ping" />
        <div className="relative w-24 h-24 bg-[#3D1F0E] rounded-full flex items-center justify-center shadow-2xl">
          <Check size={50} className="text-[#F5E6D3]" strokeWidth={2.5} />
        </div>
      </div>

      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A0D06] mb-3">
          Thank you for your order!
        </h1>
        <p className="text-[#8B5E3C] text-sm mb-6">
          Your order has been confirmed successfully.
        </p>

        <div className="bg-[#F5E9DC] rounded-2xl px-8 py-5 mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8B5E3C] mb-2">Order ID</p>
          <p className="text-2xl font-bold text-[#3D1F0E] tracking-wide">{orderNumber}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-11 h-11 bg-[#F5E9DC] rounded-xl flex items-center justify-center text-[#3D1F0E] flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A0D06]">Order confirmed</p>
              <p className="text-xs text-[#8B5E3C]">Tap Track Order to request the latest delivery update on WhatsApp.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={trackOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-[#1EBE57] transition"
          >
            <MessageCircle size={20} />
            Track Order
          </a>

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 bg-white text-[#3D1F0E] py-4 rounded-2xl font-bold text-base border-2 border-[#E8D5C0] hover:border-[#3D1F0E] transition"
          >
            <Home size={18} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#3D1F0E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
