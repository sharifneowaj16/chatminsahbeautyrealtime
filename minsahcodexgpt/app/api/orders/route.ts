import { NextRequest, NextResponse } from "next/server";
import { recordProductOrderCreatedInTransaction } from "@/lib/analytics/product-metrics";
import prisma from "@/lib/prisma";
import { Prisma, OrderStatus } from "@/generated/prisma/client";
import { getAuthenticatedUserId } from "@/app/api/auth/_utils";
import { generateDailyOrderNumber } from "@/lib/order-number";
import { notifyNewOrder } from "@/lib/telegram-notify";
import { readOrderAttribution } from "@/lib/tracking/order-attribution";
import { snapshotOrderAttributionInTransaction, type AttributionDb } from "@/lib/attribution/repository";
import { buildOrderTrackingExclusionData } from "@/lib/tracking/traffic-filter";
import { resolveOrderDeliveryAccounting } from "@/lib/order-delivery-accounting";
import {
  isCanonicalOnlinePaymentMethod,
  isCodPaymentMethod,
} from "@/lib/payments/canonical-payment-contract";
import { getSupportedCheckoutPaymentMethods } from "@/lib/payments/payment-methods";
import {
  ONLINE_PAYMENT_INITIAL_STATUS,
  ONLINE_PAYMENT_PENDING_ORDER_STATUS,
} from "@/lib/orders/payment-lifecycle";
import {
  OrderValidationError,
  validateAndNormalizeOrderRequest,
} from "@/lib/order-validation";
import {
  CouponValidationError,
  validateCouponForOrder,
} from "@/lib/coupon-validation";
import {
  normalizeBangladeshPhoneNumber,
  getBangladeshPhoneVariations,
} from "@/lib/phone";
import {
  CheckoutIdempotencyError,
  hashCheckoutIdempotencyPayload,
  readCheckoutIdempotencyKey,
} from "@/lib/checkout-idempotency";
import {
  PathaoAreaAvailabilityError,
  verifyPathaoHomeDeliveryArea,
} from "@/lib/pathao-area-availability";
import {
  availableProductStock,
  availableVariantStock,
  decrementCodOrderStockInTransaction,
  getOnlinePaymentExpiresAt,
  reserveOnlineOrderStockInTransaction,
} from "@/lib/online-payment-stock";
import { triggerEventDrivenCatalogSync } from "@/lib/meta-platform/domains/catalog/event-sync";
import { reserveCampaignUsageInTransaction } from "@/lib/campaign-usage";
import { normalizeFlashDealsConfig } from "@/lib/homepageConfig";
import {
  createPriceQuoteToken,
  verifyPriceQuoteToken,
} from "@/lib/price-quote";

export const dynamic = "force-dynamic";

function readVariantAttribute(attributes: unknown, keys: string[]) {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return null;
  }

  const record = attributes as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  const loweredKeys = keys.map((key) => key.toLowerCase());
  for (const [key, value] of Object.entries(record)) {
    if (!loweredKeys.includes(key.toLowerCase())) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return null;
}

function formatVariantForNotification(
  variant: { name: string; attributes?: unknown } | null | undefined,
) {
  if (!variant) return null;

  const sizeOrVolume = readVariantAttribute(variant.attributes, [
    "size",
    "Size",
    "volume",
    "Volume",
  ]);
  const colorOrShade = readVariantAttribute(variant.attributes, [
    "color",
    "Color",
    "shade",
    "Shade",
  ]);
  const details = [
    sizeOrVolume ? `Size/Volume: ${sizeOrVolume}` : null,
    colorOrShade ? `Color/Shade: ${colorOrShade}` : null,
  ].filter(Boolean);

  return details.length ? details.join(" / ") : variant.name || null;
}

type CheckoutOrderForResponse = {
  id: string;
  orderNumber: string;
  total: unknown;
  paymentMethod: string | null;
  shippingCost: unknown;
  courierDeliveryCharge: unknown | null;
  deliveryDiscountAmount: unknown;
  deliveryPricingSource: unknown;
  deliveryOfferType: unknown;
  deliveryOfferProductId: string | null;
  deliveryOfferBadgeText: string | null;
};

function decimalToNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }
  return 0;
}

