'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, CreditCard, FileText, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import SocialLoginModal from '@/app/products/[id]/components/SocialLoginModal';

function CheckoutContent() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _searchParams = useSearchParams(); // kept for Suspense boundary
  const { user } = useAuth();
  const {
    items,
    subtotal,
    shippingCost,
    selectedAddress,
    selectedPaymentMethod,
    clearCart,
  } = useCart();

  const [expandedSection, setExpandedSection] = useState<'address' | 'payment' | 'summary' | null>('address');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(shippingCost);
  const [deliveryState, setDeliveryState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deliveryProvider, setDeliveryProvider] = useState<'steadfast' | 'pathao'>('steadfast');
  const [deliveryMeta, setDeliveryMeta] = useState<{ quoteSource?: string; message?: string | null } | null>(null);

  // Ref to track that "Place Order" was clicked while logged out
  const pendingOrderRef = useRef(false);
  const shippingQuoteItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId ?? item.id,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      })),
    [items]
  );
  const finalTotal = subtotal + deliveryCharge;

  useEffect(() => {
    if (!items.length || !selectedAddress?.city || !selectedAddress.zone) {
      setDeliveryCharge(shippingCost);
      setDeliveryState('idle');
      setDeliveryMeta(null);
      return;
    }

    let isCancelled = false;
    const abortController = new AbortController();

    const quoteDeliveryCharge = async () => {
      setDeliveryState('loading');
      try {
        const response = await fetch('/api/buy-now/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: shippingQuoteItems,
            city: selectedAddress.city,
            area: selectedAddress.zone,
            provider: deliveryProvider,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to quote delivery');
        }

        const data = (await response.json()) as { deliveryCharge?: number; quoteSource?: string; message?: string | null };
        if (!isCancelled && typeof data.deliveryCharge === 'number') {
          setDeliveryCharge(data.deliveryCharge);
          setDeliveryState('success');
          setDeliveryMeta({ quoteSource: data.quoteSource, message: data.message ?? null });
        }
      } catch {
        if (!isCancelled) {
          setDeliveryCharge(shippingCost);
          setDeliveryState('error');
          setDeliveryMeta(null);
        }
      }
    };

    void quoteDeliveryCharge();
    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [items.length, selectedAddress?.city, selectedAddress?.zone, shippingCost, shippingQuoteItems, deliveryProvider]);

  // ── Core order submission (called directly or after login) ───────────────
  const submitOrder = async (sessionUserId?: string) => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }
    if (!selectedPaymentMethod) {
      alert('Please select a payment method');
      return;
    }
    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const isRealDbId = selectedAddress.id && !/^\d+$/.test(selectedAddress.id);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId ?? item.id,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
          })),
          addressId: isRealDbId ? selectedAddress.id : undefined,
          addressData: {
            fullName: selectedAddress.fullName,
            phoneNumber: selectedAddress.phoneNumber,
            address: selectedAddress.address,
            zone: selectedAddress.zone,
            city: selectedAddress.city,
            provinceRegion: selectedAddress.provinceRegion,
            landmark: selectedAddress.landmark,
          },
          paymentMethod: selectedPaymentMethod.type,
          shippingCost: deliveryCharge,
          shippingMethod: deliveryProvider,
          customerNote: '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to place order. Please try again.');
        return;
      }

      clearCart();
      router.push(data.redirectURL || '/checkout/order-confirmed');
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ── Place Order button handler ────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user) {
      // Not logged in — open login modal, order will auto-submit after login
      pendingOrderRef.current = true;
      setShowLoginModal(true);
      return;
    }
    await submitOrder();
  };

  // ── Called by SocialLoginModal on successful login ────────────────────────
  const handleLoginSuccess = async (userId: string, userName: string) => {
    setShowLoginModal(false);
    if (pendingOrderRef.current) {
      pendingOrderRef.current = false;
      await submitOrder(userId);
    }
  };

  const toggleSection = (section: 'address' | 'payment' | 'summary') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-minsah-light pb-24">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link href="/cart" className="p-2 hover:bg-minsah-primary rounded-lg transition">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-semibold">Checkout</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">

        {/* ── Shipping Address ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('address')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-minsah-accent/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <MapPin size={20} className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-minsah-dark">Shipping Address</h2>
                {selectedAddress && expandedSection !== 'address' && (
                  <p className="text-xs text-minsah-secondary line-clamp-1">
                    {selectedAddress.address}
                  </p>
                )}
              </div>
            </div>
            {expandedSection === 'address'
              ? <ChevronUp className="text-minsah-secondary" size={20} />
              : <ChevronDown className="text-minsah-secondary" size={20} />}
          </button>

          {expandedSection === 'address' && (
            <div className="px-4 pb-4 border-t border-minsah-accent">
              {selectedAddress ? (
                <div className="mt-4 p-4 bg-minsah-accent rounded-xl relative">
                  <Link
                    href="/checkout/select-address"
                    className="absolute top-3 right-3 p-2 bg-white rounded-lg hover:bg-minsah-light transition"
                  >
                    <Edit2 size={16} className="text-minsah-primary" />
                  </Link>
                  <div className="pr-12">
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin size={16} className="text-minsah-primary mt-0.5" />
                      <p className="text-sm font-semibold text-minsah-dark">
                        {selectedAddress.address}
                      </p>
                    </div>
                    <p className="text-sm text-minsah-secondary ml-6">
                      {selectedAddress.city}, {selectedAddress.zone}
                    </p>
                    <p className="text-sm text-minsah-secondary ml-6">
                      {selectedAddress.fullName} • {selectedAddress.phoneNumber}
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/checkout/select-address"
                  className="mt-4 block w-full bg-minsah-primary text-minsah-light text-center py-3 rounded-xl font-semibold hover:bg-minsah-dark transition"
                >
                  Add Shipping Address
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Payment Method ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('payment')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-minsah-accent/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <CreditCard size={20} className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-minsah-dark">Payment Method</h2>
                {selectedPaymentMethod && expandedSection !== 'payment' && (
                  <p className="text-xs text-minsah-secondary">
                    {selectedPaymentMethod.name}
                  </p>
                )}
              </div>
            </div>
            {expandedSection === 'payment'
              ? <ChevronUp className="text-minsah-secondary" size={20} />
              : <ChevronDown className="text-minsah-secondary" size={20} />}
          </button>

          {expandedSection === 'payment' && (
            <div className="px-4 pb-4 border-t border-minsah-accent">
              <Link
                href="/checkout/payment-method"
                className="mt-4 block w-full bg-minsah-primary text-minsah-light text-center py-3 rounded-xl font-semibold hover:bg-minsah-dark transition"
              >
                {selectedPaymentMethod
                  ? `Change: ${selectedPaymentMethod.name}`
                  : 'Select Payment Method'}
              </Link>
            </div>
          )}
        </div>

        {/* ── Order Summary ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-minsah-accent/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-minsah-dark">Order Summary</h2>
                <p className="text-xs text-minsah-secondary">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {expandedSection === 'summary'
              ? <ChevronUp className="text-minsah-secondary" size={20} />
              : <ChevronDown className="text-minsah-secondary" size={20} />}
          </button>

          {expandedSection === 'summary' && (
            <div className="px-4 pb-4 border-t border-minsah-accent">
              {items.length === 0 ? (
                <div className="mt-4 text-center py-6">
                  <p className="text-sm text-minsah-secondary mb-3">Cart empty</p>
                  <Link href="/shop" className="text-minsah-primary font-semibold text-sm">
                    Continue Shopping →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-minsah-accent flex-shrink-0">
                        {item.image &&
                          (item.image.startsWith('/') || item.image.startsWith('http')) ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-2xl">
                            {item.image || '✨'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-minsah-dark line-clamp-1">
                          {item.name}
                        </p>
                        {item.variantName && (
                          <p className="text-xs text-minsah-secondary">{item.variantName}</p>
                        )}
                        <p className="text-xs text-minsah-secondary">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-minsah-primary">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}

                  <div className="border-t border-minsah-accent pt-3 space-y-2">
                    <div className="pb-2">
                      <p className="text-sm font-semibold text-minsah-dark mb-2">Delivery Partner</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryProvider('steadfast')}
                          className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                            deliveryProvider === 'steadfast'
                              ? 'bg-minsah-primary text-minsah-light border-minsah-primary'
                              : 'bg-white text-minsah-dark border-minsah-accent hover:bg-minsah-accent/30'
                          }`}
                        >
                          Steadfast
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryProvider('pathao')}
                          className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                            deliveryProvider === 'pathao'
                              ? 'bg-minsah-primary text-minsah-light border-minsah-primary'
                              : 'bg-white text-minsah-dark border-minsah-accent hover:bg-minsah-accent/30'
                          }`}
                        >
                          Pathao
                        </button>
                      </div>
                      {deliveryMeta?.quoteSource && (
                        <p className="mt-2 text-xs text-minsah-secondary">
                          Quote: {deliveryMeta.quoteSource === 'fallback' ? 'Estimated' : 'Live'} ({deliveryMeta.quoteSource})
                          {deliveryMeta.message ? ` • ${deliveryMeta.message}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between text-sm text-minsah-secondary">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-minsah-secondary">
                      <span>Shipping</span>
                      <span>
                        {deliveryState === 'loading'
                          ? 'Calculating...'
                          : deliveryState === 'error'
                            ? 'Will be confirmed'
                            : formatPrice(deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-minsah-dark">
                      <span>Total</span>
                      <span>{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Place Order Button (fixed bottom) ────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-minsah-accent shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-minsah-secondary">Total</span>
          <span className="text-xl font-bold text-minsah-primary">{formatPrice(finalTotal)}</span>
        </div>
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || items.length === 0}
          className="w-full bg-minsah-primary text-minsah-light py-4 rounded-xl font-bold text-base shadow-lg hover:bg-minsah-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlacingOrder ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Placing Order...
            </span>
          ) : !user ? (
            'Login to Place Order'
          ) : (
            'Place Order'
          )}
        </button>
      </div>

      {/* ── Social Login Modal Overlay ────────────────────────────── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in">
            <SocialLoginModal
              purpose="checkout"
              onSuccess={handleLoginSuccess}
              onClose={() => {
                setShowLoginModal(false);
                pendingOrderRef.current = false;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-minsah-light flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-minsah-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
