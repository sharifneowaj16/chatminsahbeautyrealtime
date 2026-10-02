'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';

// Atomic Primitives
import { CustomerContactCard } from '@/components/admin/customer/CustomerContactCard';
import { PathaoLocationSelector, PathaoLocationValue } from '@/components/admin/courier/PathaoLocationSelector';
import { CourierProviderSelector, CourierProvider } from '@/components/admin/courier/CourierProviderSelector';
import { CourierWeightPicker } from '@/components/admin/courier/CourierWeightPicker';
import { OrderFinancialSummaryCard } from '@/components/admin/finance/OrderFinancialSummaryCard';
import { AdvancePaymentInput, AdvancePaymentData } from '@/components/admin/finance/AdvancePaymentInput';
import { ProductSearchAutocomplete, SearchedProduct } from '@/components/admin/products/ProductSearchAutocomplete';
import { ProductVariantOption } from '@/components/admin/products/ProductVariantSelector';
import { OrderItemRow } from '@/components/admin/products/OrderItemRow';
import { CustomItemCreateModal } from '@/components/admin/products/CustomItemCreateModal';

import {
  ArrowLeft,
  User,
  ShoppingBag,
  Plus,
  Loader2,
  CheckCircle2,
  MapPin,
  CreditCard,
  Truck,
  PackagePlus,
  AlertCircle,
} from 'lucide-react';

export interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  orderCount?: number;
}

export interface OrderItemLine {
  key: string;
  productId: string | null;
  variantId?: string | null;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  productType: 'new' | 'old' | 'virtual';
  isCustom: boolean;
  variantName?: string;
  imageUrl?: string;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();

  const hasAccess = hasPermission(PERMISSIONS.ORDERS_VIEW);

  // 1. Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerData[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // 2. Shipping Address & Pathao Location
  const [address, setAddress] = useState({
    street1: '',
    street2: '',
    city: 'Dhaka',
    postalCode: '',
  });

  const [pathaoLocation, setPathaoLocation] = useState<PathaoLocationValue>({});

