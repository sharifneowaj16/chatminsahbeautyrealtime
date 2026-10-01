// app/admin/shortlist/components/mobile/MobileOrderDetailView.tsx
// 100% Mobile Pixel Parity for Stitch Screen 208c15483688436196885f8ec4d61aac
// Dedicated Mobile Order Inspection View with Live Milestone Stepper & SKU Breakdown

'use client';

import React from 'react';
import { WholesaleSkuRow } from '../../types';
import {
  ArrowLeft,
  Share2,
  Clock,
  Activity,
  MapPin,
  Phone,
  MessageSquare,
  Truck,
  Package,
  Store,
  CheckCircle,
  QrCode,
  TrendingUp,
  History,
  PhoneCall,
  CheckSquare,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface MobileOrderDetailViewProps {
  orderId: string;
  sku?: WholesaleSkuRow | null;
  onBack: () => void;
  runnerName?: string;
}

export default function MobileOrderDetailView({
  orderId,
  sku,
  onBack,
  runnerName = 'Shakil',
}: MobileOrderDetailViewProps) {
  const orderNumber = orderId.startsWith('ORD-') ? orderId : `#ORD-${orderId}`;
  const [loading, setLoading] = React.useState(true);
  const [customerName, setCustomerName] = React.useState('Ayesha Siddiqua');
  const [customerPhone, setCustomerPhone] = React.useState('01712-345678');
  const [customerAddress, setCustomerAddress] = React.useState('House 14, Road 5, Uttara Sector 4, Dhaka-1230');
  const [courierService, setCourierService] = React.useState('Steadfast Express (Same-Day Direct Van)');
  const [orderedItems, setOrderedItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      if (!orderId) return;
      setLoading(true);
      try {
        const cleanId = orderId.replace(/^#/, '');
        const res = await fetch(`/api/admin/orders/${cleanId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          const ord = json.order || json.data || json;
          if (isMounted && ord) {
            if (ord.user) {
              const fullName = `${ord.user.firstName || ''} ${ord.user.lastName || ''}`.trim();
              if (fullName) setCustomerName(fullName);
              if (ord.user.phone) setCustomerPhone(ord.user.phone);
            }
            if (ord.shippingAddress) {
              const addr = [
                ord.shippingAddress.addressLine1,
                ord.shippingAddress.addressLine2,
                ord.shippingAddress.city,
                ord.shippingAddress.district,
                ord.shippingAddress.postalCode,
              ].filter(Boolean).join(', ');
              if (addr) setCustomerAddress(addr);
            }
            if (ord.shippingMethod) {
              setCourierService(ord.shippingMethod);
            }
            if (Array.isArray(ord.items) && ord.items.length > 0) {
              setOrderedItems(ord.items);
            }
          }
        }
      } catch {
        // Fallback kept
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#051424] text-[#d4e4fa] font-sans pb-32">
      {/* ── 1. Top Bar & Manifest Header ── */}
      <div className="px-4 pt-4 pb-3 flex flex-col gap-3 bg-[#0d1c2d] border-b border-[#172a3e] shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-indigo-300 active:scale-95 transition text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Shortlist</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Urgent Dispatch
            </span>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition"
              aria-label="Share Slip"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Manifest Reference
            </span>
            <h1 className="font-mono text-xl text-white font-bold tracking-tight">
              {orderNumber}
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>42m left</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Cutoff: 3:30 PM Today</span>
          </div>
        </div>
      </div>

      {/* ── 2. Live Sourcing Link Banner ── */}
      <div className="mx-4 my-3 p-3 rounded-xl bg-[#122131] border border-[#1f2f45] flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">
              Live Sourcing Link
            </span>
            <span className="text-slate-500 text-[10px]">•</span>
            <span className="font-mono text-[11px] text-slate-400">Dhaka Central Hub</span>
          </div>
          <p className="text-xs text-white truncate font-semibold">
            Assigned: Paltan Sourcing Rig #04 ({runnerName})
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold shrink-0">
          ACTIVE
        </span>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* ── 3. Recipient & Delivery Card ── */}
        <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-bold">Recipient &amp; Delivery</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1c2b3c] text-emerald-400 font-mono font-bold tracking-wide">
              PRE-PAID (bKash)
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2.5 p-3 bg-[#122131] rounded-lg animate-pulse">
              <div className="h-[12px] w-3/4 bg-slate-700/60 rounded" />
              <div className="h-[12px] w-1/2 bg-slate-700/60 rounded" />
              <div className="h-[12px] w-5/6 bg-slate-700/60 rounded" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 bg-[#122131] p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{customerName}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${customerPhone}`}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center active:scale-90 transition"
                      aria-label="Call Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/88${customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold flex items-center justify-center active:scale-90 transition"
                    >
                      WA
                    </a>
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400 font-medium">{customerPhone}</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{customerAddress}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 bg-[#051424] px-2.5 py-1.5 rounded-lg border border-[#1c2b3c]">
                  <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-300">
                    <span className="font-bold text-indigo-300">{courierService}</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── 4. Ordered SKU Breakdown ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Ordered SKU Breakdown</h2>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">2 SKUs (3 Items)</span>
          </div>

          {/* SKU 1 */}
          <div className="rounded-xl bg-[#122131] border border-[#1f2f45] p-3 shadow-lg flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#051424] border border-[#1c2b3c] overflow-hidden shrink-0">
                {sku?.thumbnailUrl ? (
                  <img src={sku.thumbnailUrl} alt={sku.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-400">
                    <Package className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs text-indigo-300 font-bold">
                    {sku?.sku || 'MSB-LIP-01'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold tracking-wide">
                    1/2 ACQUIRED
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">
                  {sku?.title || 'Velvet Matte Liquid Lipstick'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {sku?.variantOrShade || 'Shade: Ruby Rose 3.2ml • Long-Wear'}
                </p>
              </div>
            </div>

            {/* Sourced From */}
            <div className="p-2.5 rounded-xl bg-[#051424] border border-[#1c2b3c] flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  Sourced From (Stall Master)
                </span>
                <span className="font-mono text-xs text-emerald-400 font-bold">Stand 14, Lane 2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold">Paltan Heritage Trading</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold uppercase">
                  Verified Vendor
                </span>
              </div>
            </div>

            {/* Price Matrix */}
            <div className="grid grid-cols-3 gap-2 bg-[#051424] rounded-xl p-2.5 text-center border border-[#1c2b3c]">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">ORDER REQ</span>
                <span className="font-mono text-sm text-white font-bold">2 pcs</span>
                <span className="text-[9px] text-indigo-400 font-bold">2x EXPRESS</span>
              </div>
              <div className="flex flex-col border-x border-[#1c2b3c]">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">WHOLESALE</span>
                <span className="font-mono text-sm text-white font-bold">৳320</span>
                <span className="text-[9px] text-slate-400">UNIT COST</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">RETAIL</span>
                <span className="font-mono text-sm text-emerald-400 font-bold">৳550</span>
                <span className="text-[9px] text-emerald-400 font-bold">+71.8% MARGIN</span>
              </div>
            </div>

            {/* Scan Action */}
            <div className="flex items-center justify-between pt-1 border-t border-[#1c2b3c]">
              <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">1 pc packed in Rig Bag</span>
              </div>
              <button
                type="button"
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan 2nd PC</span>
              </button>
            </div>
          </div>

          {/* SKU 2 */}
          <div className="rounded-xl bg-[#122131] border border-[#1f2f45] p-3 shadow-md flex flex-col gap-2.5 opacity-90">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#051424] border border-[#1c2b3c] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs text-slate-400 font-bold">MSB-SKN-001</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold tracking-wide">
                    READY (1/1)
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white truncate">Hydrating Face Serum (30ml)</h3>
                <p className="text-[11px] text-slate-400">HA 2% + B5 Moisture Lock Formulation</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#051424] text-xs border border-[#1c2b3c]">
              <div className="flex items-center gap-1 text-slate-400">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Chawkbazar Shop 204</span>
              </div>
              <span className="font-mono text-white font-bold">1 pc • ৳550</span>
            </div>
          </div>
        </div>

        {/* ── 5. Financial Clearance Card ── */}
        <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
            <span className="text-sm font-bold text-white">Financial Clearance</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">TxID: 9K82JD01</span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>Items Subtotal (3 pcs)</span>
              <span className="font-mono font-semibold text-white">৳1,650</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Steadfast Subsidized Express</span>
              <span className="font-mono font-semibold text-white">৳60</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400 pt-1 bg-[#122131] px-2.5 py-1.5 rounded-lg">
              <span className="font-medium">Total Procured Cost (Wholesale)</span>
              <span className="font-mono font-bold">৳940</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-white">Customer Paid</span>
              <span className="font-mono text-base text-indigo-400 font-bold">৳1,710</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Estimated Gross Profit
                </span>
                <span className="text-[11px] text-slate-400">Post Courier &amp; Wholesale</span>
              </div>
            </div>
            <span className="font-mono text-xl text-emerald-400 font-black">৳710</span>
          </div>
        </div>

        {/* ── 6. Order Live Milestone (Vertical Stepper) ── */}
        <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 shadow-md flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-1 border-b border-[#1c2b3c]">
            <History className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Order Live Milestone</h2>
          </div>

          <div className="relative pl-6 flex flex-col gap-4">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#1c2b3c]" />

            {/* Milestone 1 */}
            <div className="relative flex items-start gap-2.5">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-[#0d1c2d]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white font-bold">11:15 AM</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c2b3c] text-slate-400 font-semibold">
                    Webstore API
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Order placed by client &amp; bKash payment verified
                </span>
              </div>
            </div>

            {/* Milestone 2 */}
            <div className="relative flex items-start gap-2.5">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-[#0d1c2d]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white font-bold">11:20 AM</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c2b3c] text-slate-400 font-semibold">
                    Ops Engine
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Sent to Dhaka Live Sourcing Shortlist queue
                </span>
              </div>
            </div>

            {/* Milestone 3 (Active) */}
            <div className="relative flex items-start gap-2.5">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-indigo-500 animate-pulse ring-4 ring-[#0d1c2d]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-400 font-bold">11:42 AM</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    IN PROGRESS
                  </span>
                </div>
                <span className="text-xs text-white font-medium">
                  In Sourcing (Rig #04 - {runnerName} at Paltan)
                </span>
              </div>
            </div>

            {/* Milestone 4 (Pending) */}
            <div className="relative flex items-start gap-2.5 opacity-60">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-slate-600 ring-4 ring-[#0d1c2d]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 font-bold">3:30 PM</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c2b3c] text-slate-500 font-semibold">
                    TARGET BENCH
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Van Departure • Steadfast Express Hub Intake
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. Sticky Bottom Action Bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-4 bg-[#051424]/95 backdrop-blur-xl border-t border-[#172a3e] shadow-2xl flex items-center gap-3">
        <a
          href={`tel:${customerPhone}`}
          className="h-12 px-4 rounded-xl bg-[#1c2b3c] hover:bg-[#273647] text-white flex items-center justify-center gap-2 active:scale-98 transition shrink-0"
        >
          <PhoneCall className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">Call Customer</span>
        </a>
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 transition"
        >
          <CheckSquare className="w-5 h-5" />
          <span>Back to Shortlist</span>
        </button>
      </div>
    </div>
  );
}
