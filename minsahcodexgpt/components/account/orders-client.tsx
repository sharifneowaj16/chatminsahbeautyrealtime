'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import {
  ShoppingBag,
  Calendar,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Search,
  Star,
  Download,
  RotateCcw,
  Package,
  ShieldCheck,
  ExternalLink,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOrders = initialOrders.filter((order) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      order.orderNumber.toLowerCase().includes(normalizedSearchTerm) ||
      order.items.some((item) => item.productName.toLowerCase().includes(normalizedSearchTerm));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-[#27a644]" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-[#828fff]" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-amber-300" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'refunded':
        return <RotateCcw className="w-4 h-4 text-[#828fff]" />;
      default:
        return <Clock className="w-4 h-4 text-[#8a8f98]" />;
    }
  };

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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const isPaid = status === 'paid' || status === 'completed';
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${
          isPaid
            ? 'bg-[#27a644]/10 text-[#27a644] border-[#27a644]/25'
            : 'bg-[#18191a] text-[#8a8f98] border-[#23252a]'
        }`}
      >
        {status}
      </span>
    );
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

  return (
    <div className="w-full space-y-5 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            Order History
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Track parcels, download tax invoices, and review authentic luxury cosmetics
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8a8f98] font-mono">
          <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
          <span>{filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'} Recorded</span>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8a8f98] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order # or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* ── Orders Listing ────────────────────────────────────────────────────── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#0f1011] rounded-2xl border border-dashed border-[#23252a] p-10 text-center shadow-xl">
          <ShoppingBag className="w-12 h-12 text-[#62666d] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1">No orders found</h3>
          <p className="text-xs text-[#8a8f98] mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filter options'
              : "You haven't placed any luxury cosmetic orders yet"}
          </p>
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
          >
            Explore Beauty Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-xl overflow-hidden transition-all hover:border-[#5e6ad2]/50"
            >
              {/* Order Card Header */}
              <div className="p-4 sm:p-5 border-b border-[#23252a]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141516]/50">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a]">
                    {getStatusIcon(order.status)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-[#f7f8f8] tracking-tight font-mono">
                        #{order.orderNumber}
                      </h3>
                      {getStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8a8f98]">
                      <Calendar className="w-3.5 h-3.5 text-[#62666d]" />
                      <span>
                        {mounted
                          ? new Date(order.createdAt).toLocaleDateString('en-BD', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '---'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-[#23252a]/50 sm:border-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                      Total Paid
                    </p>
                    <p className="text-base font-bold text-[#f7f8f8] font-mono">
                      ৳{order.total.toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center justify-center h-9 px-3.5 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] rounded-xl text-xs font-medium text-[#f7f8f8] transition-all"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#8a8f98]" />
                  </Link>
                </div>
              </div>

              {/* Awaiting dispatch telemetry notice */}
              {awaitingDispatch(order) && (
                <div className="px-4 sm:px-5 pt-3">
                  <p className="text-xs text-[#828fff] bg-[#5e6ad2]/10 border border-[#5e6ad2]/30 rounded-xl px-3.5 py-2.5">
                    We&rsquo;re preparing your luxury items. After dispatch, live GPS telemetry and courier tracking will activate.
                  </p>
                </div>
              )}

              {/* Order Items List */}
              <div className="p-4 sm:p-5">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#141516] border border-[#23252a] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        <ProductImage src={item.productImage} name={item.productName} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs sm:text-sm text-[#f7f8f8] truncate">
                          {item.productName}
                        </h4>
                        <p className="text-xs text-[#8a8f98] mt-0.5 font-mono">
                          Qty: {item.quantity} × ৳{item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-xs sm:text-sm text-[#f7f8f8] font-mono">
                          ৳{item.totalPrice.toLocaleString()}
                        </p>
                        {order.canReview && (
                          <Link
                            href={`/account/reviews/write?productId=${item.productId}&orderId=${order.id}`}
                            className="inline-flex items-center text-[11px] font-medium text-[#828fff] hover:underline mt-1"
                          >
                            <Star className="w-3 h-3 mr-1 text-amber-400 fill-amber-400" />
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Actions - Uniform Linear Buttons */}
                <div className="mt-4 pt-3.5 border-t border-[#23252a] grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                  {(order.steadfastTrackingCode || order.trackingNumber) && (
                    <a
                      href={getTrackingUrl(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center h-11 sm:h-9 px-4 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95"
                    >
                      <Truck className="w-3.5 h-3.5 mr-2" />
                      <span>Track Shipment</span>
                    </a>
                  )}
                  <Link
                    href={`/account/orders/${order.id}?print=invoice`}
                    target="_blank"
                    className="w-full sm:w-auto inline-flex items-center justify-center h-11 sm:h-9 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#f7f8f8] rounded-xl text-xs font-medium transition-all"
                  >
                    <Download className="w-3.5 h-3.5 mr-2 text-[#8a8f98]" />
                    <span>Download Invoice</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    disabled={reorderingOrderIds.includes(order.id)}
                    className={`w-full sm:w-auto inline-flex items-center justify-center h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                      reorderingOrderIds.includes(order.id)
                        ? 'bg-[#18191a] text-[#62666d] border border-[#23252a]'
                        : reorderedOrderIds.includes(order.id)
                        ? 'bg-[#27a644]/20 text-[#27a644] border border-[#27a644]/40'
                        : 'bg-[#18191a] hover:bg-[#23252a] text-[#828fff] border border-[#5e6ad2]/40'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                    <span>
                      {reorderingOrderIds.includes(order.id)
                        ? 'Adding...'
                        : reorderedOrderIds.includes(order.id)
                        ? 'Added to Cart'
                        : 'Buy Again'}
                    </span>
                  </button>
                  {(order.status === 'delivered' || order.status === 'shipped') && (
                    <Link
                      href={`/account/orders/${order.id}/return`}
                      className="w-full sm:w-auto inline-flex items-center justify-center h-11 sm:h-9 px-4 bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[#8a8f98] hover:text-rose-400 rounded-xl text-xs font-medium transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-2" />
                      <span>{getReturnLabel(order)}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
