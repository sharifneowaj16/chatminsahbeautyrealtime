import "server-only";

import {
  attachTelegramActionTokenContext,
  createTelegramActionToken,
  TELEGRAM_ORDER_ACTIONS,
} from "@/lib/telegram/action-tokens";
import { getTelegramOrderBotConfig } from "@/lib/telegram/auth";

interface OrderItemDetail {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface AddressDetail {
  city: string;
  zone?: string | null;
  area?: string | null;
}

interface DetailedOrderNotification {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: AddressDetail;
  items: OrderItemDetail[];
  subtotal: number;
  /** Customer-facing delivery charge saved in Order.shippingCost. */
  shippingCost: number;
  /** Internal courier actual charge from Pathao/Steadfast, when known. */
  courierDeliveryCharge?: number | null;
  /** Business subsidy/discount for delivery offers. */
  deliveryDiscountAmount?: number | null;
  deliveryPricingSource?: string | null;
  deliveryOfferType?: string | null;
  deliveryOfferBadgeText?: string | null;
  total: number;
  paymentMethod: string;
}

interface BasicOrderNotification {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
}

type NewOrderNotification = DetailedOrderNotification | BasicOrderNotification;

function isDetailedOrder(
  order: NewOrderNotification,
): order is DetailedOrderNotification {
  return "orderId" in order && "items" in order && Array.isArray(order.items);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : "0";
}

function amountOrFree(value: number) {
  return value <= 0 ? "Free" : `BDT ${formatAmount(value)}`;
}

function normalizePhoneForTelUrl(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(compact)) return compact;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `+880${digits}`;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^\d{8,15}$/.test(digits)) return `+${digits}`;

  return null;
}

function buildCustomerCallUrl(phone: string | null | undefined) {
  const normalized = normalizePhoneForTelUrl(phone);
  return normalized ? `tel:${normalized}` : null;
}

function deliverySourceLabel(source?: string | null) {
  const normalized = String(source || "").toUpperCase();
  const labels: Record<string, string> = {
    DEFAULT: "Default",
    PATHAO: "Pathao quote",
    STEADFAST: "Steadfast quote",
    PRODUCT_OFFER: "Product offer",
    MANUAL: "Manual",
    FALLBACK: "Fallback",
  };
  return labels[normalized] || normalized || "Not set";
}

function deliveryOfferLabel(type?: string | null) {
  const normalized = String(type || "").toUpperCase();
  const labels: Record<string, string> = {
    DEFAULT: "No product offer",
    FREE: "Free delivery offer",
    FIXED: "Fixed delivery offer",
  };
  return labels[normalized] || normalized || "No product offer";
}

function buildBasicMessage(order: BasicOrderNotification) {
  return (
    `<b>New Order</b>\n\n` +
    `Order: <b>${escapeHtml(order.orderNumber)}</b>\n` +
    `Total: BDT ${formatAmount(order.total)}\n` +
    `Payment: ${escapeHtml(order.paymentMethod)}\n` +
    `Items: ${order.itemsCount}`
  );
}