function buildCheckoutOrderResponse(
  order: CheckoutOrderForResponse,
  options: { idempotentReplay?: boolean } = {},
) {
  const normalizedPaymentMethod = (order.paymentMethod || "")
    .trim()
    .toLowerCase();
  const orderTotal = decimalToNumber(order.total);
  const paymentStep = ["bkash", "nagad"].includes(normalizedPaymentMethod)
    ? {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: normalizedPaymentMethod,
        amount: orderTotal,
        redirectURL: `/checkout/payment/${normalizedPaymentMethod}?orderId=${encodeURIComponent(order.id)}&orderNumber=${encodeURIComponent(order.orderNumber)}`,
      }
    : null;
  const redirectURL =
    paymentStep?.redirectURL ||
    `/checkout/order-confirmed?orderNumber=${encodeURIComponent(order.orderNumber)}`;

  return {
    success: true,
    idempotentReplay: Boolean(options.idempotentReplay),
    orderId: order.id,
    orderNumber: order.orderNumber,
    total: orderTotal,
    paymentStep,
    deliveryAccounting: {
      shippingCost: decimalToNumber(order.shippingCost),
      courierDeliveryCharge:
        order.courierDeliveryCharge === null
          ? null
          : decimalToNumber(order.courierDeliveryCharge),
      deliveryDiscountAmount: decimalToNumber(order.deliveryDiscountAmount),
      deliveryPricingSource: order.deliveryPricingSource,
      deliveryOfferType: order.deliveryOfferType,
      deliveryOfferProductId: order.deliveryOfferProductId,
      quoteVerified: true,
    },
    redirectURL,
  };
}

