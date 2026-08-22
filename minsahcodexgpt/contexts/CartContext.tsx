'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { trackAddToCart } from '@/lib/tracking/ecommerce';

// ── Types ──────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;          // variantId ?? productId  (used as React key & local lookup)
  cartItemId?: string; // DB CartItem.id          (used for PATCH/DELETE /api/cart/:id)
  productId?: string;  // DB Product.id           (MUST be sent to /api/orders)
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku?: string;
  productSku?: string;
  variantSku?: string | null;
  variantName?: string | null;
  size?: string | null;
  color?: string | null;
  variantImage?: string | null;
  weight?: number | null;
  shippingWeight?: number | null;
  /** Available stock for display only. Null means unknown/unlimited. */
  stock?: number | null;
  /** Maximum purchasable quantity when inventory is enforced. Null means no client cap. */
  maxQuantity?: number | null;
}


export interface AddItemOptions {
  /** Set to false when a caller will emit one combined tracking event itself. */
  track?: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phoneNumber: string;
  landmark?: string;
  provinceRegion: string;
  city: string;
  zone: string;
  address: string;
  type: 'home' | 'office';
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
  pathao_city_id?: number | null;
  pathao_zone_id?: number | null;
  pathao_area_id?: number | null;
}

export interface PaymentMethod {
  id: string;
  type: 'cod' | 'bkash' | 'nagad';
  name: string;
  icon?: string;
  details?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem, options?: AddItemOptions) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  promoCode: string;
  setPromoCode: (code: string) => void;
  applyPromoCode: (codeOverride?: string) => void;
  removePromoCode: () => void;
  discount: number;
  addresses: Address[];
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, address: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  cartLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', type: 'cod', name: 'Cash on Delivery', icon: '💵' },
  { id: '2', type: 'bkash', name: 'bKash', icon: '💳' },
  { id: '3', type: 'nagad', name: 'Nagad', icon: '💰' },
];

function getAttributeValue(attributes: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const exact = attributes[key];
    if (exact) return exact;
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

// ── Map API response item → CartItem ──────────────────────────────────────
// IMPORTANT:
//   item.id        = variantId ?? productId  (local key only)
//   item.productId = always the real Product.id  ← order API needs this
function mapApiItem(apiItem: {
  id: string;           // DB CartItem.id
  productId: string;    // DB Product.id
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    brand: string | null;
    sku?: string | null;
    stock: number;
    slug: string;
    weight?: number | null;
    shippingWeight?: number | null;
    trackInventory?: boolean | null;
    allowBackorder?: boolean | null;
  };
  variant: {
    id: string;
    name: string;
    price: number;
    stock: number;
    sku?: string | null;
    attributes: Record<string, string> | null;
  } | null;
}): CartItem {
  const price  = apiItem.variant?.price ?? apiItem.product.price;
  const attrs  = apiItem.variant?.attributes ?? {};
  const size   = getAttributeValue(attrs, ['size', 'Size']);
  const color  = getAttributeValue(attrs, ['color', 'Color', 'shade', 'Shade']);

  const variantParts = [size, color].filter(Boolean);
  const variantName  = apiItem.variant
    ? (variantParts.length > 0 ? variantParts.join(' / ') : apiItem.variant.name)
    : null;
  const availableStock = apiItem.variant?.stock ?? apiItem.product.stock ?? null;
  const maxQuantity = apiItem.product.trackInventory && !apiItem.product.allowBackorder
    ? availableStock
    : null;

  return {
    // Local lookup key: prefer variantId so same product with different
    // variants are distinct in the cart list.
    id:         apiItem.variantId ?? apiItem.productId,

    // DB IDs — kept separate so order placement always has the right value
    cartItemId: apiItem.id,
    productId:  apiItem.productId,   // ← never null/undefined
    variantId:  apiItem.variantId,   // ← null when no variant

    name:     apiItem.product.name,
    price,
    quantity: apiItem.quantity,
    image:    apiItem.product.image ?? '',
    sku:      apiItem.variant?.sku ?? apiItem.product.sku ?? undefined,
    productSku: apiItem.product.sku ?? undefined,
    variantSku: apiItem.variant?.sku ?? null,
    variantName,
    size,
    color,
    weight: apiItem.product.weight ?? null,
    shippingWeight: apiItem.product.shippingWeight ?? null,
    stock: availableStock,
    maxQuantity,
  };
}