function buildDetailedMessage(order: DetailedOrderNotification) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("bn-BD", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const addressLine =
    [order.address.city, order.address.zone, order.address.area]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" > ") || "N/A";

  const itemLines = order.items
    .map((item) => {
      const variantLine = item.variant
        ? `\n   Variant: ${escapeHtml(item.variant)}`
        : "";
      return (
        `- ${escapeHtml(item.name)}${variantLine}\n` +
        `   Qty: ${item.quantity} x BDT ${formatAmount(item.unitPrice)} = BDT ${formatAmount(item.total)}`
      );
    })
    .join("\n\n");

  return (
    `<b>New Order - Minsah Beauty</b>\n\n` +
    `Order: <b>#${escapeHtml(order.orderNumber)}</b>\n` +
    `Time: ${dateStr}, ${timeStr}\n\n` +
    `<b>Customer</b>\n` +
    `Name: ${escapeHtml(order.customerName)}\n` +
    `Phone: ${escapeHtml(order.customerPhone)}\n` +
    `Address: ${addressLine}\n\n` +
    `<b>Items</b>\n` +
    `${itemLines || "N/A"}\n\n` +
    `Subtotal: BDT ${formatAmount(order.subtotal)}\n` +
    `Customer delivery paid: ${amountOrFree(order.shippingCost)}\n` +
    (typeof order.courierDeliveryCharge === "number"
      ? `Courier actual charge: BDT ${formatAmount(order.courierDeliveryCharge)}\n`
      : "") +
    ((order.deliveryDiscountAmount || 0) > 0
      ? `Delivery subsidy: BDT ${formatAmount(order.deliveryDiscountAmount || 0)}\n`
      : "") +
    `Pricing source: ${escapeHtml(deliverySourceLabel(order.deliveryPricingSource))}\n` +
    `Offer type: ${escapeHtml(deliveryOfferLabel(order.deliveryOfferType))}\n` +
    (order.deliveryOfferBadgeText
      ? `Offer badge: ${escapeHtml(order.deliveryOfferBadgeText)}\n`
      : "") +
    `<b>Total: BDT ${formatAmount(order.total)}</b>\n\n` +
    `Payment: ${escapeHtml(order.paymentMethod)}\n\n` +
    `Call the customer first. After phone confirmation, tap <b>Phone Confirmed</b>.\n` +
    `Courier/Pathao sending is a separate next step.`
  );
}

async function sendTelegramMessage(body: Record<string, unknown>) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) {
    throw new Error("Telegram order bot not configured.");
  }

  const res = await fetch(`${config.relayBase}${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${text}`);
  }

  return res.json().catch(() => null);
}

async function buildOrderActionButtons(orderId: string, customerPhone?: string | null) {
  const callCustomerUrl = buildCustomerCallUrl(customerPhone);
  const [phoneConfirm, phoneOff, cancel] = await Promise.all([
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM,
      orderId,
    }),
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.PHONE_OFF,
      orderId,
    }),
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.CANCEL,
      orderId,
    }),
  ]);

  return {
    tokenIds: [phoneConfirm.tokenId, phoneOff.tokenId, cancel.tokenId],
    replyMarkup: {
      inline_keyboard: [
        ...(callCustomerUrl
          ? [
              [
                {
                  text: "Call Customer",
                  url: callCustomerUrl,
                },
              ],
            ]
          : []),
        [
          {
            text: "Phone Confirmed",
            callback_data: phoneConfirm.callbackData,
          },
        ],
        [
          {
            text: "Phone Off",
            callback_data: phoneOff.callbackData,
          },
          {
            text: "Cancel",
            callback_data: cancel.callbackData,
          },
        ],
      ],
    },
  };
}

function extractTelegramSentMessageContext(response: unknown) {
  if (!response || typeof response !== "object") return null;
  const data = response as {
    ok?: boolean;
    result?: { message_id?: number | string; chat?: { id?: number | string } };
  };
  const messageId = data.result?.message_id;
  const chatId = data.result?.chat?.id;
  if (messageId == null || chatId == null) return null;
  return { messageId, chatId };
}

export async function notifyNewOrder(order: NewOrderNotification) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.error("Telegram order bot not configured - skipping notification.");
    return;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: config.chatId,
      text: isDetailedOrder(order)
        ? buildDetailedMessage(order)
        : buildBasicMessage(order),
      parse_mode: "HTML",
    };

    let actionTokenIds: string[] = [];
    if (isDetailedOrder(order)) {
      const buttons = await buildOrderActionButtons(order.orderId, order.customerPhone);
      body.reply_markup = buttons.replyMarkup;
      actionTokenIds = buttons.tokenIds;
    }

    const response = await sendTelegramMessage(body);
    const sentContext = extractTelegramSentMessageContext(response);
    if (sentContext && actionTokenIds.length) {
      await attachTelegramActionTokenContext({
        tokenIds: actionTokenIds,
        telegramChatId: sentContext.chatId,
        messageId: sentContext.messageId,
      });
    }
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}
