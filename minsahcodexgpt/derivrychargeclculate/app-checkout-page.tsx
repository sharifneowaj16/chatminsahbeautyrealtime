'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, CreditCard, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import SocialLoginModal from '@/app/products/[id]/components/SocialLoginModal';

type DeliveryOption = {
  id: number;
  name: string;
};

type DeliveryAreaOption = DeliveryOption & {
  homeDeliveryAvailable?: boolean;
  pickupAvailable?: boolean;
};

type ShippingFormState = {
  fullName: string;
  phoneNumber: string;
  city: string;
  zone: string;
  area: string;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
};

function normalizeDeliveryOptions(value: unknown): DeliveryOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const candidate = option as { id?: unknown; name?: unknown };
      const id = Number(candidate.id);
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      return Number.isFinite(id) && name ? { id, name } : null;
    })
    .filter((option): option is DeliveryOption => Boolean(option));
}

function normalizeDeliveryAreas(value: unknown): DeliveryAreaOption[] {
  if (!Array.isArray(value)) return [];

  const areas: DeliveryAreaOption[] = [];
  for (const option of value) {
    if (!option || typeof option !== 'object') continue;
    const candidate = option as {
      id?: unknown;
      name?: unknown;
      homeDeliveryAvailable?: unknown;
      pickupAvailable?: unknown;
    };
    const id = Number(candidate.id);
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    if (!Number.isFinite(id) || !name) continue;
    areas.push({
      id,
      name,
      homeDeliveryAvailable: Boolean(candidate.homeDeliveryAvailable),
      pickupAvailable: Boolean(candidate.pickupAvailable),
    });
  }
  return areas;
}

