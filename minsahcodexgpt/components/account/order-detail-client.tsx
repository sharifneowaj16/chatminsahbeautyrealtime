'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/utils/currency';
import { productPath } from '@/lib/product-url';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Button } from '@/components/ui/Button';
import LiveTrackingMobileView from '@/components/account/mobile/order-detail/LiveTrackingMobileView';
import type { LiveTrackingOrderData } from '@/components/account/mobile/order-detail/types';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  FileText,
  Phone,
  Mail,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Printer,
} from 'lucide-react';

interface OrderDetailClientProps {
  order: any;
  printMode?: boolean;
}

interface UnifiedTrackingEvent {
  status: string;
  message: string;
  timestamp: string;
  source: 'pathao' | 'steadfast';
}

interface UnifiedTrackingResponse {
  courier: 'pathao' | 'steadfast';
  trackingId: string | null;
  consignmentId: string | null;
  currentStatus: string;
  lastUpdatedAt: string | null;
  customerDeliveryCharge: number;
  deliveryCharge: number;
  deliveryChargeLabel?: string;
  timeline: UnifiedTrackingEvent[];
}

function ProductImage({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <CatalogProductImage
        src={src}
        alt={name ? `${name} product image` : 'Product image'}
        sizes="64px"
        padding="sm"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#18191a] text-base font-semibold text-[#828fff]">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function OrderDetailClient({ order, printMode = false }: OrderDetailClientProps) {
  const router = useRouter();
  const [trackingDetails, setTrackingDetails] = useState<UnifiedTrackingResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trackPhoneDigits = (order?.shippingAddress?.phone ?? '')
    .replace(/\D/g, '')
    .replace(/^880/, '0');
  const trackingCode =
    trackingDetails?.trackingId ||
    order?.pathaoTrackingCode ||
    order?.steadfastTrackingCode ||
    order?.trackingNumber;

  const trackHref = trackingCode
    ? `/track?code=${encodeURIComponent(trackingCode)}`
    : trackPhoneDigits
    ? `/track?order=${encodeURIComponent(order?.orderNumber || '')}&phone=${encodeURIComponent(trackPhoneDigits)}`
    : '/track';

  useEffect(() => {
    let isCancelled = false;

    const loadTracking = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/tracking`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as UnifiedTrackingResponse;
        if (!isCancelled) {
          setTrackingDetails(data);
        }
      } catch {
        // Keep base order details if tracking lookup fails.
      }
    };

    if (order?.id) {
      void loadTracking();
    }

    return () => {
      isCancelled = true;
    };
  }, [order?.id]);

  useEffect(() => {
    if (!printMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [printMode]);

  const courierName =
    order?.courierPartner ||
    order?.courierName ||
    (order?.pathaoTrackingCode ? 'Pathao Courier' : null) ||
    (order?.steadfastTrackingCode ? 'Steadfast Courier' : null) ||
    trackingDetails?.courier ||
    'Courier Partner';

  const currentCourierStatus =
    trackingDetails?.currentStatus ||
    order?.deliveryStatus ||
    order?.steadfastStatus ||
    null;

  const deliveryChargeLabel =
    trackingDetails?.deliveryChargeLabel ||
    (order?.shipping > 0 ? formatPrice(order.shipping) : 'FREE Express Delivery');

  const timeline = trackingDetails?.timeline || [];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      delivered: { bg: 'bg-[#27a644]/15', text: 'text-[#27a644]', border: 'border-[#27a644]/30' },
      shipped: { bg: 'bg-[#5e6ad2]/15', text: 'text-[#828fff]', border: 'border-[#5e6ad2]/30' },
      processing: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
      confirmed: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
      cancelled: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
      refunded: { bg: 'bg-[#5e6ad2]/15', text: 'text-[#828fff]', border: 'border-[#5e6ad2]/30' },
    };
    const s = map[status] ?? { bg: 'bg-[#18191a]', text: 'text-[#8a8f98]', border: 'border-[#23252a]' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const mobileTrackingData: LiveTrackingOrderData | null = useMemo(() => {
    if (!order) return null;
    return {
      orderNumber: `Order ${order.orderNumber?.startsWith('#') ? order.orderNumber : `#${order.orderNumber || ''}`}`,
      eta:
        order.status === 'delivered'
          ? 'Delivered'
          : order.estimatedDeliveryDate
          ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
          : 'In Transit',
      etaSubtext: courierName ? `Shipment handled via ${courierName}` : 'Express delivery in transit',
      courierPartner: courierName || 'Courier Partner',
      hub: order.shippingAddress?.city || 'Dhaka Hub',
      trackingAwb:
        trackingDetails?.trackingId ||
        order.pathaoTrackingCode ||
        order.steadfastTrackingCode ||
        order.trackingNumber ||
        '',
      deliveryDestination:
        [order.shippingAddress?.street1, order.shippingAddress?.city].filter(Boolean).join(', ') ||
        'Address on file',
      milestones:
        timeline && timeline.length > 0
          ? timeline.map((ev: any, i: number) => ({
              id: `step-${i}`,
              title: ev.status || 'Status update',
              time: ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '',
              description: ev.message || ev.description || '',
              status: (i === 0 ? 'completed' : 'upcoming') as 'completed' | 'active' | 'upcoming',
              iconType: (i === 0 ? 'check' : i === 1 ? 'plane' : i === 2 ? 'shield' : 'bike') as any,
            }))
          : [],
      courier: courierName
        ? {
            name: courierName,
            partner: courierName,
          }
        : null,
      items: (order.items || []).map((it: any) => ({
        id: it.id,
        title: it.name || it.product?.name || 'Product',
        variant: it.variantName || it.variant?.name || '',
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 1),
        image: it.image || it.product?.image || '/images/categories/Serum.png',
        hologramSealed: true,
      })),
      payment: {
        subtotal: Number(order.subtotal || order.total || 0),
        freight: order.shipping > 0 ? `৳${order.shipping}` : 'FREE',
        total: Number(order.total || 0),
        method: `${order.paymentMethod || order.paymentStatus || 'Online'} Verified`,
      },
      previousOrder: undefined,
    };
  }, [order, courierName, trackingDetails, timeline]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#010102] flex items-center justify-center p-4">
        <div className="text-center rounded-2xl border border-[#23252a] bg-[#0f1011] p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-xl font-bold text-[#f7f8f8] mb-2">Order Not Found</h1>
          <p className="text-xs text-[#8a8f98] mb-6">The order record requested does not exist or has been archived.</p>
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center h-11 px-5 bg-[#5e6ad2] hover:bg-[#828fff] text-white font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {!printMode && mobileTrackingData && <LiveTrackingMobileView orderData={mobileTrackingData} />}
      <div className={`${!printMode ? 'hidden lg:block ' : ''}min-h-screen bg-[#010102] text-[#f7f8f8]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {!printMode && (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mb-2 text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Back to All Orders</span>
                </button>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8]">Order Details</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#828fff] bg-[#5e6ad2]/10 px-2.5 py-0.5 rounded-md border border-[#5e6ad2]/20">
                  #{order.orderNumber}
                </span>
                {getStatusBadge(order.status)}
                {printMode && (
                  <span className="rounded-md bg-[#27a644]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#27a644] border border-[#27a644]/30">
                    Official Tax Invoice
                  </span>
                )}
              </div>
            </div>

            {!printMode && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center h-10 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#f7f8f8] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer gap-2"
              >
                <Printer className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>Print Invoice</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Status & Timeline Card */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
                  <div>
                    <h2 className="text-sm font-semibold text-[#f7f8f8]">Logistics & Checkpoint Telemetry</h2>
                    <p className="text-xs text-[#8a8f98] mt-0.5">Real-time status synced with Banani hub & delivery partners</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="mt-4 mb-6">
                  {currentCourierStatus && (
                    <div className="mb-4 rounded-xl border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 p-3.5">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#828fff]" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#828fff]">
                          Courier Live Update
                        </p>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-medium text-[#f7f8f8]">
                        {currentCourierStatus}
                      </p>
                    </div>
                  )}

                  {['pending', 'confirmed', 'processing'].includes(order.status) &&
                    !trackingCode &&
                    !order.trackingNumber && (
                      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed">
                        Your parcel is being batch-sealed and hologram inspected. A live consignment code will appear as soon as the courier scans the parcel.
                      </div>
                    )}

                  {(trackingCode || trackingDetails?.consignmentId || courierName) && (
                    <div className="rounded-xl bg-[#141516] border border-[#23252a] p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8a8f98]">Courier Partner</span>
                        <span className="font-semibold text-[#f7f8f8]">{courierName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8a8f98]">Tracking Code</span>
                        <span className="font-mono font-bold text-[#828fff]">{trackingCode || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8a8f98]">Delivery Fee</span>
                        <span className="font-semibold text-[#27a644]">{deliveryChargeLabel}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline Items */}
                {timeline.length > 0 && (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#23252a]">
                    {timeline.map((event: UnifiedTrackingEvent, index: number) => (
                      <div key={index} className="relative flex items-start space-x-3">
                        <div className="absolute -left-[27px] top-0.5 z-10 w-5 h-5 rounded-full bg-[#5e6ad2] flex items-center justify-center text-white">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div className="flex-1 rounded-xl bg-[#141516] border border-[#23252a] p-3 text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="font-semibold text-[#f7f8f8]">{event.message}</h4>
                            <span className="text-[11px] text-[#8a8f98] font-mono">
                              {mounted ? new Date(event.timestamp).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8a8f98] capitalize">
                            {event.status.replace(/_/g, ' ')} via {event.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Card */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
                  <h2 className="text-sm font-semibold text-[#f7f8f8]">Package Contents & Verification</h2>
                  <span className="text-xs text-[#8a8f98]">{order.items?.length || 0} Products</span>
                </div>
                <div className="divide-y divide-[#23252a] mt-3">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-1">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#23252a] bg-[#141516] flex-shrink-0">
                        <ProductImage src={item.productImage} name={item.productName} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={productPath({ id: item.productId, slug: item.productSlug })}
                          className="font-medium text-xs sm:text-sm text-[#f7f8f8] hover:text-[#828fff] line-clamp-1 transition-colors"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-[11px] text-[#8a8f98] mt-0.5 font-mono">SKU: {item.sku || 'MB-AUTH'}</p>
                        <p className="text-xs text-[#8a8f98] mt-0.5 font-mono">
                          Qty: <span className="text-[#f7f8f8] font-semibold">{item.quantity}</span> × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-xs sm:text-sm text-[#f7f8f8] font-mono">{formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Summary & Actions */}
            <div className="space-y-6">
              {/* Order Summary Card */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-6 shadow-2xl">
                <h2 className="text-sm font-semibold text-[#f7f8f8] mb-4 pb-3 border-b border-[#23252a]">
                  Payment Breakdown
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8a8f98]">Subtotal</span>
                    <span className="font-semibold text-[#f7f8f8] font-mono">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#8a8f98]">VIP Voucher Discount</span>
                      <span className="font-semibold text-[#27a644] font-mono">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#8a8f98]">Shipping Freight</span>
                    <span className="font-semibold text-[#f7f8f8] font-mono">{deliveryChargeLabel}</span>
                  </div>
                  <div className="border-t border-[#23252a] pt-3 mt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-[#f7f8f8]">Grand Total</span>
                      <span className="text-lg font-bold text-[#f7f8f8] font-mono">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#23252a]">
                  <div className="rounded-xl bg-[#141516] p-3 border border-[#23252a] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#8a8f98]">Payment Method</span>
                      <span className="font-medium text-[#f7f8f8] capitalize">{order.paymentMethod?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8a8f98]">Payment Status</span>
                      <span className={`font-semibold capitalize ${order.paymentStatus === 'paid' ? 'text-[#27a644]' : 'text-amber-300'}`}>
                        {order.paymentStatus === 'paid' ? 'Paid & Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#23252a]">
                  <MapPin className="w-4 h-4 text-[#828fff]" />
                  <h2 className="text-sm font-semibold text-[#f7f8f8]">Delivery Destination</h2>
                </div>
                {order.shippingAddress ? (
                  <div className="space-y-1.5 text-xs text-[#8a8f98] leading-relaxed">
                    <p className="font-semibold text-[#f7f8f8]">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                    </p>
                    {order.shippingAddress.phone && (
                      <div className="flex items-center gap-2 font-mono text-[#828fff] pt-2 border-t border-[#23252a] mt-2">
                        <Phone className="w-3.5 h-3.5 text-[#8a8f98]" />
                        <span>{order.shippingAddress.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#8a8f98]">No shipping address recorded for this parcel.</p>
                )}
              </div>

              {/* Actions Card */}
              <div className="rounded-2xl border border-[#23252a] bg-[#0f1011] p-6 shadow-2xl">
                <h2 className="text-sm font-semibold text-[#f7f8f8] mb-3">Order Actions</h2>
                <div className="space-y-2.5">
                  {(trackingCode || trackingDetails?.consignmentId || currentCourierStatus) && (
                    <a
                      href={trackHref}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center h-11 px-4 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-semibold shadow-md transition-all gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Track Shipment Live</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full inline-flex items-center justify-center h-11 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#f7f8f8] rounded-xl text-xs font-medium transition-all gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#8a8f98]" />
                    <span>Download Invoice</span>
                  </button>

                  {(order.status === 'delivered' || order.status === 'shipped') && !order.latestReturn && (
                    <>
                      <Link
                        href={`/account/orders/${order.id}/return`}
                        className="w-full inline-flex items-center justify-center h-11 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#8a8f98] hover:text-rose-400 rounded-xl text-xs font-medium transition-all gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Return or Exchange</span>
                      </Link>
                      <Link
                        href={`/account/warranty/claim?orderId=${order.id}`}
                        className="w-full inline-flex items-center justify-center h-11 px-4 bg-[#18191a] hover:bg-[#23252a] border border-[#5e6ad2]/30 text-[#828fff] rounded-xl text-xs font-semibold transition-all gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#828fff]" />
                        <span>Claim Authenticity Warranty</span>
                      </Link>
                    </>
                  )}

                  <a
                    href="mailto:support@minsahbeauty.com"
                    className="w-full inline-flex items-center justify-center h-11 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#8a8f98] rounded-xl text-xs font-medium transition-all gap-2"
                  >
                    <Mail className="w-4 h-4 text-[#8a8f98]" />
                    <span>Concierge Support</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