const checkoutOrderResponseSelect = {
  id: true,
  orderNumber: true,
  total: true,
  paymentMethod: true,
  shippingCost: true,
  courierDeliveryCharge: true,
  deliveryDiscountAmount: true,
  deliveryPricingSource: true,
  deliveryOfferType: true,
  deliveryOfferProductId: true,
  deliveryOfferBadgeText: true,
  checkoutPayloadHash: true,
} as const;

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let idempotencyReplayContext: {
    userId: string;
    checkoutIdempotencyKey: string;
    checkoutPayloadHash: string;
  } | null = null;

  try {
    // 1. Auth — userId is required by Order schema
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Please log in to place an order.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const checkoutIdempotencyKey = readCheckoutIdempotencyKey(request);

    // 2. Parse & validate body. Security note: client couponDiscount is intentionally ignored.
    const body = await request.json();
    const {
      items,
      addressId,
      addressData,
      paymentMethod,
      couponCode,
      customerNote,
      priceQuoteToken,
    } = validateAndNormalizeOrderRequest(body);

    if (
      !isCodPaymentMethod(paymentMethod) &&
      !isCanonicalOnlinePaymentMethod(paymentMethod)
    ) {
      return NextResponse.json(
        {
          error: "Unsupported payment method for production checkout.",
          code: "UNSUPPORTED_PAYMENT_METHOD",
          allowedPaymentMethods: getSupportedCheckoutPaymentMethods(),
        },
        { status: 400 },
      );
    }

    const isOnlinePaymentOrder = isCanonicalOnlinePaymentMethod(paymentMethod);
    const orderLifecycleNow = new Date();
    const onlinePaymentExpiresAt = isOnlinePaymentOrder
      ? getOnlinePaymentExpiresAt(orderLifecycleNow)
      : null;

    const clientFields = body as {
      shippingCost?: number;
      customerDeliveryCharge?: number;
      courierDeliveryCharge?: number;
      deliveryDiscountAmount?: number;
      deliveryPricingSource?: string;
      deliveryOfferType?: string;
      deliveryOfferProductId?: string | null;
      deliveryOfferBadgeText?: string | null;
      shippingMethod?: string;
    };
    const {
      shippingCost = 0,
      customerDeliveryCharge,
      courierDeliveryCharge,
      deliveryDiscountAmount: clientDeliveryDiscountAmount,
      deliveryPricingSource: clientDeliveryPricingSource,
      deliveryOfferType: clientDeliveryOfferType,
      deliveryOfferProductId: clientDeliveryOfferProductId,
      deliveryOfferBadgeText: clientDeliveryOfferBadgeText,
      shippingMethod,
    } = clientFields;

    const checkoutPayloadHash = hashCheckoutIdempotencyPayload({
      items: items
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
        }))
        .sort((a, b) =>
          `${a.productId}:${a.variantId ?? ""}`.localeCompare(
            `${b.productId}:${b.variantId ?? ""}`,
          ),
        ),
      addressId: addressId ?? null,
      addressData: addressData
        ? {
            fullName: addressData.fullName,
            phoneNumber: addressData.phoneNumber,
            city: addressData.city,
            zone: addressData.zone,
            area: addressData.area,
            streetAddress: addressData.streetAddress,
            pathao_city_id: addressData.pathao_city_id ?? null,
            pathao_zone_id: addressData.pathao_zone_id ?? null,
            pathao_area_id: addressData.pathao_area_id ?? null,
          }
        : null,
      paymentMethod,
      couponCode: couponCode ?? null,
      customerNote: customerNote ?? "",
      shippingCost,
      customerDeliveryCharge: customerDeliveryCharge ?? null,
      courierDeliveryCharge: courierDeliveryCharge ?? null,
      deliveryDiscountAmount: clientDeliveryDiscountAmount ?? 0,
      deliveryPricingSource: clientDeliveryPricingSource ?? null,
      deliveryOfferType: clientDeliveryOfferType ?? null,
      deliveryOfferProductId: clientDeliveryOfferProductId ?? null,
      deliveryOfferBadgeText: clientDeliveryOfferBadgeText ?? null,
      shippingMethod: shippingMethod ?? null,
    });

    idempotencyReplayContext = {
      userId,
      checkoutIdempotencyKey,
      checkoutPayloadHash,
    };

    const existingOrder = await prisma.order.findFirst({
      where: { userId, checkoutIdempotencyKey },
      select: checkoutOrderResponseSelect,
    });

    if (existingOrder) {
      if (existingOrder.checkoutPayloadHash !== checkoutPayloadHash) {
        return NextResponse.json(
          {
            error:
              "This checkout submission key was already used for a different order payload. Please refresh checkout and try again.",
            code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        buildCheckoutOrderResponse(existingOrder, { idempotentReplay: true }),
      );
    }

    // 3. Fetch products & variants from DB — never trust client prices
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const variantIds = Array.from(
      new Set(
        items.filter((i) => i.variantId).map((i) => i.variantId as string),
      ),
    );

    const [products, variants, customerForTracking, flashDealsConfigRaw] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          quantity: true,
          reservedQuantity: true,
          trackInventory: true,
          allowBackorder: true,
          lowStockThreshold: true,
          weight: true,
          shippingWeight: true,
          deliveryOfferEnabled: true,
          deliveryOfferType: true,
          deliveryOfferAmount: true,
          deliveryChargeInsideDhaka: true,
          deliveryChargeOutsideDhaka: true,
          deliveryOfferStartDate: true,
          deliveryOfferEndDate: true,
          deliveryOfferBadgeText: true,
        },
      }),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              productId: true,
              price: true,
              quantity: true,
              reservedQuantity: true,
              sku: true,
              name: true,
              attributes: true,
            },
          })
        : Promise.resolve([]),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      }),
      prisma.siteConfig.findUnique({
        where: { key: "flashDeals" },
        select: { value: true },
      }),
    ]);

    const flashDealsConfig = normalizeFlashDealsConfig(flashDealsConfigRaw?.value);
    const dealsByCampaignRef = new Map(
      flashDealsConfig.items.map((deal) => [deal.campaignRef, deal]),
    );
    const dealsByProductId = new Map(
      flashDealsConfig.items.map((deal) => [deal.productId, deal]),
    );

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 4. Validate product/variant ownership and stock before entering transaction.
    const requestedStockByKey = new Map<string, number>();
    for (const item of items) {
      const stockKey = item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
      requestedStockByKey.set(stockKey, (requestedStockByKey.get(stockKey) ?? 0) + item.quantity);
    }

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          {
            error: `Product not found or unavailable: ${item.productId}`,
            code: "PRODUCT_UNAVAILABLE",
          },
          { status: 400 },
        );
      }

      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      if (item.variantId && !variant) {
        return NextResponse.json(
          {
            error: `Variant not found or unavailable: ${item.variantId}`,
            code: "VARIANT_UNAVAILABLE",
          },
          { status: 400 },
        );
      }

      if (variant && variant.productId !== item.productId) {
        return NextResponse.json(
          {
            error: "Selected variant does not belong to the selected product.",
            code: "VARIANT_PRODUCT_MISMATCH",
          },
          { status: 400 },
        );
      }

      if (product.trackInventory && !product.allowBackorder) {
        const availableStock = variant
          ? availableVariantStock(variant)
          : availableProductStock(product);
        const stockKey = item.variantId ? `variant:${item.variantId}` : `product:${item.productId}`;
        const totalRequested = requestedStockByKey.get(stockKey) ?? item.quantity;

        if (availableStock < totalRequested) {
          return NextResponse.json(
            {
              error: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${totalRequested}`,
              code: "INSUFFICIENT_STOCK",
              productId: item.productId,
            },
            { status: 409 },
          );
        }
      }
    }

    // 5. Calculate totals server-side & detect campaign expiry or price changes
    let priceChanged = false;
    const priceChanges: Array<{
      productId: string;
      variantId: string | null;
      lineKey: string | null;
      productName: string;
      oldPrice: number;
      newPrice: number;
      reason: string;
    }> = [];

    const now = new Date();
    const isDealExpired = (deal: { isActive?: boolean } | null | undefined) => {
      if (!deal || deal.isActive === false) return true;
      if (flashDealsConfig.endsAt) {
        const endTime = new Date(flashDealsConfig.endsAt).getTime();
        if (!isNaN(endTime) && endTime <= now.getTime()) {
          return true;
        }
      }
      return false;
    };

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const regularPrice = parseFloat(
        (variant?.price ?? product.price).toString(),
      );
      const sku = variant?.sku ?? product.sku;
      const name = variant ? `${product.name} - ${variant.name}` : product.name;
      const bundleGroupId = item.bundleGroupId || null;
      const bundleInstanceId = item.bundleInstanceId || null;
      const originalPrice = regularPrice;

      let pricingSource = item.pricingSource || "REGULAR";
      let campaignRef = item.campaignRef || null;
      let unitPrice = regularPrice;
      let discountAmount = 0;

      if (pricingSource === "FLASH_DEAL") {
        const deal =
          (campaignRef ? dealsByCampaignRef.get(campaignRef) : null) ||
          dealsByProductId.get(item.productId);
        const expired = isDealExpired(deal);

        if (expired || !deal || deal.salePrice <= 0) {
          // Deal expired or inactive: revert to regular price
          pricingSource = "REGULAR";
          campaignRef = null;
          unitPrice = regularPrice;
          discountAmount = 0;

          priceChanged = true;
          priceChanges.push({
            productId: item.productId,
            variantId: item.variantId || null,
            lineKey: item.lineKey || null,
            productName: name,
            oldPrice: typeof item.price === "number" ? item.price : regularPrice,
            newPrice: regularPrice,
            reason: "ফ্ল্যাশ ডিলের মেয়াদ শেষ হওয়ায় নিয়মিত মূল্য প্রযোজ্য",
          });
        } else {
          unitPrice = deal.salePrice;
          discountAmount = parseFloat(
            Math.max(0, (regularPrice - unitPrice) * item.quantity).toFixed(2),
          );

          if (
            typeof item.price === "number" &&
            Math.abs(item.price - unitPrice) >= 0.01
          ) {
            priceChanged = true;
            priceChanges.push({
              productId: item.productId,
              variantId: item.variantId || null,
              lineKey: item.lineKey || null,
              productName: name,
              oldPrice: item.price,
              newPrice: unitPrice,
              reason: "অফারের মূল্য পরিবর্তন হয়েছে",
            });
          }
        }
      } else if (
        pricingSource === "BUNDLE" &&
        typeof item.price === "number" &&
        item.price > 0
      ) {
        unitPrice = item.price;
        discountAmount = parseFloat(
          Math.max(0, (regularPrice - unitPrice) * item.quantity).toFixed(2),
        );
      } else {
        unitPrice = regularPrice;
        discountAmount = 0;

        if (
          typeof item.price === "number" &&
          Math.abs(item.price - unitPrice) >= 0.01
        ) {
          priceChanged = true;
          priceChanges.push({
            productId: item.productId,
            variantId: item.variantId || null,
            lineKey: item.lineKey || null,
            productName: name,
            oldPrice: item.price,
            newPrice: unitPrice,
            reason: "পণ্যের মূল্য পরিবর্তন হয়েছে",
          });
        }
      }

      const itemTotal = parseFloat((unitPrice * item.quantity).toFixed(2));

      return {
        productId: item.productId,
        variantId: item.variantId || null,
        name,
        sku,
        price: unitPrice,
        quantity: item.quantity,
        total: itemTotal,
        originalPrice,
        discountAmount,
        pricingSource,
        campaignRef,
        bundleGroupId,
        bundleInstanceId,
        lineKey: item.lineKey || null,
      };
    });

    const subtotal = parseFloat(
      orderItems.reduce((s, i) => s + i.total, 0).toFixed(2),
    );
    const savedAccountingAddress =
      !addressData && addressId
        ? await prisma.address.findFirst({
            where: { id: addressId, userId },
            select: {
              pathaoCityId: true,
              pathaoZoneId: true,
              pathaoAreaId: true,
              phone: true,
              street1: true,
              street2: true,
              city: true,
            },
          })
        : null;

    if (!addressData && addressId) {
      if (!savedAccountingAddress) {
        return NextResponse.json(
          {
            error: "Shipping address not found.",
            code: "SHIPPING_ADDRESS_NOT_FOUND",
          },
          { status: 400 },
        );
      }

      if (!normalizeBangladeshPhoneNumber(savedAccountingAddress.phone)) {
        return NextResponse.json(
          {
            error:
              "Saved shipping address has an invalid Bangladesh phone number.",
            code: "INVALID_SAVED_ADDRESS_PHONE",
          },
          { status: 400 },
        );
      }

      if (!savedAccountingAddress.street1?.trim()) {
        return NextResponse.json(
          {
            error: "Saved shipping address is missing street address.",
            code: "SAVED_STREET_ADDRESS_REQUIRED",
          },
          { status: 400 },
        );
      }
    }

    if (addressData) {
      await verifyPathaoHomeDeliveryArea({
        pathaoZoneId: addressData.pathao_zone_id,
        pathaoAreaId: addressData.pathao_area_id,
        selectedAreaName: addressData.area,
      });
    } else if (savedAccountingAddress) {
      await verifyPathaoHomeDeliveryArea({
        pathaoZoneId: savedAccountingAddress.pathaoZoneId,
        pathaoAreaId: savedAccountingAddress.pathaoAreaId,
      });
    }

    const deliveryAccounting = await resolveOrderDeliveryAccounting({
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      })),
      products,
      variants,
      address: addressData ?? savedAccountingAddress,
      client: {
        shippingCost,
        customerDeliveryCharge,
        courierDeliveryCharge,
        deliveryDiscountAmount: clientDeliveryDiscountAmount,
        deliveryPricingSource: clientDeliveryPricingSource,
        deliveryOfferType: clientDeliveryOfferType,
        deliveryOfferProductId: clientDeliveryOfferProductId ?? null,
        deliveryOfferBadgeText: clientDeliveryOfferBadgeText ?? null,
      },
    });
    const shippingCostNum = deliveryAccounting.shippingCost;
    const taxAmount = 0;
    const customerPhone =
      addressData?.phoneNumber ??
      savedAccountingAddress?.phone ??
      customerForTracking?.phone ??
      null;
    const checkoutPhones = [
      customerForTracking?.phone,
      addressData?.phoneNumber,
      addressData?.phone,
      savedAccountingAddress?.phone,
    ];
    const regularSubtotal = parseFloat(
      orderItems
        .filter((item) => item.pricingSource !== "FLASH_DEAL")
        .reduce((s, i) => s + i.total, 0)
        .toFixed(2),
    );

    const couponValidation = await validateCouponForOrder({
      prisma,
      userId,
      couponCode,
      subtotal,
      eligibleSubtotal: regularSubtotal,
      shippingCost: shippingCostNum,
      phoneNumber: customerPhone,
      phoneNumbers: checkoutPhones,
    });
    const discountAmount = couponValidation.discountAmount;
    const total = parseFloat(
      Math.max(0, subtotal + shippingCostNum - discountAmount).toFixed(2),
    );

    if (total <= 0) {
      throw new OrderValidationError(
        "Order payable total must be greater than zero.",
        "INVALID_ORDER_TOTAL",
        400,
      );
    }

    // Cryptographic Price Quote & Expiry Protection (Master Spec Section 11.1)
    const quoteAddress = {
      pathaoCityId: addressData?.pathao_city_id ?? savedAccountingAddress?.pathaoCityId ?? null,
      pathaoZoneId: addressData?.pathao_zone_id ?? savedAccountingAddress?.pathaoZoneId ?? null,
      pathaoAreaId: addressData?.pathao_area_id ?? savedAccountingAddress?.pathaoAreaId ?? null,
      street1: addressData?.streetAddress ?? savedAccountingAddress?.street1 ?? null,
      phoneNumber: customerPhone,
    };

    if (priceChanged || priceQuoteToken) {
      if (priceQuoteToken) {
        const verifyResult = verifyPriceQuoteToken(priceQuoteToken, {
          userId,
          items: orderItems,
          address: quoteAddress,
          couponCode,
          subtotal,
          discountAmount,
          shippingCost: shippingCostNum,
          total,
        });

        if (!verifyResult.valid) {
          if (verifyResult.reason === "EXPIRED") {
            return NextResponse.json(
              {
                error: "QUOTE_EXPIRED",
                code: "QUOTE_EXPIRED",
                message:
                  "মূল্য নির্ধারণের সময়সীমা (১০ মিনিট) শেষ হয়ে গেছে। অনুগ্রহ করে নতুন করে কনফার্ম করুন।",
              },
              { status: 400 },
            );
          }
          return NextResponse.json(
            {
              error: "QUOTE_INVALID",
              code: "QUOTE_INVALID",
              message: verifyResult.error,
            },
            { status: 400 },
          );
        }
      } else {
        const { token: newQuoteToken, payload: quotePayload } = createPriceQuoteToken({
          userId,
          items: orderItems,
          address: quoteAddress,
          couponCode,
          subtotal,
          discountAmount,
          shippingCost: shippingCostNum,
          total,
        });

        return NextResponse.json(
          {
            error: "PRICE_CHANGED",
            code: "PRICE_CHANGED",
            status: "REVISION_REQUIRED",
            message:
              "ফ্ল্যাশ ডিলের মেয়াদ বা পণ্যের মূল্যে পরিবর্তন হওয়ায় মূল্য আপডেট করা হয়েছে। অনুগ্রহ করে সংশোধিত মূল্য যাচাই করে কনফার্ম করুন।",
            priceQuoteToken: newQuoteToken,
            changes: priceChanges,
            quote: {
              quoteId: quotePayload.quoteId,
              expiresAt: new Date(quotePayload.exp * 1000).toISOString(),
              items: orderItems.map((i) => ({
                lineKey: i.lineKey || null,
                productId: i.productId,
                variantId: i.variantId || null,
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.price,
                lineTotal: i.total,
                pricingSource: i.pricingSource,
              })),
              subtotal,
              couponDiscount: discountAmount,
              shippingCost: shippingCostNum,
              grandTotal: total,
            },
          },
          { status: 409 },
        );
      }
    }
    const notifyItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const unitPrice = parseFloat(
        (variant?.price ?? product.price).toString(),
      );

      return {
        name: product.name,
        variant: formatVariantForNotification(variant),
        quantity: item.quantity,
        unitPrice,
        total: parseFloat((unitPrice * item.quantity).toFixed(2)),
      };
    });
    const orderAttribution = readOrderAttribution(request, { userId });
    const orderTrackingExclusion = buildOrderTrackingExclusionData({
      request,
      email: customerForTracking?.email ?? undefined,
      phones: [
        customerForTracking?.phone,
        addressData?.phoneNumber,
        addressData?.phone,
        savedAccountingAddress?.phone,
      ],
    });

    // 6. Single transaction: resolve address → create order → reserve/finalize stock → clear cart
    const order = await prisma.$transaction(async (tx) => {
      // 6a. Resolve shipping address
      let resolvedAddressId: string | null = null;

      if (addressId) {
        const dbAddr = await tx.address.findFirst({
          where: { id: addressId, userId },
        });
        if (!dbAddr) {
          throw new Error("SHIPPING_ADDRESS_NOT_FOUND");
        }
        resolvedAddressId = dbAddr.id;
      }

      if (!resolvedAddressId && addressData) {
        const created = await tx.address.create({
          data: {
            userId,
            firstName: addressData.fullName || addressData.firstName || "",
            lastName: addressData.lastName || "",
            phone: addressData.phoneNumber,
            street1: addressData.streetAddress,
            street2: `${addressData.zone}, ${addressData.area}`,
            city: addressData.city,
            state:
              addressData.provinceRegion ||
              addressData.state ||
              addressData.city,
            postalCode: addressData.postalCode || "",
            country: addressData.country || "Bangladesh",
            pathaoCityId: addressData.pathao_city_id ?? null,
            pathaoZoneId: addressData.pathao_zone_id ?? null,
            pathaoAreaId: addressData.pathao_area_id ?? null,
            isDefault: false,
            type: "SHIPPING",
          },
        });
        resolvedAddressId = created.id;
      }

      if (!resolvedAddressId) {
        throw new Error("SHIPPING_ADDRESS_REQUIRED");
      }

      if (couponValidation.couponId) {
        if (
          couponValidation.perUserLimit !== null &&
          couponValidation.perUserLimit > 0 &&
          couponValidation.code
        ) {
          const rawPhones = [
            customerForTracking?.phone,
            addressData?.phoneNumber,
            addressData?.phone,
            savedAccountingAddress?.phone,
          ].filter((p): p is string => Boolean(p && typeof p === "string" && p.trim()));

          const phoneCandidates = Array.from(
            new Set(rawPhones.flatMap((p) => getBangladeshPhoneVariations(p))),
          );

          const userConditions: Prisma.OrderWhereInput[] = [{ userId }];
          if (phoneCandidates.length > 0) {
            userConditions.push({
              shippingAddress: {
                phone: { in: phoneCandidates },
              },
            });
            userConditions.push({
              user: {
                phone: { in: phoneCandidates },
              },
            });
          }

          const userCouponUseCount = await tx.order.count({
            where: {
              couponCode: couponValidation.code,
              status: { notIn: ["CANCELLED", "PAYMENT_EXPIRED"] },
              OR: userConditions,
            },
          });
          if (userCouponUseCount >= couponValidation.perUserLimit) {
            throw new Error("COUPON_USER_LIMIT_REACHED");
          }
        }

        const couponUpdate = await tx.coupon.updateMany({
          where:
            couponValidation.usageLimit !== null
              ? {
                  id: couponValidation.couponId,
                  usageCount: { lt: couponValidation.usageLimit },
                }
              : { id: couponValidation.couponId },
          data: { usageCount: { increment: 1 } },
        });

        if (couponUpdate.count !== 1) {
          throw new Error("COUPON_USAGE_LIMIT_REACHED");
        }
      }

      // 6b. Unique daily order number
      const orderNumber = await generateDailyOrderNumber(tx);

      // 6c. Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: resolvedAddressId,
          status: isOnlinePaymentOrder
            ? ONLINE_PAYMENT_PENDING_ORDER_STATUS
            : "CONFIRMED",
          paymentStatus: ONLINE_PAYMENT_INITIAL_STATUS,
          paymentMethod,
          paymentExpiresAt: onlinePaymentExpiresAt,
          stockReservedAt: isOnlinePaymentOrder ? orderLifecycleNow : null,
          stockFinalizedAt: isOnlinePaymentOrder ? null : orderLifecycleNow,
          subtotal,
          shippingCost: shippingCostNum,
          courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge,
          deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount,
          deliveryPricingSource: deliveryAccounting.deliveryPricingSource,
          deliveryOfferType: deliveryAccounting.deliveryOfferType,
          deliveryOfferProductId: deliveryAccounting.deliveryOfferProductId,
          deliveryOfferBadgeText: deliveryAccounting.deliveryOfferBadgeText,
          shippingMethod: shippingMethod || null,
          taxAmount,
          discountAmount,
          total,
          couponCode: couponValidation.code,
          couponDiscount: discountAmount > 0 ? discountAmount : null,
          checkoutIdempotencyKey,
          checkoutPayloadHash,
          customerNote:
            [customerNote, deliveryAccounting.pricingNote]
              .filter(Boolean)
              .join(" | ") || null,
          ...orderAttribution,
          ...orderTrackingExclusion,
          items: {
            create: orderItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId || null,
              name: i.name,
              sku: i.sku,
              price: i.price,
              quantity: i.quantity,
              total: i.total,
              originalPrice: i.originalPrice,
              discountAmount: i.discountAmount,
              pricingSource: i.pricingSource,
              campaignRef: i.campaignRef,
              bundleGroupId: i.bundleGroupId,
              bundleInstanceId: i.bundleInstanceId,
            })),
          },
        },
      });

      // 6d. Persist one immutable first-party attribution snapshot in the same transaction.
      await snapshotOrderAttributionInTransaction(tx as unknown as AttributionDb, {
        orderId: newOrder.id,
        customerId: userId,
        visitorId: orderAttribution.anonymousVisitorId,
        fbp: orderAttribution.fbp,
        fbc: orderAttribution.fbc,
        utmSource: orderAttribution.utmSource,
        utmMedium: orderAttribution.utmMedium,
        utmCampaign: orderAttribution.utmCampaign,
        utmTerm: orderAttribution.utmTerm,
        utmContent: orderAttribution.utmContent,
        landingPage: orderAttribution.campaignSourceUrl ?? orderAttribution.firstLandingUrl,
        consentState: orderAttribution.trackingConsent,
        total: total.toString(),
        currency: 'BDT',
        createdAt: newOrder.createdAt,
      });

      // 6e. Stock handling
      // COD orders are confirmed immediately, so stock is finalized now.
      // bKash/Nagad orders reserve stock briefly and finalize only after verified payment.
      if (isOnlinePaymentOrder) {
        await reserveOnlineOrderStockInTransaction(
          tx,
          orderItems,
          productMap,
          variantMap,
        );
      } else {
        await decrementCodOrderStockInTransaction(tx, orderItems, productMap);
      }

      // 6f. Atomic campaign usage reservation / confirmation
      await reserveCampaignUsageInTransaction(tx, {
        items,
        userId,
        phone: customerPhone,
        orderId: newOrder.id,
        isOnlinePayment: isOnlinePaymentOrder,
        reservedUntil: onlinePaymentExpiresAt,
      });

      // 6f. Product analytics: order counters are updated in the same DB transaction
      // so backend product analytics never shows an order without matching product metrics.
      await recordProductOrderCreatedInTransaction(tx, orderItems, undefined, {
        skip: Boolean(orderTrackingExclusion.isTest),
        reason: orderTrackingExclusion.trackingFilteredReason ?? undefined,
      });

      // 6g. Clear user cart
      await tx.cartItem.deleteMany({ where: { userId } });

      return newOrder;
    });

    // Trigger event-driven Meta Catalog sync for ordered product IDs (debounced 60s, cache invalidated immediately)
    const affectedProductIds = orderItems.map((item) => item.productId).filter(Boolean);
    if (affectedProductIds.length > 0) {
      void triggerEventDrivenCatalogSync({
        productIds: affectedProductIds,
        reason: 'checkout_order_completed',
      });
    }

    // Pathao delivery is not created here - it triggers after Telegram admin confirmation.
    // Online payment orders notify admin only after verified payment finalizes stock.
    if (!isOnlinePaymentOrder) {
      const resolvedAddress = order.addressId
      ? await prisma.address.findUnique({
          where: { id: order.addressId },
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            street2: true,
            street1: true,
          },
        })
      : null;

    notifyNewOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: resolvedAddress
        ? `${resolvedAddress.firstName} ${resolvedAddress.lastName}`.trim()
        : "N/A",
      customerPhone: resolvedAddress?.phone || "N/A",
      address: {
        city: resolvedAddress?.city || "N/A",
        zone: resolvedAddress?.street2 || null,
        area: resolvedAddress?.street1 || null,
      },
      items: notifyItems,
      subtotal,
      shippingCost: shippingCostNum,
      courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge,
      deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount,
      deliveryPricingSource: deliveryAccounting.deliveryPricingSource,
      deliveryOfferType: deliveryAccounting.deliveryOfferType,
      deliveryOfferBadgeText: deliveryAccounting.deliveryOfferBadgeText,
      total,
      paymentMethod,
    }).catch(() => {});
    }

    return NextResponse.json(
      buildCheckoutOrderResponse({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        shippingCost: order.shippingCost,
        courierDeliveryCharge: order.courierDeliveryCharge,
        deliveryDiscountAmount: order.deliveryDiscountAmount,
        deliveryPricingSource: order.deliveryPricingSource,
        deliveryOfferType: order.deliveryOfferType,
        deliveryOfferProductId: order.deliveryOfferProductId,
        deliveryOfferBadgeText: order.deliveryOfferBadgeText,
      }),
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);

    if (error instanceof CheckoutIdempotencyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      idempotencyReplayContext
    ) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: idempotencyReplayContext.userId,
          checkoutIdempotencyKey:
            idempotencyReplayContext.checkoutIdempotencyKey,
        },
        select: checkoutOrderResponseSelect,
      });

      if (
        existingOrder?.checkoutPayloadHash ===
        idempotencyReplayContext.checkoutPayloadHash
      ) {
        return NextResponse.json(
          buildCheckoutOrderResponse(existingOrder, { idempotentReplay: true }),
        );
      }
    }

    if (
      error instanceof OrderValidationError ||
      error instanceof CouponValidationError ||
      error instanceof PathaoAreaAvailabilityError
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    if (error instanceof Error) {
      if (error.message === "SHIPPING_ADDRESS_REQUIRED") {
        return NextResponse.json(
          {
            error: "Shipping address not found. Please add an address first.",
            code: "SHIPPING_ADDRESS_REQUIRED",
          },
          { status: 400 },
        );
      }
      if (error.message === "SHIPPING_ADDRESS_NOT_FOUND") {
        return NextResponse.json(
          {
            error: "Shipping address not found.",
            code: "SHIPPING_ADDRESS_NOT_FOUND",
          },
          { status: 400 },
        );
      }
      if (
        error.message === "ONLINE_STOCK_RESERVATION_FAILED" ||
        error.message === "COD_STOCK_DECREMENT_FAILED"
      ) {
        return NextResponse.json(
          {
            error: "Stock is no longer available for one or more selected items.",
            code: error.message,
          },
          { status: 409 },
        );
      }
      if (error.message === "COUPON_USER_LIMIT_REACHED") {
        return NextResponse.json(
          {
            error: "Coupon usage limit reached for this account.",
            code: "COUPON_USER_LIMIT_REACHED",
          },
          { status: 409 },
        );
      }
      if (error.message === "COUPON_USAGE_LIMIT_REACHED") {
        return NextResponse.json(
          {
            error: "Coupon usage limit reached.",
            code: "COUPON_USAGE_LIMIT_REACHED",
          },
          { status: 409 },
        );
      }
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            error: "Duplicate order. Please refresh and try again.",
            code: "DUPLICATE_ORDER",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 },
    );
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "10"));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status")?.toUpperCase();

    // Validate status against enum
    const validStatuses = Object.values(OrderStatus);
    const orderStatus =
      status && validStatuses.includes(status as OrderStatus)
        ? (status as OrderStatus)
        : undefined;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(orderStatus ? { status: orderStatus } : {}),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: { take: 1, orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
          shippingAddress: true,
          payments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
