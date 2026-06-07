'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { formatPrice } from '@/utils/currency';
import {
  Search,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Check,
  Trash2,
  MapPin,
  User,
  Phone,
  Mail,
  Package,
  DollarSign,
  Edit3,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PathaoCity { id: number; name: string }
interface PathaoZone { id: number; name: string }
interface PathaoArea { id: number; name: string }

interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AddressData {
  firstName: string;
  lastName: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
}

interface VariantOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
}

interface SearchedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  variants: VariantOption[];
}

type ProductType = 'new' | 'old' | 'virtual';

interface OrderLineItem {
  key: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  productType: ProductType;
  isCustom: boolean;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'bkash',            label: 'bKash' },
  { value: 'nagad',            label: 'Nagad' },
  { value: 'rocket',           label: 'Rocket' },
];

const PAYMENT_STATUSES = [
  { value: 'PENDING',   label: 'Pending' },
  { value: 'COMPLETED', label: 'Paid' },
  { value: 'FAILED',    label: 'Failed' },
];

const ORDER_STATUSES = [
  { value: 'PENDING',    label: 'Pending' },
  { value: 'CONFIRMED',  label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED',    label: 'Shipped' },
];

const PRODUCT_TYPE_META: Record<ProductType, { label: string; color: string }> = {
  new:     { label: 'New',     color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  old:     { label: 'Old',     color: 'bg-amber-100  text-amber-700  border-amber-300'  },
  virtual: { label: 'Virtual', color: 'bg-violet-100 text-violet-700 border-violet-300' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genKey() {
  return Math.random().toString(36).slice(2, 9);
}

function formatVariantLabel(variant: VariantOption): string {
  const attrs = variant.attributes;
  if (!attrs || Object.keys(attrs).length === 0) return variant.name || variant.sku;
  return Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' / ');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateOrderPage() {
  const router = useRouter();
  const { hasPermission } = useAdminAuth();

  // ── Customer state ──────────────────────────────────────────────────────────
  const [customerSearch,   setCustomerSearch]   = useState('');
  const [customerResults,  setCustomerResults]  = useState<CustomerData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customer,         setCustomer]         = useState<Partial<CustomerData>>({});

  // ── Address state ───────────────────────────────────────────────────────────
  const [cities,  setCities]  = useState<PathaoCity[]>([]);
  const [zones,   setZones]   = useState<PathaoZone[]>([]);
  const [areas,   setAreas]   = useState<PathaoArea[]>([]);
  const [address, setAddress] = useState<Partial<AddressData>>({});

  // ── Product search state ────────────────────────────────────────────────────
  const [productQuery,      setProductQuery]      = useState('');
  const [productResults,    setProductResults]    = useState<SearchedProduct[]>([]);
  const [productSearching,  setProductSearching]  = useState(false);
  const [showProductDrop,   setShowProductDrop]   = useState(false);
  const [addQty,            setAddQty]            = useState(1);
  // per-product selected variant in dropdown
  const [dropVariants,      setDropVariants]      = useState<Record<string, string | null>>({});

  // ── Order items state ───────────────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  // inline editor
  const [editingKey,  setEditingKey]  = useState<string | null>(null);
  const [editValues,  setEditValues]  = useState<Partial<OrderLineItem>>({});

  // ── Order settings ──────────────────────────────────────────────────────────
  const [paymentMethod,  setPaymentMethod]  = useState('cash_on_delivery');
  const [paymentStatus,  setPaymentStatus]  = useState('PENDING');
  const [orderStatus,    setOrderStatus]    = useState('PENDING');
  const [shippingCost,   setShippingCost]   = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode,     setCouponCode]     = useState('');
  const [adminNote,      setAdminNote]      = useState('');

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<ToastState | null>(null);

  const custDebounce    = useRef<NodeJS.Timeout | null>(null);
  const productDebounce = useRef<NodeJS.Timeout | null>(null);
  const toastTimer      = useRef<NodeJS.Timeout | null>(null);
  const productDropRef  = useRef<HTMLDivElement>(null);
  const custDropRef     = useRef<HTMLDivElement>(null);

  // ── Permission guard — must come AFTER all hooks ─────────────────────────────
  const hasAccess = hasPermission(PERMISSIONS.ORDERS_VIEW);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productDropRef.current && !productDropRef.current.contains(e.target as Node)) {
        setShowProductDrop(false);
      }
      if (custDropRef.current && !custDropRef.current.contains(e.target as Node)) {
        setShowCustomerDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Customer search debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (custDebounce.current) clearTimeout(custDebounce.current);
    if (!customerSearch.trim()) { setCustomerResults([]); return; }
    custDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.customers || []);
        }
      } catch { /* ignore */ }
    }, 400);
    return () => { if (custDebounce.current) clearTimeout(custDebounce.current); };
  }, [customerSearch]);

  // ── Pathao cities on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/shipping/pathao/cities', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setCities(d || []))
      .catch(() => {});
  }, []);

  // ── Zones when city changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!address.pathaoCityId) {
      setZones([]);
      setAddress(p => ({ ...p, pathaoZoneId: undefined, pathaoAreaId: undefined }));
      return;
    }
    fetch(`/api/shipping/pathao/zones?city_id=${address.pathaoCityId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setZones(d || []))
      .catch(() => {});
  }, [address.pathaoCityId]);

  // ── Areas when zone changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!address.pathaoZoneId) {
      setAreas([]);
      setAddress(p => ({ ...p, pathaoAreaId: undefined }));
      return;
    }
    fetch(`/api/shipping/pathao/areas?zone_id=${address.pathaoZoneId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAreas(d || []))
      .catch(() => {});
  }, [address.pathaoZoneId]);

  // ── Product search debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (productDebounce.current) clearTimeout(productDebounce.current);
    if (!productQuery.trim()) { setProductResults([]); setProductSearching(false); return; }
    setProductSearching(true);
    productDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(productQuery.trim())}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setProductResults(data.products || []);
        }
      } catch { setProductResults([]); }
      finally   { setProductSearching(false); }
    }, 380);
    return () => { if (productDebounce.current) clearTimeout(productDebounce.current); };
  }, [productQuery]);

  // ── Customer handlers ───────────────────────────────────────────────────────
  const handleSelectCustomer = (cust: CustomerData) => {
    setSelectedCustomer(cust);
    setCustomer({ id: cust.id, firstName: cust.firstName, lastName: cust.lastName, email: cust.email, phone: cust.phone });
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDrop(false);
  };

  // ── Product handlers ────────────────────────────────────────────────────────
  const addDbProduct = (product: SearchedProduct, variantId: string | null) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    const price   = variant ? variant.price : product.price;
    const sku     = variant ? variant.sku   : product.sku;
    const name    = variant ? `${product.name} — ${formatVariantLabel(variant)}` : product.name;

    const existing = orderItems.find(
      i => i.productId === product.id && i.variantId === variantId
    );

    if (existing) {
      setOrderItems(prev =>
        prev.map(i => i.key === existing.key ? { ...i, quantity: i.quantity + addQty } : i)
      );
    } else {
      setOrderItems(prev => [...prev, {
        key: genKey(),
        productId: product.id,
        variantId: variantId,
        name,
        sku,
        price,
        quantity: addQty,
        productType: 'new',
        isCustom: false,
      }]);
    }

    setProductQuery('');
    setProductResults([]);
    setShowProductDrop(false);
    setAddQty(1);
    setDropVariants({});
  };

  const addCustomProduct = () => {
    const name = productQuery.trim();
    if (!name) return;
    const newKey = genKey();
    const newItem: OrderLineItem = {
      key: newKey,
      productId: null,
      variantId: null,
      name,
      sku: `CUSTOM-${Date.now()}`,
      price: 0,
      quantity: addQty,
      productType: 'new',
      isCustom: true,
    };
    setOrderItems(prev => [...prev, newItem]);
    setProductQuery('');
    setProductResults([]);
    setShowProductDrop(false);
    setAddQty(1);
    // auto open edit so user sets price
    setEditingKey(newKey);
    setEditValues({ price: 0, name, sku: newItem.sku, productType: 'new' });
  };

  const removeItem = (key: string) => setOrderItems(prev => prev.filter(i => i.key !== key));

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) { removeItem(key); return; }
    setOrderItems(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i));
  };

  const startEdit = (item: OrderLineItem) => {
    setEditingKey(item.key);
    setEditValues({ price: item.price, name: item.name, sku: item.sku, productType: item.productType });
  };

  const commitEdit = (key: string) => {
    setOrderItems(prev => prev.map(i => i.key === key ? { ...i, ...editValues } as OrderLineItem : i));
    setEditingKey(null);
    setEditValues({});
  };

  const cancelEdit = () => { setEditingKey(null); setEditValues({}); };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total    = subtotal + shippingCost - discountAmount;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer.firstName || !customer.phone) { showToast('error', 'Customer name and phone required'); return; }
    if (!address.street1 || !address.city)       { showToast('error', 'Street and city required');        return; }
    if (orderItems.length === 0)                  { showToast('error', 'Add at least one product');        return; }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            firstName: customer.firstName,
            lastName:  customer.lastName  || '',
            email:     customer.email     || `${Date.now()}@order.local`,
            phone:     customer.phone,
          },
          shippingAddress: {
            firstName:    address.firstName || customer.firstName,
            lastName:     address.lastName  || customer.lastName || '',
            street1:      address.street1,
            street2:      address.street2   || '',
            city:         address.city,
            state:        address.state     || '',
            postalCode:   address.postalCode || '',
            phone:        address.phone     || customer.phone,
            pathaoCityId: address.pathaoCityId,
            pathaoZoneId: address.pathaoZoneId,
            pathaoAreaId: address.pathaoAreaId,
          },
          items: orderItems.map(item => ({
            productId:   item.productId,
            variantId:   item.variantId,
            name:        item.name,
            sku:         item.sku,
            quantity:    item.quantity,
            price:       item.price,
            productType: item.productType,
            isCustom:    item.isCustom,
          })),
          paymentMethod,
          paymentStatus,
          shippingCost,
          discountAmount,
          couponCode: couponCode || undefined,
          adminNote:  adminNote  || undefined,
          status:     orderStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const data = await res.json();
      showToast('success', `Order created: ${data.order.orderNumber}`);
      setTimeout(() => router.push(`/admin/orders/${data.order.orderNumber}`), 1500);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No permission to create orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6">

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-violet-600 hover:text-violet-800 mb-3 flex items-center gap-1"
          >
            ← Back to Orders
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Order</h1>
          <p className="text-sm text-gray-500 mt-1">Add order for customer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ════════════════════════════════════════
              CUSTOMER
          ════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Customer
            </h2>

            {/* Selected customer chip */}
            {selectedCustomer ? (
              <div className="mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomer(null); setCustomer({}); }}
                  className="text-violet-600 hover:text-violet-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* Customer search */
              <div className="relative mb-4" ref={custDropRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search existing customer…"
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {showCustomerDrop && customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {customerResults.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-900">
                          {cust.firstName} {cust.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{cust.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customer fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={customer.firstName || ''}
                  onChange={e => setCustomer(p => ({ ...p, firstName: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={customer.lastName || ''}
                  onChange={e => setCustomer(p => ({ ...p, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone *
                </label>
                <input
                  type="tel"
                  value={customer.phone || ''}
                  onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  value={customer.email || ''}
                  onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              DELIVERY ADDRESS
          ════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Delivery Address
            </h2>

            {/* Name override */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={address.firstName || ''}
                  onChange={e => setAddress(p => ({ ...p, firstName: e.target.value }))}
                  placeholder={customer.firstName}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={address.lastName || ''}
                  onChange={e => setAddress(p => ({ ...p, lastName: e.target.value }))}
                  placeholder={customer.lastName}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Street */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address *</label>
              <input
                type="text"
                value={address.street1 || ''}
                onChange={e => setAddress(p => ({ ...p, street1: e.target.value }))}
                required
                placeholder="House no, road, area…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {/* Pathao cascading */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <select
                  value={address.pathaoCityId || ''}
                  onChange={e => setAddress(p => ({
                    ...p,
                    pathaoCityId: e.target.value ? parseInt(e.target.value) : undefined,
                    city: cities.find(c => c.id === parseInt(e.target.value))?.name,
                    pathaoZoneId: undefined,
                    pathaoAreaId: undefined,
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone *</label>
                <select
                  value={address.pathaoZoneId || ''}
                  onChange={e => setAddress(p => ({
                    ...p,
                    pathaoZoneId: e.target.value ? parseInt(e.target.value) : undefined,
                    state: zones.find(z => z.id === parseInt(e.target.value))?.name,
                    pathaoAreaId: undefined,
                  }))}
                  disabled={!address.pathaoCityId}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                >
                  <option value="">Select zone</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Area *</label>
                <select
                  value={address.pathaoAreaId || ''}
                  onChange={e => setAddress(p => ({
                    ...p,
                    pathaoAreaId: e.target.value ? parseInt(e.target.value) : undefined,
                  }))}
                  disabled={!address.pathaoZoneId}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                >
                  <option value="">Select area</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={address.phone || ''}
                onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                placeholder={customer.phone}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* ════════════════════════════════════════
              PRODUCTS
          ════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" /> Products
            </h2>

            {/* ── Search bar ── */}
            <div className="relative mb-4" ref={productDropRef}>
              <div className="flex gap-2">
                {/* Qty */}
                <input
                  type="number"
                  min={1}
                  value={addQty}
                  onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-2.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                  title="Quantity to add"
                />
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products — or type a custom name and press Enter"
                    value={productQuery}
                    onChange={e => { setProductQuery(e.target.value); setShowProductDrop(true); }}
                    onFocus={() => productQuery && setShowProductDrop(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && productResults.length === 0 && productQuery.trim()) {
                        e.preventDefault();
                        addCustomProduct();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* ── Dropdown ── */}
              {showProductDrop && productQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-96 overflow-y-auto">

                  {/* Loading */}
                  {productSearching && (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                      Searching…
                    </div>
                  )}

                  {/* DB results */}
                  {!productSearching && productResults.map(product => {
                    const selVarId  = dropVariants[product.id] ?? null;
                    const selVariant = selVarId ? product.variants.find(v => v.id === selVarId) : null;
                    const displayPrice = selVariant ? selVariant.price : product.price;

                    return (
                      <div key={product.id} className="border-b border-gray-100 last:border-0">
                        <div className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Product name + meta */}
                            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              SKU: {product.sku} &nbsp;·&nbsp; Stock: {product.stock} &nbsp;·&nbsp; {formatPrice(product.price)}
                            </p>

                            {/* Variant chips */}
                            {(product.variants ?? []).length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-400 mb-1">Variant:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {/* Base (no variant) */}
                                  <button
                                    type="button"
                                    onClick={() => setDropVariants(p => ({ ...p, [product.id]: null }))}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                                      selVarId === null
                                        ? 'bg-violet-600 text-white border-violet-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
                                    }`}
                                  >
                                    Base ({formatPrice(product.price)})
                                  </button>
                                   {(product.variants ?? []).map(v => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => setDropVariants(p => ({ ...p, [product.id]: v.id }))}
                                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                                        selVarId === v.id
                                          ? 'bg-violet-600 text-white border-violet-600'
                                          : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
                                      }`}
                                      title={`Stock: ${v.stock}`}
                                    >
                                      {formatVariantLabel(v)} ({formatPrice(v.price)})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Add button */}
                          <button
                            type="button"
                            onClick={() => addDbProduct(product, selVarId)}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add · {formatPrice(displayPrice)}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* "No results" hint + custom add */}
                  {!productSearching && (
                    <button
                      type="button"
                      onClick={addCustomProduct}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-violet-50 border-t border-dashed border-violet-200 group transition-colors"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5 text-violet-600" />
                      </span>
                      <span className="text-sm">
                        Add <strong className="text-violet-700">"{productQuery}"</strong> as{' '}
                        <span className="text-gray-500">custom / unlisted product</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Order Items List ── */}
            {orderItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                No products added yet
              </p>
            ) : (
              <div className="space-y-2">
                {orderItems.map(item => {
                  const isEditing = editingKey === item.key;
                  const typeMeta  = PRODUCT_TYPE_META[item.productType];

                  return (
                    <div
                      key={item.key}
                      className={`rounded-lg border transition-all ${
                        isEditing
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {/* View mode */}
                      {!isEditing ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap sm:flex-nowrap">
                          {/* Badges + name */}
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${typeMeta.color}`}>
                                {typeMeta.label}
                              </span>
                              {item.isCustom && (
                                <span className="text-xs px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200 font-medium">
                                  Custom
                                </span>
                              )}
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            </div>
                            <p className="text-xs text-gray-400">SKU: {item.sku} &nbsp;·&nbsp; Unit: {formatPrice(item.price)}</p>
                          </div>

                          {/* Qty */}
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => updateQty(item.key, parseInt(e.target.value) || 1)}
                            className="w-14 px-1.5 py-1 border border-gray-200 rounded text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />

                          {/* Line total */}
                          <span className="text-sm font-semibold text-gray-900 w-24 text-right shrink-0">
                            {formatPrice(item.price * item.quantity)}
                          </span>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            title="Edit"
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-100 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Edit mode */
                        <div className="p-4 space-y-3">
                          {/* Name */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Product Name</label>
                            <input
                              type="text"
                              value={editValues.name ?? item.name}
                              onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            {/* Price */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Unit Price (৳)</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editValues.price ?? item.price}
                                onChange={e => setEditValues(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              />
                            </div>
                            {/* SKU */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">SKU</label>
                              <input
                                type="text"
                                value={editValues.sku ?? item.sku}
                                onChange={e => setEditValues(p => ({ ...p, sku: e.target.value }))}
                                className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              />
                            </div>
                            {/* Product type */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                              <select
                                value={editValues.productType ?? item.productType}
                                onChange={e => setEditValues(p => ({ ...p, productType: e.target.value as ProductType }))}
                                className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              >
                                <option value="new">New</option>
                                <option value="old">Old</option>
                                <option value="virtual">Virtual</option>
                              </select>
                            </div>
                          </div>

                          {/* Save / Cancel */}
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => commitEdit(item.key)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Items subtotal */}
                <div className="flex justify-end pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    Items subtotal:&nbsp;
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              ORDER SETTINGS
          ════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Order Settings
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Status</label>
                <select
                  value={orderStatus}
                  onChange={e => setOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shipping Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Note</label>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Internal notes…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* ════════════════════════════════════════
              ORDER SUMMARY
          ════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200 text-base">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || orderItems.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : <><Check className="w-4 h-4" /> Create Order</>
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// 'use client';

// import { useState, useCallback, useRef, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
// import { formatPrice } from '@/utils/currency';
// import {
//   Search,
//   Plus,
//   X,
//   AlertCircle,
//   Loader2,
//   Check,
//   ChevronDown,
//   Trash2,
//   MapPin,
//   User,
//   Phone,
//   Mail,
//   Package,
//   DollarSign,
// } from 'lucide-react';

// interface PathaoCity {
//   id: number;
//   name: string;
// }

// interface PathaoZone {
//   id: number;
//   name: string;
// }

// interface PathaoArea {
//   id: number;
//   name: string;
// }

// interface CustomerData {
//   id?: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   phone: string;
// }

// interface AddressData {
//   firstName: string;
//   lastName: string;
//   street1: string;
//   street2: string;
//   city: string;
//   state: string;
//   postalCode: string;
//   phone: string;
//   pathaoCityId?: number;
//   pathaoZoneId?: number;
//   pathaoAreaId?: number;
// }

// interface ProductData {
//   id: string;
//   name: string;
//   sku: string;
//   price: number;
//   quantity: number;
// }

// interface OrderItem {
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   price: number;
//   product: ProductData;
// }

// interface ToastState {
//   type: 'success' | 'error';
//   message: string;
// }

// const PAYMENT_METHODS = [
//   { value: 'cash_on_delivery', label: 'Cash on Delivery' },
//   { value: 'bkash', label: 'bKash' },
//   { value: 'nagad', label: 'Nagad' },
//   { value: 'rocket', label: 'Rocket' },
// ];

// const PAYMENT_STATUSES = [
//   { value: 'PENDING', label: 'Pending' },
//   { value: 'COMPLETED', label: 'Paid' },
//   { value: 'FAILED', label: 'Failed' },
// ];

// const ORDER_STATUSES = [
//   { value: 'PENDING', label: 'Pending' },
//   { value: 'CONFIRMED', label: 'Confirmed' },
//   { value: 'PROCESSING', label: 'Processing' },
//   { value: 'SHIPPED', label: 'Shipped' },
// ];

// export default function CreateOrderPage() {
//   const router = useRouter();
//   const { hasPermission } = useAdminAuth();

//   // Customer state
//   const [customerSearch, setCustomerSearch] = useState('');
//   const [customerResults, setCustomerResults] = useState<CustomerData[]>([]);
//   const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [customer, setCustomer] = useState<Partial<CustomerData>>({});

//   // Address state
//   const [cities, setCities] = useState<PathaoCity[]>([]);
//   const [zones, setZones] = useState<PathaoZone[]>([]);
//   const [areas, setAreas] = useState<PathaoArea[]>([]);
//   const [address, setAddress] = useState<Partial<AddressData>>({});

//   // Product state
//   const [productSearch, setProductSearch] = useState('');
//   const [productResults, setProductResults] = useState<ProductData[]>([]);
//   const [showProductDropdown, setShowProductDropdown] = useState(false);
//   const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
//   const [addingProductQuantity, setAddingProductQuantity] = useState(1);

//   // Order state
//   const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
//   const [paymentStatus, setPaymentStatus] = useState('PENDING');
//   const [orderStatus, setOrderStatus] = useState('PENDING');
//   const [shippingCost, setShippingCost] = useState(0);
//   const [discountAmount, setDiscountAmount] = useState(0);
//   const [couponCode, setCouponCode] = useState('');
//   const [adminNote, setAdminNote] = useState('');

//   // UI state
//   const [loading, setLoading] = useState(false);
//   const [toast, setToast] = useState<ToastState | null>(null);
//   const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
//   const toastRef = useRef<NodeJS.Timeout | null>(null);

//   // Guard
//   if (!hasPermission(PERMISSIONS.ORDERS_VIEW)) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
//           <p className="text-gray-500 font-medium">No permission to create orders.</p>
//         </div>
//       </div>
//     );
//   }

//   const showToast = useCallback((type: ToastState['type'], message: string) => {
//     setToast({ type, message });
//     if (toastRef.current) clearTimeout(toastRef.current);
//     toastRef.current = setTimeout(() => setToast(null), 3000);
//   }, []);

//   // Search customers
//   useEffect(() => {
//     if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

//     if (!customerSearch.trim()) {
//       setCustomerResults([]);
//       return;
//     }

//     searchDebounceRef.current = setTimeout(async () => {
//       try {
//         const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`, {
//           credentials: 'include',
//         });
//         if (res.ok) {
//           const data = await res.json();
//           setCustomerResults(data.customers || []);
//         }
//       } catch (e) {
//         console.error('Failed to search customers:', e);
//       }
//     }, 400);

//     return () => {
//       if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
//     };
//   }, [customerSearch]);

//   // Load Pathao cities on mount
//   useEffect(() => {
//     const loadCities = async () => {
//       try {
//         const res = await fetch('/api/shipping/pathao/cities', { credentials: 'include' });
//         if (res.ok) {
//           const data = await res.json();
//           setCities(data || []);
//         }
//       } catch (e) {
//         console.error('Failed to load cities:', e);
//       }
//     };
//     loadCities();
//   }, []);

//   // Load zones when city changes
//   useEffect(() => {
//     if (!address.pathaoCityId) {
//       setZones([]);
//       setAddress((prev) => ({ ...prev, pathaoZoneId: undefined, pathaoAreaId: undefined }));
//       return;
//     }

//     const loadZones = async () => {
//       try {
//         const res = await fetch(`/api/shipping/pathao/zones?city_id=${address.pathaoCityId}`, {
//           credentials: 'include',
//         });
//         if (res.ok) {
//           const data = await res.json();
//           setZones(data || []);
//         }
//       } catch (e) {
//         console.error('Failed to load zones:', e);
//       }
//     };
//     loadZones();
//   }, [address.pathaoCityId]);

//   // Load areas when zone changes
//   useEffect(() => {
//     if (!address.pathaoZoneId) {
//       setAreas([]);
//       setAddress((prev) => ({ ...prev, pathaoAreaId: undefined }));
//       return;
//     }

//     const loadAreas = async () => {
//       try {
//         const res = await fetch(`/api/shipping/pathao/areas?zone_id=${address.pathaoZoneId}`, {
//           credentials: 'include',
//         });
//         if (res.ok) {
//           const data = await res.json();
//           setAreas(data || []);
//         }
//       } catch (e) {
//         console.error('Failed to load areas:', e);
//       }
//     };
//     loadAreas();
//   }, [address.pathaoZoneId]);

//   // Search products
//   useEffect(() => {
//     if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

//     if (!productSearch.trim()) {
//       setProductResults([]);
//       return;
//     }

//     searchDebounceRef.current = setTimeout(async () => {
//       try {
//         const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(productSearch)}`, {
//           credentials: 'include',
//         });
//         if (res.ok) {
//           const data = await res.json();
//           setProductResults(data.products || []);
//         }
//       } catch (e) {
//         console.error('Failed to search products:', e);
//       }
//     }, 400);

//     return () => {
//       if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
//     };
//   }, [productSearch]);

//   const handleSelectCustomer = (cust: CustomerData) => {
//     setSelectedCustomer(cust);
//     setCustomer({
//       id: cust.id,
//       firstName: cust.firstName,
//       lastName: cust.lastName,
//       email: cust.email,
//       phone: cust.phone,
//     });
//     setCustomerSearch('');
//     setShowCustomerDropdown(false);
//   };

//   const handleAddProduct = (product: ProductData) => {
//     const existing = orderItems.find((item) => item.productId === product.id);
//     if (existing) {
//       setOrderItems((prev) =>
//         prev.map((item) =>
//           item.productId === product.id
//             ? { ...item, quantity: item.quantity + addingProductQuantity }
//             : item
//         )
//       );
//     } else {
//       setOrderItems((prev) => [
//         ...prev,
//         {
//           productId: product.id,
//           quantity: addingProductQuantity,
//           price: product.price,
//           product,
//         },
//       ]);
//     }
//     setProductSearch('');
//     setProductResults([]);
//     setShowProductDropdown(false);
//     setAddingProductQuantity(1);
//   };

//   const handleRemoveItem = (productId: string) => {
//     setOrderItems((prev) => prev.filter((item) => item.productId !== productId));
//   };

//   const handleUpdateQuantity = (productId: string, quantity: number) => {
//     if (quantity <= 0) {
//       handleRemoveItem(productId);
//       return;
//     }
//     setOrderItems((prev) =>
//       prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
//     );
//   };

//   const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
//   const total = subtotal + shippingCost - discountAmount;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!customer.firstName || !customer.phone) {
//       showToast('error', 'Customer name and phone required');
//       return;
//     }

//     if (!address.street1 || !address.city) {
//       showToast('error', 'Street and city required');
//       return;
//     }

//     if (orderItems.length === 0) {
//       showToast('error', 'Add at least one product');
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await fetch('/api/admin/orders', {
//         method: 'POST',
//         credentials: 'include',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           customer: {
//             firstName: customer.firstName,
//             lastName: customer.lastName || '',
//             email: customer.email || `${Date.now()}@order.local`,
//             phone: customer.phone,
//           },
//           shippingAddress: {
//             firstName: address.firstName || customer.firstName,
//             lastName: address.lastName || customer.lastName || '',
//             street1: address.street1,
//             street2: address.street2 || '',
//             city: address.city,
//             state: address.state || '',
//             postalCode: address.postalCode || '',
//             phone: address.phone || customer.phone,
//             pathaoCityId: address.pathaoCityId,
//             pathaoZoneId: address.pathaoZoneId,
//             pathaoAreaId: address.pathaoAreaId,
//           },
//           items: orderItems.map((item) => ({
//             productId: item.productId,
//             variantId: item.variantId,
//             quantity: item.quantity,
//             price: item.price,
//           })),
//           paymentMethod,
//           paymentStatus,
//           shippingCost,
//           discountAmount,
//           couponCode: couponCode || undefined,
//           adminNote: adminNote || undefined,
//           status: orderStatus,
//         }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error || 'Failed to create order');
//       }

//       const data = await res.json();
//       showToast('success', `Order created: ${data.order.orderNumber}`);
//       setTimeout(() => router.push(`/admin/orders/${data.order.orderNumber}`), 1500);
//     } catch (error) {
//       showToast('error', error instanceof Error ? error.message : 'Failed to create order');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#F7F8FA] p-6">
//       {toast && (
//         <div className="fixed right-4 top-4 z-50">
//           <div
//             className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
//               toast.type === 'success'
//                 ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
//                 : 'border-red-200 bg-red-50 text-red-700'
//             }`}
//           >
//             {toast.message}
//           </div>
//         </div>
//       )}

//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="mb-6">
//           <button
//             onClick={() => router.back()}
//             className="text-sm text-violet-600 hover:text-violet-800 mb-3 flex items-center gap-1"
//           >
//             ← Back to Orders
//           </button>
//           <h1 className="text-3xl font-bold text-gray-900">Create Order</h1>
//           <p className="text-sm text-gray-500 mt-1">Add order for customer</p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Customer Section */}
//           <div className="bg-white rounded-xl border border-gray-200 p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
//               <User className="w-5 h-5" /> Customer
//             </h2>

//             {selectedCustomer ? (
//               <div className="mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200 flex items-center justify-between">
//                 <div>
//                   <p className="font-medium text-gray-900">
//                     {selectedCustomer.firstName} {selectedCustomer.lastName}
//                   </p>
//                   <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSelectedCustomer(null);
//                     setCustomer({});
//                     setCustomerSearch('');
//                   }}
//                   className="text-violet-600 hover:text-violet-800"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             ) : (
//               <div className="relative mb-4">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search existing customer..."
//                   value={customerSearch}
//                   onChange={(e) => {
//                     setCustomerSearch(e.target.value);
//                     setShowCustomerDropdown(true);
//                   }}
//                   className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                   onFocus={() => setShowCustomerDropdown(true)}
//                 />
//                 {showCustomerDropdown && customerResults.length > 0 && (
//                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
//                     {customerResults.map((cust) => (
//                       <button
//                         key={cust.id}
//                         type="button"
//                         onClick={() => handleSelectCustomer(cust)}
//                         className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
//                       >
//                         <p className="font-medium text-sm text-gray-900">
//                           {cust.firstName} {cust.lastName}
//                         </p>
//                         <p className="text-xs text-gray-500">{cust.email}</p>
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   First Name *
//                 </label>
//                 <input
//                   type="text"
//                   value={customer.firstName || ''}
//                   onChange={(e) => setCustomer((p) => ({ ...p, firstName: e.target.value }))}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Last Name
//                 </label>
//                 <input
//                   type="text"
//                   value={customer.lastName || ''}
//                   onChange={(e) => setCustomer((p) => ({ ...p, lastName: e.target.value }))}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
//                   <Phone className="w-4 h-4" /> Phone *
//                 </label>
//                 <input
//                   type="tel"
//                   value={customer.phone || ''}
//                   onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
//                   <Mail className="w-4 h-4" /> Email
//                 </label>
//                 <input
//                   type="email"
//                   value={customer.email || ''}
//                   onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Address Section */}
//           <div className="bg-white rounded-xl border border-gray-200 p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
//               <MapPin className="w-5 h-5" /> Delivery Address
//             </h2>

//             <div className="grid grid-cols-2 gap-4 mb-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   First Name
//                 </label>
//                 <input
//                   type="text"
//                   value={address.firstName || ''}
//                   onChange={(e) => setAddress((p) => ({ ...p, firstName: e.target.value }))}
//                   placeholder={customer.firstName}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Last Name
//                 </label>
//                 <input
//                   type="text"
//                   value={address.lastName || ''}
//                   onChange={(e) => setAddress((p) => ({ ...p, lastName: e.target.value }))}
//                   placeholder={customer.lastName}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//             </div>

//             {/* Pathao Cascading */}
//             <div className="grid grid-cols-3 gap-4 mb-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   City *
//                 </label>
//                 <select
//                   value={address.pathaoCityId || ''}
//                   onChange={(e) =>
//                     setAddress((p) => ({
//                       ...p,
//                       pathaoCityId: e.target.value ? parseInt(e.target.value) : undefined,
//                       city: cities.find((c) => c.id === parseInt(e.target.value))?.name,
//                     }))
//                   }
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                   required
//                 >
//                   <option value="">Select city</option>
//                   {cities.map((city) => (
//                     <option key={city.id} value={city.id}>
//                       {city.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Zone *
//                 </label>
//                 <select
//                   value={address.pathaoZoneId || ''}
//                   onChange={(e) =>
//                     setAddress((p) => ({
//                       ...p,
//                       pathaoZoneId: e.target.value ? parseInt(e.target.value) : undefined,
//                       state: zones.find((z) => z.id === parseInt(e.target.value))?.name,
//                     }))
//                   }
//                   disabled={!address.pathaoCityId}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
//                   required
//                 >
//                   <option value="">Select zone</option>
//                   {zones.map((zone) => (
//                     <option key={zone.id} value={zone.id}>
//                       {zone.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Area *
//                 </label>
//                 <select
//                   value={address.pathaoAreaId || ''}
//                   onChange={(e) =>
//                     setAddress((p) => ({
//                       ...p,
//                       pathaoAreaId: e.target.value ? parseInt(e.target.value) : undefined,
//                     }))
//                   }
//                   disabled={!address.pathaoZoneId}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
//                   required
//                 >
//                   <option value="">Select area</option>
//                   {areas.map((area) => (
//                     <option key={area.id} value={area.id}>
//                       {area.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Phone
//                 </label>
//                 <input
//                   type="tel"
//                   value={address.phone || ''}
//                   onChange={(e) => setAddress((p) => ({ ...p, phone: e.target.value }))}
//                   placeholder={customer.phone}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//              </div>
//           </div>

//           {/* Products Section */}
//           <div className="bg-white rounded-xl border border-gray-200 p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
//               <Package className="w-5 h-5" /> Products
//             </h2>

//             <div className="relative mb-4">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search products..."
//                 value={productSearch}
//                 onChange={(e) => {
//                   setProductSearch(e.target.value);
//                   setShowProductDropdown(true);
//                 }}
//                 onFocus={() => setShowProductDropdown(true)}
//                 className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//               />
//               {showProductDropdown && productResults.length > 0 && (
//                 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
//                   {productResults.map((product) => (
//                     <div
//                       key={product.id}
//                       className="px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
//                     >
//                       <div className="flex items-center justify-between gap-2">
//                         <div className="flex-1 min-w-0">
//                           <p className="font-medium text-sm text-gray-900">{product.name}</p>
//                           <p className="text-xs text-gray-500">SKU: {product.sku}</p>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <input
//                             type="number"
//                             min="1"
//                             value={addingProductQuantity}
//                             onChange={(e) => setAddingProductQuantity(parseInt(e.target.value) || 1)}
//                             className="w-16 px-2 py-1 border border-gray-200 rounded text-xs"
//                           />
//                           <button
//                             type="button"
//                             onClick={() => handleAddProduct(product)}
//                             className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700"
//                           >
//                             <Plus className="w-3.5 h-3.5" /> Add
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Order Items */}
//             {orderItems.length > 0 ? (
//               <div className="space-y-2">
//                 {orderItems.map((item) => (
//                   <div
//                     key={item.productId}
//                     className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
//                   >
//                     <div className="flex-1">
//                       <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
//                       <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="number"
//                         min="1"
//                         value={item.quantity}
//                         onChange={(e) =>
//                           handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)
//                         }
//                         className="w-16 px-2 py-1 border border-gray-200 rounded text-xs"
//                       />
//                       <span className="text-sm font-medium text-gray-900 w-20 text-right">
//                         {formatPrice(item.price * item.quantity)}
//                       </span>
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveItem(item.productId)}
//                         className="p-1 text-red-500 hover:bg-red-50 rounded"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-sm text-gray-500 text-center py-6">No products added yet</p>
//             )}
//           </div>

//           {/* Order Settings */}
//           <div className="bg-white rounded-xl border border-gray-200 p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
//               <DollarSign className="w-5 h-5" /> Order Settings
//             </h2>

//             <div className="grid grid-cols-2 gap-4 mb-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Payment Method
//                 </label>
//                 <select
//                   value={paymentMethod}
//                   onChange={(e) => setPaymentMethod(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 >
//                   {PAYMENT_METHODS.map((method) => (
//                     <option key={method.value} value={method.value}>
//                       {method.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Payment Status
//                 </label>
//                 <select
//                   value={paymentStatus}
//                   onChange={(e) => setPaymentStatus(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 >
//                   {PAYMENT_STATUSES.map((status) => (
//                     <option key={status.value} value={status.value}>
//                       {status.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Order Status
//                 </label>
//                 <select
//                   value={orderStatus}
//                   onChange={(e) => setOrderStatus(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 >
//                   {ORDER_STATUSES.map((status) => (
//                     <option key={status.value} value={status.value}>
//                       {status.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Shipping Cost
//                 </label>
//                 <input
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={shippingCost}
//                   onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Discount Amount
//                 </label>
//                 <input
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={discountAmount}
//                   onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Coupon Code
//                 </label>
//                 <input
//                   type="text"
//                   value={couponCode}
//                   onChange={(e) => setCouponCode(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
//                 />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                 Admin Note
//               </label>
//               <textarea
//                 value={adminNote}
//                 onChange={(e) => setAdminNote(e.target.value)}
//                 rows={3}
//                 placeholder="Internal notes..."
//                 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
//               />
//             </div>
//           </div>

//           {/* Order Summary */}
//           <div className="bg-white rounded-xl border border-gray-200 p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
//             <div className="space-y-2 text-sm mb-4">
//               <div className="flex justify-between text-gray-600">
//                 <span>Subtotal</span>
//                 <span>{formatPrice(subtotal)}</span>
//               </div>
//               {shippingCost > 0 && (
//                 <div className="flex justify-between text-gray-600">
//                   <span>Shipping</span>
//                   <span>{formatPrice(shippingCost)}</span>
//                 </div>
//               )}
//               {discountAmount > 0 && (
//                 <div className="flex justify-between text-emerald-600">
//                   <span>Discount</span>
//                   <span>-{formatPrice(discountAmount)}</span>
//                 </div>
//               )}
//               <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
//                 <span>Total</span>
//                 <span>{formatPrice(total)}</span>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading || orderItems.length === 0}
//               className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="w-4 h-4 animate-spin" /> Creating...
//                 </>
//               ) : (
//                 <>
//                   <Check className="w-4 h-4" /> Create Order
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
