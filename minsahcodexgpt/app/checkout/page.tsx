"use client";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, Suspense, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  ShoppingBag,
  Check,
  ShieldCheck,
  Truck,
  Sparkles,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Lock,
  Search,
  X,
} from "lucide-react";
import { formatPrice } from "@/utils/currency";
import { Button } from "@/components/ui/Button";
import dynamic from "next/dynamic";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackInitiateCheckout,
  trackViewCart,
} from "@/lib/tracking/ecommerce";
import type { DeliveryQuoteResponse } from "@/types/delivery-quote";

const SocialLoginModal = dynamic(
  () => import("@/app/(storefront)/products/[id]/components/SocialLoginModal"),
  { ssr: false, loading: () => null },
);

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
  streetAddress: string;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
};

function formatCustomerDeliveryCharge(amount: number) {
  return amount <= 0 ? "Free Delivery" : formatPrice(amount);
}

function getDeliveryOfferMessage(quote: DeliveryQuoteResponse | null) {
  if (!quote) return null;
  const discountAmount = Number(quote.deliveryDiscountAmount ?? 0);
  const badgeText =
    quote.deliveryOfferBadgeText || quote.appliedDeliveryOffer?.badgeText;

  if (discountAmount > 0) {
    return `${badgeText || "Delivery offer applied"} · Saved ${formatPrice(discountAmount)}`;
  }

  if (quote.deliveryPricingSource === "PRODUCT_OFFER" && badgeText) {
    return badgeText;
  }

  return null;
}

function createCheckoutIdempotencyKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeBdMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length >= 13)
    return digits.slice(2, 13);
  if (digits.startsWith("01")) return digits.slice(0, 11);
  return digits.slice(0, 11);
}

function isValidBdMobileNumber(value: string) {
  return /^01[3-9]\d{8}$/.test(value);
}

export type CheckoutFieldKey =
  | "fullName"
  | "phoneNumber"
  | "city"
  | "zone"
  | "area"
  | "streetAddress";

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldKey, string>>;
type CheckoutTouchedFields = Partial<Record<CheckoutFieldKey, boolean>>;

type CartItemWithWeight = {
  weight?: number | string | null;
  weightKg?: number | string | null;
  shippingWeight?: number | string | null;
  shippingWeightKg?: number | string | null;
};

function normalizeWeightKg(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue > 20 ? numericValue / 1000 : numericValue;
}

function getCartItemWeightKg(item: CartItemWithWeight) {
  return (
    normalizeWeightKg(item.shippingWeightKg) ??
    normalizeWeightKg(item.shippingWeight) ??
    normalizeWeightKg(item.weightKg) ??
    normalizeWeightKg(item.weight) ??
    0.1
  );
}

function getFriendlyCheckoutError(data: unknown) {
  if (!data || typeof data !== "object") {
    return "Something went wrong. Please try again.";
  }

  const payload = data as {
    code?: unknown;
    error?: unknown;
    message?: unknown;
  };
  const code = typeof payload.code === "string" ? payload.code : "";
  const rawMessage =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : "";

  if (code === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
    return "Cart or address details changed. Please review and place order again.";
  }

  if (code === "PATHAO_HOME_DELIVERY_UNAVAILABLE") {
    return "Home delivery is not available in the selected area. Please select another area.";
  }

  if (code === "PATHAO_AREA_ZONE_MISMATCH") {
    return "Selected area does not match the selected zone. Please re-select.";
  }

  if (rawMessage.toLowerCase().includes("phone")) {
    return "Phone number ta 11 digit-er valid BD number din.";
  }

  if (rawMessage.toLowerCase().includes("street")) {
    return "Street address ta din.";
  }

  return rawMessage || "Something went wrong. Please try again.";
}

function normalizeDeliveryOptions(value: unknown): DeliveryOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const candidate = option as { id?: unknown; name?: unknown };
      const id = Number(candidate.id);
      const name =
        typeof candidate.name === "string" ? candidate.name.trim() : "";
      return Number.isFinite(id) && name ? { id, name } : null;
    })
    .filter((option): option is DeliveryOption => Boolean(option));
}

