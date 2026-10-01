// app/admin/shortlist/components/mobile/MobileOrdersDemandSheet.tsx
// 100% Mobile Pixel Parity for Stitch Screen b453857e36f34d3c805ea3a4e4a5d35b
// Slide-Up Bottom Sheet showing Customer Orders Demanding the Selected SKU

'use client';

import React from 'react';
import { WholesaleSkuRow, LinkedOrderDemand } from '../../types';
import {
  X,
  Clock,
  MessageSquare,
  Receipt,
  CheckCircle,
  Truck,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export interface EnrichedOrderDemand extends LinkedOrderDemand {
  customerName?: string;
  phone?: string;
  address?: string;
  area?: string;
  courierService?: string;
  orderTotal?: number;
  paymentMethod?: 'bKash' | 'COD' | 'Nagad' | 'Card';
  urgencyLabel?: string;
  acquiredStatus?: string;
}

interface MobileOrdersDemandSheetProps {
  sku: WholesaleSkuRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (order: EnrichedOrderDemand) => void;
  onAcquireClick?: (sku: WholesaleSkuRow) => void;
  onPrintThermalSlipClick?: (sku: WholesaleSkuRow) => void;
}

export default function MobileOrdersDemandSheet({
  sku,
  isOpen,
  onClose,
  onSelectOrder,
  onAcquireClick,
  onPrintThermalSlipClick,
}: MobileOrdersDemandSheetProps) {
  if (!sku) return null;

  const totalDemand = sku.requiredQuantity || 1;
  const pickedQty = sku.pickedQuantity || 0;
  const remainingQty = Math.max(0, totalDemand - pickedQty);

  const [customerDataMap, setCustomerDataMap] = React.useState<Map<string, EnrichedOrderDemand>>(new Map());
  const [loadingMap, setLoadingMap] = React.useState<Map<string, boolean>>(new Map());

  React.useEffect(() => {
    if (!sku?.linkedOrders || sku.linkedOrders.length === 0) return;
    let isMounted = true;

    async function fetchAllLinkedOrders() {
      for (const lo of sku?.linkedOrders || []) {
        const idToFetch = lo.orderId || lo.orderNumber;
        if (!idToFetch) continue;
        const cleanId = idToFetch.replace(/^#/, '');

        setLoadingMap((prev) => new Map(prev).set(lo.orderId, true));

        try {
          const res = await fetch(`/api/admin/orders/${cleanId}`, {
            credentials: 'include',
          });
          if (res.ok) {
            const json = await res.json();
            const ord = json.order || json.data || json;
            if (isMounted && ord) {
              const fullName = ord.user
                ? `${ord.user.firstName || ''} ${ord.user.lastName || ''}`.trim()
                : 'Customer';
              const phone = ord.user?.phone || '';
              const address = ord.shippingAddress
                ? [
                    ord.shippingAddress.addressLine1,
                    ord.shippingAddress.city,
                    ord.shippingAddress.district,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : '';
              const area =
                ord.shippingAddress?.district || ord.shippingAddress?.city || 'Dhaka';
              const courier =
                ord.shippingMethod ||
                (ord.shippingAddress?.city?.toLowerCase() === 'dhaka'
                  ? 'Steadfast Express • Direct Van'
                  : 'Steadfast Courier');
              const payment = (
                ord.paymentMethod?.toLowerCase().includes('bkash')
                  ? 'bKash'
                  : ord.paymentMethod?.toLowerCase().includes('nagad')
                  ? 'Nagad'
                  : 'COD'
              ) as 'bKash' | 'COD' | 'Nagad' | 'Card';
              const total = Number(ord.total) || 0;

              setCustomerDataMap((prev) => {
                const next = new Map(prev);
                next.set(lo.orderId, {
                  ...lo,
                  customerName: fullName || 'Customer',
                  phone,
                  address,
                  area,
                  courierService: courier,
                  orderTotal: total,
                  paymentMethod: payment,
                  urgencyLabel:
                    ord.status === 'CONFIRMED' ? 'Urgent Dispatch' : undefined,
                  acquiredStatus:
                    pickedQty > 0 ? '1 in Bag • 1 Needed' : '0/1 Acquired (Pending)',
                });
                return next;
              });
            }
          }
        } catch {
          // ignore error
        } finally {
          if (isMounted) {
            setLoadingMap((prev) => {
              const next = new Map(prev);
              next.set(lo.orderId, false);
              return next;
            });
          }
        }
      }
    }

    fetchAllLinkedOrders();
    return () => {
      isMounted = false;
    };
  }, [sku, pickedQty]);

  const rawLinkedOrders: LinkedOrderDemand[] = sku.linkedOrders && sku.linkedOrders.length > 0
    ? sku.linkedOrders
    : [
        {
          orderId: 'ord-fallback-1',
          orderNumber: 'ORD-65412890',
          quantity: 2,
          shippingType: 'Express',
        },
      ];

  const ordersList: EnrichedOrderDemand[] = rawLinkedOrders.map((lo) => {
    const fetched = customerDataMap.get(lo.orderId);
    if (fetched) return fetched;
    return {
      ...lo,
      customerName: undefined,
      phone: undefined,
      address: undefined,
      area: undefined,
      courierService: undefined,
      orderTotal: undefined,
      paymentMethod: undefined,
      urgencyLabel: undefined,
      acquiredStatus: undefined,
    };
  });

  const totalWholesaleAlloc = ordersList.reduce(
    (sum, o) => sum + (o.quantity * (sku.financials?.unitCost || 320)),
    0
  );

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(1, 15, 31, 0.82)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full h-full flex flex-col justify-end">
        {/* Dismiss Backdrop */}
        <div className="flex-1 w-full" onClick={onClose} />

        {/* Bottom Sheet Container */}
        <div
          className={`w-full max-h-[90vh] bg-[#0d1c2d] border-t border-[#1f2f45] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Grab Handle */}
          <div
            onClick={onClose}
            className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer shrink-0"
          >
            <div className="w-12 h-1.5 rounded-full bg-[#273647]" />
          </div>

          {/* Sheet Header */}
          <div className="px-4 pb-3 border-b border-[#1c2b3c] flex items-start justify-between gap-2 shrink-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold tracking-wider">
                  {sku.sku}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                  {ordersList.length} Orders • {totalDemand} pcs Total
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c2b3c] text-amber-300 font-bold">
                  {pickedQty} Acquired / {remainingQty} Left
                </span>
              </div>
              <h2 className="text-lg leading-tight text-white font-extrabold truncate">
                Orders Demanding this SKU
              </h2>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {sku.title} • {sku.variantOrShade} {sku.volumeSpec ? `• ${sku.volumeSpec}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1c2b3c] hover:bg-[#273647] active:scale-90 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition"
              aria-label="Close Orders Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Sheet Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {/* Urgency Dispatch Cutoff Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-white flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-300 leading-tight">
                    Urgent Dispatch Cutoff
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Runner must acquire {remainingQty} pcs within 42m for evening batch couriers
                  </span>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-[#1c2b3c] text-amber-300 font-mono font-bold shrink-0">
                42m Left
              </span>
            </div>

            {/* List of Waiting Customer Order Cards */}
            {ordersList.map((order, idx) => {
              const isItemLoading = loadingMap.get(order.orderId) ?? (!order.customerName);
              if (isItemLoading && !order.customerName) {
                return (
                  <article
                    key={order.orderId || idx}
                    className="p-3.5 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 bg-slate-700/60 rounded" />
                      <div className="h-4 w-16 bg-slate-700/60 rounded" />
                    </div>
                    <div className="h-3 w-40 bg-slate-700/60 rounded" />
                    <div className="h-16 w-full bg-[#051424] rounded-xl" />
                  </article>
                );
              }

              return (
                <article
                  key={order.orderId || idx}
                  onClick={() => onSelectOrder && onSelectOrder(order)}
                  className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] hover:border-indigo-500 flex flex-col gap-2.5 shadow-sm transition cursor-pointer active:scale-[0.99]"
                >
                {/* Order Top: ID, Badges, Name, Contact Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        #{order.orderNumber}
                      </span>
                      {order.shippingType === 'Express' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                          2x Express
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-slate-400 font-bold uppercase">
                          {order.shippingType || 'Standard'}
                        </span>
                      )}
                      {order.urgencyLabel && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 font-bold">
                          {order.urgencyLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-white truncate mt-1">
                      {order.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {order.address}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {order.phone && (
                      <a
                        href={`tel:${order.phone}`}
                        className="w-8 h-8 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-emerald-400 flex items-center justify-center active:scale-90 transition"
                        aria-label={`Call ${order.customerName}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {order.phone && (
                      <a
                        href={`sms:${order.phone}`}
                        className="w-8 h-8 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-indigo-400 flex items-center justify-center active:scale-90 transition"
                        aria-label={`SMS ${order.customerName}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Logistics & Payment Block */}
                <div className="p-2.5 rounded-xl bg-[#051424] border border-[#1c2b3c] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Courier Service
                    </span>
                    <span className="font-semibold text-slate-200 truncate flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-indigo-400" />
                      {order.courierService}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      SKU Qty Demanded
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-indigo-400">
                        {order.quantity} pcs
                      </span>
                      {order.acquiredStatus && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                          {order.acquiredStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1c2b3c]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Order Value &amp; Payment
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatPrice(order.orderTotal || 1710)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          order.paymentMethod === 'bKash' || order.paymentMethod === 'Nagad'
                            ? 'bg-[#1c2b3c] text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {order.paymentMethod === 'COD' ? 'Cash On Delivery' : `Paid ${order.paymentMethod}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tap Hint */}
                <div className="flex items-center justify-end gap-1 text-[11px] text-indigo-400 font-medium">
                  <span>View Customer Order Peek</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </article>
            );
          })}
          </div>

          {/* Footer Actions */}
          <div className="p-4 pt-3 pb-8 bg-[#051424] border-t border-[#1c2b3c] flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">
                Total SKU Allocation
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {totalDemand} pcs • {ordersList.length} Clients (Wholesale: {formatPrice(totalWholesaleAlloc)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPrintThermalSlipClick && onPrintThermalSlipClick(sku)}
                className="h-12 px-4 rounded-xl bg-[#1c2b3c] hover:bg-[#273647] text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                <span>Print Slips</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onAcquireClick) onAcquireClick(sku);
                }}
                className="flex-1 h-12 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-98 text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-lg transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Acquire All ({remainingQty} Remaining)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
