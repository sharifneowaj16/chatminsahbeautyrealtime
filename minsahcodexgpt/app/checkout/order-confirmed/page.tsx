'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Check, Package, MessageSquare, Bell } from 'lucide-react';
import Link from 'next/link';

function OrderConfirmedContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const orderNumber  = searchParams.get('orderNumber') || '—';

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-4 py-12">

      {/* ── Success icon ─────────────────────────────────────────── */}
      <div className="relative mb-8">
        <span className="absolute inset-0 rounded-full bg-[#3D1F0E]/10 animate-ping" />
        <div className="relative w-28 h-28 bg-[#3D1F0E] rounded-full flex items-center justify-center shadow-2xl">
          <Check size={56} className="text-[#F5E6D3]" strokeWidth={2.5} />
        </div>
        {/* Decorative dots */}
        {['-top-3 -right-3', '-bottom-3 -left-3', 'top-1/2 -left-7', 'top-1/2 -right-7'].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-3 h-3 bg-[#C9A882] rounded-full animate-bounce`}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* ── Message ──────────────────────────────────────────────── */}
      <h1 className="text-2xl md:text-3xl font-bold text-[#1A0D06] mb-2 text-center">
        অর্ডার সফল হয়েছে! 🎉
      </h1>
      <p className="text-[#8B5E3C] text-sm mb-6 text-center">
        আপনার অর্ডার সফলভাবে প্লেস হয়েছে
      </p>

      {/* Order number */}
      <div className="bg-[#F5E9DC] rounded-2xl px-8 py-4 mb-8 text-center">
        <p className="text-xs text-[#8B5E3C] mb-1">অর্ডার নম্বর</p>
        <p className="text-xl font-bold text-[#3D1F0E] tracking-wide">{orderNumber}</p>
      </div>

      {/* ── Info cards ───────────────────────────────────────────── */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-5 mb-8 space-y-4">
        {[
          { icon: <Package size={20} />,      title: 'ডেলিভারি সময়',    sub: 'ঢাকায় ১-২ দিন, সারাদেশে ৩-৫ দিন' },
          { icon: <MessageSquare size={20} />, title: 'SMS নিশ্চিতকরণ',  sub: 'আপনার নম্বরে SMS পাঠানো হয়েছে' },
          { icon: <Bell size={20} />,          title: 'Order Tracking',   sub: 'SMS-এ আপডেট পাবেন' },
        ].map(card => (
          <div key={card.title} className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#F5E9DC] rounded-xl flex items-center justify-center text-[#3D1F0E] flex-shrink-0">
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A0D06]">{card.title}</p>
              <p className="text-xs text-[#8B5E3C]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Buttons ──────────────────────────────────────────────── */}
      <div className="w-full max-w-sm space-y-3">
        <Link
          href="/"
          className="block w-full bg-[#3D1F0E] text-[#F5E6D3] text-center py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-[#2A1509] transition"
        >
          শপিং চালিয়ে যান
        </Link>
        <Link
          href="/account/orders"
          className="block w-full bg-white text-[#3D1F0E] text-center py-4 rounded-2xl font-bold text-base border-2 border-[#E8D5C0] hover:border-[#3D1F0E] transition"
        >
          আমার অর্ডার দেখুন
        </Link>
      </div>

      <p className="mt-8 text-xs text-[#A0856A] text-center">
        ধন্যবাদ <span className="font-bold text-[#3D1F0E]">Minsah Beauty</span>-তে কেনাকাটার জন্য ✨
      </p>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3D1F0E] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}
