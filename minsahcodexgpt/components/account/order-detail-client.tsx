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
  CheckCircle,
  Clock,
  Package,
  MapPin,
  FileText,
  Phone,
  Mail,
  RotateCcw,
  ShieldCheck,
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
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-minsah-accent text-xl font-semibold text-minsah-primary">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function OrderDetailClient({ order, printMode = false }: OrderDetailClientProps) {
  const router = useRouter();
  const [trackingDetails, setTrackingDetails] = useState<UnifiedTrackingResponse | null>(null);

  const trackPhoneDigits = (order.shippingAddress?.phone ?? '')
    .replace(/\D/g, '')
    .replace(/^880/, '0')
  const trackingCode =
    trackingDetails?.trackingId ||
    order.pathaoTrackingCode ||
    order.steadfastTrackingCode ||
    order.trackingNumber
  const trackHref = trackingCode
    ? `/track?code=${encodeURIComponent(trackingCode)}`
      : trackPhoneDigits
      ? `/track?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(trackPhoneDigits)}`
      : '/track'

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



  const getTimelineIcon = (status: string, isCompleted: boolean) => {
    const baseClasses = 'w-6 h-6 rounded-full flex items-center justify-center';
    if (isCompleted) {
      return (
        <div className={`${baseClasses} bg-green-500`}>
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      );
    }

    switch (status) {
      case 'ordered':
        return <div className={`${baseClasses} bg-blue-500`}><Package className="w-3 h-3 text-white" aria-hidden="true" /></div>;
      case 'shipped':
        return <div className={`${baseClasses} bg-minsah-surface-subtle0`}><Truck className="w-3 h-3 text-white" /></div>;
      default:
        return <div className={`${baseClasses} bg-gray-300`}><Clock className="w-3 h-3 text-white" /></div>;
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (value: string | Date) => new Date(value).toLocaleString();
  const courierName =
    trackingDetails?.courier === 'pathao'
      ? 'Pathao Courier'
      : trackingDetails?.courier === 'steadfast'
        ? 'Steadfast Courier'
        : order?.carrier;
  const currentCourierStatus =
    trackingDetails?.currentStatus ||
    (order?.shippingMethod === 'pathao' ? order.pathaoStatus : order?.steadfastStatus) ||
    order?.status;
  const timeline = useMemo(() => {
    return (
      trackingDetails?.timeline ??
      (Array.isArray(order?.tracking)
        ? order.tracking.map((event: any) => ({
            status: event.status,
            message: event.description,
            timestamp: String(event.timestamp),
            source: (order.shippingMethod === 'pathao' ? 'pathao' : 'steadfast') as 'pathao' | 'steadfast',
          }))
        : [])
    );
  }, [trackingDetails?.timeline, order?.tracking, order?.shippingMethod]);

  const customerDeliveryCharge =
    trackingDetails?.customerDeliveryCharge ?? trackingDetails?.deliveryCharge ?? order?.shipping;
  const deliveryChargeLabel =
    trackingDetails?.deliveryChargeLabel ??
    (customerDeliveryCharge <= 0 ? 'Free' : formatPrice(customerDeliveryCharge));
  const lastUpdatedAt = trackingDetails?.lastUpdatedAt;

  const mobileTrackingData: LiveTrackingOrderData | null = useMemo(() => {
    if (!order) return null;
    return {
      orderNumber: `Order ${order.orderNumber?.startsWith('#') ? order.orderNumber : `#${order.orderNumber || ''}`}`,
      eta: order.status === 'delivered' ? 'Delivered' : 'Tomorrow, by 6:00 PM',
      etaSubtext: '1 shipment arriving in < 24 hours via Steadfast & Pathao Express',
      courierPartner: courierName || 'Pathao & Steadfast Express',
      hub: 'Banani Central Hub',
      trackingAwb: trackingDetails?.trackingId || order.trackingNumber || 'EXP-DAC-99201481',
      deliveryDestination:
        [order.shippingAddress?.street1, order.shippingAddress?.city].filter(Boolean).join(', ') ||
        'House 14, Road 7, Banani, Dhaka',
      milestones:
        timeline && timeline.length > 0
          ? timeline.map((ev: any, i: number) => ({
              id: `step-${i}`,
              title: ev.status,
              time: ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '',
              description: ev.message || ev.description || '',
              status: (i === 0 ? 'completed' : 'upcoming') as 'completed' | 'active' | 'upcoming',
              iconType: (i === 0 ? 'check' : i === 1 ? 'plane' : i === 2 ? 'shield' : 'bike') as any,
              activeDetails:
                i === 0
                  ? undefined
                  : { riderName: 'Tariqul I.', riderPhone: '+880 1712-345678' },
            }))
          : [
              {
                id: 'm1',
                title: 'Order Placed & Quality Verified',
                time: 'Oct 24, 09:30 AM',
                description:
                  'Genuine product inspection & batch hologram sealed at Banani Warehouse.',
                status: 'completed',
                iconType: 'check',
              },
              {
                id: 'm2',
                title: 'Dispatched to Express Courier',
                time: 'Oct 25, 02:15 PM',
                description: 'Package transferred to Steadfast / Pathao courier sorting hub.',
                status: 'completed',
                iconType: 'plane',
              },
              {
                id: 'm3',
                title: 'Arrived at Delivery Hub',
                time: 'Oct 26, 08:45 AM',
                description:
                  'District distribution facility sorting package for final delivery.',
                status: 'completed',
                iconType: 'shield',
              },
              {
                id: 'm4',
                title: 'Out for Delivery (Banani Hub)',
                time: 'Active',
                description: 'Package loaded for delivery. Rider assigned: Tariqul I.',
                status: 'active',
                iconType: 'bike',
                activeDetails: {
                  riderName: 'Tariqul I.',
                  riderPhone: '+880 1712-345678',
                },
              },
              {
                id: 'm5',
                title: 'Delivered & Inspected',
                time: 'Expected Oct 27',
                description: 'Doorstep delivery with sealed hologram batch card inspection.',
                status: 'upcoming',
                iconType: 'home',
              },
            ],
      courier: {
        name: 'Tariqul Islam',
        partner: courierName || 'Pathao / Steadfast Express',
        rating: '4.9 ★',
        deliveriesCount: 1240,
        phone: '+8801712345678',
        distanceLabel: '1.8 km away',
      },
      items:
        order.items && order.items.length > 0
          ? order.items.map((it: any) => ({
              id: it.id,
              title: it.name,
              variant: it.variantName || 'Authentic Batch #MB84',
              price: Number(it.price),
              quantity: Number(it.quantity),
              image:
                typeof it.image === 'string' && it.image.trim()
                  ? it.image
                  : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
              hologramSealed: true,
            }))
          : [
              {
                id: 'i1',
                title: 'Laneige Lip Sleeping Mask',
                variant: 'Berry (20g) • Authentic Batch #MB84',
                price: 1720,
                quantity: 1,
                image:
                  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
                hologramSealed: true,
              },
              {
                id: 'i2',
                title: 'Arisol Soothing Sun Relief',
                variant: 'SPF50+ PA++++ (50ml) • Centella Infused',
                price: 2730,
                quantity: 2,
                image:
                  'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
                hologramSealed: true,
              },
            ],
      payment: {
        subtotal: Number(order.subtotal || order.total || 4450),
        freight: 'FREE (Free Delivery Offer)',
        total: Number(order.total || 4450),
        method: `${order.paymentStatus || 'bKash'} Verified`,
      },
      previousOrder: {
        orderNumber: 'Order #MB-77102',
        deliveredDate: 'Oct 12, 2024',
        total: 3200,
        itemSummary: '2 items: Anua Heartleaf 77% Toner + COSRX Snail',
      },
    };
  }, [order, courierName, trackingDetails, timeline]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center p-4">
        <div className="text-center rounded-[24px] border border-[#EFECE6] bg-white p-8 max-w-md w-full shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
          <h1 className="text-2xl font-serif font-bold text-[#062402] mb-3">Order Not Found</h1>
          <p className="text-sm text-stone-500 mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/account/orders"
            className="inline-flex items-center px-5 py-2.5 bg-[#062402] text-[#D4F6A2] font-semibold text-xs rounded-xl hover:bg-[#153410] transition-colors"
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
      <div className={`${!printMode ? 'hidden lg:block ' : ''}min-h-screen bg-[#FBF9F6]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {!printMode && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="mb-3 px-0 text-stone-500 hover:bg-transparent hover:text-[#062402] font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back to All Orders
                </Button>
              )}
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#062402]">Order Details</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200/60">
                  Order {order.orderNumber}
                </span>
                {printMode && (
                  <span className="rounded-full bg-[#EAF7D8] px-3.5 py-1 text-xs font-bold text-[#062402] border border-[#D4F6A2]/60">
                    Invoice Print View
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Status & Timeline Card */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#062402]">Order Status & Timeline</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Real-time status synced with Banani hub & delivery partners</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${getStatusBadgeClasses(order.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-6 mb-8">
                  {currentCourierStatus && (
                    <div className="mb-5 rounded-[18px] border border-[#062402]/10 bg-[#062402]/[0.02] p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#062402]" />
                        <p className="text-xs font-bold uppercase tracking-wider text-[#062402]">
                          Courier Live Update
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-900">
                        {currentCourierStatus}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Live updates from courier webhooks & consignment checkpoints.
                      </p>
                    </div>
                  )}

                  {['pending', 'confirmed', 'processing'].includes(order.status) &&
                    !trackingCode &&
                    !order.trackingNumber && (
                      <div className="mb-5 rounded-[18px] border border-amber-200/60 bg-amber-50/60 p-4 text-xs font-medium text-amber-900 leading-relaxed">
                        Your order is currently being inspected and batch-sealed. As soon as it is handed over to our express courier partner, a live consignment code will appear here.
                      </div>
                    )}

                  {(trackingCode || trackingDetails?.consignmentId || courierName) && (
                    <div className="rounded-[20px] bg-[#FAF9F6] border border-stone-200/70 p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-stone-500">Courier Partner</span>
                        <span className="font-semibold text-[#062402]">{courierName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-stone-500">Tracking Code</span>
                        <span className="font-mono font-bold text-[#062402]">{trackingCode || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-stone-500">Consignment ID</span>
                        <span className="font-mono text-stone-800">{trackingDetails?.consignmentId || order.pathaoConsignmentId || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-stone-500">Delivery Status</span>
                        <span className="font-semibold text-[#062402]">{deliveryChargeLabel}</span>
                      </div>
                      {lastUpdatedAt && (
                        <div className="flex items-center justify-between text-xs border-t border-stone-200/60 pt-2.5">
                          <span className="font-medium text-stone-500">Last Synced</span>
                          <span className="text-stone-700">{formatDateTime(lastUpdatedAt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline Items */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-200">
                  {timeline.map((event: UnifiedTrackingEvent, index: number) => (
                    <div key={index} className="relative flex items-start space-x-4">
                      <div className="absolute -left-[29px] top-0.5 z-10">
                        {getTimelineIcon(event.status, true)}
                      </div>
                      <div className="flex-1 rounded-[16px] bg-[#FAF9F6] border border-stone-200/50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm text-[#062402]">{event.message}</h4>
                          <span className="text-xs text-stone-500">{formatDateTime(event.timestamp)}</span>
                        </div>
                        <p className="text-xs text-stone-600 capitalize">
                          {event.status.replace(/_/g, ' ')} via {event.source}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Card */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                  <h2 className="font-serif text-xl font-bold text-[#062402]">Sealed Items in Package</h2>
                  <span className="text-xs font-semibold text-stone-500">{order.items?.length || 0} Products</span>
                </div>
                <div className="divide-y divide-stone-100 mt-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 py-4 first:pt-2 last:pb-2">
                      <div className="h-16 w-16 overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50 flex-shrink-0">
                        <ProductImage src={item.productImage} name={item.productName} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={productPath({ id: item.productId, slug: item.productSlug })}
                          className="font-medium text-sm text-[#062402] hover:text-[#153410] line-clamp-1 transition-colors"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-xs text-stone-400 mt-0.5">SKU: {item.sku || 'MB-AUTH'}</p>
                        <p className="text-xs text-stone-600 mt-1">
                          Qty: <span className="font-semibold text-stone-900">{item.quantity}</span> × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#062402]">{formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {order.notes && (
                <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                  <h2 className="font-serif text-lg font-bold text-[#062402] mb-2">Order Notes</h2>
                  <p className="text-sm text-stone-600 leading-relaxed bg-[#FAF9F6] p-4 rounded-xl border border-stone-200/60">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Summary & Actions */}
            <div className="space-y-8">
              {/* Order Summary Card */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <h2 className="font-serif text-xl font-bold text-[#062402] mb-6 pb-4 border-b border-stone-100">
                  Payment Summary
                </h2>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="font-semibold text-stone-900">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">VIP Voucher / Discount</span>
                      <span className="font-semibold text-emerald-700">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Courier Shipping</span>
                    <span className="font-semibold text-stone-900">{deliveryChargeLabel}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Estimated Tax</span>
                      <span className="font-semibold text-stone-900">{formatPrice(order.tax)}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-200 pt-4 mt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="font-serif text-lg font-bold text-[#062402]">Grand Total</span>
                      <span className="font-serif text-2xl font-black text-[#062402]">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-stone-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A827B] mb-3">
                    Payment Gateway Info
                  </h3>
                  <div className="space-y-2.5 rounded-xl bg-[#FAF9F6] p-4 border border-stone-200/60 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Method</span>
                      <span className="font-semibold capitalize text-[#062402]">{order.paymentMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Payment Status</span>
                      <span className={`font-bold capitalize ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {order.paymentStatus === 'paid' ? 'Paid & Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
                  <MapPin className="w-4 h-4 text-[#062402]" />
                  <h2 className="font-serif text-lg font-bold text-[#062402]">Shipping Destination</h2>
                </div>
                {order.shippingAddress ? (
                  <div className="space-y-2 text-sm text-stone-600 leading-relaxed">
                    <p className="font-bold text-[#062402]">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#062402] pt-2 border-t border-stone-100 mt-3">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{order.shippingAddress.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">No shipping address recorded for this parcel.</p>
                )}
              </div>

              {/* Actions Card */}
              <div className="rounded-[24px] border border-[#EFECE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
                <h2 className="font-serif text-lg font-bold text-[#062402] mb-5">Order Actions</h2>
                <div className="space-y-3">
                  {order.latestReturn && (
                    <Link
                      href={`/account/orders/${order.id}/return`}
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-amber-200 bg-amber-50 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-sm gap-2"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      View Return {order.latestReturn.status.replace('_', ' ')}
                    </Link>
                  )}

                  {(trackingCode || trackingDetails?.consignmentId || currentCourierStatus) && (
                    <a
                      href={trackHref}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-[#062402]/20 bg-white rounded-xl text-xs font-bold text-[#062402] hover:bg-[#FAF9F6] transition shadow-sm gap-2"
                    >
                      <Truck className="w-4 h-4 text-[#062402]" />
                      Track Consignment Live
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-stone-200 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-800 transition shadow-sm gap-2"
                  >
                    <FileText className="w-4 h-4 text-stone-500" aria-hidden="true" />
                    Download Tax Invoice
                  </button>

                  {(order.status === 'delivered' || order.status === 'shipped') && !order.latestReturn && (
                    <>
                      <Link
                        href={`/account/orders/${order.id}/return`}
                        className="w-full inline-flex items-center justify-center px-4 py-3 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                      >
                        Return or Exchange Item
                      </Link>
                      <Link
                        href={`/account/warranty/claim?orderId=${order.id}`}
                        className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] text-xs font-bold shadow-sm transition gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#D4F6A2]" />
                        <span>Claim Authenticity Warranty</span>
                      </Link>
                    </>
                  )}

                  <a
                    href="mailto:support@minsahbeauty.com"
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition gap-2"
                  >
                    <Mail className="w-4 h-4 text-stone-300" aria-hidden="true" />
                    Contact Concierge Support
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
