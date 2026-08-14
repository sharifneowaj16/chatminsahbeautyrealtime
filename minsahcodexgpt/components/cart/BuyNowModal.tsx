"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/utils/currency";
import dynamic from "next/dynamic";
import { trackInitiateCheckout } from "@/lib/tracking/ecommerce";
import type { DeliveryQuoteResponse } from "@/types/delivery-quote";
import { getCachedProductDetail } from "./productDetailCache";
import CatalogProductImage from "@/components/catalog/CatalogProductImage";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { SuccessState } from "@/components/ui/SuccessState";
import { Textarea } from "@/components/ui/Textarea";

const SocialLoginModal = dynamic(
  () => import("@/app/(storefront)/products/[id]/components/SocialLoginModal"),
  { ssr: false, loading: () => null },
);

export interface BuyNowVariantOption {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
  attributes: Record<string, string>;
  weight?: number | null;
  sku?: string | null;
}

interface BuyNowModalProps {
  isOpen: boolean;
  productId: string;
  productName: string;
  productImage: string;
  basePrice: number;
  baseWeightKg?: number | null;
  baseStock?: number | null;
  variants?: BuyNowVariantOption[];
  variantCount?: number;
  variantsFullyLoaded?: boolean;
  initialVariantId?: string | null;
  initialQuantity?: number;
  onClose: () => void;
}

interface ShippingFormState {
  name: string;
  phone: string;
  city: string;
  zone: string;
  area: string;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
  streetAddress: string;
}

type DeliveryOption = {
  id: number;
  name: string;
};

type DeliveryAreaOption = DeliveryOption & {
  homeDeliveryAvailable?: boolean;
  pickupAvailable?: boolean;
};

type ModalStage = "select" | "summary" | "success";

function formatCustomerDeliveryCharge(amount: number) {
  return amount <= 0 ? "Free" : formatPrice(amount);
}

function getDeliveryOfferMessage(quote: DeliveryQuoteResponse | null) {
  if (!quote) return null;
  const discountAmount = Number(quote.deliveryDiscountAmount ?? 0);
  const badgeText =
    quote.deliveryOfferBadgeText || quote.appliedDeliveryOffer?.badgeText;

  if (discountAmount > 0) {
    return `${badgeText || "Delivery offer applied"} · You saved ${formatPrice(discountAmount)}`;
  }

  if (quote.deliveryPricingSource === "PRODUCT_OFFER" && badgeText) {
    return badgeText;
  }

  return null;
}

