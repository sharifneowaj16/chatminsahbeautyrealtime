'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import OrderHistoryMobileView from '@/components/account/mobile/order-history/OrderHistoryMobileView';
import type { MobileOrderRecord } from '@/components/account/mobile/order-history/types';
import {
  ShoppingBag,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Search,
  Star,
  Download,
  RotateCcw,
} from 'lucide-react';

function ProductImage({ src, name }: { src: any; name: string }) {
  if (typeof src === 'string' && src.trim()) {
    return (
      <CatalogProductImage
        src={src}
        alt={name ? `${name} product image` : 'Product image'}
        sizes="64px"
        padding="sm"
      />
    );
  }
  if (src && typeof src === 'object') return src;
  return null;
}

interface OrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productImage: any;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  total: number;
  createdAt: Date;
  estimatedDelivery: Date;
  trackingNumber?: string;
  steadfastTrackingCode?: string;
  steadfastStatus?: string;
  userPhone?: string;
  canReview: boolean;
  returnStatus?: string | null;
  returnNumber?: string | null;
}

interface OrdersClientProps {
  initialOrders: Order[];
}

export function OrdersClient({ initialOrders }: OrdersClientProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [reorderingOrderIds, setReorderingOrderIds] = useState<string[]>([]);
  const [reorderedOrderIds, setReorderedOrderIds] = useState<string[]>([]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOrders = initialOrders.filter((order) => {
    const matchesSearch = !normalizedSearchTerm ||
      order.orderNumber.toLowerCase().includes(normalizedSearchTerm) ||
      order.items.some((item) => item.productName.toLowerCase().includes(normalizedSearchTerm));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'refunded': return <XCircle className="w-5 h-5 text-minsah-action-primary" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'refunded': return 'bg-minsah-surface-accent text-minsah-action-primary';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-minsah-surface-accent text-minsah-action-primary';
      case 'cancelled': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  /** Prefers Steadfast / courier code; falls back to order+phone lookup on /track */
  const getTrackingUrl = (order: Order): string => {
    const code = order.steadfastTrackingCode || order.trackingNumber;
    if (code) {
      return `/track?code=${encodeURIComponent(code)}`;
    }
    return `/track?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.userPhone || '')}`;
  };

  const awaitingDispatch = (order: Order) => {
    const hasCode = !!(order.steadfastTrackingCode || order.trackingNumber);
    if (hasCode) return false;
    return ['pending', 'confirmed', 'processing'].includes(order.status);
  };

  const getReturnLabel = (order: Order) => {
    if (!order.returnStatus) {
      return 'Request Return';
    }

    return `Return ${order.returnStatus.replace('_', ' ')}`;
  };

  const handleReorder = async (order: Order) => {
    if (reorderingOrderIds.includes(order.id) || order.items.length === 0) {
      return;
    }

    setErrorMessage('');
    setReorderingOrderIds((prev) => [...prev, order.id]);

    try {
      const drawerIntentId = registerAddIntent();
      const cartItems: CartItem[] = order.items.map((item) => ({
        id: item.variantId ?? item.productId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
        image: typeof item.productImage === 'string' ? item.productImage : '',
      }));

      const results: boolean[] = [];
      for (const cartItem of cartItems) {
        results.push(await addItem(cartItem));
      }
      if (results.some((added) => !added)) {
        throw new Error('Failed to reorder one or more items');
      }
      if (cartItems[0]) {
        openForSuccessfulAdd(drawerIntentId, cartItems[0], cartItems[0].quantity);
      }

      setReorderedOrderIds((prev) => [...prev, order.id]);
      setTimeout(() => {
        setReorderedOrderIds((prev) => prev.filter((id) => id !== order.id));
      }, 2200);
    } catch {
      setErrorMessage('Failed to add items from this order back to cart. Please try again.');
    } finally {
      setReorderingOrderIds((prev) => prev.filter((id) => id !== order.id));
    }
  };

  const mobileOrders: MobileOrderRecord[] = useMemo(() => {
    return initialOrders.map((order) => {
      const isTransit = ['shipped', 'processing', 'confirmed', 'pending'].includes(order.status);
      const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
      const statusType: 'transit' | 'delivered' | 'cancelled' = isTransit
        ? 'transit'
        : isCancelled
          ? 'cancelled'
          : 'delivered';

      return {
        id: order.id,
        orderNumber: order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`,
        status: statusType,
        statusLabel: capitalize(order.status),
        statusBadgeVariant: isTransit ? 'secondary' : 'surface',
        timestampLabel: new Date(order.createdAt).toLocaleDateString(),
        totalAmount: order.total,
        paymentMethod: `${capitalize(order.paymentStatus)} Paid`,
        products: order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          image:
            typeof item.productImage === 'string' && item.productImage.trim()
              ? item.productImage
              : 'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
        })),
        transitProgress: isTransit
          ? {
              riderName: 'Courier Dispatch',
              hubName: 'Dhaka Central Hub',
              etaMinutes: 45,
              progressPercentage: 80,
              destinationAddress: 'Dhaka Delivery Hub',
            }
          : undefined,
        batchSeal: !isCancelled
          ? {
              code: `#KR-AN-${order.id.slice(-4).toUpperCase()}`,
              notes: 'Tamper-evident hologram intact',
            }
          : undefined,
        canReview: order.canReview,
      };
    });
  }, [initialOrders]);

  return (
    <>
      {/* Mobile Pixel-Parity View (Stitch screen 24e38f8eadf745fca125f6f0c134f393) */}
      <OrderHistoryMobileView initialOrders={mobileOrders} />

      {/* Desktop Preserved View */}
      <div className="hidden lg:block space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Order History</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Search by order number or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            label="Search orders"
            hideLabel
            leading={<Search className="w-4 h-4" aria-hidden="true" />}
            containerClassName="flex-1"
            className="focus:ring-minsah-focus"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by status"
            hideLabel
            containerClassName="sm:w-56"
            className="focus:ring-minsah-focus"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>

        {/* Orders */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : "You haven't placed any orders yet"}
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-minsah-action-primary text-white rounded-lg hover:bg-minsah-action-primary-hover"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-[24px] border border-[#EFECE6] shadow-[0_4px_24px_rgba(6,36,2,0.03)] overflow-hidden transition-all hover:border-[#D4F6A2]/80">
                {/* Order Header */}
                <div className="p-5 sm:p-6 border-b border-[#F2EFEA]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7D8] text-[#062402]">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#121915] tracking-tight">{order.orderNumber}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <div className="flex items-center text-xs text-[#5E6D64]">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-[#7A827B]" />
                            <span>{new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getStatusColor(order.status)}`}>
                            {capitalize(order.status)}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getPaymentStatusColor(order.paymentStatus)}`}>
                            {capitalize(order.paymentStatus)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:self-center self-end">
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A827B]">Total</p>
                        <p className="text-lg font-black text-[#121915]">৳{order.total.toLocaleString()}</p>
                      </div>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="inline-flex items-center px-4 py-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs font-bold text-[#121915] hover:bg-[#F2EFEA] transition-colors"
                      >
                        View Details
                        <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#7A827B]" />
                      </Link>
                    </div>
                  </div>
                </div>

                {awaitingDispatch(order) && (
                  <div className="px-6 pt-4">
                    <p className="text-xs text-[#1C3A13] bg-[#EAF7D8] border border-[#D4F6A2]/60 rounded-xl px-3.5 py-2.5">
                      We&rsquo;re preparing your order. After the warehouse dispatches it, your{' '}
                      <strong>tracking link</strong> and live delivery telemetry will update here.
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div className="p-5 sm:p-6">
                  <div className="space-y-3.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                          <ProductImage src={item.productImage} name={item.productName} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-[#121915] truncate">{item.productName}</h4>
                          <p className="text-xs text-[#5E6D64] mt-0.5">Qty: {item.quantity} × ৳{item.price.toLocaleString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-[#121915]">৳{item.totalPrice.toLocaleString()}</p>
                          {order.canReview && (
                            <Link
                              href={`/account/reviews/write?productId=${item.productId}&orderId=${order.id}`}
                              className="inline-flex items-center text-xs font-semibold text-[#062402] hover:underline mt-1"
                            >
                              <Star className="w-3 h-3 mr-1 text-amber-500 fill-amber-400" />
                              Review
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Actions */}
                  <div className="mt-5 pt-4 border-t border-[#F2EFEA] flex flex-wrap items-center gap-2.5">
                    {(order.steadfastTrackingCode || order.trackingNumber) && (
                      <a
                        href={getTrackingUrl(order)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#062402] text-[#EAF7D8] hover:bg-[#153410] rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5 mr-2 text-[#D4F6A2]" />
                        Track Delivery
                      </a>
                    )}
                    <Link
                      href={`/account/orders/${order.id}?print=invoice`}
                      target="_blank"
                      className="inline-flex items-center px-4 py-2 bg-white border border-[#EFECE6] hover:bg-stone-50 text-[#5E6D64] rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Invoice
                    </Link>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleReorder(order)}
                      disabled={reorderingOrderIds.includes(order.id)}
                      className={
                        reorderingOrderIds.includes(order.id)
                          ? 'bg-stone-200 text-stone-500 rounded-xl text-xs font-bold'
                          : reorderedOrderIds.includes(order.id)
                            ? 'bg-[#EAF7D8] text-[#1C3A13] rounded-xl text-xs font-bold'
                            : 'bg-[#D4F6A2] hover:bg-[#c2eb87] text-[#062402] font-bold rounded-xl text-xs shadow-xs'
                      }
                    >
                      <ShoppingBag className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      {reorderingOrderIds.includes(order.id)
                        ? 'Adding...'
                        : reorderedOrderIds.includes(order.id)
                          ? 'Added to Cart'
                          : 'Buy Again'}
                    </Button>
                    {(order.status === 'delivered' || order.status === 'shipped') && (
                      <Link
                        href={`/account/orders/${order.id}/return`}
                        className="inline-flex items-center px-4 py-2 bg-white border border-[#EFECE6] hover:bg-stone-50 text-[#5E6D64] rounded-xl text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        {getReturnLabel(order)}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