function normalizeQuantity(quantity: number): number {
  const next = Math.trunc(Number(quantity));
  return Number.isFinite(next) ? next : 0;
}

function clampCartQuantity(quantity: number, maxQuantity?: number | null): number {
  const normalized = normalizeQuantity(quantity);
  if (normalized <= 0) return 0;
  if (typeof maxQuantity === 'number' && Number.isFinite(maxQuantity)) {
    return Math.max(0, Math.min(normalized, Math.max(0, maxQuantity)));
  }
  return normalized;
}

function mergeCartItem(existing: CartItem, incoming: CartItem): CartItem {
  const maxQuantity = incoming.maxQuantity ?? existing.maxQuantity ?? null;
  const quantity = clampCartQuantity(existing.quantity + incoming.quantity, maxQuantity);
  return {
    ...existing,
    ...incoming,
    cartItemId: incoming.cartItemId ?? existing.cartItemId,
    quantity,
    maxQuantity,
    stock: incoming.stock ?? existing.stock ?? null,
  };
}

// ── Provider ───────────────────────────────────────────────────────────────
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, refreshToken } = useAuth();
  const { pushToast } = useToast();

  const [items, setItems]             = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [promoCode, setPromoCode]     = useState('');
  const [discount, setDiscount]       = useState(0);
  const [addresses, setAddresses]     = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const cartSyncVersionRef = useRef(0);

  const paymentMethods = PAYMENT_METHODS;
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(PAYMENT_METHODS[0]);

  const subtotal     = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingCost = 0;
  const tax          = 0;
  const total        = subtotal + shippingCost - discount;

  // ── DB helpers ─────────────────────────────────────────────────

  const fetchCartFromDB = useCallback(async () => {
    const requestVersion = cartSyncVersionRef.current;
    setCartLoading(true);
    try {
      let res = await fetch('/api/cart', { credentials: 'include' });
      if (res.status === 401 && await refreshToken()) {
        res = await fetch('/api/cart', { credentials: 'include' });
      }
      if (!res.ok) return;
      const data = await res.json();
      const mapped: CartItem[] = (data.items ?? []).map(mapApiItem);
      if (requestVersion !== cartSyncVersionRef.current) return;
      setItems(mapped);
    } catch {
      try {
        if (requestVersion !== cartSyncVersionRef.current) return;
        const saved = localStorage.getItem('minsah_cart');
        if (saved) setItems(JSON.parse(saved));
      } catch { /* ignore */ }
    } finally {
      if (requestVersion === cartSyncVersionRef.current) {
        setCartLoading(false);
      }
    }
  }, [refreshToken]);

  const mergeGuestCartToDB = useCallback(async (guestItems: CartItem[]) => {
    const failedItems: CartItem[] = [];

    for (const item of guestItems) {
      try {
        const requestBody = JSON.stringify({
          // Always prefer explicit productId; fall back to id only as last resort
          productId: item.productId ?? item.id,
          variantId: item.variantId ?? null,
          quantity:  clampCartQuantity(item.quantity, item.maxQuantity),
        });
        let res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: requestBody,
        });
        if (res.status === 401 && await refreshToken()) {
          res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
        }
        if (!res.ok) throw new Error('Failed to merge cart item');
      } catch {
        failedItems.push(item);
      }
    }

    return failedItems;
  }, [refreshToken]);

  // ── Load cart on auth change ────────────────────────────────────

  useEffect(() => {
    if (user) {
      const guestCart = (() => {
        try {
          const saved = localStorage.getItem('minsah_cart');
          const parsed = saved ? (JSON.parse(saved) as CartItem[]) : [];
          return parsed.filter((item) => !item.cartItemId);
        } catch { return []; }
      })();

      const init = async () => {
        const failedGuestItems = guestCart.length > 0
          ? await mergeGuestCartToDB(guestCart)
          : [];
        if (failedGuestItems.length > 0) {
          localStorage.setItem('minsah_cart', JSON.stringify(failedGuestItems));
        } else {
          localStorage.removeItem('minsah_cart');
        }
        await fetchCartFromDB();
        if (failedGuestItems.length > 0) {
          setItems((serverItems) => {
            const merged = [...serverItems];
            for (const failedItem of failedGuestItems) {
              const existing = merged.find((item) => item.id === failedItem.id);
              if (existing) {
                continue;
              }
              merged.push({ ...failedItem, cartItemId: undefined });
            }
            return merged;
          });
        }
      };
      init();
    } else {
      try {
        const saved = localStorage.getItem('minsah_cart');
        if (saved) setItems(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Address helpers ─────────────────────────────────────────────

  const dbToCartAddress = (db: {
    id: string;
    firstName: string;
    phone: string | null;
    street1: string;
    street2: string | null;
    state: string;
    company: string | null;
    city: string;
    isDefault: boolean;
    pathaoCityId?: number | null;
    pathaoZoneId?: number | null;
    pathaoAreaId?: number | null;
  }): Address => ({
    id:             db.id,
    fullName:       db.firstName,
    phoneNumber:    db.phone        ?? '',
    address:        db.street1,
    zone:           db.street2      ?? '',
    provinceRegion: db.state,
    landmark:       db.company      ?? '',
    city:           db.city,
    isDefault:      db.isDefault,
    type:           'home',
    pathao_city_id: db.pathaoCityId ?? null,
    pathao_zone_id: db.pathaoZoneId ?? null,
    pathao_area_id: db.pathaoAreaId ?? null,
  });

  const fetchAddressesFromDB = useCallback(async () => {
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const parsed: Address[] = (data.addresses ?? []).map(dbToCartAddress);
      setAddresses(parsed);
      setSelectedAddress(parsed.find((a) => a.isDefault) || parsed[0] || null);
      localStorage.setItem('minsah_addresses', JSON.stringify(parsed));
    } catch {
      try {
        const saved = localStorage.getItem('minsah_addresses');
        if (saved) {
          const parsed: Address[] = JSON.parse(saved);
          setAddresses(parsed);
          setSelectedAddress(parsed.find((a) => a.isDefault) || parsed[0] || null);
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      fetchAddressesFromDB();
    } else {
      try {
        const saved = localStorage.getItem('minsah_addresses');
        if (saved) {
          const parsed: Address[] = JSON.parse(saved);
          setAddresses(parsed);
          setSelectedAddress(parsed.find((a) => a.isDefault) || parsed[0] || null);
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) localStorage.setItem('minsah_addresses', JSON.stringify(addresses));
  }, [addresses, user]);

  // ── Cart CRUD ───────────────────────────────────────────────────

  const addItem = useCallback(
    async (item: CartItem, options: AddItemOptions = {}) => {
      if (user) {
        cartSyncVersionRef.current += 1;
        // Optimistic update
        const normalizedItem: CartItem = {
          ...item,
          quantity: clampCartQuantity(item.quantity, item.maxQuantity),
        };
        if (normalizedItem.quantity <= 0) return false;

        setItems((prev) => {
          const existing = prev.find((i) => i.id === normalizedItem.id);
          if (existing) {
            return prev.map((i) =>
              i.id === normalizedItem.id ? mergeCartItem(i, normalizedItem) : i
            );
          }
          return [...prev, normalizedItem];
        });

        try {
          const requestBody = JSON.stringify({
            productId: normalizedItem.productId ?? normalizedItem.id,
            variantId: normalizedItem.variantId ?? null,
            quantity:  normalizedItem.quantity,
          });
          let res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
          if (res.status === 401 && await refreshToken()) {
            res = await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: requestBody,
            });
          }
          if (!res.ok) throw new Error('Failed to add item to cart');
          const data = await res.json();
          let itemForTracking = normalizedItem;
          if (data.item) {
            const mapped = mapApiItem(data.item);
            itemForTracking = mapped;
            setItems((prev) => {
              const existing = prev.find((cartItem) => cartItem.id === mapped.id);
              if (existing) {
                return prev.map((cartItem) => cartItem.id === mapped.id ? mapped : cartItem);
              }
              return [mapped, ...prev];
            });
          } else {
            await fetchCartFromDB();
          }
          if (options.track !== false) {
            trackAddToCart(itemForTracking, itemForTracking.quantity);
          }
          return true;
        } catch {
          await fetchCartFromDB();
          return false;
        } finally {
          setCartLoading(false);
        }
      } else {
        const normalizedItem: CartItem = {
          ...item,
          quantity: clampCartQuantity(item.quantity, item.maxQuantity),
        };
        if (normalizedItem.quantity <= 0) return false;

        setItems((prev) => {
          const existing = prev.find((i) => i.id === normalizedItem.id);
          if (existing) {
            return prev.map((i) =>
              i.id === normalizedItem.id ? mergeCartItem(i, normalizedItem) : i
            );
          }
          return [...prev, normalizedItem];
        });
        if (options.track !== false) {
          trackAddToCart(normalizedItem, normalizedItem.quantity);
        }
        return true;
      }
    },
    [user, refreshToken, fetchCartFromDB]
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const target = items.find((i) => i.id === itemId);
      if (!target) return false;

      if (user) {
        cartSyncVersionRef.current += 1;
        setItems((prev) => prev.filter((i) => i.id !== itemId));

        if (!target.cartItemId) return true;

        try {
          let res = await fetch(`/api/cart/${target.cartItemId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (res.status === 401 && await refreshToken()) {
            res = await fetch(`/api/cart/${target.cartItemId}`, {
              method: 'DELETE',
              credentials: 'include',
            });
          }
          if (!res.ok) throw new Error('Failed to remove cart item');
          return true;
        } catch {
          await fetchCartFromDB();
          return false;
        }
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
      return true;
    },
    [user, items, refreshToken, fetchCartFromDB]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      const target = items.find((i) => i.id === itemId);
      if (!target) return false;

      const nextQuantity = clampCartQuantity(quantity, target.maxQuantity);

      if (nextQuantity <= 0) {
        return removeItem(itemId);
      }

      const quantityDelta = nextQuantity - target.quantity;

      if (user) {
        cartSyncVersionRef.current += 1;
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, quantity: nextQuantity } : i))
        );

        if (!target.cartItemId) {
          if (quantityDelta > 0) {
            trackAddToCart({ ...target, quantity: quantityDelta }, quantityDelta);
          }
          return true;
        }

        try {
          const requestBody = JSON.stringify({ quantity: nextQuantity });
          let res = await fetch(`/api/cart/${target.cartItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: requestBody,
          });
          if (res.status === 401 && await refreshToken()) {
            res = await fetch(`/api/cart/${target.cartItemId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: requestBody,
            });
          }
          if (!res.ok) throw new Error('Failed to update cart item');
          if (quantityDelta > 0) {
            trackAddToCart({ ...target, quantity: quantityDelta }, quantityDelta);
          }
          return true;
        } catch {
          await fetchCartFromDB();
          return false;
        }
      }

      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity: nextQuantity } : i))
      );
      if (quantityDelta > 0) {
        trackAddToCart({ ...target, quantity: quantityDelta }, quantityDelta);
      }
      return true;
    },
    [user, items, removeItem, refreshToken, fetchCartFromDB]
  );

  const clearCart = useCallback(async () => {
    const previousItems = items;
    const previousPromoCode = promoCode;
    const previousDiscount = discount;

    setItems([]);
    cartSyncVersionRef.current += 1;
    setPromoCode('');
    setDiscount(0);
    if (user) {
      try {
        let res = await fetch('/api/cart', { method: 'DELETE', credentials: 'include' });
        if (res.status === 401 && await refreshToken()) {
          res = await fetch('/api/cart', { method: 'DELETE', credentials: 'include' });
        }
        if (!res.ok) throw new Error('Failed to clear cart');
        return true;
      } catch {
        setItems(previousItems);
        setPromoCode(previousPromoCode);
        setDiscount(previousDiscount);
        await fetchCartFromDB();
        return false;
      }
    } else {
      localStorage.setItem('minsah_cart', JSON.stringify([]));
      return true;
    }
  }, [discount, fetchCartFromDB, items, promoCode, refreshToken, user]);

  useEffect(() => {
    if (!user) localStorage.setItem('minsah_cart', JSON.stringify(items));
  }, [items, user]);

  // ── Promo code ──────────────────────────────────────────────────

  const applyPromoCode = useCallback((codeOverride?: string) => {
    const code = (codeOverride || promoCode).trim().toUpperCase();
    if (!code) {
      pushToast({ title: 'Please enter a coupon code', tone: 'danger' });
      return;
    }
    const valid: Record<string, number> = {
      SAVE10: Math.round(subtotal * 0.1),
      SAVE20: Math.round(subtotal * 0.2),
      FIRST50: 50,
      MINSAH10: Math.round(subtotal * 0.1),
      WELCOME: 100,
    };
    if (valid[code]) {
      setDiscount(valid[code]);
      setPromoCode(code);
      pushToast({ title: `Coupon "${code}" applied successfully!`, tone: 'success' });
    } else {
      pushToast({ title: 'Invalid or expired promo code', tone: 'danger' });
    }
  }, [promoCode, pushToast, subtotal]);

  const removePromoCode = useCallback(() => {
    setDiscount(0);
    setPromoCode('');
    pushToast({ title: 'Coupon removed', tone: 'info' });
  }, [pushToast]);

  // ── Address CRUD ────────────────────────────────────────────────

  const addAddress = useCallback(
    async (address: Omit<Address, 'id'>) => {
      if (user) {
        try {
          const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              firstName: address.fullName,
              phone:     address.phoneNumber,
              street1:   address.address,
              street2:   address.zone,
              state:     address.provinceRegion,
              company:   address.landmark,
              city:      address.city,
              isDefault: address.isDefault,
              type:      'SHIPPING',
              pathao_city_id: address.pathao_city_id ?? undefined,
              pathao_zone_id: address.pathao_zone_id ?? undefined,
              pathao_area_id: address.pathao_area_id ?? undefined,
            }),
          });
          if (res.ok) await fetchAddressesFromDB();
        } catch {
          const na: Address = { ...address, id: Date.now().toString() };
          setAddresses((prev) => [...prev, na]);
          if (address.isDefault) setSelectedAddress(na);
        }
      } else {
        const na: Address = { ...address, id: Date.now().toString() };
        setAddresses((prev) => [...prev, na]);
        if (address.isDefault) setSelectedAddress(na);
      }
    },
    [user, fetchAddressesFromDB]
  );

  const updateAddress = useCallback(
    async (id: string, updates: Partial<Address>) => {
      if (user) {
        try {
          const b: Record<string, unknown> = {};
          if (updates.fullName       !== undefined) b.firstName = updates.fullName;
          if (updates.phoneNumber    !== undefined) b.phone     = updates.phoneNumber;
          if (updates.address        !== undefined) b.street1   = updates.address;
          if (updates.zone           !== undefined) b.street2   = updates.zone;
          if (updates.provinceRegion !== undefined) b.state     = updates.provinceRegion;
          if (updates.landmark       !== undefined) b.company   = updates.landmark;
          if (updates.city           !== undefined) b.city      = updates.city;
          if (updates.isDefault      !== undefined) b.isDefault = updates.isDefault;
          if (updates.pathao_city_id !== undefined) b.pathao_city_id = updates.pathao_city_id;
          if (updates.pathao_zone_id !== undefined) b.pathao_zone_id = updates.pathao_zone_id;
          if (updates.pathao_area_id !== undefined) b.pathao_area_id = updates.pathao_area_id;
          await fetch(`/api/addresses/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(b),
          });
          await fetchAddressesFromDB();
        } catch {
          setAddresses((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
          );
        }
      } else {
        setAddresses((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
        );
      }
    },
    [user, fetchAddressesFromDB]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      if (user) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        if (selectedAddress?.id === id)
          setSelectedAddress(addresses.find((a) => a.id !== id) || null);
        try {
          await fetch(`/api/addresses/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch {
          await fetchAddressesFromDB();
        }
      } else {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        if (selectedAddress?.id === id)
          setSelectedAddress(addresses.find((a) => a.id !== id) || null);
      }
    },
    [user, addresses, selectedAddress, fetchAddressesFromDB]
  );

  const contextValue = useMemo<CartContextType>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      shippingCost,
      tax,
      total,
      promoCode,
      setPromoCode,
      applyPromoCode,
      removePromoCode,
      discount,
      addresses,
      selectedAddress,
      setSelectedAddress,
      addAddress,
      updateAddress,
      deleteAddress,
      paymentMethods,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      cartLoading,
    }),
    [
      addAddress,
      addItem,
      addresses,
      applyPromoCode,
      removePromoCode,
      cartLoading,
      clearCart,
      deleteAddress,
      discount,
      items,
      paymentMethods,
      promoCode,
      removeItem,
      selectedAddress,
      selectedPaymentMethod,
      shippingCost,
      subtotal,
      tax,
      total,
      updateAddress,
      updateQuantity,
    ],
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