function getAttributeValue(attributes: Record<string, string>, keys: string[]) {
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

function toVariantLabel(variant: BuyNowVariantOption) {
  const size = getAttributeValue(variant.attributes, ["size", "Size"]);
  const color = getAttributeValue(variant.attributes, [
    "color",
    "Color",
    "shade",
    "Shade",
  ]);
  return [size, color].filter(Boolean).join(" / ") || variant.name;
}

function formatWeight(weightKg: number) {
  return `${weightKg.toFixed(3).replace(/\.?0+$/, "")}kg`;
}

function clampQuantity(nextQuantity: number, stock?: number | null) {
  const normalizedStock =
    typeof stock === "number" && Number.isFinite(stock)
      ? Math.max(0, stock)
      : 99;
  return Math.max(0, Math.min(normalizedStock, nextQuantity));
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

export default function BuyNowModal({
  isOpen,
  productId,
  productName,
  productImage,
  basePrice,
  baseWeightKg = null,
  baseStock = null,
  variants,
  variantCount,
  variantsFullyLoaded = true,
  initialVariantId,
  initialQuantity = 1,
  onClose,
}: BuyNowModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [stage, setStage] = useState<ModalStage>("select");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [resolvedProductName, setResolvedProductName] = useState(productName);
  const [resolvedProductImage, setResolvedProductImage] =
    useState(productImage);
  const [resolvedBasePrice, setResolvedBasePrice] = useState(basePrice);
  const [resolvedBaseWeightKg, setResolvedBaseWeightKg] =
    useState(baseWeightKg);
  const [resolvedBaseStock, setResolvedBaseStock] = useState<number | null>(
    baseStock,
  );
  const [resolvedBaseSku, setResolvedBaseSku] = useState<string | null>(null);
  const [resolvedVariants, setResolvedVariants] = useState<
    BuyNowVariantOption[]
  >(variants ?? []);
  const [selectedQuantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [shippingForm, setShippingForm] = useState<ShippingFormState>({
    name: "",
    phone: "",
    city: "",
    zone: "",
    area: "",
    pathao_city_id: null,
    pathao_zone_id: null,
    pathao_area_id: null,
    streetAddress: "",
  });
  const [cities, setCities] = useState<DeliveryOption[]>([]);
  const [zones, setZones] = useState<DeliveryOption[]>([]);
  const [areas, setAreas] = useState<DeliveryAreaOption[]>([]);
  const [locationLoading, setLocationLoading] = useState<
    "cities" | "zones" | "areas" | null
  >(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(null);
  const [deliveryQuote, setDeliveryQuote] =
    useState<DeliveryQuoteResponse | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<{
    orderNumber: string;
    estimatedDelivery: string;
    redirectURL?: string;
  } | null>(null);

  const hasVariants = resolvedVariants.length > 0;
  const simpleStock =
    typeof resolvedBaseStock === "number" && Number.isFinite(resolvedBaseStock)
      ? Math.max(0, resolvedBaseStock)
      : 99;


  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    setStage("select");
    setError(null);
    setSubmitting(false);
    setDeliveryState("idle");
    setDeliveryCharge(null);
    setDeliveryQuote(null);
    setDeliveryMessage(null);
    setSuccessPayload(null);
    setShowLoginModal(false);
    setLocationError(null);
    setZones([]);
    setAreas([]);
    setResolvedProductName(productName);
    setResolvedProductImage(productImage);
    setResolvedBasePrice(basePrice);
    setResolvedBaseWeightKg(baseWeightKg);
    setResolvedBaseStock(baseStock);
    setResolvedBaseSku(null);
    setShippingForm({
      name: user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ")
        : "",
      phone: user?.phone ?? "",
      city: "",
      zone: "",
      area: "",
      pathao_city_id: null,
      pathao_zone_id: null,
      pathao_area_id: null,
      streetAddress: "",
    });

    const prefetchedVariantCount = variants?.length ?? 0;
    const needsFullVariants =
      variantsFullyLoaded === false ||
      (typeof variantCount === "number" &&
        variantCount > prefetchedVariantCount);

    // Do not render a partial shade list while the complete product details are loading.
    setResolvedVariants(needsFullVariants ? [] : (variants ?? []));
    setLoading(needsFullVariants);

    if (!needsFullVariants && variants?.length) {
      const preferredVariant =
        (initialVariantId &&
          variants.find((variant) => variant.id === initialVariantId)) ||
        (variants.length === 1 ? variants[0] : null);
      setSelectedQuantities(
        preferredVariant
          ? {
              [preferredVariant.id]: clampQuantity(
                Math.max(1, initialQuantity),
                preferredVariant.stock,
              ),
            }
          : {},
      );
    } else if (!needsFullVariants) {
      setSelectedQuantities({
        simple: clampQuantity(Math.max(1, initialQuantity), baseStock),
      });
    } else {
      setSelectedQuantities({});
    }

    const loadProduct = async () => {
      if (prefetchedVariantCount > 0 && !needsFullVariants) return;
      setLoading(true);
      try {
        const productDetail = await getCachedProductDetail(productId);
        if (!active) return;
        setResolvedProductName(productDetail.name || productName);
        setResolvedProductImage(productDetail.image || productImage);
        setResolvedBasePrice(productDetail.price || basePrice);
        setResolvedBaseWeightKg(productDetail.weight ?? baseWeightKg ?? null);
        setResolvedBaseStock(
          Number.isFinite(Number(productDetail.stock))
            ? Math.max(0, Number(productDetail.stock))
            : baseStock,
        );
        setResolvedBaseSku(productDetail.sku ?? null);
        const fetchedVariants = productDetail.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          image: variant.image ?? null,
          weight: variant.weight ?? productDetail.weight ?? null,
          attributes: variant.attributes,
          sku: variant.sku ?? null,
        }));
        setResolvedVariants(fetchedVariants);
        if (fetchedVariants.length) {
          const preferredVariant =
            (initialVariantId &&
              fetchedVariants.find(
                (variant) => variant.id === initialVariantId,
              )) ||
            (fetchedVariants.length === 1 ? fetchedVariants[0] : null);
          setSelectedQuantities(
            preferredVariant
              ? {
                  [preferredVariant.id]: clampQuantity(
                    Math.max(1, initialQuantity),
                    preferredVariant.stock,
                  ),
                }
              : {},
          );
        } else {
          setSelectedQuantities({
            simple: clampQuantity(
              Math.max(1, initialQuantity),
              productDetail.stock,
            ),
          });
        }
      } catch (fetchError) {
        if (active)
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load product",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProduct();

    return () => {
      active = false;
    };
  }, [
    basePrice,
    baseStock,
    baseWeightKg,
    initialQuantity,
    initialVariantId,
    isOpen,
    productId,
    productImage,
    productName,
    user,
    variantCount,
    variants,
    variantsFullyLoaded,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
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
        if (active) setCities(normalizeDeliveryOptions(data));
      } catch {
        if (active && !controller.signal.aborted) {
          setCities([]);
          setLocationError("Could not load delivery cities. Please try again.");
        }
      } finally {
        if (active) setLocationLoading(null);
      }
    };

    void loadCities();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shippingForm.pathao_city_id) {
      setZones([]);
      setAreas([]);
      return;
    }

    let active = true;
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
        if (active) setZones(normalizeDeliveryOptions(data));
      } catch {
        if (active && !controller.signal.aborted) {
          setZones([]);
          setLocationError(
            "Could not load zones for this city. Please try again.",
          );
        }
      } finally {
        if (active) setLocationLoading(null);
      }
    };

    void loadZones();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, shippingForm.pathao_city_id]);

  useEffect(() => {
    if (!isOpen || !shippingForm.pathao_zone_id) {
      setAreas([]);
      return;
    }

    let active = true;
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
        if (active) setAreas(normalizeDeliveryAreas(data));
      } catch {
        if (active && !controller.signal.aborted) {
          setAreas([]);
          setLocationError(
            "Could not load areas for this zone. Please try again.",
          );
        }
      } finally {
        if (active) setLocationLoading(null);
      }
    };

    void loadAreas();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, shippingForm.pathao_zone_id]);

  const selectedItems = useMemo(() => {
    if (hasVariants) {
      return resolvedVariants
        .filter((variant) => (selectedQuantities[variant.id] ?? 0) > 0)
        .map((variant) => {
          const quantity = selectedQuantities[variant.id];
          const unitWeightKg = variant.weight ?? resolvedBaseWeightKg ?? 0.1;
          return {
            key: variant.id,
            productId,
            variantId: variant.id,
            label: toVariantLabel(variant),
            quantity,
            unitPrice: variant.price,
            subtotal: variant.price * quantity,
            unitWeightKg,
            totalWeightKg: unitWeightKg * quantity,
            image: variant.image || resolvedProductImage,
            sku: variant.sku ?? null,
            size: getAttributeValue(variant.attributes, ["size", "Size"]),
            color: getAttributeValue(variant.attributes, [
              "color",
              "Color",
              "shade",
              "Shade",
            ]),
          };
        });
    }

    const quantity = selectedQuantities.simple ?? 0;
    if (quantity <= 0) return [];
    const unitWeightKg = resolvedBaseWeightKg ?? 0.1;
    return [
      {
        key: "simple",
        productId,
        variantId: null,
        label: resolvedProductName,
        quantity,
        unitPrice: resolvedBasePrice,
        subtotal: resolvedBasePrice * quantity,
        unitWeightKg,
        totalWeightKg: unitWeightKg * quantity,
        image: resolvedProductImage,
        sku: resolvedBaseSku,
        size: null,
        color: null,
      },
    ];
  }, [
    hasVariants,
    productId,
    resolvedBasePrice,
    resolvedBaseSku,
    resolvedBaseWeightKg,
    resolvedProductImage,
    resolvedProductName,
    resolvedVariants,
    selectedQuantities,
  ]);

  const subtotal = Number(
    selectedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const grandTotal = Number((subtotal + (deliveryCharge ?? 0)).toFixed(2));
  const canContinue = selectedItems.length > 0;
  const hasRequiredShippingFields = Boolean(
    shippingForm.name.trim() &&
    shippingForm.phone.trim() &&
    shippingForm.city.trim() &&
    shippingForm.zone.trim() &&
    shippingForm.area.trim() &&
    shippingForm.streetAddress.trim() &&
    shippingForm.pathao_city_id &&
    shippingForm.pathao_zone_id &&
    shippingForm.pathao_area_id,
  );
  const selectedParcelWeightKg = Number(
    selectedItems.reduce((sum, item) => sum + item.totalWeightKg, 0).toFixed(3),
  );
  const canPlaceOrder =
    canContinue &&
    hasRequiredShippingFields &&
    !submitting &&
    deliveryState === "success";

  useEffect(() => {
    if (!isOpen || stage !== "summary" || !canContinue) return;
    if (!hasRequiredShippingFields) {
      setDeliveryState("idle");
      setDeliveryCharge(null);
      setDeliveryQuote(null);
      setDeliveryMessage(null);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDeliveryState("loading");
      setDeliveryQuote(null);
      setDeliveryMessage(null);
      try {
        const response = await fetch("/api/shipping/pathao/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: selectedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            totalWeightKg: selectedParcelWeightKg,
            address: {
              pathao_city_id: shippingForm.pathao_city_id,
              pathao_zone_id: shippingForm.pathao_zone_id,
              pathao_area_id: shippingForm.pathao_area_id,
            },
          }),
          signal: controller.signal,
        });
        const data = (await response.json()) as DeliveryQuoteResponse;
        if (!active) return;
        const customerDeliveryCharge =
          data.customerDeliveryCharge ?? data.shippingCharge;
        if (!response.ok || typeof customerDeliveryCharge !== "number") {
          throw new Error(data.error || "Could not calculate delivery charge");
        }
        setDeliveryCharge(customerDeliveryCharge);
        setDeliveryQuote(data);
        setDeliveryState("success");
        setDeliveryMessage(getDeliveryOfferMessage(data));
      } catch (deliveryError) {
        if (!active || controller.signal.aborted) return;
        setDeliveryCharge(0);
        setDeliveryQuote(null);
        setDeliveryState("error");
        setDeliveryMessage(
          deliveryError instanceof Error
            ? deliveryError.message
            : "Could not calculate delivery charge",
        );
      }
    }, 350);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    canContinue,
    hasRequiredShippingFields,
    isOpen,
    selectedItems,
    selectedParcelWeightKg,
    shippingForm.pathao_city_id,
    shippingForm.pathao_zone_id,
    shippingForm.pathao_area_id,
    stage,
  ]);

  useEffect(() => {
    if (!isOpen || stage !== "success" || !successPayload) return;
    const timer = window.setTimeout(() => {
      onClose();
      router.push(
        successPayload.redirectURL ||
          `/checkout/order-confirmed?orderNumber=${encodeURIComponent(successPayload.orderNumber)}`,
      );
    }, 2200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, onClose, router, stage, successPayload]);


  const updateVariantQuantity = (
    key: string,
    nextQuantity: number,
    stock: number,
  ) => {
    setSelectedQuantities((current) => ({
      ...current,
      [key]: clampQuantity(nextQuantity, stock),
    }));
  };

  const handleContinue = () => {
    if (canContinue) {
      trackInitiateCheckout(
        selectedItems.map((item) => ({
          id: item.key,
          productId: item.productId,
          variantId: item.variantId,
          name: item.label,
          price: item.unitPrice,
          quantity: item.quantity,
          variantName: item.variantId ? item.label : undefined,
          sku: item.sku ?? undefined,
          size: item.size ?? undefined,
          color: item.color ?? undefined,
        })),
        subtotal,
      );
      setStage("summary");
    }
  };

  const placeOrder = async () => {
    if (!canPlaceOrder) return;
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/buy-now/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: selectedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          parcelWeight: selectedParcelWeightKg,
          shippingAddress: {
            name: shippingForm.name.trim(),
            phone: shippingForm.phone.trim(),
            address: shippingForm.streetAddress.trim(),
            city: shippingForm.city.trim(),
            zone: shippingForm.zone.trim(),
            area: shippingForm.area.trim(),
            pathao_city_id: shippingForm.pathao_city_id,
            pathao_zone_id: shippingForm.pathao_zone_id,
            pathao_area_id: shippingForm.pathao_area_id,
          },
          deliveryCharge: deliveryCharge ?? 0,
          customerDeliveryCharge:
            deliveryQuote?.customerDeliveryCharge ?? deliveryCharge ?? 0,
          courierDeliveryCharge: deliveryQuote?.courierDeliveryCharge ?? null,
          deliveryDiscountAmount: deliveryQuote?.deliveryDiscountAmount ?? 0,
          deliveryPricingSource:
            deliveryQuote?.deliveryPricingSource ?? "PATHAO",
          deliveryOfferType: deliveryQuote?.deliveryOfferType ?? "DEFAULT",
          deliveryOfferProductId: deliveryQuote?.deliveryOfferProductId ?? null,
          deliveryOfferBadgeText: deliveryQuote?.deliveryOfferBadgeText ?? null,
          subtotal,
          grandTotal,
          paymentMethod: "COD",
          deliveryPendingConfirmation: false,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        orderNumber?: string;
        estimatedDelivery?: string;
        redirectURL?: string;
      };

      if (response.status === 401) {
        setShowLoginModal(true);
        return;
      }

      if (!response.ok || !data.orderNumber) {
        throw new Error(data.error || "Failed to place order");
      }

      setSuccessPayload({
        orderNumber: data.orderNumber,
        estimatedDelivery: data.estimatedDelivery || "2-3 days",
        redirectURL: data.redirectURL,
      });
      setStage("success");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to place order",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
  };

  const handleCityChange = (cityId: string) => {
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
    const selectedArea = areas.find((area) => String(area.id) === areaId);
    setShippingForm((current) => ({
      ...current,
      area: selectedArea?.name ?? "",
      pathao_area_id: selectedArea?.id ?? null,
    }));
  };

  if (!isOpen) return null;

  const modalTitle =
    stage === "select" ? "Buy Now" : stage === "summary" ? "Order Summary" : "Order Placed";

  const footer =
    stage === "success" ? undefined : stage === "select" ? (
      <Button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue || submitting}
        fullWidth
        size="lg"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        Confirm
      </Button>
    ) : (
      <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStage("select")}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => void placeOrder()}
          disabled={!canPlaceOrder}
          className="flex-1"
          aria-busy={submitting || undefined}
        >
          {submitting ? (
            <Spinner size="sm" decorative />
          ) : (
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          )}
          {user ? "Place Order" : "Login to place order"}
        </Button>
      </div>
    );

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        title={modalTitle}
        description={resolvedProductName}
        size="lg"
        dismissible={!submitting}
        closeLabel="Close buy now modal"
        bodyClassName="max-h-[72dvh]"
        footer={footer}
      >
        {loading ? (
          <LoadingState
            label="Loading product options…"
            description="Available variants and delivery details are being prepared."
          />
        ) : stage === "select" ? (
          <div className="space-y-4">
            <Alert tone="info">
              Select the variant and quantity you want for this instant order. Your main cart stays untouched.
            </Alert>

            {hasVariants ? (
              <div className="space-y-3">
                {resolvedVariants.map((variant) => {
                  const quantity = selectedQuantities[variant.id] ?? 0;
                  const isCurrent = variant.id === initialVariantId;
                  const isOutOfStock = variant.stock <= 0;

                  return (
                    <section
                      key={variant.id}
                      aria-label={toVariantLabel(variant)}
                      className={`rounded-2xl border p-4 ${
                        isCurrent
                          ? "border-minsah-action-primary bg-minsah-surface-accent"
                          : "border-minsah-border-default bg-minsah-surface-panel"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-minsah-surface-subtle">
                          {variant.image || resolvedProductImage ? (
                            <CatalogProductImage
                              src={variant.image || resolvedProductImage}
                              alt={toVariantLabel(variant)}
                              sizes="56px"
                              padding="sm"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-bold text-minsah-text-primary">
                              {toVariantLabel(variant)}
                            </h3>
                            {isCurrent ? <Badge tone="info">Initial choice</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-minsah-text-muted">
                            {formatPrice(variant.price)} · {variant.stock > 0 ? `${variant.stock} available` : "Out of stock"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <div className="flex items-center gap-1 rounded-full border border-minsah-border-default bg-minsah-surface-panel p-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Decrease ${toVariantLabel(variant)} quantity`}
                            onClick={() => updateVariantQuantity(variant.id, quantity - 1, variant.stock)}
                            disabled={quantity <= 0 || submitting}
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <output className="min-w-8 text-center text-sm font-bold text-minsah-text-primary">
                            {quantity}
                          </output>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Increase ${toVariantLabel(variant)} quantity`}
                            onClick={() => updateVariantQuantity(variant.id, quantity + 1, variant.stock)}
                            disabled={isOutOfStock || quantity >= variant.stock || submitting}
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <section className="rounded-2xl border border-minsah-border-default bg-minsah-surface-panel p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-minsah-surface-subtle">
                    {resolvedProductImage ? (
                      <CatalogProductImage
                        src={resolvedProductImage}
                        alt={resolvedProductName}
                        sizes="56px"
                        padding="sm"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-minsah-text-primary">{resolvedProductName}</h3>
                    <p className="mt-1 text-xs text-minsah-text-muted">
                      {formatPrice(resolvedBasePrice)} · {simpleStock > 0 ? `${simpleStock} available` : "Out of stock"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="flex items-center gap-1 rounded-full border border-minsah-border-default bg-minsah-surface-panel p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Decrease ${resolvedProductName} quantity`}
                      onClick={() =>
                        setSelectedQuantities((current) => ({
                          ...current,
                          simple: clampQuantity((current.simple ?? 0) - 1, simpleStock),
                        }))
                      }
                      disabled={(selectedQuantities.simple ?? 0) <= 0 || submitting}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <output className="min-w-8 text-center text-sm font-bold text-minsah-text-primary">
                      {selectedQuantities.simple ?? 0}
                    </output>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Increase ${resolvedProductName} quantity`}
                      onClick={() =>
                        setSelectedQuantities((current) => ({
                          ...current,
                          simple: clampQuantity((current.simple ?? 0) + 1, simpleStock),
                        }))
                      }
                      disabled={submitting || simpleStock <= 0 || (selectedQuantities.simple ?? 0) >= simpleStock}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </section>
            )}

            <dl className="rounded-2xl border border-minsah-border-default bg-minsah-surface-subtle p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-minsah-text-muted">Selected Items</dt>
                <dd className="font-bold text-minsah-text-primary">
                  {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                </dd>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <dt className="text-minsah-text-muted">Subtotal</dt>
                <dd className="font-bold text-minsah-text-primary">{formatPrice(subtotal)}</dd>
              </div>
            </dl>

            {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}
          </div>
        ) : stage === "summary" ? (
          <div className="space-y-5">
            <section className="rounded-3xl bg-minsah-surface-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-text-muted">
                  Selected Items
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStage("select")}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {selectedItems.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-minsah-surface-panel">
                      {item.image ? (
                        <CatalogProductImage src={item.image} alt={item.label} sizes="56px" padding="sm" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-minsah-text-primary">{item.label}</p>
                      <p className="mt-1 text-xs text-minsah-text-muted">
                        ×{item.quantity} · {formatWeight(item.totalWeightKg)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-minsah-text-primary">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-minsah-border-default bg-minsah-surface-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-text-muted">
                  Delivery Location
                </h3>
                {locationLoading ? <Spinner size="sm" label="Loading delivery locations" /> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="buy-now-name"
                  label="Full name"
                  value={shippingForm.name}
                  onChange={(event) =>
                    setShippingForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Your full name"
                  required
                />
                <Input
                  id="buy-now-phone"
                  label="Phone number"
                  type="tel"
                  inputMode="tel"
                  value={shippingForm.phone}
                  onChange={(event) =>
                    setShippingForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="01XXXXXXXXX"
                  required
                />
                <Select
                  id="buy-now-city"
                  label="City"
                  value={shippingForm.pathao_city_id ?? ""}
                  onChange={(event) => handleCityChange(event.target.value)}
                  required
                >
                  <option value="">
                    {locationLoading === "cities" ? "Loading cities..." : "Select city"}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </Select>
                <Select
                  id="buy-now-zone"
                  label="Zone"
                  value={shippingForm.pathao_zone_id ?? ""}
                  onChange={(event) => handleZoneChange(event.target.value)}
                  disabled={!shippingForm.pathao_city_id || locationLoading === "zones"}
                  required
                >
                  <option value="">
                    {locationLoading === "zones" ? "Loading zones..." : "Select zone"}
                  </option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </Select>
                <Select
                  id="buy-now-area"
                  label="Area"
                  value={shippingForm.pathao_area_id ?? ""}
                  onChange={(event) => handleAreaChange(event.target.value)}
                  disabled={!shippingForm.pathao_zone_id || locationLoading === "areas"}
                  containerClassName="sm:col-span-2"
                  required
                >
                  <option value="">
                    {locationLoading === "areas" ? "Loading areas..." : "Select area"}
                  </option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </Select>
                <Textarea
                  id="buy-now-street-address"
                  label="Street address"
                  value={shippingForm.streetAddress}
                  onChange={(event) =>
                    setShippingForm((current) => ({ ...current, streetAddress: event.target.value }))
                  }
                  placeholder="House, road, block, landmark"
                  rows={3}
                  containerClassName="sm:col-span-2"
                  required
                />
              </div>

              {locationError ? (
                <Alert tone="danger" className="mt-3" announcement="polite">{locationError}</Alert>
              ) : null}
            </section>

            {!user ? (
              <Alert tone="warning">
                You can review everything here. Sign in on the final button to place this order.
              </Alert>
            ) : null}

            <section className="rounded-3xl border border-minsah-border-default bg-minsah-surface-panel p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-text-muted">Payment</h3>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-minsah-surface-subtle px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-minsah-action-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-minsah-text-primary">COD</p>
                  <p className="text-xs text-minsah-text-muted">Cash on Delivery</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-minsah-border-default bg-minsah-surface-subtle p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-text-muted">Total</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-minsah-text-muted">Subtotal</dt>
                  <dd className="font-bold text-minsah-text-primary">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-minsah-text-muted">Package Weight</dt>
                  <dd className="font-bold text-minsah-text-primary">{formatWeight(selectedParcelWeightKg)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-minsah-text-muted">Delivery Charge</dt>
                  <dd className="font-bold text-minsah-text-primary">
                    {deliveryState === "loading"
                      ? "Calculating..."
                      : deliveryState === "success"
                        ? formatCustomerDeliveryCharge(deliveryCharge ?? 0)
                        : "Select city, zone and area"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-minsah-border-default pt-3">
                  <dt className="font-bold text-minsah-text-primary">Grand Total</dt>
                  <dd className="text-lg font-black text-minsah-action-primary">{formatPrice(grandTotal)}</dd>
                </div>
              </dl>
              {deliveryMessage ? (
                <Alert
                  tone={deliveryState === "error" ? "danger" : "success"}
                  className="mt-3"
                  announcement="polite"
                >
                  {deliveryMessage}
                </Alert>
              ) : null}
            </section>

            {error ? <Alert tone="danger" announcement="assertive">{error}</Alert> : null}
          </div>
        ) : (
          <SuccessState
            title="Order Placed!"
            description={
              <div className="space-y-1">
                <p>Order ID: #{successPayload?.orderNumber}</p>
                <p>Est. Delivery: {successPayload?.estimatedDelivery}</p>
              </div>
            }
          />
        )}
      </Modal>

      <Modal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign in to place your order"
        description="Choose a secure login method to continue checkout."
        size="sm"
        dismissible={!submitting}
      >
        <SocialLoginModal
          purpose="checkout"
          onSuccess={() => void handleLoginSuccess()}
          onClose={() => setShowLoginModal(false)}
        />
      </Modal>
    </>
  );
}
