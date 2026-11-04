'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Sparkles,
  ArrowLeft,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface OrderItemData {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image?: string | null;
  variantName?: string | null;
  isTargetItem?: boolean;
}

interface VerificationData {
  success: boolean;
  verified: boolean;
  portal: string;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    isDelivered: boolean;
    deliveredAt?: string | null;
    paymentStatus: string;
    paymentMethod?: string;
    subtotal: number;
    shippingCost: number;
    discountAmount: number;
    total: number;
    recipientName: string;
    maskedPhone: string;
    maskedAddress: string;
    courierCode?: string | null;
    courierMethod?: string;
  };
  warranty: {
    status: 'ACTIVE' | 'PENDING_DELIVERY' | 'EXPIRED';
    isDelivered: boolean;
    policy: string;
    warrantyDaysTotal: number;
    daysRemaining: number;
    expiryDate?: string | null;
    message: string;
  };
  items: OrderItemData[];
}

export default function OrderWarrantyUnifiedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [activeTab, setActiveTab] = useState<'slip' | 'warranty'>('slip');
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/q/${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!isMounted) return;

        if (!res.ok || json.error) {
          setError(json.error || 'ভেরিফিকেশন লিঙ্কটি সঠিক নয় বা মেয়াদোত্তীর্ণ হয়েছে।');
        } else {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('সার্ভারে যোগাযোগ করা যায়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#010102] text-white flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#010102] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#5e6ad2] border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400 font-mono tracking-wide animate-pulse">
          ভেরিফিকেশন ও অর্ডার লোড হচ্ছে...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#010102] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-white mb-2">QR ভেরিফিকেশন ব্যর্থ হয়েছে</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || 'অর্ডার বা ওয়ারেন্টি তথ্য খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক QR কোড স্ক্যান করুন।'}
        </p>
        <Link
          href="/"
          className="h-11 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm flex items-center gap-2 border border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>হোমপেজে ফিরে যান</span>
        </Link>
      </div>
    );
  }

  const { order, warranty, items } = data;
  const isDelivered = warranty.isDelivered;

  return (
    <div className="min-h-screen bg-[#010102] text-slate-200 antialiased overflow-x-hidden selection:bg-[#5e6ad2]/30 selection:text-white pb-12">
      {/* Top Floating App Header */}
      <header className="sticky top-0 z-40 bg-[#010102]/80 backdrop-blur-md border-b border-[#23252a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white font-black text-xs shadow-md">
            M
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white leading-tight">
              MINSAH BEAUTY
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">
              Genuine Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Genuine</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Unified 2-Button Switcher: { Order Slip } and { Warranty } */}
        <div className="p-1 rounded-2xl bg-[#0f1011] border border-[#23252a] grid grid-cols-2 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('slip')}
            className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'slip'
                ? 'bg-[#5e6ad2] text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Order Slip</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warranty')}
            className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all relative ${
              activeTab === 'warranty'
                ? 'bg-[#5e6ad2] text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Warranty</span>
            {isDelivered && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* TAB 1: ORDER SLIP */}
        {activeTab === 'slip' && (
          <div className="space-y-4 animate-fade-in">
            {/* Order Status Banner */}
            <div className="p-4 rounded-2xl bg-[#0f1011] border border-[#23252a] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-mono">
                    Order Reference
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    #{order.orderNumber}
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${
                    isDelivered
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {order.status}
                </div>
              </div>

              {/* Delivery / Tracking pill */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Truck className="w-4 h-4 text-[#5e6ad2]" />
                  <span>{order.courierMethod || 'Courier Delivery'}</span>
                </div>
                {order.courierCode && (
                  <span className="font-mono text-slate-400 font-semibold">
                    {order.courierCode}
                  </span>
                )}
              </div>
            </div>

            {/* Items Purchased List */}
            <div className="p-4 rounded-2xl bg-[#0f1011] border border-[#23252a] space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                অর্ডারকৃত পণ্যসমূহ ({items.length})
              </h2>

              <div className="divide-y divide-[#23252a]">
                {items.map((item) => (
                  <div key={item.id} className="py-3 first:pt-1 last:pb-0 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-[#23252a] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-white truncate">{item.name}</h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.quantity} × ৳{item.price.toLocaleString()}</span>
                        {item.variantName && <span>• {item.variantName}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-white">
                        ৳{item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown Card */}
            <div className="p-4 rounded-2xl bg-[#0f1011] border border-[#23252a] space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="text-slate-200">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Charge:</span>
                <span className="text-slate-200">৳{order.shippingCost.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Discount:</span>
                  <span>-৳{order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#23252a] flex justify-between items-center text-sm">
                <span className="font-bold text-white">সর্বমোট প্রদেয়:</span>
                <span className="font-black text-emerald-400 text-base">
                  ৳{order.total.toLocaleString()}
                </span>
              </div>
              <div className="pt-1 flex justify-between text-[11px] text-slate-500">
                <span>Payment: {order.paymentMethod || 'COD'}</span>
                <span className="font-semibold uppercase text-slate-400">
                  {order.paymentStatus === 'paid' ? 'Paid / Settled' : 'Cash On Delivery'}
                </span>
              </div>
            </div>

            {/* Recipient Privacy-Safe Summary */}
            <div className="p-3.5 rounded-2xl bg-[#0f1011] border border-[#23252a] text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="text-slate-200 font-medium">{order.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone (Protected):</span>
                <span className="text-slate-200 font-mono">{order.maskedPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Area:</span>
                <span className="text-slate-200">{order.maskedAddress}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WARRANTY */}
        {activeTab === 'warranty' && (
          <div className="space-y-4 animate-fade-in">
            {/* Warranty Status Hero Card */}
            {isDelivered ? (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-[#0f1011] border border-emerald-500/30 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      WARRANTY ACTIVE
                    </span>
                    <h2 className="text-sm font-bold text-white">
                      অফিসিয়াল ওয়ারেন্টি সক্রিয় আছে
                    </h2>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300">মেয়াদ বাকি:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {warranty.daysRemaining} দিন
                  </span>
                </div>

                <p className="text-[12px] text-slate-300 leading-relaxed">
                  {warranty.policy}। কোনো ত্রুটি বা সমস্যা দেখা দিলে দ্রুত আমাদের সাথে যোগাযোগ করুন।
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/30 to-[#0f1011] border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      PENDING DELIVERY
                    </span>
                    <h2 className="text-sm font-bold text-white">
                      ডেলিভারির পর স্বয়ংক্রিয়ভাবে সক্রিয় হবে
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  আপনার পণ্যটি বর্তমানে ট্রানজিটে রয়েছে। কুরিয়ারের মাধ্যমে ডেলিভারি সম্পন্ন হওয়া মাত্রই আপনার {warranty.warrantyDaysTotal} দিনের অফিসিয়াল গ্যারান্টি কার্যকর হবে।
                </p>
              </div>
            )}

            {/* Covered Products under this Warranty */}
            <div className="p-4 rounded-2xl bg-[#0f1011] border border-[#23252a] space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ওয়ারেন্টিভুক্ত পণ্যসমূহ
              </h3>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-900/40 border border-[#23252a] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-white truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Call-to-Action */}
            <div className="p-4 rounded-2xl bg-[#0f1011] border border-[#23252a] space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                হেল্পলাইন ও ক্লেইম সাপোর্ট
              </h3>
              <p className="text-xs text-slate-400">
                পণ্য বা ওয়ারেন্টি নিয়ে যেকোনো জিজ্ঞাসায় আমাদের কাস্টমার সার্ভিসের সাথে সরাসরি কথা বলুন:
              </p>

              <div className="flex gap-2">
                <a
                  href="tel:+8809612888999"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>হটলাইন কল</span>
                </a>

                <Link
                  href="/contact"
                  className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <span>সাপোর্ট সেন্টার</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Global Footer Note */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-600 tracking-wider font-mono">
            MINSAH BEAUTY CLOUD • AUTHENTIC VERIFICATION ENGINE
          </p>
        </div>
      </main>
    </div>
  );
}

