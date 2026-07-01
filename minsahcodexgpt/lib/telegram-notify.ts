import 'server-only';

import { createTelegramActionToken, TELEGRAM_ORDER_ACTIONS } from '@/lib/telegram/action-tokens';
import { getTelegramOrderBotConfig } from '@/lib/telegram/auth';

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
  shippingCost: number;
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

function isDetailedOrder(order: NewOrderNotification): order is DetailedOrderNotification {
  return 'orderId' in order && 'items' in order && Array.isArray(order.items);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : '0';
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
  const dateStr = now.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('bn-BD', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const addressLine =
    [order.address.city, order.address.zone, order.address.area]
      .filter(Boolean)
      .map(escapeHtml)
      .join(' > ') || 'N/A';

  const itemLines = order.items
    .map((item) => {
      const variantLine = item.variant ? `\n   Variant: ${escapeHtml(item.variant)}` : '';
      return (
        `- ${escapeHtml(item.name)}${variantLine}\n` +
        `   Qty: ${item.quantity} x BDT ${formatAmount(item.unitPrice)} = BDT ${formatAmount(item.total)}`
      );
    })
    .join('\n\n');

  return (
    `<b>New Order - Minsah Beauty</b>\n\n` +
    `Order: <b>#${escapeHtml(order.orderNumber)}</b>\n` +
    `Time: ${dateStr}, ${timeStr}\n\n` +
    `<b>Customer</b>\n` +
    `Name: ${escapeHtml(order.customerName)}\n` +
    `Phone: ${escapeHtml(order.customerPhone)}\n` +
    `Address: ${addressLine}\n\n` +
    `<b>Items</b>\n` +
    `${itemLines || 'N/A'}\n\n` +
    `Subtotal: BDT ${formatAmount(order.subtotal)}\n` +
    `Delivery: BDT ${formatAmount(order.shippingCost)}\n` +
    `<b>Total: BDT ${formatAmount(order.total)}</b>\n\n` +
    `Payment: ${escapeHtml(order.paymentMethod)}\n\n` +
    `Call the customer first. After phone confirmation, tap <b>Phone Confirmed</b>.\n` +
    `Courier/Pathao sending is a separate next step.`
  );
}

async function sendTelegramMessage(body: Record<string, unknown>) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) {
    throw new Error('Telegram order bot not configured.');
  }

  const res = await fetch(`${config.relayBase}${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Telegram sendMessage failed: ${res.status} ${text}`);
  }

  return res.json().catch(() => null);
}

async function buildOrderActionButtons(orderId: string) {
  const [phoneConfirm, phoneOff, cancel] = await Promise.all([
    createTelegramActionToken({ action: TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM, orderId }),
    createTelegramActionToken({ action: TELEGRAM_ORDER_ACTIONS.PHONE_OFF, orderId }),
    createTelegramActionToken({ action: TELEGRAM_ORDER_ACTIONS.CANCEL, orderId }),
  ]);

  return {
    inline_keyboard: [
      [
        {
          text: 'Phone Confirmed',
          callback_data: phoneConfirm.callbackData,
        },
      ],
      [
        {
          text: 'Phone Off',
          callback_data: phoneOff.callbackData,
        },
        {
          text: 'Cancel',
          callback_data: cancel.callbackData,
        },
      ],
    ],
  };
}

export async function notifyNewOrder(order: NewOrderNotification) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.error('Telegram order bot not configured - skipping notification.');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: config.chatId,
      text: isDetailedOrder(order) ? buildDetailedMessage(order) : buildBasicMessage(order),
      parse_mode: 'HTML',
    };

    if (isDetailedOrder(order)) {
      body.reply_markup = await buildOrderActionButtons(order.orderId);
    }

    await sendTelegramMessage(body);
  } catch (err) {
    console.error('Telegram notify failed:', err);
  }
}
