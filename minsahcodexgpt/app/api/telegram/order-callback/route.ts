import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';
import { enqueueGa4Purchase, enqueueMetaCapiPurchase } from '@/lib/queue/metaCapiQueue';
import {
  assertTelegramUserAllowed,
  getTelegramOrderBotConfig,
  requireTelegramWebhookAuth,
  telegramForbiddenResponse,
} from '@/lib/telegram/auth';
import {
  consumeTelegramActionToken,
  createTelegramActionToken,
  parseTelegramCallbackToken,
  resolveTelegramActionToken,
  TELEGRAM_ORDER_ACTIONS,
  type TelegramOrderAction,
} from '@/lib/telegram/action-tokens';
import {
  canTelegramCancel,
  canTelegramPathaoSend,
  canTelegramPhoneConfirm,
  canTelegramPhoneOff,
} from '@/lib/telegram/order-state';

export const dynamic = 'force-dynamic';

type TelegramCallbackQuery = {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  message?: { chat: { id: number | string }; message_id: number };
  data?: string;
};

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
};

type TelegramActionResult = {
  ok: boolean;
  status: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'FAILED';
  message: string;
  orderNumber?: string;
  shouldQueuePurchase?: boolean;
  isTest?: boolean;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getCallbackChatId(callback: TelegramCallbackQuery) {
  return callback.message?.chat.id == null ? null : String(callback.message.chat.id);
}

function getCallbackMessageId(callback: TelegramCallbackQuery) {
  return callback.message?.message_id == null ? null : String(callback.message.message_id);
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) return;

  const res = await fetch(`${config.relayBase}${config.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Telegram ${method} failed:`, res.status, text);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  await telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text.slice(0, 190),
    show_alert: showAlert,
  });
}

async function createTelegramLog(params: {
  callback: TelegramCallbackQuery;
  action: string;
  orderId?: string | null;
  status: string;
  errorMessage?: string | null;
}) {
  try {
    await prisma.telegramActionLog.create({
      data: {
        callbackQueryId: params.callback.id,
        telegramUserId: String(params.callback.from.id),
        telegramUsername: params.callback.from.username ?? null,
        action: params.action,
        orderId: params.orderId ?? null,
        status: params.status,
        errorMessage: params.errorMessage ?? null,
        messageId: getCallbackMessageId(params.callback),
        chatId: getCallbackChatId(params.callback),
      },
    });
    return true;
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return false;
    }
    console.error('Telegram action log write failed:', error);
    return true;
  }
}

async function editTelegramMessage(callback: TelegramCallbackQuery, text: string, replyMarkup?: Record<string, unknown>) {
  if (!callback.message) return;

  await telegramApi('editMessageText', {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function buildPathaoButton(orderId: string, callback: TelegramCallbackQuery) {
  const pathaoToken = await createTelegramActionToken({
    action: TELEGRAM_ORDER_ACTIONS.PATHAO_SEND,
    orderId,
    telegramChatId: getCallbackChatId(callback),
    messageId: getCallbackMessageId(callback),
  });

  return {
    inline_keyboard: [
      [
        {
          text: 'Send to Pathao',
          callback_data: pathaoToken.callbackData,
        },
      ],
    ],
  };
}

function orderSelectFields() {
  return {
    id: true,
    orderNumber: true,
    status: true,
    paymentStatus: true,
    paymentMethod: true,
    phoneConfirmedAt: true,
    metaPurchaseSent: true,
    isTest: true,
    pathaoConsignmentId: true,
    pathaoTrackingCode: true,
    pathaoSentAt: true,
    shippedAt: true,
    deliveredAt: true,
    cancelledAt: true,
    refundedAt: true,
    addressId: true,
  } as const;
}

async function handlePhoneConfirmed(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const telegramUserId = String(callback.from.id);
  const confirmedAt = new Date();
  const eventId = `Purchase-${orderId}`;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: orderSelectFields(),
    });

    if (!order) {
      return { ok: false, status: 'NOT_FOUND' as const, message: 'Order not found' };
    }

    const allowed = canTelegramPhoneConfirm(order);
    if (!allowed.ok) {
      return {
        ok: false,
        status: 'BLOCKED' as const,
        message: allowed.reason,
        orderNumber: order.orderNumber,
        isTest: order.isTest,
      };
    }

    if (order.phoneConfirmedAt && !order.metaPurchaseSent) {
      return {
        ok: true,
        status: 'SUCCESS' as const,
        message: 'Already phone-confirmed; Purchase queue will be retried if needed.',
        orderNumber: order.orderNumber,
        isTest: order.isTest,
        shouldQueuePurchase: true,
      };
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        phoneConfirmedAt: confirmedAt,
        confirmationStatus: 'CONFIRMED_BY_PHONE',
        confirmedByAdminId: `telegram:${telegramUserId}`,
        metaEventId: eventId,
      },
      select: {
        id: true,
        orderNumber: true,
        isTest: true,
      },
    });

    return {
      ok: true,
      status: 'SUCCESS' as const,
      message: 'Phone confirmed.',
      orderNumber: updated.orderNumber,
      isTest: updated.isTest,
      shouldQueuePurchase: true,
    };
  });

  if (result.ok) {
    await answerCallbackQuery(callback.id, result.message);
    await editTelegramMessage(
      callback,
      `<b>Phone Confirmed</b>\n\n` +
        `Order: <b>#${escapeHtml(result.orderNumber)}</b>\n` +
        `Meta COD Purchase will use phoneConfirmedAt as event_time.` +
        (result.isTest ? '\n\nTest order: production tracking skipped.' : ''),
      await buildPathaoButton(orderId, callback)
    );
  } else {
    await answerCallbackQuery(callback.id, result.message, result.status === 'BLOCKED');
  }

  if (result.shouldQueuePurchase && !result.isTest) {
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

  return result;
}

