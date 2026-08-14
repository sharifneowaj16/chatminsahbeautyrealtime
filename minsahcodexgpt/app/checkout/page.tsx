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
  FileText,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Check,
} from "lucide-react";
import { formatPrice } from "@/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import dynamic from "next/dynamic";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackInitiateCheckout,
  trackViewCart,
} from "@/lib/tracking/ecommerce";
import type { DeliveryQuoteResponse } from "@/types/delivery-quote";
import CartItemRow from "@/features/cart/CartItemRow";
import OrderSummary from "@/features/cart/OrderSummary";
import CheckoutStepper from "@/features/checkout/CheckoutStepper";
import { UI_COPY } from "@/lib/ui-copy";

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
  return amount <= 0 ? UI_COPY.checkout.free : formatPrice(amount);
}

function getDeliveryOfferMessage(quote: DeliveryQuoteResponse | null) {
  if (!quote) return null;
  const discountAmount = Number(quote.deliveryDiscountAmount ?? 0);
  const badgeText =
    quote.deliveryOfferBadgeText || quote.appliedDeliveryOffer?.badgeText;

  if (discountAmount > 0) {
    return `${badgeText || UI_COPY.checkout.deliveryOfferApplied} · ${UI_COPY.checkout.saved} ${formatPrice(discountAmount)}`;
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

type CheckoutFieldKey =
  "fullName" | "phoneNumber" | "city" | "zone" | "area" | "streetAddress";

type CheckoutFieldErrors = Partial<Record<CheckoutFieldKey, string>>;
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

  // Admin product weights are sometimes stored as grams. Keep kg values as-is,
  // but convert large gram-like values to kg for Pathao quote payloads.
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
    return UI_COPY.checkout.genericError;
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
    return UI_COPY.checkout.changedDetails;
  }

  if (code === "PATHAO_HOME_DELIVERY_UNAVAILABLE") {
    return UI_COPY.checkout.homeDeliveryUnavailable;
  }

  if (code === "PATHAO_AREA_ZONE_MISMATCH") {
    return UI_COPY.checkout.areaZoneMismatch;
  }

  if (rawMessage.toLowerCase().includes("phone")) {
    return UI_COPY.checkout.invalidPhone;
  }

  if (rawMessage.toLowerCase().includes("street")) {
    return UI_COPY.checkout.streetRequired;
  }

  return rawMessage || UI_COPY.checkout.genericError;
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
  const _searchParams = useSearchParams(); // kept for Suspense boundary
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

  const [expandedSection, setExpandedSection] = useState<
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
  const [deliveryRetryNonce, setDeliveryRetryNonce] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<CheckoutTouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const pendingOrderRef = useRef(false);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const viewCartTrackedRef = useRef(false);
  const initiateCheckoutTrackedRef = useRef(false);
  const shippingInfoTrackedRef = useRef(false);
  const paymentInfoTrackedRef = useRef(false);
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
      errors.fullName = UI_COPY.checkout.fullNameRequired;
    }

    if (!isValidBdMobileNumber(normalizedShippingPhone)) {
      errors.phoneNumber = UI_COPY.checkout.invalidPhone;
    }

    if (!shippingForm.pathao_city_id) {
      errors.city = UI_COPY.checkout.cityRequired;
    }

    if (!shippingForm.pathao_zone_id) {
      errors.zone = UI_COPY.checkout.zoneRequired;
    }

    if (!shippingForm.pathao_area_id) {
      errors.area = UI_COPY.checkout.areaRequired;
    } else if (selectedArea && !selectedArea.homeDeliveryAvailable) {
      errors.area =
        UI_COPY.checkout.homeDeliveryUnavailable;
    }

    if (!shippingForm.streetAddress.trim()) {
      errors.streetAddress = UI_COPY.checkout.streetRequired;
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
    if (items.length === 0)
      return UI_COPY.checkout.cartEmpty;
    const firstFieldError = Object.values(fieldErrors)[0];
    if (firstFieldError) return firstFieldError;
    if (!selectedPaymentMethod) return UI_COPY.checkout.paymentRequired;
    if (deliveryState === "loading") return UI_COPY.checkout.calculatingDelivery;
    if (deliveryState !== "success") {
      return UI_COPY.checkout.deliveryCalculationFailed;
    }
    return null;
  }, [deliveryState, fieldErrors, items.length, selectedPaymentMethod]);

  const checkoutStep =
    expandedSection === "payment" ? 2 : expandedSection === "summary" ? 3 : 1;
  const canOpenLoginBeforeCheckout = !user && items.length > 0;
  const placeOrderDisabled =
    isPlacingOrder ||
    items.length === 0 ||
    (Boolean(user) && deliveryState === "loading");

  const orderButtonLabel = useMemo(() => {
    if (isPlacingOrder) {
      return selectedPaymentMethod?.type === "cod"
        ? UI_COPY.checkout.placingOrder
        : `Preparing ${selectedPaymentMethod?.name || "payment"}...`;
    }
    if (!user) return UI_COPY.checkout.loginToOrder;
    if (checkoutBlockReason) return UI_COPY.checkout.completeDetails;
    if (selectedPaymentMethod?.type === "cod") return UI_COPY.checkout.placeOrder;
    return `${selectedPaymentMethod?.name || "পেমেন্ট"} দিয়ে এগিয়ে যান`;
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
          setLocationError("ডেলিভারির শহরগুলো লোড করা যায়নি। আবার চেষ্টা করুন।");
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
          setLocationError(
            "এই শহরের জোনগুলো লোড করা যায়নি। আবার চেষ্টা করুন।",
          );
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
          setLocationError(
            "এই জোনের এলাকাগুলো লোড করা যায়নি। আবার চেষ্টা করুন।",
          );
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
          setDeliveryError(
            UI_COPY.checkout.deliveryCalculationFailed,
          );
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
    deliveryRetryNonce,
  ]);

  const submitOrder = async (sessionUserId?: string) => {
    markBeginCheckout();
    setSubmitAttempted(true);
    trackPaymentInfoOnce();
    setCheckoutError(null);

    if (checkoutBlockReason) {
      setCheckoutError(checkoutBlockReason);
      if (
        fieldErrors.fullName ||
        fieldErrors.phoneNumber ||
        fieldErrors.city ||
        fieldErrors.zone ||
        fieldErrors.area ||
        fieldErrors.streetAddress
      ) {
        setExpandedSection("address");
      } else if (!selectedPaymentMethod) {
        setExpandedSection("payment");
      } else {
        setExpandedSection("summary");
      }
      return;
    }

    if (
      !hasRequiredShippingFields ||
      !selectedAreaHomeDeliveryAvailable ||
      !selectedPaymentMethod
    ) {
      setCheckoutError(UI_COPY.checkout.completeDetails);
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
        UI_COPY.checkout.networkError,
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

  const toggleSection = (section: "address" | "payment" | "summary") => {
    if (section === "address") {
      markBeginCheckout();
    }
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleCityChange = (cityId: string) => {
    markBeginCheckout();
    const selectedCity = cities.find((city) => String(city.id) === cityId);
    setShippingForm((current) => ({
      ...current,
      city: selectedCity?.name ?? "",
      zone: "",
      area: "",
      pathao_city_id: selectedCity?.id ?? null,
      pathao_zone_id: null,
      pathao_area_id: null,
    }));
    setZones([]);
    setAreas([]);
  };

  const handleZoneChange = (zoneId: string) => {
    markBeginCheckout();
    const selectedZone = zones.find((zone) => String(zone.id) === zoneId);
    setShippingForm((current) => ({
      ...current,
      zone: selectedZone?.name ?? "",
      area: "",
      pathao_zone_id: selectedZone?.id ?? null,
      pathao_area_id: null,
    }));
    setAreas([]);
  };

  const handleAreaChange = (areaId: string) => {
    markBeginCheckout();
    const selectedArea = areas.find((area) => String(area.id) === areaId);
    setShippingForm((current) => ({
      ...current,
      area: selectedArea?.name ?? "",
      pathao_area_id: selectedArea?.id ?? null,
    }));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-minsah-light">
        <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
          <div className="px-4 py-4 flex items-center justify-between">
            <Link
              href="/shop"
              aria-label="শপে ফিরে যান"
              className="p-2 hover:bg-minsah-primary rounded-lg transition"
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-semibold">কার্ট ও চেকআউট</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="px-4 py-10">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-minsah-accent">
              <ShoppingCart size={28} className="text-minsah-primary" />
            </div>
            <h2 className="text-xl font-bold text-minsah-dark">
              আপনার কার্ট খালি
            </h2>
            <p className="mt-2 text-sm text-minsah-secondary">
              চেকআউট করতে একটি পণ্য যোগ করুন।
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex rounded-xl bg-minsah-primary px-6 py-3 text-sm font-bold text-minsah-light transition hover:bg-minsah-dark"
            >
              কেনাকাটা চালিয়ে যান
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-minsah-light pb-24 lg:pb-8">
      <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link
            href="/cart"
            aria-label="কার্টে ফিরে যান"
            className="p-2 hover:bg-minsah-primary rounded-lg transition"
          >
            <ArrowLeft size={24} aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-semibold">কার্ট ও চেকআউট</h1>
          <div className="w-10" />
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <CheckoutStepper currentStep={checkoutStep} />
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-minsah-accent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <ShoppingCart size={20} aria-hidden="true" className="text-minsah-primary" />
              </div>
              <div>
                <h2 className="font-bold text-minsah-dark">কার্টের পণ্য</h2>
                <p className="text-xs text-minsah-secondary">
                  চেকআউটের আগে পণ্যগুলো যাচাই করুন
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-minsah-primary">
              {items.length}টি পণ্য · {totalQuantity}টি আইটেম
            </span>
          </div>

          <div className="px-4 py-4">
            {items.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-minsah-secondary mb-3">
                  আপনার কার্ট খালি
                </p>
                <Link
                  href="/shop"
                  className="text-minsah-primary font-semibold text-sm"
                >
                  কেনাকাটা চালিয়ে যান
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    density="compact"
                    showLineTotal
                    onQuantityChange={(nextQuantity) =>
                      void updateQuantity(item.id, nextQuantity)
                    }
                    onRemove={() => void removeItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Button
            id="checkout-address-toggle"
            type="button"
            variant="ghost"
            onClick={() => toggleSection("address")}
            aria-expanded={expandedSection === "address"}
            aria-controls="checkout-address-panel"
            className="w-full justify-between rounded-none px-4 py-4 hover:bg-minsah-accent/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <MapPin size={20} aria-hidden="true" className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2
                  id="checkout-address-heading"
                  className="font-bold text-minsah-dark"
                >
                  ডেলিভারির ঠিকানা
                </h2>
                {hasRequiredShippingFields && expandedSection !== "address" && (
                  <p className="text-xs text-minsah-secondary line-clamp-1">
                    {shippingForm.area}, {shippingForm.zone},{" "}
                    {shippingForm.city}
                  </p>
                )}
              </div>
            </div>
            {expandedSection === "address" ? (
              <ChevronUp className="text-minsah-secondary" size={20} aria-hidden="true" />
            ) : (
              <ChevronDown className="text-minsah-secondary" size={20} aria-hidden="true" />
            )}
          </Button>

          {expandedSection === "address" && (
            <div
              id="checkout-address-panel"
              role="region"
              aria-labelledby="checkout-address-toggle"
              className="px-4 pb-4 border-t border-minsah-accent"
            >
              <div className="mt-4 grid gap-4">
                <Input
                  id="checkout-full-name"
                  value={shippingForm.fullName}
                  onFocus={markBeginCheckout}
                  onBlur={() => markFieldTouched("fullName")}
                  onChange={(event) =>
                    setShippingForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="আপনার পুরো নাম"
                  label="পুরো নাম"
                  error={visibleFieldErrors.fullName}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary"
                />
                <Input
                  id="checkout-phone"
                  value={shippingForm.phoneNumber}
                  onFocus={markBeginCheckout}
                  onBlur={() => markFieldTouched("phoneNumber")}
                  onChange={(event) =>
                    setShippingForm((current) => ({
                      ...current,
                      phoneNumber: normalizeBdMobileNumber(
                        event.target.value,
                      ),
                    }))
                  }
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  maxLength={11}
                  label="মোবাইল নম্বর"
                  error={visibleFieldErrors.phoneNumber}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary"
                />
                <Select
                  id="checkout-city"
                  value={shippingForm.pathao_city_id ?? ""}
                  onBlur={() => markFieldTouched("city")}
                  onChange={(event) => {
                    markFieldTouched("city");
                    handleCityChange(event.target.value);
                  }}
                  label="শহর"
                  error={visibleFieldErrors.city}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary"
                  placeholder={
                    locationLoading === "cities"
                      ? "শহর লোড হচ্ছে…"
                      : "শহর নির্বাচন করুন"
                  }
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </Select>
                <Select
                  id="checkout-zone"
                  value={shippingForm.pathao_zone_id ?? ""}
                  onBlur={() => markFieldTouched("zone")}
                  onChange={(event) => {
                    markFieldTouched("zone");
                    handleZoneChange(event.target.value);
                  }}
                  disabled={
                    !shippingForm.pathao_city_id ||
                    locationLoading === "zones"
                  }
                  label="জোন"
                  error={visibleFieldErrors.zone}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary disabled:cursor-not-allowed disabled:bg-minsah-accent/40"
                  placeholder={
                    locationLoading === "zones"
                      ? "জোন লোড হচ্ছে…"
                      : "জোন নির্বাচন করুন"
                  }
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </Select>
                <Select
                  id="checkout-area"
                  value={shippingForm.pathao_area_id ?? ""}
                  onBlur={() => markFieldTouched("area")}
                  onChange={(event) => {
                    markFieldTouched("area");
                    handleAreaChange(event.target.value);
                  }}
                  disabled={
                    !shippingForm.pathao_zone_id ||
                    locationLoading === "areas"
                  }
                  label="এলাকা"
                  error={visibleFieldErrors.area}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary disabled:cursor-not-allowed disabled:bg-minsah-accent/40"
                  placeholder={
                    locationLoading === "areas"
                      ? "এলাকা লোড হচ্ছে..."
                      : "এলাকা নির্বাচন করুন"
                  }
                >
                    {areas.map((area) => (
                      <option
                        key={area.id}
                        value={area.id}
                        disabled={!area.homeDeliveryAvailable}
                      >
                        {area.name}
                        {!area.homeDeliveryAvailable ? " (পাওয়া যাচ্ছে না)" : ""}
                      </option>
                    ))}
                  </Select>
                <Input
                  id="checkout-street-address"
                    value={shippingForm.streetAddress}
                    onFocus={markBeginCheckout}
                    onBlur={() => markFieldTouched("streetAddress")}
                    onChange={(event) =>
                      setShippingForm((current) => ({
                        ...current,
                        streetAddress: event.target.value,
                      }))
                    }
                    placeholder="বাসা, রাস্তা, ফ্লোর ও নিকটস্থ পরিচিত স্থান"
                  label="বিস্তারিত ঠিকানা"
                  error={visibleFieldErrors.streetAddress}
                  labelClassName="text-xs font-semibold text-minsah-dark"
                  className="rounded-xl border-minsah-accent py-3 focus:border-minsah-primary"
                />
                {locationError && (
                  <p className="text-xs text-red-600">{locationError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Button
            id="checkout-payment-toggle"
            type="button"
            variant="ghost"
            onClick={() => toggleSection("payment")}
            aria-expanded={expandedSection === "payment"}
            aria-controls="checkout-payment-panel"
            className="w-full justify-between rounded-none px-4 py-4 hover:bg-minsah-accent/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <CreditCard size={20} aria-hidden="true" className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2
                  id="checkout-payment-heading"
                  className="font-bold text-minsah-dark"
                >
                  পেমেন্ট পদ্ধতি
                </h2>
                {selectedPaymentMethod && expandedSection !== "payment" && (
                  <p className="text-xs text-minsah-secondary">
                    {selectedPaymentMethod.name}
                  </p>
                )}
              </div>
            </div>
            {expandedSection === "payment" ? (
              <ChevronUp className="text-minsah-secondary" size={20} aria-hidden="true" />
            ) : (
              <ChevronDown className="text-minsah-secondary" size={20} aria-hidden="true" />
            )}
          </Button>

          {expandedSection === "payment" && (
            <div
              id="checkout-payment-panel"
              role="region"
              aria-labelledby="checkout-payment-toggle"
              className="px-4 pb-4 border-t border-minsah-accent"
            >
              <div
                className="mt-4 grid gap-3"
                role="radiogroup"
                aria-labelledby="checkout-payment-heading"
              >
                {paymentMethods.map((method) => {
                  const isSelected = selectedPaymentMethod?.id === method.id;
                  return (
                    <Button
                      key={method.id}
                      type="button"
                      variant="secondary"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        markBeginCheckout();
                        setSelectedPaymentMethod(method);
                        trackPaymentInfoOnce(method);
                      }}
                      className={`w-full justify-start rounded-xl border-2 p-4 text-left ${
                        isSelected
                          ? "border-minsah-primary bg-minsah-accent shadow-sm"
                          : "border-minsah-accent bg-white hover:border-minsah-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-minsah-primary bg-minsah-primary"
                              : "border-minsah-secondary"
                          }`}
                        >
                          {isSelected && (
                            <Check size={14} aria-hidden="true" className="text-white" />
                          )}
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                          {method.icon?.startsWith("/") ? (
                            <Image
                              src={method.icon}
                              alt={method.name}
                              width={28}
                              height={28}
                              sizes="28px"
                              className="h-7 w-7 object-contain"
                            />
                          ) : (
                            <span className="text-2xl">{method.icon}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-minsah-dark">
                            {method.name}
                          </p>
                          <p className="text-xs text-minsah-secondary mt-1">
                            {method.type === "cod"
                              ? "অর্ডার পৌঁছালে পেমেন্ট করুন"
                              : `প্রথমে অর্ডার তৈরি হবে, তারপর ${method.name} পেমেন্ট শুরু হবে`}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-minsah-secondary">
                পেমেন্ট পদ্ধতি এই পেজেই নির্বাচন করুন। বৈধ অর্ডার তৈরি হওয়ার পরই bKash/Nagad পেমেন্ট পেজ খুলবে।
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Button
            id="checkout-summary-toggle"
            type="button"
            variant="ghost"
            onClick={() => toggleSection("summary")}
            aria-expanded={expandedSection === "summary"}
            aria-controls="checkout-summary-panel"
            className="w-full justify-between rounded-none px-4 py-4 hover:bg-minsah-accent/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-minsah-accent rounded-lg flex items-center justify-center">
                <FileText size={20} aria-hidden="true" className="text-minsah-primary" />
              </div>
              <div className="text-left">
                <h2
                  id="checkout-summary-heading"
                  className="font-bold text-minsah-dark"
                >
                  অর্ডারের সারসংক্ষেপ
                </h2>
                <p className="text-xs text-minsah-secondary">
                  {items.length}টি পণ্য · {totalQuantity}টি আইটেম
                </p>
              </div>
            </div>
            {expandedSection === "summary" ? (
              <ChevronUp className="text-minsah-secondary" size={20} aria-hidden="true" />
            ) : (
              <ChevronDown className="text-minsah-secondary" size={20} aria-hidden="true" />
            )}
          </Button>

          {expandedSection === "summary" && (
            <div
              id="checkout-summary-panel"
              role="region"
              aria-labelledby="checkout-summary-toggle"
              className="px-4 pb-4 border-t border-minsah-accent"
            >
              {items.length === 0 ? (
                <div className="mt-4 text-center py-6">
                  <p className="text-sm text-minsah-secondary mb-3">
                    আপনার কার্ট খালি
                  </p>
                  <Link
                    href="/shop"
                    className="text-minsah-primary font-semibold text-sm"
                  >
                    কেনাকাটা চালিয়ে যান
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <CartItemRow key={item.id} item={item} density="summary" />
                  ))}

                  <OrderSummary
                    compact
                    title=""
                    lines={[
                      {
                        key: "subtotal",
                        label: "পণ্যের মোট",
                        value: formatPrice(subtotal),
                      },
                      {
                        key: "delivery",
                        label: "ডেলিভারি",
                        value:
                          deliveryState === "loading"
                            ? "হিসাব করা হচ্ছে…"
                            : deliveryState === "success"
                              ? formatCustomerDeliveryCharge(deliveryCharge)
                              : "শহর, জোন ও এলাকা নির্বাচন করুন",
                      },
                    ]}
                    notice={
                      <>
                        {deliveryOfferMessage && (
                          <p className="text-xs font-medium text-emerald-700">
                            {deliveryOfferMessage}
                          </p>
                        )}
                        {deliveryError && (
                          <div className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                            <p className="text-xs text-red-600">
                              {deliveryError}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setDeliveryRetryNonce((value) => value + 1)
                              }
                              disabled={
                                !hasDeliveryLocation ||
                                deliveryState === "loading"
                              }
                              className="mt-2 h-auto min-h-0 p-0 text-xs text-minsah-primary underline-offset-2 hover:underline"
                            >
                              ডেলিভারি চার্জ আবার হিসাব করুন
                            </Button>
                          </div>
                        )}
                      </>
                    }
                    total={{ label: "সর্বমোট", value: formatPrice(finalTotal) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-[80] border-t border-minsah-accent bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-minsah-secondary">সর্বমোট</span>
          <span className="text-xl font-bold text-minsah-primary">
            {formatPrice(finalTotal)}
          </span>
        </div>
        {checkoutError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">{checkoutError}</p>
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={handlePlaceOrder}
          disabled={placeOrderDisabled}
          className="bg-minsah-primary py-4 text-base text-minsah-light shadow-lg hover:bg-minsah-dark"
          aria-disabled={placeOrderDisabled}
        >
          {isPlacingOrder ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              {orderButtonLabel}
            </span>
          ) : (
            orderButtonLabel
          )}
        </Button>
        {canOpenLoginBeforeCheckout && !isPlacingOrder && (
          <p className="mt-2 text-center text-xs text-minsah-secondary">
            চেকআউটের তথ্য নিশ্চিত করে অর্ডার করতে লগইন করুন।
          </p>
        )}
        {user && checkoutBlockReason && !isPlacingOrder && (
          <p className="mt-2 text-center text-xs text-minsah-secondary">
            {submitAttempted
              ? checkoutBlockReason
              : UI_COPY.checkout.completeDetails}
          </p>
        )}
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
