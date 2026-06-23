import 'server-only';

const TELEGRAM_RELAY_BASE = process.env.TELEGRAM_RELAY_BASE;
const BOT_TOKEN = process.env.TELEGRAM_ORDER_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ORDER_CHAT_ID;

export async function notifyNewOrder(order: {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
}) {
  if (!TELEGRAM_RELAY_BASE || !BOT_TOKEN || !CHAT_ID) {
    console.error("Telegram order bot not configured — skipping notification.");
    return;
  }

  try {
    const text =
      `🛒 <b>নতুন Order!</b>\n\n` +
      `📦 Order: <b>${order.orderNumber}</b>\n` +
      `💰 Total: ৳${order.total}\n` +
      `💳 Payment: ${order.paymentMethod}\n` +
      `📋 Items: ${order.itemsCount}`;

    await fetch(`${TELEGRAM_RELAY_BASE}${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}