async function handlePhoneOff(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
    if (!order) return { ok: false, status: 'NOT_FOUND' as const, message: 'Order not found' };

    const allowed = canTelegramPhoneOff(order);
    if (!allowed.ok) {
      return {
        ok: false,
        status: 'BLOCKED' as const,
        message: allowed.reason,
        orderNumber: order.orderNumber,
      };
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        confirmationStatus: 'PHONE_OFF',
        confirmationNote: 'Marked phone off from Telegram.',
      },
    });

    return {
      ok: true,
      status: 'SUCCESS' as const,
      message: 'Marked as Phone Off.',
      orderNumber: order.orderNumber,
    };
  });

  await answerCallbackQuery(callback.id, result.message, result.status === 'BLOCKED');
  if (result.ok) {
    await editTelegramMessage(
      callback,
      `<b>Phone Off</b>\n\nOrder: <b>#${escapeHtml(result.orderNumber)}</b>\nNo Purchase was sent.`
    );
  }
  return result;
}

async function handleCancel(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
    if (!order) return { ok: false, status: 'NOT_FOUND' as const, message: 'Order not found' };

    const allowed = canTelegramCancel(order);
    if (!allowed.ok) {
      return {
        ok: false,
        status: 'BLOCKED' as const,
        message: allowed.reason,
        orderNumber: order.orderNumber,
      };
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: order.paymentStatus === 'COMPLETED' ? order.paymentStatus : 'CANCELLED',
        cancelledAt: new Date(),
        confirmationStatus: 'CANCELLED_FROM_TELEGRAM',
        confirmationNote: 'Cancelled from Telegram before phone confirmation/dispatch.',
      },
    });

    return {
      ok: true,
      status: 'SUCCESS' as const,
      message: 'Order cancelled.',
      orderNumber: order.orderNumber,
    };
  });

  await answerCallbackQuery(callback.id, result.message, result.status === 'BLOCKED');
  if (result.ok) {
    await editTelegramMessage(
      callback,
      `<b>Order Cancelled</b>\n\nOrder: <b>#${escapeHtml(result.orderNumber)}</b>\nNo Purchase was sent.`
    );
  }
  return result;
}

