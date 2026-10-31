'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Copy,
  Receipt,
  Download,
  Share2
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  variant: string;
  sku: string;
  price: number;
  qty: number;
  total: number;
  image: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id ? decodeURIComponent(resolvedParams.id) : 'ORD-2847';

  const [orderStatus, setOrderStatus] = useState<'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'>('Processing');
  const [internalNote, setInternalNote] = useState('');
  const [notesList, setNotesList] = useState([
    { author: 'Sharif (Admin)', text: 'Payment verified via bKash merchant dashboard. Fast dispatch requested.', time: 'Oct 21, 14:35' },
    { author: 'Runner Fleet', text: 'Items retrieved from Dhanmondi shelf A-4.', time: 'Oct 21, 15:10' }
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    name: 'Customer Name',
    phone: '01XXXXXXXXX',
    email: 'customer@example.com',
    address: 'House 42, Road 9/A, Dhanmondi R/A, Dhaka-1209',
    city: 'Dhaka',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: '1',
      name: 'Korean Rose Glow Miracle Serum 30ml',
      variant: 'Standard Formula',
      sku: 'SKU-ROSE-30',
      price: 850,
      qty: 2,
      total: 1700,
      image: '/images/categories/Skincare.png'
    },
    {
      id: '2',
      name: 'COSRX Centella Asiatica Calming Water Toner 200ml',
      variant: '200ml Bottle',
      sku: 'SKU-COSRX-TONER',
      price: 1750,
      qty: 1,
      total: 1750,
      image: '/images/categories/Skincare.png'
    }
  ]);

  const [pricing, setPricing] = useState({
    subtotal: 3450,
    shippingFee: 60,
    discount: 200,
    totalAmount: 3310,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadOrderDetail = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        const ord = data.order;
        if (ord) {
          // Status
          const rawStatus = (ord.status || '').toUpperCase();
          if (rawStatus === 'DELIVERED') setOrderStatus('Delivered');
          else if (rawStatus === 'SHIPPED') setOrderStatus('Shipped');
          else if (rawStatus === 'CANCELLED') setOrderStatus('Cancelled');
          else setOrderStatus('Processing');

          // Customer
          if (data.user) {
            setCustomerInfo((prev) => ({
              ...prev,
              name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || prev.name,
              phone: data.user.phone || prev.phone,
              email: data.user.email || prev.email,
            }));
          }

          if (ord.shippingAddress && typeof ord.shippingAddress === 'object') {
            const addr = ord.shippingAddress as any;
            setCustomerInfo((prev) => ({
              ...prev,
              address: addr.address || addr.street || prev.address,
              city: addr.city || addr.district || prev.city,
            }));
          }

          // Items
          if (ord.items && ord.items.length > 0) {
            const mappedItems: OrderItem[] = ord.items.map((it: any) => ({
              id: it.id,
              name: it.name || 'Beauty Product',
              variant: 'Standard',
              sku: it.sku || `SKU-${it.id.slice(-4)}`,
              price: Number(it.price || 0),
              qty: it.quantity || 1,
              total: Number(it.total || (Number(it.price || 0) * (it.quantity || 1))),
              image: it.image || '/images/categories/Skincare.png',
            }));
            setOrderItems(mappedItems);
          }

          // Pricing
          const sub = Number(ord.subtotal || 0);
          const ship = Number(ord.shippingCost || 60);
          const disc = Number(ord.discountAmount || 0);
          const tot = Number(ord.total || sub + ship - disc);
          setPricing({
            subtotal: sub,
            shippingFee: ship,
            discount: disc,
            totalAmount: tot,
          });

          // Notes
          if (ord.adminNote) {
            setNotesList((prev) => [
              { author: 'Admin Note', text: ord.adminNote, time: 'Stored' },
              ...prev,
            ]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch order detail from API, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleStatusChange = async (newStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled') => {
    setOrderStatus(newStatus);
    showToast(`Order status updated to ${newStatus}`);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus.toUpperCase() }),
      });
    } catch (e) {
      console.warn('Failed to update order status on server', e);
    }
  };

  const addNote = async () => {
    if (!internalNote.trim()) return;
    const noteText = internalNote.trim();
    setNotesList((prev) => [
      { author: 'You (Manager)', text: noteText, time: 'Just now' },
      ...prev
    ]);
    setInternalNote('');
    showToast('Internal note saved!');

    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: noteText }),
      });
    } catch (e) {
      console.warn('Failed to save note to server', e);
    }
  };

  const subtotal = pricing.subtotal;
  const shippingFee = pricing.shippingFee;
  const discount = pricing.discount;
  const totalAmount = pricing.totalAmount;

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 bg-[#122131] hover:bg-[#1c2b3c] border border-[#273647] rounded-lg text-[#908fa0] hover:text-[#ffffff] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c0c1ff]">
              <span>ORDERS // SINGLE FULFILLMENT</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">
                Order #{orderId}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  orderStatus === 'Processing'
                    ? 'bg-[#ec6a06]/20 text-[#ffb690]'
                    : orderStatus === 'Shipped'
                    ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                    : orderStatus === 'Delivered'
                    ? 'bg-[#00a572]/20 text-[#4edea3]'
                    : 'bg-[#93000a]/20 text-[#ffb4ab]'
                }`}
              >
                {orderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Status Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={orderStatus}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className="px-3 py-2 bg-[#122131] border border-[#273647] rounded-lg text-xs font-semibold text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
          >
            <option value="Processing">Status: Processing</option>
            <option value="Shipped">Status: Shipped to Courier</option>
            <option value="Delivered">Status: Delivered & Paid</option>
            <option value="Cancelled">Status: Cancelled / Void</option>
          </select>

          <button
            onClick={() => showToast('Printing 80mm Thermal Receipt slip...')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#4edea3]" />
            <span>Thermal Slip</span>
          </button>

          <button
            onClick={() => showToast('PDF Invoice generated and downloaded!')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-[#c0c1ff]" />
            <span>PDF Invoice</span>
          </button>

          <button
            onClick={() => showToast('Steadfast courier waybill booked & printed!')}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Truck className="w-4 h-4" />
            <span>Courier Dispatch</span>
          </button>
        </div>
      </div>

      {/* 3-Column Layout: Left 50% Items & Timeline, Middle 25% Customer & Address, Right 25% Payment & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Order Items Table */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#273647] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#c0c1ff]" />
                <span>Purchased Line Items (2 Products)</span>
              </h3>
              <span className="text-xs font-mono text-[#908fa0]">Verified Authentic</span>
            </div>

            <div className="divide-y divide-[#273647]">
              {orderItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center gap-3.5 hover:bg-[#1c2b3c]/40 transition-colors">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded-lg bg-[#051424] border border-[#273647]"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#ffffff] truncate">{item.name}</h4>
                    <div className="text-[11px] text-[#908fa0] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#c0c1ff]">{item.sku}</span>
                      <span>•</span>
                      <span>{item.variant}</span>
                    </div>
                    <div className="text-xs text-[#908fa0] mt-1">
                      ৳ {item.price} × {item.qty}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-sm text-[#ffffff]">
                    ৳ {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Card */}
            <div className="p-4 bg-[#0d1c2d] border-t border-[#273647] space-y-2 text-xs">
              <div className="flex justify-between text-[#908fa0]">
                <span>Items Subtotal</span>
                <span className="font-mono text-[#ffffff]">৳ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#908fa0]">
                <span>Delivery Charge (Inside Dhaka)</span>
                <span className="font-mono text-[#ffffff]">৳ {shippingFee}</span>
              </div>
              <div className="flex justify-between text-[#4edea3]">
                <span>Coupon Applied (MINSAHGLOW)</span>
                <span className="font-mono">-৳ {discount}</span>
              </div>
              <div className="pt-2 border-t border-[#273647] flex justify-between items-center text-sm">
                <span className="font-bold text-[#ffffff]">Total Payable Amount</span>
                <span className="font-mono font-extrabold text-base text-[#4edea3]">
                  ৳ {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Order Lifecycle Timeline */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4edea3]" />
              <span>Order Lifecycle & Dispatch Audit Trail</span>
            </h3>

            <div className="space-y-4 relative pl-4 border-l-2 border-[#273647] ml-2 text-xs">
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00a572] absolute -left-[21px] top-1" />
                <div className="font-bold text-[#ffffff]">Order Placed by Customer</div>
                <div className="text-[11px] text-[#908fa0]">Oct 21, 2024 at 14:30 • via Web Storefront (Chrome / Dhaka)</div>
              </div>

              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00a572] absolute -left-[21px] top-1" />
                <div className="font-bold text-[#ffffff]">Payment Verified via bKash Merchant</div>
                <div className="text-[11px] text-[#908fa0]">Oct 21, 2024 at 14:32 • TrxID: TXN-8847231 confirmed</div>
              </div>

              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c0c1ff] absolute -left-[21px] top-1 animate-pulse" />
                <div className="font-bold text-[#c0c1ff]">Picked & Packed by Warehouse</div>
                <div className="text-[11px] text-[#908fa0]">Oct 21, 2024 at 15:10 • Packed in tamper-proof bubble polybag</div>
              </div>

              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-[#464554] absolute -left-[21px] top-1" />
                <div className="font-medium text-[#908fa0]">Courier Handover (Steadfast)</div>
                <div className="text-[11px] text-[#908fa0]">Awaiting pickup rider arrival</div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column (3 cols): Customer & Shipping Address */}
        <div className="lg:col-span-3 space-y-6">
          {/* Customer Profile */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#273647]">
              <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                <User className="w-4 h-4 text-[#c0c1ff]" />
                <span>Customer Profile</span>
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c0c1ff]/20 text-[#c0c1ff]">
                VIP Member
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="font-bold text-sm text-[#ffffff]">{customerInfo.name}</div>
                <div className="text-[#908fa0] text-[11px]">Customer since August 2024</div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#908fa0] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#4edea3]" />
                  <span>{customerInfo.phone}</span>
                </span>
                <button
                  onClick={() => showToast('Copied phone number')}
                  className="text-[10px] text-[#c0c1ff] hover:underline"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#908fa0] flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#ffb690]" />
                  <span className="truncate">{customerInfo.email}</span>
                </span>
              </div>

              <div className="pt-2 border-t border-[#273647] flex justify-between text-[11px]">
                <span className="text-[#908fa0]">Lifetime Orders:</span>
                <span className="font-mono text-[#ffffff] font-bold">4 Orders (৳14,200)</span>
              </div>
            </div>
          </div>

          {/* Shipping Address & Courier Assignment */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2 pb-2 border-b border-[#273647]">
              <MapPin className="w-4 h-4 text-[#4edea3]" />
              <span>Delivery Address</span>
            </h3>

            <div className="text-xs space-y-1.5">
              <div className="font-semibold text-[#ffffff]">{customerInfo.name}</div>
              <div className="text-[#908fa0] leading-relaxed">
                {customerInfo.address}
              </div>
              <div className="text-[11px] text-[#4edea3] font-mono">Area: {customerInfo.city} // Inside City</div>
            </div>

            <div className="pt-3 border-t border-[#273647] space-y-2">
              <div className="text-xs text-[#908fa0]">Assigned Courier</div>
              <div className="p-2.5 rounded-lg bg-[#051424] border border-[#273647] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#ffffff]">Steadfast Courier</div>
                  <div className="font-mono text-[10px] text-[#c0c1ff]">CN: CN-884920</div>
                </div>
                <a
                  href="https://steadfast.com.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-[#4edea3] text-[#908fa0]"
                  title="Track Live"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (3 cols): Payment & Admin Notes */}
        <div className="lg:col-span-3 space-y-6">
          {/* Payment & Fraud Risk */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#273647]">
              <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
                <span>Payment & Security</span>
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00a572]/20 text-[#4edea3]">
                Paid
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Payment Channel:</span>
                <span className="font-bold text-[#ffffff]">bKash Merchant</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Transaction ID:</span>
                <span className="font-mono text-[#c0c1ff]">TXN-8847231</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Fraud Risk Score:</span>
                <span className="font-mono font-bold text-[#4edea3]">5/100 (Safe)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Device Fingerprint:</span>
                <span className="font-mono text-[11px] text-[#908fa0]">Chrome Mobile (Dhaka)</span>
              </div>
            </div>
          </div>

          {/* Admin Internal Notes */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2 pb-2 border-b border-[#273647]">
              <MessageCircle className="w-4 h-4 text-[#c0c1ff]" />
              <span>Internal Admin Notes</span>
            </h3>

            <div className="space-y-2">
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Write private fulfillment note..."
                rows={2}
                className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] focus:outline-none focus:border-[#c0c1ff]"
              />
              <button
                onClick={addNote}
                className="w-full py-1.5 bg-[#1c2b3c] hover:bg-[#273647] text-[#c0c1ff] rounded-lg text-xs font-semibold transition-all"
              >
                Add Private Note
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#273647]">
              {notesList.map((note, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#051424] border border-[#273647] text-[11px]">
                  <div className="flex justify-between text-[#908fa0] mb-1">
                    <span className="font-semibold text-[#ffffff]">{note.author}</span>
                    <span className="font-mono text-[10px]">{note.time}</span>
                  </div>
                  <p className="text-[#d4e4fa]">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
