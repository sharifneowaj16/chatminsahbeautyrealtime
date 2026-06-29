import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';
import { enqueueGa4Purchase, enqueueMetaCapiPurchase } from '@/lib/queue/metaCapiQueue';

const TELEGRAM_RELAY_BASE = process.env.TELEGRAM_RELAY_BASE;
const BOT_TOKEN = process.env.TELEGRAM_ORDER_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_ADMIN_USER_IDS = (process.env.TELEGRAM_ADMIN_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

type TelegramCallbackQuery = {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  message?: { chat: { id: number | string }; message_id: number };
  data?: string;
};

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
};

function parseCallbackData(data?: string) {
  if (!data) return null;

  const prefixes = ['phone_confirm_', 'phone_off_', 'cancel_', 'pathao_send_'] as const;

  for (const prefix of prefixes) {
    if (data.startsWith(prefix)) {
      return {
        action: prefix.slice(0, -1),
        orderId: data.slice(prefix.length),
      };
    }
  }

  return null;
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  if (!TELEGRAM_RELAY_BASE || !BOT_TOKEN) return;

  const res = await fetch(`${TELEGRAM_RELAY_BASE}${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Telegram ${method} failed:`, res.status, text);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

async function editTelegramMessage(callback: TelegramCallbackQuery, orderId: string, text: string) {
  if (!callback.message) return;

  await telegramApi('editMessageText', {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Send to Pathao',
            callback_data: `pathao_send_${orderId}`,
          },
        ],
      ],
    },
  });
}

async function handlePhoneConfirmed(callback: TelegramCallbackQuery, orderId: string) {
  const telegramUserId = String(callback.from.id);
  const confirmedAt = new Date();
  const eventId = `Purchase-${orderId}`;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        phoneConfirmedAt: true,
        metaPurchaseSent: true,
        isTest: true,
      },
    });

    if (!order) {
      return { status: 'NOT_FOUND' as const };
    }

    if (order.metaPurchaseSent) {
      return {
        status: 'ALREADY_SENT' as const,
        orderNumber: order.orderNumber,
      };
    }

    if (order.phoneConfirmedAt && !order.metaPurchaseSent) {
      return {
        status: 'CONFIRMED_NEEDS_CAPI' as const,
        orderId: order.id,
        orderNumber: order.orderNumber,
        isTest: order.isTest,
      };
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        phoneConfirmedAt: confirmedAt,
        confirmationStatus: 'CONFIRMED_BY_PHONE',
        confirmedByAdminId: telegramUserId,
        metaEventId: eventId,
      },
      select: {
        id: true,
        orderNumber: true,
        isTest: true,
      },
    });

    return {
      status: 'CONFIRMED' as const,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      isTest: updated.isTest,
    };
  });

  if (result.status === 'NOT_FOUND') {
    await answerCallbackQuery(callback.id, 'Order not found');
    return;
  }

  if (result.status === 'ALREADY_SENT') {
    await answerCallbackQuery(callback.id, 'Already confirmed and Meta Purchase already sent');
    return;
  }

  const isFreshConfirm = result.status === 'CONFIRMED';

  await answerCallbackQuery(
    callback.id,
    isFreshConfirm ? 'Phone confirmed' : 'Already confirmed; sending Meta Purchase if needed'
  );

  if (callback.message && isFreshConfirm) {
    await editTelegramMessage(
      callback,
      orderId,
      `<b>Phone Confirmed</b>\n\nOrder: <b>#${result.orderNumber}</b>\nMeta COD Purchase will use this confirmation time as event_time.`
    );
  }

  if (!result.isTest) {
    try {
      await enqueueMetaCapiPurchase({ type: 'cod_purchase', orderId });
    } catch (error) {
      console.error('COD Meta Purchase queue enqueue failed:', error);
    }

    try {
      await enqueueGa4Purchase({ source: 'cod_phone_confirmed', orderId });
    } catch (error) {
      console.error('COD GA4 Purchase queue enqueue failed:', error);
    }
  }
}

async function handlePhoneOff(callback: TelegramCallbackQuery, orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      confirmationStatus: 'PHONE_OFF',
      confirmationNote: 'Marked phone off from Telegram.',
    },
  });

  await answerCallbackQuery(callback.id, 'Marked as Phone Off');
}

async function handleCancel(callback: TelegramCallbackQuery, orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      confirmationStatus: 'CANCELLED_FROM_TELEGRAM',
    },
  });

  await answerCallbackQuery(callback.id, 'Order cancelled');
}

async function handlePathaoSend(callback: TelegramCallbackQuery, orderId: string) {
  const result = await createPathaoDeliveryForOrder(orderId, {
    preserveOrderStatus: false,
    saveFailureStatus: true,
  }).catch((error) => ({
    success: false as const,
    error: error instanceof Error ? error.message : 'Unknown Pathao error',
  }));

  if (!result.success) {
    await answerCallbackQuery(callback.id, `Pathao failed: ${result.error}`);
    return;
  }

  await answerCallbackQuery(
    callback.id,
    result.alreadyDispatched ? 'Already sent to Pathao' : 'Sent to Pathao'
  );

  if (callback.message) {
    const trackingLine = result.trackingCode
      ? `Tracking: <b>${result.trackingCode}</b>\n`
      : '';
    await telegramApi('editMessageText', {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      text:
        `<b>Pathao Dispatch ${result.alreadyDispatched ? 'Already Exists' : 'Created'}</b>\n\n` +
        `Order: <b>#${result.orderNumber}</b>\n` +
        `${trackingLine}` +
        `Status: ${result.pathaoStatus ?? 'N/A'}`,
      parse_mode: 'HTML',
    });
  }
}

export async function POST(req: NextRequest) {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const update = (await req.json()) as TelegramUpdate;
  const callback = update.callback_query;

  if (!callback) {
    return NextResponse.json({ ok: true, skipped: 'not_callback_query' });
  }

  if (
    TELEGRAM_ADMIN_USER_IDS.length > 0 &&
    !TELEGRAM_ADMIN_USER_IDS.includes(String(callback.from.id))
  ) {
    await answerCallbackQuery(callback.id, 'Unauthorized');
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
  }

  const parsed = parseCallbackData(callback.data);

  if (!parsed?.orderId) {
    await answerCallbackQuery(callback.id, 'Invalid action');
    return NextResponse.json({ ok: false, error: 'Invalid callback data' }, { status: 400 });
  }

  if (parsed.action === 'phone_confirm') {
    await handlePhoneConfirmed(callback, parsed.orderId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.action === 'phone_off') {
    await handlePhoneOff(callback, parsed.orderId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.action === 'cancel') {
    await handleCancel(callback, parsed.orderId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.action === 'pathao_send') {
    await handlePathaoSend(callback, parsed.orderId);
    return NextResponse.json({ ok: true });
  }

  await answerCallbackQuery(callback.id, 'Unknown action');
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
