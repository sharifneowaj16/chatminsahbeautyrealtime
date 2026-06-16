'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingCart, MapPin, Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import SocialLoginModal from '@/app/products/[id]/components/SocialLoginModal';

type DeliveryOption = {
  id: number;
  name: string;
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

  const options: DeliveryOption[] = [];
  for (const option of value) {
    if (!option || typeof option !== 'object') continue;
    const candidate = option as { id?: unknown; name?: unknown };
    const id = Number(candidate.id);
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    if (Number.isFinite(id) && name) options.push({ id, name });
  }
  return options;
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    selectedPaymentMethod,
  } = useCart();

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
  const [areas, setAreas] = useState<DeliveryOption[]>([]);
  const [locationLoading, setLocationLoading] = useState<'cities' | 'zones' | 'areas' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryState, setDeliveryState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
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
        if (!isCancelled) setAreas(normalizeDeliveryOptions(data));
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
    const controller = new AbortController();

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
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to quote delivery');
        const data = (await response.json()) as { shippingCharge?: number };
        if (!isCancelled && typeof data.shippingCharge === 'number') {
          setDeliveryCharge(data.shippingCharge);
          setDeliveryState('success');
        }
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setDeliveryCharge(0);
          setDeliveryState('error');
          setDeliveryError('Could not calculate delivery charge. Please check city, zone and area.');
        }
      }
    };

    void quoteDeliveryCharge();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    items.length,
    hasDeliveryLocation,
    shippingQuoteItems,
    estimatedTotalWeightKg,
    shippingForm.pathao_city_id,
    shippingForm.pathao_zone_id,
  ]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = items.find((cartItem) => cartItem.id === itemId);
    if (item) updateQuantity(itemId, item.quantity + delta);
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

  const submitOrder = async (sessionUserId?: string) => {
    if (!hasRequiredShippingFields) {
      alert('Please enter name, phone, city, zone and area');
      return;
    }
    if (!selectedPaymentMethod) {
      alert('Please select a payment method');
      return;
    }
    if (!items.length) {
      alert('Cart is empty');
      return;
    }
    if (deliveryState !== 'success') {
      alert('Could not calculate delivery charge. Please check city, zone and area.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const response = await fetch('/api/orders', {
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
      const data = await response.json();
      if (!response.ok) {
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

  const canPlaceOrder =
    items.length > 0 &&
    hasRequiredShippingFields &&
    deliveryState === 'success' &&
    !isPlacingOrder;

  return (
    <div className="min-h-screen bg-[#FDF8F3] pb-32">
      <header className="bg-[#3D1F0E] text-[#F5E6D3] sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link href="/shop" className="p-2 hover:bg-[#2A1509] rounded-lg transition">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-semibold">Cart & Checkout</h1>
          <div className="p-2 relative">
            <ShoppingCart size={24} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#F5E6D3] text-[#3D1F0E] text-xs min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-bold">
                {items.length}
              </span>
            )}
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-[#F5E9DC] rounded-full p-8 mb-6">
            <ShoppingCart size={64} className="text-[#3D1F0E]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A0D06] mb-2">Your cart is empty</h2>
          <p className="text-[#8B5E3C] mb-6 text-center">Add products to start checkout.</p>
          <Link href="/shop" className="bg-[#3D1F0E] text-[#F5E6D3] px-8 py-3 rounded-lg font-semibold hover:bg-[#2A1509] transition">
            Start Shopping
          </Link>
        </div>
      ) : (
        <main className="px-4 py-4 space-y-4">
          <section className="space-y-3">
            {items.map((item) => {
              const displayImage = item.variantImage || item.image;
              const itemTotal = item.price * item.quantity;

              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5E9DC]">
                      {displayImage ? (
                        <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">*</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1A0D06] text-sm leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      {(item.size || item.color || item.variantName) && (
                        <p className="mt-1 text-xs text-[#8B5E3C] line-clamp-1">
                          {[item.size, item.color].filter(Boolean).join(' / ') || item.variantName}
                        </p>
                      )}
                      <p className="text-sm font-bold text-[#3D1F0E] mt-1.5">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0 self-start"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5E9DC]">
                    <div className="flex items-center h-9 rounded-xl border-2 border-[#3D1F0E] overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-9 h-full flex items-center justify-center text-[#3D1F0E] hover:bg-[#F5E9DC] transition"
                        aria-label="Decrease"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-9 text-center text-sm font-bold text-[#1A0D06]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-9 h-full flex items-center justify-center text-[#3D1F0E] hover:bg-[#F5E9DC] transition"
                        aria-label="Increase"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-[#8B5E3C]">
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                      <p className="text-base font-bold text-[#1A0D06]">
                        {formatPrice(itemTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#3D1F0E]" />
                <h2 className="font-bold text-[#1A0D06]">Delivery Location</h2>
              </div>
              {locationLoading ? <Loader2 size={16} className="animate-spin text-[#8B5E3C]" /> : null}
            </div>

            <div className="grid gap-3">
              <input
                value={shippingForm.fullName}
                onChange={(event) => setShippingForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Full name"
                className="w-full rounded-xl border border-[#E8D5C0] px-4 py-3 text-sm outline-none transition focus:border-[#3D1F0E]"
              />
              <input
                value={shippingForm.phoneNumber}
                onChange={(event) => setShippingForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-xl border border-[#E8D5C0] px-4 py-3 text-sm outline-none transition focus:border-[#3D1F0E]"
              />
              <select
                value={shippingForm.pathao_city_id ?? ''}
                onChange={(event) => handleCityChange(event.target.value)}
                className="w-full rounded-xl border border-[#E8D5C0] px-4 py-3 text-sm outline-none transition focus:border-[#3D1F0E]"
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
                className="w-full rounded-xl border border-[#E8D5C0] px-4 py-3 text-sm outline-none transition focus:border-[#3D1F0E] disabled:cursor-not-allowed disabled:bg-[#F5E9DC]"
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
                className="w-full rounded-xl border border-[#E8D5C0] px-4 py-3 text-sm outline-none transition focus:border-[#3D1F0E] disabled:cursor-not-allowed disabled:bg-[#F5E9DC]"
              >
                <option value="">{locationLoading === 'areas' ? 'Loading areas...' : 'Area'}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            {locationError ? <p className="mt-2 text-xs text-red-600">{locationError}</p> : null}
          </section>

          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-[#1A0D06]">Payment</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F5E9DC] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#3D1F0E]" />
              <div>
                <p className="text-sm font-semibold text-[#1A0D06]">Cash on Delivery</p>
                <p className="text-xs text-[#8B5E3C]">Pay when your order arrives</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
            <h2 className="font-bold text-[#1A0D06]">Order Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-[#8B5E3C]">Subtotal</span>
              <span className="font-semibold text-[#1A0D06]">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8B5E3C]">Delivery</span>
              <span className="font-semibold text-[#1A0D06]">
                {deliveryState === 'loading'
                  ? 'Calculating...'
                  : deliveryState === 'success'
                    ? formatPrice(deliveryCharge)
                    : 'Select city, zone and area'}
              </span>
            </div>
            {deliveryError ? <p className="text-xs text-red-600">{deliveryError}</p> : null}
            <div className="border-t border-[#E8D5C0] pt-3 flex justify-between">
              <span className="font-bold text-[#1A0D06]">Total</span>
              <span className="font-bold text-[#3D1F0E] text-lg">{formatPrice(finalTotal)}</span>
            </div>
          </section>
        </main>
      )}

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8D5C0] shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#8B5E3C]">Total</span>
            <span className="text-xl font-bold text-[#3D1F0E]">{formatPrice(finalTotal)}</span>
          </div>
          <button
            type="button"
            onClick={() => void handlePlaceOrder()}
            disabled={!canPlaceOrder}
            className="w-full bg-[#3D1F0E] text-[#F5E6D3] py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-[#2A1509] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacingOrder ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Placing Order...
              </span>
            ) : !user ? (
              'Login to Place Order'
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      )}

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