function CheckoutContent() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _searchParams = useSearchParams(); // kept for Suspense boundary
  const { user } = useAuth();
  const {
    items,
    subtotal,
    selectedPaymentMethod,
    clearCart,
  } = useCart();

  const [expandedSection, setExpandedSection] = useState<'address' | 'payment' | 'summary' | null>('address');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>({
    fullName: '',
    phoneNumber: '',
    city: '',
    zone: '',
    area: '',
    pathao_city_id: null,
    pathao_zone_id: null,
    pathao_area_id: null,
  });
  const [cities, setCities] = useState<DeliveryOption[]>([]);
  const [zones, setZones] = useState<DeliveryOption[]>([]);
  const [areas, setAreas] = useState<DeliveryAreaOption[]>([]);
  const [locationLoading, setLocationLoading] = useState<'cities' | 'zones' | 'areas' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [deliveryState, setDeliveryState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

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
  const estimatedTotalWeightKg = useMemo(
    () => Number((items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0) * 0.1).toFixed(3)),
    [items]
  );
  const hasDeliveryLocation = Boolean(
    shippingForm.pathao_city_id &&
    shippingForm.pathao_zone_id &&
    shippingForm.pathao_area_id
  );
  const hasRequiredShippingFields = Boolean(
    shippingForm.fullName.trim() &&
    shippingForm.phoneNumber.trim() &&
    shippingForm.city.trim() &&
    shippingForm.zone.trim() &&
    shippingForm.area.trim() &&
    hasDeliveryLocation
  );
  const finalTotal = subtotal + deliveryCharge;

  useEffect(() => {
    if (!user) return;
    setShippingForm((current) => ({
      ...current,
      fullName: current.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '),
      phoneNumber: current.phoneNumber || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const loadCities = async () => {
      setLocationLoading('cities');
      setLocationError(null);
      try {
        const response = await fetch('/api/shipping/pathao/cities', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load cities');
        const data = await response.json();
        if (!isCancelled) setCities(normalizeDeliveryOptions(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setCities([]);
          setLocationError('Could not load delivery cities. Please try again.');
        }
      } finally {
        if (!isCancelled) setLocationLoading(null);
      }
    };

    void loadCities();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!shippingForm.pathao_city_id) {
      setZones([]);
      setAreas([]);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const loadZones = async () => {
      setLocationLoading('zones');
      setLocationError(null);
      try {
        const response = await fetch(`/api/shipping/pathao/zones?city_id=${shippingForm.pathao_city_id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load zones');
        const data = await response.json();
        if (!isCancelled) setZones(normalizeDeliveryOptions(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setZones([]);
          setLocationError('Could not load zones for this city. Please try again.');
        }
      } finally {
        if (!isCancelled) setLocationLoading(null);
      }
    };

    void loadZones();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [shippingForm.pathao_city_id]);

  useEffect(() => {
    if (!shippingForm.pathao_zone_id) {
      setAreas([]);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const loadAreas = async () => {
      setLocationLoading('areas');
      setLocationError(null);
      try {
        const response = await fetch(`/api/shipping/pathao/areas?zone_id=${shippingForm.pathao_zone_id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load areas');
        const data = await response.json();
        if (!isCancelled) setAreas(normalizeDeliveryAreas(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setAreas([]);
          setLocationError('Could not load areas for this zone. Please try again.');
        }
      } finally {
        if (!isCancelled) setLocationLoading(null);
      }
    };

    void loadAreas();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [shippingForm.pathao_zone_id]);

  useEffect(() => {
    if (!items.length || !hasDeliveryLocation || estimatedTotalWeightKg <= 0) {
      setDeliveryCharge(0);
      setDeliveryState('idle');
      setDeliveryError(null);
      return;
    }

    let isCancelled = false;
    const abortController = new AbortController();

    const quoteDeliveryCharge = async () => {
      setDeliveryState('loading');
      setDeliveryError(null);
      try {
        const response = await fetch('/api/shipping/pathao/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: shippingQuoteItems,
            totalWeightKg: estimatedTotalWeightKg,
            address: {
              pathao_city_id: shippingForm.pathao_city_id,
              pathao_zone_id: shippingForm.pathao_zone_id,
            },
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to quote delivery');
        }

        const data = (await response.json()) as { shippingCharge?: number };
        if (!isCancelled && typeof data.shippingCharge === 'number') {
          setDeliveryCharge(data.shippingCharge);
          setDeliveryState('success');
        }
      } catch {
        if (!isCancelled && !abortController.signal.aborted) {
          setDeliveryCharge(0);
          setDeliveryState('error');
          setDeliveryError('Could not calculate delivery charge. Please check city, zone and area.');
        }
      }
    };

    void quoteDeliveryCharge();
    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [
    items.length,
    hasDeliveryLocation,
    shippingQuoteItems,
    estimatedTotalWeightKg,
    shippingForm.pathao_city_id,
    shippingForm.pathao_zone_id,
  ]);

  const submitOrder = async (sessionUserId?: string) => {
    if (!hasRequiredShippingFields) {
      alert('Please enter name, phone, city, zone and area');
      setExpandedSection('address');
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
    if (deliveryState !== 'success') {
      alert('Could not calculate delivery charge. Please check city, zone and area.');
      return;
    }

    setIsPlacingOrder(true);

    try {
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
          addressData: {
            fullName: shippingForm.fullName.trim(),
            phoneNumber: shippingForm.phoneNumber.trim(),
            address: shippingForm.area.trim(),
            zone: shippingForm.zone.trim(),
            city: shippingForm.city.trim(),
            provinceRegion: shippingForm.city.trim(),
            landmark: '',
            pathao_city_id: shippingForm.pathao_city_id,
            pathao_zone_id: shippingForm.pathao_zone_id,
            pathao_area_id: shippingForm.pathao_area_id,
          },
          paymentMethod: selectedPaymentMethod.type,
          shippingCost: deliveryCharge,
          shippingMethod: 'pathao',
          customerNote: '',
          sessionUserId,
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

  const handlePlaceOrder = async () => {
    if (!user) {
      pendingOrderRef.current = true;
      setShowLoginModal(true);
      return;
    }
    await submitOrder();
  };

  const handleLoginSuccess = async (userId: string) => {
    setShowLoginModal(false);
    if (pendingOrderRef.current) {
      pendingOrderRef.current = false;
      await submitOrder(userId);
    }
  };

  const toggleSection = (section: 'address' | 'payment' | 'summary') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleCityChange = (cityId: string) => {
    const selectedCity = cities.find((city) => String(city.id) === cityId);
    setShippingForm((current) => ({
      ...current,
      city: selectedCity?.name ?? '',
      zone: '',
      area: '',
      pathao_city_id: selectedCity?.id ?? null,
      pathao_zone_id: null,
      pathao_area_id: null,
    }));
    setZones([]);
    setAreas([]);
  };

  const handleZoneChange = (zoneId: string) => {
    const selectedZone = zones.find((zone) => String(zone.id) === zoneId);
    setShippingForm((current) => ({
      ...current,
      zone: selectedZone?.name ?? '',
      area: '',
      pathao_zone_id: selectedZone?.id ?? null,
      pathao_area_id: null,
    }));
    setAreas([]);
  };

  const handleAreaChange = (areaId: string) => {
    const selectedArea = areas.find((area) => String(area.id) === areaId);
    setShippingForm((current) => ({
      ...current,
      area: selectedArea?.name ?? '',
      pathao_area_id: selectedArea?.id ?? null,
    }));
  };

  return (
    <div className="min-h-screen bg-minsah-light pb-24">
      <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link href="/cart" className="p-2 hover:bg-minsah-primary rounded-lg transition">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-semibold">Checkout</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">
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
                <h2 className="font-bold text-minsah-dark">Delivery Location</h2>
                {hasRequiredShippingFields && expandedSection !== 'address' && (
                  <p className="text-xs text-minsah-secondary line-clamp-1">
                    {shippingForm.area}, {shippingForm.zone}, {shippingForm.city}
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
              <div className="mt-4 grid gap-3">
                <input
                  value={shippingForm.fullName}
                  onChange={(event) => setShippingForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-minsah-accent px-4 py-3 text-sm outline-none transition focus:border-minsah-primary"
                />
                <input
                  value={shippingForm.phoneNumber}
                  onChange={(event) => setShippingForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-minsah-accent px-4 py-3 text-sm outline-none transition focus:border-minsah-primary"
                />
                <select
                  value={shippingForm.pathao_city_id ?? ''}
                  onChange={(event) => handleCityChange(event.target.value)}
                  className="w-full rounded-xl border border-minsah-accent px-4 py-3 text-sm outline-none transition focus:border-minsah-primary"
                >
                  <option value="">{locationLoading === 'cities' ? 'Loading cities...' : 'City'}</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
                <select
                  value={shippingForm.pathao_zone_id ?? ''}
                  onChange={(event) => handleZoneChange(event.target.value)}
                  disabled={!shippingForm.pathao_city_id || locationLoading === 'zones'}
                  className="w-full rounded-xl border border-minsah-accent px-4 py-3 text-sm outline-none transition focus:border-minsah-primary disabled:cursor-not-allowed disabled:bg-minsah-accent/40"
                >
                  <option value="">{locationLoading === 'zones' ? 'Loading zones...' : 'Zone'}</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
                <select
                  value={shippingForm.pathao_area_id ?? ''}
                  onChange={(event) => handleAreaChange(event.target.value)}
                  disabled={!shippingForm.pathao_zone_id || locationLoading === 'areas'}
                  className="w-full rounded-xl border border-minsah-accent px-4 py-3 text-sm outline-none transition focus:border-minsah-primary disabled:cursor-not-allowed disabled:bg-minsah-accent/40"
                >
                  <option value="">{locationLoading === 'areas' ? 'Loading areas...' : 'Area'}</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
                {locationError && <p className="text-xs text-red-600">{locationError}</p>}
              </div>
            </div>
          )}
        </div>

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
                    Continue Shopping
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
                            {item.image || '*'}
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
                    <div className="flex justify-between text-sm text-minsah-secondary">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-minsah-secondary">
                      <span>Delivery</span>
                      <span>
                        {deliveryState === 'loading'
                          ? 'Calculating...'
                          : deliveryState === 'success'
                            ? formatPrice(deliveryCharge)
                            : 'Select city, zone and area'}
                      </span>
                    </div>
                    {deliveryError && <p className="text-xs text-red-600">{deliveryError}</p>}
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-minsah-accent shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-minsah-secondary">Total</span>
          <span className="text-xl font-bold text-minsah-primary">{formatPrice(finalTotal)}</span>
        </div>
        <button
          onClick={handlePlaceOrder}
          disabled={
            isPlacingOrder ||
            items.length === 0 ||
            !hasRequiredShippingFields ||
            deliveryState !== 'success'
          }
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
