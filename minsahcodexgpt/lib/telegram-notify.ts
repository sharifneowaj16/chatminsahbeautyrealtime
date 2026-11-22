import "server-only";

import {
  attachTelegramActionTokenContext,
  createTelegramActionToken,
  TELEGRAM_ORDER_ACTIONS,
} from "@/lib/telegram/action-tokens";
import { getTelegramOrderBotConfig } from "@/lib/telegram/auth";
import type { CustomerFraudRiskDetails } from "@/lib/courier/fraud-check";

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

export interface DetailedOrderNotification {
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
  courierVerification?: CustomerFraudRiskDetails | null;
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

function normalizeBangladeshPhoneDisplay(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "N/A";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `+880${digits}`;
  if (/^\d{8,15}$/.test(digits)) return `+${digits}`;

  return raw;
}

function buildCustomerWhatsAppUrl(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (/^01\d{9}$/.test(digits)) normalized = `88${digits}`;
  else if (/^1\d{9}$/.test(digits)) normalized = `880${digits}`;
  else if (/^8801\d{9}$/.test(digits)) normalized = digits;

  if (/^8801\d{9}$/.test(normalized)) {
    return `https://wa.me/${normalized}`;
  }
  return null;
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

function formatCourierStatusText(status: string): string {
  switch (status) {
    case "timeout":
      return "Unavailable (Timeout)";
    case "circuit_open":
      return "Paused (Auth/Rate limit)";
    case "unconfigured":
      return "Not configured";
    case "invalid_phone":
      return "Invalid BD phone";
    default:
      return "Unavailable";
  }
}

export function formatCourierHistoryForTelegram(
  details?: CustomerFraudRiskDetails | null,
): string {
  const bullet = "\u2022";
  if (!details) {
    return (
      `<b>Courier &amp; Store History</b>\n` +
      `${bullet} Steadfast: Unavailable\n` +
      `${bullet} Pathao: Unavailable`
    );
  }

  let sfLine = formatCourierStatusText(details.steadfast.status);
  if (details.steadfast.status === "ok") {
    const sf = details.steadfast;
    const parts: string[] = [];
    if (sf.deliveryRatio !== null) parts.push(`Success ${sf.deliveryRatio}%`);
    if (sf.cancellationRatio !== null) parts.push(`Cancelled ${sf.cancellationRatio}%`);
    if (sf.volumeRange) {
      parts.push(`Volume ${escapeHtml(sf.volumeRange)}`);
    } else if (sf.totalParcels !== null) {
      parts.push(`Parcels ${sf.totalParcels}`);
    }
    if (sf.deliveredCount !== null && sf.cancelledCount !== null) {
      parts.push(`(${sf.deliveredCount} ok / ${sf.cancelledCount} cancel)`);
    }
    if (parts.length === 0) {
      parts.push("No parcel history");
    }
    parts.push(
      sf.totalReports > 0
        ? `Reports: <b>${sf.totalReports}</b>`
        : "Reports: 0",
    );
    if (sf.fraudCategories.length > 0) {
      parts.push(`Flags: ${escapeHtml(sf.fraudCategories.join(", "))}`);
    }
    sfLine = parts.join(" | ");
  }

  let pathaoLine = formatCourierStatusText(details.pathao.status);
  if (details.pathao.status === "ok") {
    const p = details.pathao;
    const parts: string[] = [];
    if (p.totalParcels !== null && p.deliveredCount !== null) {
      parts.push(`Total ${p.totalParcels}`);
      parts.push(
        `Delivered ${p.deliveredCount}${p.successRate !== null ? ` (${p.successRate}%)` : ""}`,
      );
      parts.push(`Cancelled ${p.cancelledCount ?? 0}`);
    }
    if (p.customerRatingLabel) {
      parts.push(escapeHtml(p.customerRatingLabel));
    }
    pathaoLine = parts.length > 0 ? parts.join(" | ") : "No parcel history";
  }

  const s = details.storeHistory;
  const storeLine =
    s.totalOrders === 0
      ? "0 (First order)"
      : `Total ${s.totalOrders} | Delivered ${s.deliveredCount} | Cancelled ${s.cancelledCount} | Returned ${s.returnedCount}${s.pendingCount > 0 ? ` | Active ${s.pendingCount}` : ""}`;

  return (
    `<b>Courier &amp; Store History</b>${details.cached ? " <i>(cached)</i>" : ""}\n` +
    `${bullet} <b>Steadfast:</b> ${sfLine}\n` +
    `${bullet} <b>Pathao:</b> ${pathaoLine}\n` +
    `${bullet} <b>Minsah Prev Orders:</b> ${storeLine}`
  );
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
  const dateStr = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
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

  const displayPhone = normalizeBangladeshPhoneDisplay(order.customerPhone);
  const courierSection = order.courierVerification !== undefined
    ? `${formatCourierHistoryForTelegram(order.courierVerification)}\n\n`
    : "";

  return (
    `<b>New Order - Minsah Beauty</b>\n\n` +
    `Order: <b>#${escapeHtml(order.orderNumber)}</b>\n` +
    `Time: ${dateStr}, ${timeStr}\n\n` +
    `<b>Customer</b>\n` +
    `Name: ${escapeHtml(order.customerName)}\n` +
    `Phone: ${escapeHtml(displayPhone)}\n` +
    `Address: ${addressLine}\n\n` +
    courierSection +
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
  const whatsAppUrl = buildCustomerWhatsAppUrl(customerPhone);
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
        ...(whatsAppUrl
          ? [
              [
                {
                  text: "💬 WhatsApp Customer",
                  url: whatsAppUrl,
                },
              ],
            ]
          : []),
        [
          {
            text: "📞 Phone Confirmed",
            callback_data: phoneConfirm.callbackData,
          },
        ],
        [
          {
            text: "📵 Phone Off",
            callback_data: phoneOff.callbackData,
          },
          {
            text: "❌ Cancel",
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

let webhookRegistrationPromise: Promise<{ ok: boolean; webhookInfo?: unknown; error?: string }> | null = null;

export async function ensureTelegramWebhookRegistered(force = false): Promise<{
  ok: boolean;
  webhookInfo?: unknown;
  error?: string;
}> {
  if (webhookRegistrationPromise && !force) {
    return webhookRegistrationPromise;
  }

  const runRegistration = async () => {
    const config = getTelegramOrderBotConfig();
    if (!config.relayBase || !config.botToken) {
      return { ok: false, error: 'TELEGRAM_BOT_NOT_CONFIGURED' };
    }

    const webhookUrl =
      process.env.TELEGRAM_WEBHOOK_URL ||
      'https://minsahbeauty.cloud/api/telegram/order-callback';

    try {
      const currentInfo = await getTelegramWebhookInfo();
      if (currentInfo.ok && currentInfo.result?.url === webhookUrl) {
        return { ok: true, webhookInfo: currentInfo.result };
      }

      const res = await fetch(`${config.relayBase}${config.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          ...(config.webhookSecret ? { secret_token: config.webhookSecret } : {}),
          allowed_updates: ['callback_query', 'message'],
          drop_pending_updates: false,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const err = data?.description || `HTTP ${res.status}`;
        console.error('[TelegramWebhook] setWebhook failed:', err);
        return { ok: false, error: err };
      }

      console.log('[TelegramWebhook] Successfully registered webhook:', webhookUrl);
      return { ok: true, webhookInfo: data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[TelegramWebhook] Error registering webhook:', errorMsg);
      return { ok: false, error: errorMsg };
    }
  };

  webhookRegistrationPromise = runRegistration();
  return webhookRegistrationPromise;
}

export async function getTelegramWebhookInfo(): Promise<{
  ok: boolean;
  result?: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    ip_address?: string;
  };
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) {
    return { ok: false, error: 'TELEGRAM_BOT_NOT_CONFIGURED' };
  }

  try {
    const res = await fetch(`${config.relayBase}${config.botToken}/getWebhookInfo`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: data.result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function notifyNewOrder(order: NewOrderNotification): Promise<{
  ok: boolean;
  messageId?: string | number;
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.warn("[TelegramNotify] Telegram order bot not configured - skipping notification.");
    return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  }

  // Ensure webhook is registered once per server boot in background
  ensureTelegramWebhookRegistered().catch((err) => {
    console.warn("[TelegramNotify] Auto-webhook registration error:", err);
  });

  const baseText = isDetailedOrder(order)
    ? buildDetailedMessage(order)
    : buildBasicMessage(order);

  let actionTokenIds: string[] = [];
  let replyMarkup: Record<string, unknown> | undefined = undefined;

  if (isDetailedOrder(order)) {
    try {
      const buttons = await buildOrderActionButtons(order.orderId, order.customerPhone);
      replyMarkup = buttons.replyMarkup;
      actionTokenIds = buttons.tokenIds;
    } catch (btnErr) {
      console.error("[TelegramNotify] Failed to build action buttons:", btnErr);
    }
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: config.chatId,
      text: baseText,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    const response = await sendTelegramMessage(body);
    const sentContext = extractTelegramSentMessageContext(response);
    if (sentContext && actionTokenIds.length) {
      await attachTelegramActionTokenContext({
        tokenIds: actionTokenIds,
        telegramChatId: sentContext.chatId,
        messageId: sentContext.messageId,
      }).catch((err) => console.error("[TelegramNotify] attach context failed:", err));
    }
    return { ok: true, messageId: sentContext?.messageId };
  } catch (err) {
    console.error("[TelegramNotify] Primary message failed, attempting plain fallback without buttons:", err);
    if (replyMarkup) {
      try {
        const fallbackBody: Record<string, unknown> = {
          chat_id: config.chatId,
          text: baseText,
          parse_mode: "HTML",
        };
        const response = await sendTelegramMessage(fallbackBody);
        const sentContext = extractTelegramSentMessageContext(response);
        return { ok: true, messageId: sentContext?.messageId };
      } catch (fallbackErr) {
        const errorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error("[TelegramNotify] Fallback plain message also failed:", errorMsg);
        return { ok: false, error: errorMsg };
      }
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMsg };
  }
}

export async function sendTelegramHtmlMessage(message: string): Promise<{
  ok: boolean;
  messageId?: string | number;
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.warn("[TelegramNotify] Telegram order bot not configured - skipping HTML message.");
    return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  }

  try {
    const response = await sendTelegramMessage({
      chat_id: config.chatId,
      text: message,
      parse_mode: "HTML",
    });
    const sentContext = extractTelegramSentMessageContext(response);
    return { ok: true, messageId: sentContext?.messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[TelegramNotify] sendTelegramHtmlMessage failed:", errorMsg);
    return { ok: false, error: errorMsg };
  }
}