async function handlePathaoSend(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found');
    return { ok: false, status: 'NOT_FOUND', message: 'Order not found' };
  }

  const allowed = canTelegramPathaoSend(order);
  if (!allowed.ok) {
    await answerCallbackQuery(callback.id, allowed.reason, true);
    return {
      ok: false,
      status: 'BLOCKED',
      message: allowed.reason,
      orderNumber: order.orderNumber,
    };
  }

  const result = await createPathaoDeliveryForOrder(orderId, {
    preserveOrderStatus: false,
    saveFailureStatus: true,
  }).catch((error) => ({
    success: false as const,
    error: error instanceof Error ? error.message : 'Unknown Pathao error',
  }));

  if (!result.success) {
    await answerCallbackQuery(callback.id, `Pathao failed: ${result.error}`, true);
    return {
      ok: false,
      status: 'FAILED',
      message: result.error,
      orderNumber: order.orderNumber,
    };
  }

  await answerCallbackQuery(
    callback.id,
    result.alreadyDispatched ? 'Already sent to Pathao' : 'Sent to Pathao'
  );

  const trackingLine = result.trackingCode
    ? `Tracking: <b>${escapeHtml(result.trackingCode)}</b>\n`
    : '';
  await editTelegramMessage(
    callback,
    `<b>Pathao Dispatch ${result.alreadyDispatched ? 'Already Exists' : 'Created'}</b>\n\n` +
      `Order: <b>#${escapeHtml(result.orderNumber)}</b>\n` +
      `${trackingLine}` +
      `Status: ${escapeHtml(result.pathaoStatus ?? 'N/A')}`
  );

  return {
    ok: true,
    status: 'SUCCESS',
    message: result.alreadyDispatched ? 'Already sent to Pathao' : 'Sent to Pathao',
    orderNumber: result.orderNumber,
  };
}

function isTelegramOrderAction(action: string): action is TelegramOrderAction {
  return Object.values(TELEGRAM_ORDER_ACTIONS).includes(action as TelegramOrderAction);
}

async function runTelegramOrderAction(
  callback: TelegramCallbackQuery,
  action: TelegramOrderAction,
  orderId: string
) {
  if (action === TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM) return handlePhoneConfirmed(callback, orderId);
  if (action === TELEGRAM_ORDER_ACTIONS.PHONE_OFF) return handlePhoneOff(callback, orderId);
  if (action === TELEGRAM_ORDER_ACTIONS.CANCEL) return handleCancel(callback, orderId);
  if (action === TELEGRAM_ORDER_ACTIONS.PATHAO_SEND) return handlePathaoSend(callback, orderId);

  await answerCallbackQuery(callback.id, 'Unknown action');
  return { ok: false, status: 'FAILED' as const, message: 'Unknown action' };
}

export async function POST(req: NextRequest) {
  const auth = requireTelegramWebhookAuth(req);
  if (!auth.ok) return auth.response;

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const callback = update?.callback_query;

  if (!callback) {
    return NextResponse.json({ ok: true, skipped: 'not_callback_query' });
  }

  if (!assertTelegramUserAllowed(callback.from.id, auth.adminUserIds)) {
    await answerCallbackQuery(callback.id, 'Unauthorized', true);
    return telegramForbiddenResponse();
  }

  const rawToken = parseTelegramCallbackToken(callback.data);
  if (!rawToken) {
    await answerCallbackQuery(callback.id, 'Invalid or expired action. Please use the latest order message.', true);
    await createTelegramLog({
      callback,
      action: 'INVALID_CALLBACK_DATA',
      status: 'BLOCKED',
      errorMessage: 'Callback data is not a tokenized Telegram action.',
    });
    return NextResponse.json({ ok: false, error: 'Invalid callback data' }, { status: 400 });
  }

  const resolved = await resolveTelegramActionToken(rawToken);
  if (!resolved.ok) {
    await answerCallbackQuery(callback.id, resolved.message, true);
    await createTelegramLog({
      callback,
      action: resolved.code,
      status: 'BLOCKED',
      errorMessage: resolved.message,
    });
    return NextResponse.json({ ok: false, error: resolved.message, code: resolved.code }, { status: 400 });
  }

  const action = resolved.token.action;
  const orderId = resolved.token.orderId;

  if (!isTelegramOrderAction(action)) {
    await answerCallbackQuery(callback.id, 'Unknown action', true);
    await createTelegramLog({ callback, action, orderId, status: 'BLOCKED', errorMessage: 'Unknown Telegram action' });
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  const consumed = await consumeTelegramActionToken(resolved.token.id);
  if (!consumed) {
    await answerCallbackQuery(callback.id, 'Action already processed', true);
    await createTelegramLog({ callback, action, orderId, status: 'DUPLICATE', errorMessage: 'Token already consumed' });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const result = await runTelegramOrderAction(callback, action, orderId);
  await createTelegramLog({
    callback,
    action,
    orderId,
    status: result.status,
    errorMessage: result.ok ? null : result.message,
  });

  const status = result.ok ? 200 : result.status === 'NOT_FOUND' ? 404 : result.status === 'BLOCKED' ? 409 : 500;
  return NextResponse.json(
    {
      ok: result.ok,
      status: result.status,
      message: result.message,
      orderNumber: result.orderNumber,
    },
    { status }
  );
}