function normalizeDeliveryAreas(value: unknown): DeliveryAreaOption[] {
  if (!Array.isArray(value)) return [];

  const areas: DeliveryAreaOption[] = [];
  for (const option of value) {
    if (!option || typeof option !== "object") continue;
    const candidate = option as {
      id?: unknown;
      name?: unknown;
      homeDeliveryAvailable?: unknown;
      pickupAvailable?: unknown;
    };
    const id = Number(candidate.id);
    const name =
      typeof candidate.name === "string" ? candidate.name.trim() : "";
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
  const _searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    items,
    subtotal,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethods,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const [, setExpandedSection] = useState<
    "address" | "payment" | "summary" | null
  >("address");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>({
    fullName: "",
    phoneNumber: "",
    city: "",
    zone: "",
    area: "",
    streetAddress: "",
    pathao_city_id: null,
    pathao_zone_id: null,
    pathao_area_id: null,
  });
  const [cities, setCities] = useState<DeliveryOption[]>([]);
  const [zones, setZones] = useState<DeliveryOption[]>([]);
  const [areas, setAreas] = useState<DeliveryAreaOption[]>([]);
  const [locationLoading, setLocationLoading] = useState<
    "cities" | "zones" | "areas" | null
  >(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [deliveryQuote, setDeliveryQuote] =
    useState<DeliveryQuoteResponse | null>(null);
  const [deliveryState, setDeliveryState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<CheckoutTouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Focus states for Floating Labels
  const [focusedField, setFocusedField] = useState<CheckoutFieldKey | null>(null);

  // Searchable Dropdown Open / Query States
  const [openDropdown, setOpenDropdown] = useState<"city" | "zone" | "area" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingOrderRef = useRef(false);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const viewCartTrackedRef = useRef(false);
  const initiateCheckoutTrackedRef = useRef(false);
  const shippingInfoTrackedRef = useRef(false);
  const paymentInfoTrackedRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shippingQuoteItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId ?? item.id,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      })),
    [items],
  );

  const estimatedTotalWeightKg = useMemo(
    () =>
      Number(
        items
          .reduce(
            (sum, item) =>
              sum + Math.max(1, item.quantity) * getCartItemWeightKg(item),
            0,
          )
          .toFixed(3),
      ),
    [items],
  );

  const normalizedShippingPhone = normalizeBdMobileNumber(
    shippingForm.phoneNumber,
  );

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === shippingForm.pathao_area_id) ?? null,
    [areas, shippingForm.pathao_area_id],
  );

  const selectedAreaHomeDeliveryAvailable = Boolean(
    selectedArea?.homeDeliveryAvailable,
  );

  const hasDeliveryLocation = Boolean(
    shippingForm.pathao_city_id &&
    shippingForm.pathao_zone_id &&
    shippingForm.pathao_area_id &&
    selectedAreaHomeDeliveryAvailable,
  );

  const hasRequiredShippingFields = Boolean(
    shippingForm.fullName.trim() &&
    isValidBdMobileNumber(normalizedShippingPhone) &&
    shippingForm.city.trim() &&
    shippingForm.zone.trim() &&
    shippingForm.area.trim() &&
    shippingForm.streetAddress.trim() &&
    hasDeliveryLocation,
  );

  const finalTotal = subtotal + deliveryCharge;
  const deliveryOfferMessage = getDeliveryOfferMessage(deliveryQuote);

  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const errors: CheckoutFieldErrors = {};

    if (!shippingForm.fullName.trim()) {
      errors.fullName = "Please enter your full name.";
    }

    if (!isValidBdMobileNumber(normalizedShippingPhone)) {
      errors.phoneNumber = "Phone number ta 11 digit-er valid BD number din.";
    }

    if (!shippingForm.pathao_city_id) {
      errors.city = "City select korun.";
    }

    if (!shippingForm.pathao_zone_id) {
      errors.zone = "Zone select korun.";
    }

    if (!shippingForm.pathao_area_id) {
      errors.area = "Area select korun.";
    } else if (selectedArea && !selectedArea.homeDeliveryAvailable) {
      errors.area = "Home delivery is not available in this area";
    }

    if (!shippingForm.streetAddress.trim()) {
      errors.streetAddress = "Street address ta din.";
    }

    return errors;
  }, [normalizedShippingPhone, selectedArea, shippingForm]);

  const visibleFieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const visibleErrors: CheckoutFieldErrors = {};
    (
      [
        "fullName",
        "phoneNumber",
        "city",
        "zone",
        "area",
        "streetAddress",
      ] as CheckoutFieldKey[]
    ).forEach((field) => {
      if (fieldErrors[field] && (submitAttempted || touchedFields[field])) {
        visibleErrors[field] = fieldErrors[field];
      }
    });
    return visibleErrors;
  }, [fieldErrors, submitAttempted, touchedFields]);

  const checkoutBlockReason = useMemo(() => {
    if (items.length === 0) return "Your cart is empty";
    const firstFieldError = Object.values(fieldErrors)[0];
    if (firstFieldError) return firstFieldError;
    if (!selectedPaymentMethod) return "Please select a payment method.";
    if (deliveryState === "loading") return "Delivery charge calculate hocche.";
    if (deliveryState !== "success") {
      return "Delivery calculation failed. Please re-check address.";
    }
    return null;
  }, [deliveryState, fieldErrors, items.length, selectedPaymentMethod]);

  const placeOrderDisabled =
    isPlacingOrder ||
    items.length === 0 ||
    !selectedPaymentMethod ||
    (Boolean(user) && deliveryState === "loading");

  const orderButtonLabel = useMemo(() => {
    if (isPlacingOrder) {
      return selectedPaymentMethod?.type === "cod"
        ? "Placing order..."
        : `Preparing ${selectedPaymentMethod?.name || "payment"}...`;
    }
    if (!user) return "Login to Place Order";
    if (checkoutBlockReason) return "Complete checkout details";
    if (selectedPaymentMethod?.type === "cod") return "Confirm Order";
    return `Pay with ${selectedPaymentMethod?.name || "Payment"}`;
  }, [checkoutBlockReason, isPlacingOrder, selectedPaymentMethod, user]);

  const markFieldTouched = (field: CheckoutFieldKey) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const markBeginCheckout = () => {
    if (
      initiateCheckoutTrackedRef.current ||
      items.length === 0 ||
      subtotal <= 0
    )
      return;
    initiateCheckoutTrackedRef.current = true;
    trackInitiateCheckout(items, subtotal);
  };

  useEffect(() => {
    if (viewCartTrackedRef.current || items.length === 0 || subtotal <= 0)
      return;
    viewCartTrackedRef.current = true;
    trackViewCart(items, subtotal);
  }, [items, subtotal]);

  useEffect(() => {
    if (
      shippingInfoTrackedRef.current ||
      !hasRequiredShippingFields ||
      deliveryState !== "success" ||
      items.length === 0 ||
      finalTotal <= 0
    ) {
      return;
    }

    shippingInfoTrackedRef.current = true;
    trackAddShippingInfo(items, finalTotal, "Pathao Home Delivery");
  }, [deliveryState, finalTotal, hasRequiredShippingFields, items]);

  const trackPaymentInfoOnce = (paymentMethod = selectedPaymentMethod) => {
    if (
      paymentInfoTrackedRef.current ||
      !paymentMethod ||
      items.length === 0 ||
      finalTotal <= 0
    ) {
      return;
    }

    paymentInfoTrackedRef.current = true;
    trackAddPaymentInfo(items, finalTotal, paymentMethod.type);
  };

  useEffect(() => {
    if (!user) return;
    setShippingForm((current) => ({
      ...current,
      fullName:
        current.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" "),
      phoneNumber: current.phoneNumber || user.phone || "",
    }));
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const loadCities = async () => {
      setLocationLoading("cities");
      setLocationError(null);
      try {
        const response = await fetch("/api/shipping/pathao/cities", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load cities");
        const data = await response.json();
        if (!isCancelled) setCities(normalizeDeliveryOptions(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setCities([]);
          setLocationError("Could not load delivery cities. Please retry.");
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
      setLocationLoading("zones");
      setLocationError(null);
      try {
        const response = await fetch(
          `/api/shipping/pathao/zones?city_id=${shippingForm.pathao_city_id}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Could not load zones");
        const data = await response.json();
        if (!isCancelled) setZones(normalizeDeliveryOptions(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setZones([]);
          setLocationError("Could not load zones for this city.");
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
      setLocationLoading("areas");
      setLocationError(null);
      try {
        const response = await fetch(
          `/api/shipping/pathao/areas?zone_id=${shippingForm.pathao_zone_id}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Could not load areas");
        const data = await response.json();
        if (!isCancelled) setAreas(normalizeDeliveryAreas(data));
      } catch {
        if (!isCancelled && !controller.signal.aborted) {
          setAreas([]);
          setLocationError("Could not load areas for this zone.");
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
      setDeliveryQuote(null);
      setDeliveryState("idle");
      setDeliveryError(null);
      return;
    }

    let isCancelled = false;
    const abortController = new AbortController();

    const quoteDeliveryCharge = async () => {
      setDeliveryState("loading");
      setDeliveryQuote(null);
      setDeliveryError(null);
      try {
        const response = await fetch("/api/shipping/pathao/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: shippingQuoteItems,
            totalWeightKg: estimatedTotalWeightKg,
            address: {
              pathao_city_id: shippingForm.pathao_city_id,
              pathao_zone_id: shippingForm.pathao_zone_id,
              pathao_area_id: shippingForm.pathao_area_id,
            },
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to quote delivery");
        }

        const data = (await response.json()) as DeliveryQuoteResponse;
        const customerDeliveryCharge =
          data.customerDeliveryCharge ?? data.shippingCharge;
        if (typeof customerDeliveryCharge !== "number") {
          throw new Error("Invalid delivery quote response");
        }

        if (!isCancelled) {
          setDeliveryCharge(customerDeliveryCharge);
          setDeliveryQuote(data);
          setDeliveryState("success");
        }
      } catch {
        if (!isCancelled && !abortController.signal.aborted) {
          setDeliveryCharge(0);
          setDeliveryQuote(null);
          setDeliveryState("error");
          setDeliveryError("Delivery calculation failed. Please re-check address.");
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
    shippingForm.pathao_area_id,
  ]);

  const submitOrder = async (sessionUserId?: string) => {
    markBeginCheckout();
    setSubmitAttempted(true);
    trackPaymentInfoOnce();
    setCheckoutError(null);

    if (checkoutBlockReason) {
      setCheckoutError(checkoutBlockReason);
      setExpandedSection("address");
      return;
    }

    if (
      !hasRequiredShippingFields ||
      !selectedAreaHomeDeliveryAvailable ||
      !selectedPaymentMethod
    ) {
      setCheckoutError("Home delivery is not available in the selected area");
      setExpandedSection("address");
      return;
    }

    setIsPlacingOrder(true);

    const idempotencyKey =
      checkoutIdempotencyKeyRef.current || createCheckoutIdempotencyKey();
    checkoutIdempotencyKeyRef.current = idempotencyKey;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        credentials: "include",
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
            area: shippingForm.area.trim(),
            streetAddress: shippingForm.streetAddress.trim(),
            street1: shippingForm.streetAddress.trim(),
            zone: shippingForm.zone.trim(),
            city: shippingForm.city.trim(),
            provinceRegion: shippingForm.city.trim(),
            landmark: "",
            pathao_city_id: shippingForm.pathao_city_id,
            pathao_zone_id: shippingForm.pathao_zone_id,
            pathao_area_id: shippingForm.pathao_area_id,
          },
          paymentMethod: selectedPaymentMethod.type,
          shippingCost: deliveryCharge,
          customerDeliveryCharge:
            deliveryQuote?.customerDeliveryCharge ?? deliveryCharge,
          courierDeliveryCharge: deliveryQuote?.courierDeliveryCharge ?? null,
          deliveryDiscountAmount: deliveryQuote?.deliveryDiscountAmount ?? 0,
          deliveryPricingSource:
            deliveryQuote?.deliveryPricingSource ?? "PATHAO",
          deliveryOfferType: deliveryQuote?.deliveryOfferType ?? "DEFAULT",
          deliveryOfferProductId: deliveryQuote?.deliveryOfferProductId ?? null,
          deliveryOfferBadgeText: deliveryQuote?.deliveryOfferBadgeText ?? null,
          shippingMethod: "pathao",
          customerNote: "",
          sessionUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
          checkoutIdempotencyKeyRef.current = null;
        }
        setCheckoutError(getFriendlyCheckoutError(data));
        return;
      }

      const nextURL =
        data.paymentStep?.redirectURL ||
        data.redirectURL ||
        "/checkout/order-confirmed";
      checkoutIdempotencyKeyRef.current = null;
      if (selectedPaymentMethod.type === "cod") {
        await clearCart();
      }
      router.push(nextURL);
    } catch {
      setCheckoutError(
        "Network connection failed. Please check your internet and try again.",
      );
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

  const handleCityChange = (cityId: string) => {
    markBeginCheckout();
    const selectedCity = cities.find((city) => String(city.id) === cityId);
    setShippingForm((current) => ({
      ...current,
      city: selectedCity ? selectedCity.name : "",
      zone: "",
      area: "",
      pathao_city_id: selectedCity ? selectedCity.id : null,
      pathao_zone_id: null,
      pathao_area_id: null,
    }));
  };

  const handleZoneChange = (zoneId: string) => {
    const selectedZone = zones.find((zone) => String(zone.id) === zoneId);
    setShippingForm((current) => ({
      ...current,
      zone: selectedZone ? selectedZone.name : "",
      area: "",
      pathao_zone_id: selectedZone ? selectedZone.id : null,
      pathao_area_id: null,
    }));
  };

  const handleAreaChange = (areaId: string) => {
    const selectedAreaCandidate = areas.find((area) => String(area.id) === areaId);
    setShippingForm((current) => ({
      ...current,
      area: selectedAreaCandidate ? selectedAreaCandidate.name : "",
      pathao_area_id: selectedAreaCandidate ? selectedAreaCandidate.id : null,
    }));
  };

  const handleQuantityChange = (itemId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      void removeItem(itemId);
    } else {
      void updateQuantity(itemId, nextQuantity);
    }
  };

  // Filtered dropdown options based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    return cities.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [cities, searchQuery]);

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    return zones.filter((z) =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [zones, searchQuery]);

  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areas;
    return areas.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [areas, searchQuery]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF6F2] px-4 py-12 text-[#2D1F18]">
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-sm border border-[#EFE7DE]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FAF6F2] text-[#984B29]">
            <ShoppingBag size={36} aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[#2D1F18]">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-[#7A6E65]">
            Looks like you haven&apos;t added any luxury Korean beauty products to your bag yet.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#984B29] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#7E3D20] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F2] pb-28 lg:pb-16 text-[#2D1F18]">


      {/* Top Clean Header */}
      <header className="sticky top-0 z-40 border-b border-[#EFE7DE] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A6E65] hover:text-[#984B29] transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Continue Shopping</span>
          </Link>

          <div className="text-center">
            <h1 className="text-lg font-bold tracking-tight text-[#2D1F18] sm:text-xl">
              Checkout
            </h1>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
            <ShieldCheck size={16} aria-hidden="true" />
            <span className="hidden sm:inline">100% Secure</span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Layout */}
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 xl:gap-12">
          
          {/* Left Column: Delivery Details & Payment Method */}
          <div className="space-y-6">
            
            {/* Step 1: Delivery Information with Smooth Floating Labels & Searchable Selects */}
            <section
              aria-labelledby="delivery-heading"
              className="rounded-3xl border border-[#EFE7DE] bg-white p-6 shadow-sm sm:p-8"
              ref={dropdownRef}
            >
              <div className="flex items-center gap-3 border-b border-[#F4EFEA] pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF6F2] text-[#984B29] font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 id="delivery-heading" className="text-lg font-bold text-[#2D1F18]">
                    Delivery Information
                  </h2>
                  <p className="text-xs text-[#7A6E65]">
                    Where should we send your authentic beauty order?
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                
                {/* 1. Full Name (Floating Label) */}
                <div className="relative">
                  <div
                    className={`relative rounded-2xl border transition-all duration-200 bg-white ${
                      visibleFieldErrors.fullName
                        ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
                        : focusedField === "fullName"
                          ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                          : "border-[#E8E0D5] hover:border-[#C57A58]"
                    }`}
                  >
                    <input
                      id="checkout-full-name"
                      type="text"
                      value={shippingForm.fullName}
                      onFocus={() => {
                        setFocusedField("fullName");
                        markBeginCheckout();
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        markFieldTouched("fullName");
                      }}
                      onChange={(event) =>
                        setShippingForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Full name"
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      className="w-full rounded-2xl bg-transparent px-4 pt-4 pb-3 text-sm text-[#2D1F18] outline-none placeholder:text-transparent"
                    />
                    <label
                      htmlFor="checkout-full-name"
                      className={`pointer-events-none absolute left-3 transition-all duration-200 ease-out ${
                        focusedField === "fullName" || shippingForm.fullName.trim()
                          ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                            (visibleFieldErrors.fullName
                              ? "text-red-500"
                              : focusedField === "fullName"
                                ? "text-[#984B29]"
                                : "text-[#7A6E65]")
                          : "top-1/2 -translate-y-1/2 text-sm text-[#7A6E65]"
                      }`}
                    >
                      Full name
                    </label>
                  </div>
                  {visibleFieldErrors.fullName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {visibleFieldErrors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. Phone Number with +880 (Floating Label) */}
                <div className="relative">
                  <div
                    className={`relative flex items-center rounded-2xl border transition-all duration-200 bg-white ${
                      visibleFieldErrors.phoneNumber
                        ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
                        : focusedField === "phoneNumber"
                          ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                          : "border-[#E8E0D5] hover:border-[#C57A58]"
                    }`}
                  >
                    <div className="flex items-center pl-4 pr-2 text-xs font-bold text-[#7A6E65] border-r border-[#E8E0D5] select-none">
                      +880
                    </div>
                    <input
                      id="checkout-phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={11}
                      value={shippingForm.phoneNumber}
                      onFocus={() => {
                        setFocusedField("phoneNumber");
                        markBeginCheckout();
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        markFieldTouched("phoneNumber");
                      }}
                      onChange={(event) =>
                        setShippingForm((current) => ({
                          ...current,
                          phoneNumber: normalizeBdMobileNumber(event.target.value),
                        }))
                      }
                      placeholder="Phone number"
                      aria-invalid={Boolean(fieldErrors.phoneNumber)}
                      className="w-full rounded-2xl bg-transparent px-3.5 pt-4 pb-3 text-sm text-[#2D1F18] outline-none placeholder:text-transparent"
                    />
                    <label
                      htmlFor="checkout-phone"
                      className={`pointer-events-none absolute transition-all duration-200 ease-out ${
                        focusedField === "phoneNumber" || shippingForm.phoneNumber.trim()
                          ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                            (visibleFieldErrors.phoneNumber
                              ? "text-red-500"
                              : focusedField === "phoneNumber"
                                ? "text-[#984B29]"
                                : "text-[#7A6E65]")
                          : "left-16 top-1/2 -translate-y-1/2 text-sm text-[#7A6E65]"
                      }`}
                    >
                      Phone number
                    </label>
                  </div>
                  {visibleFieldErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {visibleFieldErrors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* 3. Searchable Cascading Selects: City, Zone, Area (Floating Labels) */}
                <div className="grid gap-4 sm:grid-cols-3">
                  
                  {/* City Searchable Select */}
                  <div className="relative">
                    <div
                      onClick={() => {
                        setOpenDropdown(openDropdown === "city" ? null : "city");
                        setSearchQuery("");
                        markBeginCheckout();
                      }}
                      className={`relative flex items-center justify-between cursor-pointer rounded-2xl border px-3.5 pt-4 pb-3 transition-all duration-200 bg-white ${
                        visibleFieldErrors.city
                          ? "border-red-400"
                          : openDropdown === "city"
                            ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                            : "border-[#E8E0D5] hover:border-[#C57A58]"
                      }`}
                    >
                      <span className={`text-xs sm:text-sm truncate ${shippingForm.city ? "font-semibold text-[#2D1F18]" : "text-transparent"}`}>
                        {shippingForm.city || "City"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-[#7A6E65] transition-transform duration-200 ${openDropdown === "city" ? "rotate-180 text-[#984B29]" : ""}`}
                      />
                      <label
                        className={`pointer-events-none absolute left-3 transition-all duration-200 ease-out ${
                          openDropdown === "city" || shippingForm.city
                            ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                              (visibleFieldErrors.city
                                ? "text-red-500"
                                : openDropdown === "city"
                                  ? "text-[#984B29]"
                                  : "text-[#7A6E65]")
                            : "top-1/2 -translate-y-1/2 text-xs sm:text-sm text-[#7A6E65]"
                        }`}
                      >
                        {locationLoading === "cities" ? "Loading cities..." : "Select City"}
                      </label>
                    </div>

                    {/* Searchable Dropdown Popup */}
                    {openDropdown === "city" && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-hidden rounded-2xl border border-[#E8E0D5] bg-white shadow-xl animate-in fade-in zoom-in-95">
                        <div className="sticky top-0 border-b border-[#F4EFEA] bg-white p-2">
                          <div className="relative flex items-center">
                            <Search size={14} className="absolute left-2.5 text-[#7A6E65]" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search city / জেলা..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full rounded-xl border border-[#E8E0D5] bg-[#FDFBF9] py-1.5 pl-8 pr-3 text-xs text-[#2D1F18] outline-none focus:border-[#984B29]"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 text-gray-400 hover:text-gray-600"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1 text-xs">
                          {filteredCities.length === 0 ? (
                            <p className="py-4 text-center text-[#7A6E65]">No city found</p>
                          ) : (
                            filteredCities.map((city) => (
                              <div
                                key={city.id}
                                onClick={() => {
                                  handleCityChange(String(city.id));
                                  setOpenDropdown(null);
                                  setSearchQuery("");
                                }}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                                  shippingForm.pathao_city_id === city.id
                                    ? "bg-[#FAF6F2] font-bold text-[#984B29]"
                                    : "hover:bg-gray-50 text-[#2D1F18]"
                                }`}
                              >
                                <span>{city.name}</span>
                                {shippingForm.pathao_city_id === city.id && <Check size={14} />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {visibleFieldErrors.city && (
                      <p className="mt-1 text-xs text-red-600">{visibleFieldErrors.city}</p>
                    )}
                    <select
                      id="checkout-city"
                      value={shippingForm.pathao_city_id ?? ""}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <option value="">Loading cities...</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Searchable Select */}
                  <div className="relative">
                    <div
                      onClick={() => {
                        if (!shippingForm.pathao_city_id || locationLoading === "zones") return;
                        setOpenDropdown(openDropdown === "zone" ? null : "zone");
                        setSearchQuery("");
                      }}
                      className={`relative flex items-center justify-between rounded-2xl border px-3.5 pt-4 pb-3 transition-all duration-200 ${
                        !shippingForm.pathao_city_id
                          ? "cursor-not-allowed bg-gray-50 opacity-60 border-[#E8E0D5]"
                          : "cursor-pointer bg-white " +
                            (visibleFieldErrors.zone
                              ? "border-red-400"
                              : openDropdown === "zone"
                                ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                                : "border-[#E8E0D5] hover:border-[#C57A58]")
                      }`}
                    >
                      <span className={`text-xs sm:text-sm truncate ${shippingForm.zone ? "font-semibold text-[#2D1F18]" : "text-transparent"}`}>
                        {shippingForm.zone || "Zone"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-[#7A6E65] transition-transform duration-200 ${openDropdown === "zone" ? "rotate-180 text-[#984B29]" : ""}`}
                      />
                      <label
                        className={`pointer-events-none absolute left-3 transition-all duration-200 ease-out ${
                          openDropdown === "zone" || shippingForm.zone
                            ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                              (visibleFieldErrors.zone
                                ? "text-red-500"
                                : openDropdown === "zone"
                                  ? "text-[#984B29]"
                                  : "text-[#7A6E65]")
                            : "top-1/2 -translate-y-1/2 text-xs sm:text-sm text-[#7A6E65]"
                        }`}
                      >
                        {locationLoading === "zones" ? "Loading zones..." : "Select Zone"}
                      </label>
                    </div>

                    {/* Searchable Dropdown Popup */}
                    {openDropdown === "zone" && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-hidden rounded-2xl border border-[#E8E0D5] bg-white shadow-xl animate-in fade-in zoom-in-95">
                        <div className="sticky top-0 border-b border-[#F4EFEA] bg-white p-2">
                          <div className="relative flex items-center">
                            <Search size={14} className="absolute left-2.5 text-[#7A6E65]" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search zone / থানা..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full rounded-xl border border-[#E8E0D5] bg-[#FDFBF9] py-1.5 pl-8 pr-3 text-xs text-[#2D1F18] outline-none focus:border-[#984B29]"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 text-gray-400 hover:text-gray-600"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1 text-xs">
                          {filteredZones.length === 0 ? (
                            <p className="py-4 text-center text-[#7A6E65]">No zone found</p>
                          ) : (
                            filteredZones.map((zone) => (
                              <div
                                key={zone.id}
                                onClick={() => {
                                  handleZoneChange(String(zone.id));
                                  setOpenDropdown(null);
                                  setSearchQuery("");
                                }}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                                  shippingForm.pathao_zone_id === zone.id
                                    ? "bg-[#FAF6F2] font-bold text-[#984B29]"
                                    : "hover:bg-gray-50 text-[#2D1F18]"
                                }`}
                              >
                                <span>{zone.name}</span>
                                {shippingForm.pathao_zone_id === zone.id && <Check size={14} />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {visibleFieldErrors.zone && (
                      <p className="mt-1 text-xs text-red-600">{visibleFieldErrors.zone}</p>
                    )}
                    <select
                      id="checkout-zone"
                      value={shippingForm.pathao_zone_id ?? ""}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <option value="">Loading zones...</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Area Searchable Select */}
                  <div className="relative">
                    <div
                      onClick={() => {
                        if (!shippingForm.pathao_zone_id || locationLoading === "areas") return;
                        setOpenDropdown(openDropdown === "area" ? null : "area");
                        setSearchQuery("");
                      }}
                      className={`relative flex items-center justify-between rounded-2xl border px-3.5 pt-4 pb-3 transition-all duration-200 ${
                        !shippingForm.pathao_zone_id
                          ? "cursor-not-allowed bg-gray-50 opacity-60 border-[#E8E0D5]"
                          : "cursor-pointer bg-white " +
                            (visibleFieldErrors.area
                              ? "border-red-400"
                              : openDropdown === "area"
                                ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                                : "border-[#E8E0D5] hover:border-[#C57A58]")
                      }`}
                    >
                      <span className={`text-xs sm:text-sm truncate ${shippingForm.area ? "font-semibold text-[#2D1F18]" : "text-transparent"}`}>
                        {shippingForm.area || "Area"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-[#7A6E65] transition-transform duration-200 ${openDropdown === "area" ? "rotate-180 text-[#984B29]" : ""}`}
                      />
                      <label
                        className={`pointer-events-none absolute left-3 transition-all duration-200 ease-out ${
                          openDropdown === "area" || shippingForm.area
                            ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                              (visibleFieldErrors.area
                                ? "text-red-500"
                                : openDropdown === "area"
                                  ? "text-[#984B29]"
                                  : "text-[#7A6E65]")
                            : "top-1/2 -translate-y-1/2 text-xs sm:text-sm text-[#7A6E65]"
                        }`}
                      >
                        {locationLoading === "areas" ? "Loading areas..." : "Select Area"}
                      </label>
                    </div>

                    {/* Searchable Dropdown Popup */}
                    {openDropdown === "area" && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-hidden rounded-2xl border border-[#E8E0D5] bg-white shadow-xl animate-in fade-in zoom-in-95">
                        <div className="sticky top-0 border-b border-[#F4EFEA] bg-white p-2">
                          <div className="relative flex items-center">
                            <Search size={14} className="absolute left-2.5 text-[#7A6E65]" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search area / এলাকা..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full rounded-xl border border-[#E8E0D5] bg-[#FDFBF9] py-1.5 pl-8 pr-3 text-xs text-[#2D1F18] outline-none focus:border-[#984B29]"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 text-gray-400 hover:text-gray-600"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1 text-xs">
                          {filteredAreas.length === 0 ? (
                            <p className="py-4 text-center text-[#7A6E65]">No area found</p>
                          ) : (
                            filteredAreas.map((area) => (
                              <div
                                key={area.id}
                                onClick={() => {
                                  if (!area.homeDeliveryAvailable) return;
                                  handleAreaChange(String(area.id));
                                  setOpenDropdown(null);
                                  setSearchQuery("");
                                }}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition ${
                                  !area.homeDeliveryAvailable
                                    ? "opacity-40 cursor-not-allowed text-gray-400"
                                    : shippingForm.pathao_area_id === area.id
                                      ? "bg-[#FAF6F2] font-bold text-[#984B29]"
                                      : "hover:bg-gray-50 text-[#2D1F18]"
                                }`}
                              >
                                <span>{area.name} {!area.homeDeliveryAvailable ? "(Unavailable)" : ""}</span>
                                {shippingForm.pathao_area_id === area.id && <Check size={14} />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {visibleFieldErrors.area && (
                      <p className="mt-1 text-xs text-red-600">{visibleFieldErrors.area}</p>
                    )}
                    <select
                      id="checkout-area"
                      value={shippingForm.pathao_area_id ?? ""}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <option value="">Loading areas...</option>
                      {areas.map((area) => (
                        <option
                          key={area.id}
                          value={area.id}
                          disabled={!area.homeDeliveryAvailable}
                        >
                          {area.name} {!area.homeDeliveryAvailable ? "(Unavailable)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Street Address (Floating Label) */}
                <div className="relative">
                  <div
                    className={`relative rounded-2xl border transition-all duration-200 bg-white ${
                      visibleFieldErrors.streetAddress
                        ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
                        : focusedField === "streetAddress"
                          ? "border-[#984B29] ring-2 ring-[#984B29]/10"
                          : "border-[#E8E0D5] hover:border-[#C57A58]"
                    }`}
                  >
                    <input
                      id="checkout-street-address"
                      type="text"
                      value={shippingForm.streetAddress}
                      onFocus={() => {
                        setFocusedField("streetAddress");
                        markBeginCheckout();
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        markFieldTouched("streetAddress");
                      }}
                      onChange={(event) =>
                        setShippingForm((current) => ({
                          ...current,
                          streetAddress: event.target.value,
                        }))
                      }
                      placeholder="Street address"
                      className="w-full rounded-2xl bg-transparent px-4 pt-4 pb-3 text-sm text-[#2D1F18] outline-none placeholder:text-transparent"
                    />
                    <label
                      htmlFor="checkout-street-address"
                      className={`pointer-events-none absolute left-3 transition-all duration-200 ease-out ${
                        focusedField === "streetAddress" || shippingForm.streetAddress.trim()
                          ? "-top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-bold leading-none " +
                            (visibleFieldErrors.streetAddress
                              ? "text-red-500"
                              : focusedField === "streetAddress"
                                ? "text-[#984B29]"
                                : "text-[#7A6E65]")
                          : "top-1/2 -translate-y-1/2 text-sm text-[#7A6E65]"
                      }`}
                    >
                      Street address
                    </label>
                  </div>
                  {visibleFieldErrors.streetAddress && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {visibleFieldErrors.streetAddress}
                    </p>
                  )}
                </div>

                {locationError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                    {locationError}
                  </p>
                )}
              </div>
            </section>

            {/* Step 2: Payment Method */}
            <section
              aria-labelledby="payment-heading"
              className="rounded-3xl border border-[#EFE7DE] bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center gap-3 border-b border-[#F4EFEA] pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF6F2] text-[#984B29] font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 id="payment-heading" className="text-lg font-bold text-[#2D1F18]">
                    Payment Method
                  </h2>
                  <p className="text-xs text-[#7A6E65]">
                    Order will be created first, and payment pages open only after a valid order is created.
                  </p>
                </div>
              </div>

              <div
                className="mt-6 grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-labelledby="payment-heading"
              >
                {paymentMethods.map((method) => {
                  const isSelected = selectedPaymentMethod?.id === method.id;
                  return (
                    <div
                      key={method.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        markBeginCheckout();
                        setSelectedPaymentMethod(method);
                        trackPaymentInfoOnce(method);
                      }}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-[#984B29] bg-[#FAF6F2] shadow-sm ring-1 ring-[#984B29]/20"
                          : "border-[#E8E0D5] bg-white hover:border-[#C57A58] hover:bg-[#FDFBF9]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                            isSelected
                              ? "border-[#984B29] bg-[#984B29] text-white"
                              : "border-[#B0A59A] bg-white"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#2D1F18]">
                              {method.name}
                            </span>
                            {method.icon?.startsWith("/") ? (
                              <Image
                                src={method.icon}
                                alt={method.name}
                                width={24}
                                height={24}
                                className="h-6 w-6 object-contain"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[#7A6E65]">
                            {method.type === "cod"
                              ? "Cash on Delivery (Pay when you receive)"
                              : `Instant online payment with ${method.name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Order Summary */}
          <div className="mt-8 lg:mt-0">
            <aside
              aria-label="Order Summary"
              className="sticky top-24 rounded-3xl border border-[#EFE7DE] bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#F4EFEA] pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#984B29]" />
                  <h2 className="text-base font-bold text-[#2D1F18]">
                    Order Summary
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#7A6E65]">
                  {totalQuantity} {totalQuantity === 1 ? "item" : "items"} (Cart Items)
                </span>
              </div>

              {/* Product list with inline quantity controls */}
              <div className="mt-4 max-h-64 divide-y divide-[#F4EFEA] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 py-3 text-xs">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#FAF6F2] p-1">
                      {item.variantImage || item.image ? (
                        <Image
                          src={(item.variantImage || item.image) as string}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <ShoppingBag size={16} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-[#2D1F18] line-clamp-1">
                          {item.name}
                        </h3>
                        {(item.size || item.color || item.variantName) && (
                          <p className="text-[11px] text-[#7A6E65]">
                            {[item.size, item.color].filter(Boolean).join(" / ") || item.variantName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity adjuster */}
                        <div className="flex items-center rounded-lg border border-[#E8E0D5] bg-[#FDFBF9]">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="p-1 text-[#7A6E65] hover:text-[#2D1F18]"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="px-2 font-bold text-xs text-[#2D1F18]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="p-1 text-[#7A6E65] hover:text-[#2D1F18]"
                            aria-label="Increase quantity"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#984B29]">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-[#A3978C] hover:text-red-600 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 space-y-2.5 border-t border-[#F4EFEA] pt-4 text-xs">
                <div className="flex justify-between text-[#7A6E65]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2D1F18]">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-[#7A6E65]">
                  <span className="flex items-center gap-1.5">
                    <Truck size={14} className="text-[#984B29]" /> Delivery Fee
                  </span>
                  <span className="font-semibold text-[#2D1F18]">
                    {deliveryState === "loading"
                      ? "Calculating..."
                      : deliveryState === "success"
                        ? formatCustomerDeliveryCharge(deliveryCharge)
                        : "Select Address"}
                  </span>
                </div>

                {deliveryOfferMessage && (
                  <p className="rounded-lg bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <Sparkles size={12} /> {deliveryOfferMessage}
                  </p>
                )}

                {deliveryError && (
                  <p className="rounded-lg bg-red-50 p-2 text-[11px] text-red-600">
                    {deliveryError}
                  </p>
                )}

                <div className="flex justify-between border-t border-[#F4EFEA] pt-3 text-sm font-bold text-[#2D1F18]">
                  <span>Total</span>
                  <span className="text-base text-[#984B29]">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* Error Message Box */}
              {checkoutError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {checkoutError}
                </div>
              )}

              {/* Desktop Place Order Button */}
              <div className="mt-5 hidden lg:block">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={handlePlaceOrder}
                  disabled={placeOrderDisabled}
                  className="rounded-2xl bg-[#984B29] py-4 text-sm font-bold text-white shadow-md hover:bg-[#7E3D20] disabled:opacity-50 transition-all"
                >
                  {isPlacingOrder ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {orderButtonLabel}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock size={15} />
                      {orderButtonLabel}
                    </span>
                  )}
                </Button>

                <p className="mt-3 text-center text-[11px] text-[#A3978C] flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#15803D]" /> 100% Authentic Korean Beauty Products
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile Slim Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#EFE7DE] bg-white/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[#7A6E65] uppercase tracking-wider">Total</p>
            <p className="text-lg font-black text-[#984B29]">{formatPrice(finalTotal)}</p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handlePlaceOrder}
            disabled={placeOrderDisabled}
            className="flex-1 rounded-2xl bg-[#984B29] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#7E3D20] disabled:opacity-50"
          >
            {isPlacingOrder ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {orderButtonLabel}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                {orderButtonLabel} <ChevronRight size={16} />
              </span>
            )}
          </Button>
        </div>

        {checkoutError && (
          <p className="mt-2 text-center text-[11px] font-medium text-red-600">
            {checkoutError}
          </p>
        )}
      </div>

      {/* Auth Modal Integration */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in">
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
        <div className="min-h-screen bg-[#FAF6F2] flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-[#984B29] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