  // 3. Products & Cart
  const [orderItems, setOrderItems] = useState<OrderItemLine[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // 4. Logistics & Courier
  const [courierProvider, setCourierProvider] = useState<CourierProvider>('steadfast');
  const [weightKg, setWeightKg] = useState(0.5);

  // 5. Payment & Financials
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bkash' | 'nagad'>('cash_on_delivery');
  const [shippingCost, setShippingCost] = useState(60);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState<AdvancePaymentData>({
    amount: 0,
    method: 'bkash',
    trxId: '',
  });

  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const custDropRef = useRef<HTMLDivElement>(null);

  // Customer search debounce
  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerResults([]);
      setShowCustomerDrop(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomer(true);
        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearch.trim())}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.customers || data.data || []);
          setShowCustomerDrop(true);
        }
      } catch (err) {
        console.error('Error searching customers:', err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Click outside to dismiss customer drop
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (custDropRef.current && !custDropRef.current.contains(e.target as Node)) {
        setShowCustomerDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectCustomer = (c: CustomerData) => {
    setSelectedCustomer(c);
    setCustomer({
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email || '',
      phone: c.phone || '',
    });
    setCustomerSearch('');
    setShowCustomerDrop(false);
  };

  // Add Product from Autocomplete
  const handleAddProduct = (prod: SearchedProduct, variant?: ProductVariantOption) => {
    const key = `${prod.id}_${variant?.id || 'base'}_${Date.now()}`;
    const newItem: OrderItemLine = {
      key,
      productId: prod.id,
      variantId: variant?.id || null,
      name: prod.name,
      sku: variant?.sku || prod.sku,
      price: variant ? variant.price : prod.price,
      quantity: 1,
      productType: 'new',
      isCustom: false,
      variantName: variant?.name,
      imageUrl: variant?.image || prod.image,
    };
    setOrderItems((prev) => [...prev, newItem]);
  };

  // Add Custom Item
  const handleAddCustomItem = (item: {
    name: string;
    sku: string;
    price: number;
    quantity: number;
    productType: 'new' | 'old' | 'virtual';
  }) => {
    const key = `custom_${Date.now()}`;
    setOrderItems((prev) => [
      ...prev,
      {
        key,
        productId: null,
        variantId: null,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        productType: item.productType,
        isCustom: true,
      },
    ]);
  };

  // Totals
  const subtotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const grandTotal = Math.max(0, subtotal + shippingCost - discountAmount);

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const recipientName = (customer.firstName + ' ' + (customer.lastName || '')).trim();
    if (!recipientName) {
      pushToast({ tone: 'danger', description: 'Customer name is required' });
      return;
    }
    if (!customer.phone.trim()) {
      pushToast({ tone: 'danger', description: 'Customer phone number is required' });
      return;
    }
    if (!address.street1.trim()) {
      pushToast({ tone: 'danger', description: 'Delivery street address is required' });
      return;
    }
    if (orderItems.length === 0) {
      pushToast({ tone: 'danger', description: 'Add at least one product to the order' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer: {
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          email: customer.email.trim() || `${Date.now()}@minsahorder.local`,
          phone: customer.phone.trim(),
        },
        shippingAddress: {
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          street1: address.street1.trim(),
          street2: address.street2.trim(),
          city: pathaoLocation.cityName || address.city || 'Dhaka',
          postalCode: address.postalCode.trim(),
          phone: customer.phone.trim(),
          pathaoCityId: pathaoLocation.cityId,
          pathaoZoneId: pathaoLocation.zoneId,
          pathaoAreaId: pathaoLocation.areaId,
        },
        items: orderItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
          productType: it.productType,
          isCustom: it.isCustom,
        })),
        paymentMethod,
        paymentStatus: advancePayment.amount >= grandTotal ? 'PAID' : 'PENDING',
        shippingCost,
        discountAmount,
        advancePayment: advancePayment.amount,
        advancePaymentTrxId: advancePayment.trxId,
        courier: courierProvider,
        adminNote: adminNote.trim() || undefined,
        status: 'PENDING',
      };

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      pushToast({
        tone: 'success',
        description: `Order #${data.order?.orderNumber || 'Created'} successfully!`,
      });
      setTimeout(() => router.push('/admin/orders'), 1200);
    } catch (err: any) {
      pushToast({ tone: 'danger', description: err.message || 'Order creation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>You do not have permission to create orders.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Create New Order
            </h1>
            <p className="text-xs text-slate-400">
              Manual administrative order booking & courier consignment mapping
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmitOrder}
          disabled={submitting}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/30 px-5"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Place & Create Order</span>
        </Button>
      </div>

      {/* 3-Column Responsive Grid */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: Customer & Destination (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Customer Search / Input Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-400" />
                Customer Identity
              </span>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomer({ firstName: '', lastName: '', email: '', phone: '' });
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Customer Search Dropdown */}
            <div ref={custDropRef} className="relative">
              <label className="text-[11px] text-slate-400 block mb-1">
                Lookup Registered Customer
              </label>
              <Input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by phone, name, or email..."
                className="h-9 text-xs"
              />
              {searchingCustomer && (
                <Loader2 className="w-4 h-4 text-rose-400 animate-spin absolute right-3 top-7" />
              )}

              {showCustomerDrop && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {customerResults.map((c, i) => (
                    <div
                      key={c.id || i}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2.5 hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-white block">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {c.phone} {c.email ? `• ${c.email}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <CustomerContactCard
                name={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()}
                phone={selectedCustomer.phone}
                email={selectedCustomer.email}
                orderCount={selectedCustomer.orderCount}
                compact
              />
            )}

            {/* Direct Editable Fields */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={customer.firstName}
                  onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                  placeholder="e.g. Tanzila"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Last Name</label>
                <Input
                  type="text"
                  value={customer.lastName}
                  onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                  placeholder="e.g. Akter"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Email (Optional)</label>
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address & Pathao Location Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
            <div className="pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Delivery Destination
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Street Address <span className="text-rose-400">*</span>
              </label>
              <Textarea
                rows={2}
                value={address.street1}
                onChange={(e) => setAddress({ ...address, street1: e.target.value })}
                placeholder="House #, Road #, Sector/Block, Landmark..."
                className="text-xs"
              />
            </div>

            {/* Pathao Cascading Location Selector */}
            <PathaoLocationSelector
              value={pathaoLocation}
              onChange={setPathaoLocation}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">City / District</label>
                <Input
                  type="text"
                  value={pathaoLocation.cityName || address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Postal Code (Optional)</label>
                <Input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="e.g. 1209"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Products & Order Items (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
                Order Line Items ({orderItems.length})
              </div>

              <button
                type="button"
                onClick={() => setIsCustomModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-600 transition-colors"
              >
                <PackagePlus className="w-3.5 h-3.5 text-rose-400" />
                <span>+ Custom Item</span>
              </button>
            </div>

            {/* Product Live Search Autocomplete */}
            <ProductSearchAutocomplete onSelect={handleAddProduct} />

            {/* Order Items List */}
            <div className="space-y-2 pt-2 max-h-[460px] overflow-y-auto pr-1">
              {orderItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
                  <ShoppingBag className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                  <p className="text-xs font-medium">No products added yet</p>
                  <p className="text-[11px] text-slate-600">
                    Use search above or click "+ Custom Item"
                  </p>
                </div>
              ) : (
                orderItems.map((item) => (
                  <OrderItemRow
                    key={item.key}
                    title={item.name}
                    sku={item.sku}
                    variantName={item.variantName}
                    imageUrl={item.imageUrl}
                    unitPrice={item.price}
                    quantity={item.quantity}
                    productType={item.productType}
                    isCustom={item.isCustom}
                    editable
                    onQuantityChange={(qty) =>
                      setOrderItems((prev) =>
                        prev.map((it) => (it.key === item.key ? { ...it, quantity: qty } : it))
                      )
                    }
                    onDelete={() =>
                      setOrderItems((prev) => prev.filter((it) => it.key !== item.key))
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Admin Note */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Internal Staff Note / Customer Instructions
            </label>
            <Textarea
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. Call before delivery; Fragile item requested special box..."
              className="text-xs"
            />
          </div>
        </div>

        {/* COLUMN 3: Logistics, Financials & Actions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Courier Selection */}
          <CourierProviderSelector
            selected={courierProvider}
            onSelect={setCourierProvider}
          />

          {/* Weight Picker */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <CourierWeightPicker weightKg={weightKg} onChange={setWeightKg} />
          </div>

          {/* Advance Payment Input */}
          <AdvancePaymentInput
            value={advancePayment}
            onChange={setAdvancePayment}
            orderTotal={grandTotal}
            deliveryFee={shippingCost}
          />

          {/* Financial Summary */}
          <OrderFinancialSummaryCard
            subtotal={subtotal}
            deliveryFee={shippingCost}
            discount={discountAmount}
            advancePaid={advancePayment.amount}
            total={grandTotal}
            isCod={paymentMethod === 'cash_on_delivery'}
          />

          {/* Delivery & Discount Tuning */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Delivery Fee (৳):</span>
              <input
                type="number"
                min={0}
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                className="w-20 h-7 text-xs font-bold text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-100 tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Discount Amount (৳):</span>
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-20 h-7 text-xs font-bold text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-100 tabular-nums"
              />
            </div>
          </div>

          {/* Submit Order Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitting}
            className="h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-rose-900/30"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>Confirm & Create Order</span>
          </Button>
        </div>
      </form>

      {/* Custom Item Modal */}
      <CustomItemCreateModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAddCustomItem={handleAddCustomItem}
      />
    </div>
  );
}
