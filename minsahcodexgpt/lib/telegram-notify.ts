import 'server-only';

const TELEGRAM_RELAY_BASE = process.env.TELEGRAM_RELAY_BASE;
const BOT_TOKEN = process.env.TELEGRAM_ORDER_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ORDER_CHAT_ID;

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
    `🛒 <b>নতুন Order!</b>\n\n` +
    `📦 Order: <b>${escapeHtml(order.orderNumber)}</b>\n` +
    `💰 Total: ৳${formatAmount(order.total)}\n` +
    `💳 Payment: ${escapeHtml(order.paymentMethod)}\n` +
    `📋 Items: ${order.itemsCount}`
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
      .join(' › ') || 'N/A';

  const itemLines = order.items
    .map((item) => {
      const variantLine = item.variant ? `\n   Variant: ${escapeHtml(item.variant)}` : '';
      return (
        `▸ ${escapeHtml(item.name)}${variantLine}\n` +
        `   Qty: ${item.quantity} × ৳${formatAmount(item.unitPrice)} = ৳${formatAmount(item.total)}`
      );
    })
    .join('\n\n');

  return (
    `🛍️ <b>নতুন অর্ডার — Minsah Beauty</b>\n\n` +
    `🆔 #${escapeHtml(order.orderNumber)}\n` +
    `📅 ${dateStr}, ${timeStr}\n\n` +
    `👤 <b>গ্রাহক তথ্য</b>\n` +
    `নাম: ${escapeHtml(order.customerName)}\n` +
    `ফোন: ${escapeHtml(order.customerPhone)}\n` +
    `ঠিকানা: ${addressLine}\n\n` +
    `📦 <b>অর্ডার ডিটেইলস</b>\n` +
    `${itemLines || 'N/A'}\n\n` +
    `সাবটোটাল: ৳${formatAmount(order.subtotal)}\n` +
    `ডেলিভারি চার্জ: ৳${formatAmount(order.shippingCost)}\n` +
    `💰 <b>সর্বমোট: ৳${formatAmount(order.total)}</b>\n\n` +
    `💵 পেমেন্ট: ${escapeHtml(order.paymentMethod)}\n\n` +
    `অনুগ্রহ করে নিচের বাটন থেকে অর্ডার confirm করুন:`
  );
}

export async function notifyNewOrder(order: NewOrderNotification) {
  if (!TELEGRAM_RELAY_BASE || !BOT_TOKEN || !CHAT_ID) {
    console.error('Telegram order bot not configured - skipping notification.');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: CHAT_ID,
      text: isDetailedOrder(order) ? buildDetailedMessage(order) : buildBasicMessage(order),
      parse_mode: 'HTML',
    };

    if (isDetailedOrder(order)) {
      body.reply_markup = {
        inline_keyboard: [
          [
            { text: '✅ Confirm করুন (Pathao তে পাঠান)', callback_data: `confirm_${order.orderId}` },
            { text: '❌ Cancel', callback_data: `cancel_${order.orderId}` },
          ],
        ],
      };
    }

    await fetch(`${TELEGRAM_RELAY_BASE}${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Telegram notify failed:', err);
  }
}
