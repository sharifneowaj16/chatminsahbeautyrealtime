import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';
import { createSteadfastDeliveryForOrder } from '@/lib/steadfast-delivery';
import { enqueueGa4Purchase, enqueueTikTokPurchase } from '@/lib/queue/metaCapiQueue';
import {
  createMetaPurchaseOutbox,
  createMetaPurchaseOutboxInTransaction,
} from '@/lib/meta/capi/purchase-outbox';
import { requestMetaOutboxDispatch } from '@/lib/meta/capi/dispatcher';
import { recordProductLifecycleTransitionInTransaction } from '@/lib/analytics/product-metrics';
import { reconcileOrderStockOnStatusTransition } from '@/lib/inventory/order-stock-reconciliation';
import { getTelegramWebhookInfo } from '@/lib/telegram-notify';
import {
  assertTelegramUserAllowed,
  getTelegramOrderBotConfig,
  requireTelegramWebhookAuth,
  telegramForbiddenResponse,
  telegramUnauthorizedResponse,
} from '@/lib/telegram/auth';
import {
  consumeTelegramActionToken,
  createTelegramActionToken,
  isTelegramActionTokenContextValid,
  parseTelegramCallbackToken,
  releaseTelegramActionToken,
  resolveTelegramActionToken,
  TELEGRAM_ORDER_ACTIONS,
  type TelegramOrderAction,
} from '@/lib/telegram/action-tokens';
import {
  canTelegramCancel,
  canTelegramPathaoSend,
  canTelegramSteadfastSend,
  canTelegramPhoneConfirm,
  canTelegramPhoneOff,
} from '@/lib/telegram/order-state';
import { attributeVerifiedSearchConversionsForOrder } from '@/lib/search/conversion-attribution';

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
  metaOutboxId?: string;
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

async function telegramApi(method: string, body: Record<string, unknown>): Promise<boolean> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) return false;

  const res = await fetch(`${config.relayBase}${config.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Telegram ${method} failed:`, res.status, text);
    return false;
  }

  return true;
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

async function editTelegramMessage(
  callback: TelegramCallbackQuery,
  text: string,
  replyMarkup?: Record<string, unknown>,
  fallbackReplyMarkup?: Record<string, unknown>
) {
  if (!callback.message) return;

  const ok = await telegramApi('editMessageText', {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });

  if (!ok && fallbackReplyMarkup) {
    await telegramApi('editMessageText', {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      text,
      parse_mode: 'HTML',
      reply_markup: fallbackReplyMarkup,
    });
  }
}

async function buildCourierDispatchButtons(orderId: string, callback: TelegramCallbackQuery) {
  const telegramChatId = getCallbackChatId(callback);
  const messageId = getCallbackMessageId(callback);

  const [steadfastToken, pathaoToken] = await Promise.all([
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.STEADFAST_SEND,
      orderId,
      telegramChatId,
      messageId,
    }),
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.PATHAO_SEND,
      orderId,
      telegramChatId,
      messageId,
    }),
  ]);

  return {
    styledMarkup: {
      inline_keyboard: [
        [
          {
            text: '\u{1F69A} Send to Steadfast',
            callback_data: steadfastToken.callbackData,
            style: 'success',
          },
        ],
        [
          {
            text: '\u{1F4E6} Send to Pathao',
            callback_data: pathaoToken.callbackData,
          },
        ],
      ],
    },
    standardMarkup: {
      inline_keyboard: [
        [
          {
            text: '\u{1F69A} Send to Steadfast',
            callback_data: steadfastToken.callbackData,
          },
        ],
        [
          {
            text: '\u{1F4E6} Send to Pathao',
            callback_data: pathaoToken.callbackData,
          },
        ],
      ],
    },
  };
}

function orderSelectFields() {
  return {
    id: true,
    orderNumber: true,
    createdAt: true,
    status: true,
    paymentStatus: true,
    paymentMethod: true,
    phoneConfirmedAt: true,
    paymentPaidAt: true,
    paidAt: true,
    metaPurchaseSent: true,
    isTest: true,
    pathaoConsignmentId: true,
    pathaoTrackingCode: true,
    pathaoSentAt: true,
    steadfastConsignmentId: true,
    steadfastTrackingCode: true,
    steadfastSentAt: true,
    steadfastStatus: true,
    shippedAt: true,
    deliveredAt: true,
    cancelledAt: true,
    returnedAt: true,
    refundedAt: true,
    courierDeliveredAt: true,
    courierReturnedAt: true,
    addressId: true,
  } as const;
}

async function handlePhoneConfirmed(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const telegramUserId = String(callback.from.id);
  const confirmedAt = new Date();
  const eventId = `Purchase-${orderId}`;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: orderSelectFields(),
  });

  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found', true);
    return { ok: false, status: 'NOT_FOUND', message: 'Order not found' };
  }

  const allowed = canTelegramPhoneConfirm(order);
  if (!allowed.ok) {
    await answerCallbackQuery(callback.id, allowed.reason, true);
    return {
      ok: false,
      status: 'BLOCKED',
      message: allowed.reason,
      orderNumber: order.orderNumber,
      isTest: order.isTest,
    };
  }

  const effectiveConfirmedAt = order.phoneConfirmedAt ?? confirmedAt;
  const updated = order.phoneConfirmedAt
    ? order
    : await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          phoneConfirmedAt: effectiveConfirmedAt,
          confirmationStatus: 'CONFIRMED_BY_PHONE',
          confirmedByAdminId: `telegram:${telegramUserId}`,
          metaEventId: eventId,
        },
        select: orderSelectFields(),
      });

  // 1. Answer Telegram and update the message UI IMMEDIATELY (< 300ms) on 1st click
  const courierButtons = await buildCourierDispatchButtons(orderId, callback).catch((btnErr) => {
    console.error('[TelegramCallback] buildCourierDispatchButtons error:', btnErr);
    return undefined;
  });

  await Promise.all([
    answerCallbackQuery(callback.id, '\u2705 Phone confirmed!'),
    editTelegramMessage(
      callback,
      `<b>\u2705 Phone Confirmed</b>\n\n` +
        `Order: <b>#${escapeHtml(updated.orderNumber)}</b>\n` +
        `Meta COD Purchase dispatched (event_id: <code>${escapeHtml(eventId)}</code>).\n` +
        `<i>Select courier to book parcel:</i>` +
        (updated.isTest ? '\n\nTest order: production tracking skipped.' : ''),
      courierButtons?.styledMarkup,
      courierButtons?.standardMarkup
    ),
  ]);

  // 2. Run Outbox, Meta CAPI, Analytics, GA4 & TikTok without blocking or rolling back the order
  let metaOutboxId: string | undefined;
  if (!updated.isTest) {
    try {
      const outbox = await createMetaPurchaseOutbox({
        purchaseType: 'cod_purchase',
        orderId: updated.id,
        eventTime: effectiveConfirmedAt,
        sourceType: 'COD_PHONE_CONFIRMED_TELEGRAM',
        sourceId: callback.id,
      });
      metaOutboxId = outbox.record.id;
      const dispatch = await requestMetaOutboxDispatch(metaOutboxId);
      if (!dispatch.queued) {
        console.error('COD Meta outbox dispatch failed:', dispatch.error);
      }
    } catch (outboxErr) {
      console.error('[TelegramCallback] Meta outbox creation/dispatch error:', outboxErr);
    }
  }

  if (!order.phoneConfirmedAt) {
    prisma.$transaction(async (tx) => {
      await recordProductLifecycleTransitionInTransaction(tx, order, updated);
    }).catch((metricErr) => {
      console.error('[TelegramCallback] recordProductLifecycleTransition error:', metricErr);
    });
  }

  if (!updated.isTest) {
    attributeVerifiedSearchConversionsForOrder(orderId, {
      source: 'cod_phone_confirmed_telegram',
    }).catch((err) => console.error('Telegram COD search conversion attribution failed:', err));

    enqueueGa4Purchase({ source: 'cod_phone_confirmed', orderId }).catch((err) =>
      console.error('COD GA4 Purchase queue enqueue failed:', err)
    );

    enqueueTikTokPurchase({ type: 'tiktok_cod_purchase', orderId }).catch((err) =>
      console.error('COD TikTok Purchase queue enqueue failed:', err)
    );
  }

  return {
    ok: true,
    status: 'SUCCESS',
    message: 'Phone confirmed.',
    orderNumber: updated.orderNumber,
    isTest: updated.isTest,
    shouldQueuePurchase: true,
    metaOutboxId,
  };
}

async function handlePhoneOff(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found', true);
    return { ok: false, status: 'NOT_FOUND', message: 'Order not found' };
  }

  const allowed = canTelegramPhoneOff(order);
  if (!allowed.ok) {
    await answerCallbackQuery(callback.id, allowed.reason, true);
    return {
      ok: false,
      status: 'BLOCKED',
      message: allowed.reason,
      orderNumber: order.orderNumber,
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      confirmationStatus: 'PHONE_OFF',
      confirmationNote: 'Marked phone off from Telegram.',
    },
  });

  await Promise.all([
    answerCallbackQuery(callback.id, '📵 Marked as Phone Off.'),
    editTelegramMessage(
      callback,
      `<b>📵 Phone Off</b>\n\nOrder: <b>#${escapeHtml(order.orderNumber)}</b>\nNo Purchase was sent.`
    ),
  ]);

  return {
    ok: true,
    status: 'SUCCESS',
    message: 'Marked as Phone Off.',
    orderNumber: order.orderNumber,
  };
}

async function handleCancel(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found', true);
    return { ok: false, status: 'NOT_FOUND', message: 'Order not found' };
  }

  const allowed = canTelegramCancel(order);
  if (!allowed.ok) {
    await answerCallbackQuery(callback.id, allowed.reason, true);
    return {
      ok: false,
      status: 'BLOCKED',
      message: allowed.reason,
      orderNumber: order.orderNumber,
    };
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CANCELLED',
      paymentStatus: order.paymentStatus === 'COMPLETED' ? order.paymentStatus : 'CANCELLED',
      cancelledAt: new Date(),
      confirmationStatus: 'CANCELLED_FROM_TELEGRAM',
      confirmationNote: 'Cancelled from Telegram before phone confirmation/dispatch.',
    },
    select: orderSelectFields(),
  });

  await Promise.all([
    answerCallbackQuery(callback.id, '❌ Order cancelled.'),
    editTelegramMessage(
      callback,
      `<b>❌ Order Cancelled</b>\n\nOrder: <b>#${escapeHtml(order.orderNumber)}</b>\nNo Purchase was sent.`
    ),
  ]);

  prisma.$transaction(async (tx) => {
    await reconcileOrderStockOnStatusTransition(tx, order.id, order.status, 'CANCELLED');
  }).catch((stockErr) => {
    console.error('[TelegramCallback] reconcileOrderStockOnStatusTransition error on cancel:', stockErr);
  });

  prisma.$transaction(async (tx) => {
    await recordProductLifecycleTransitionInTransaction(tx, order, updated);
  }).catch((metricErr) => {
    console.error('[TelegramCallback] recordProductLifecycleTransition error on cancel:', metricErr);
  });

  return {
    ok: true,
    status: 'SUCCESS',
    message: 'Order cancelled.',
    orderNumber: order.orderNumber,
  };
}

async function handlePathaoSend(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found', true);
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

  // Immediately acknowledge the tap & show "Booking Pathao..." so the user never needs a 2nd click
  await Promise.all([
    answerCallbackQuery(callback.id, '⏳ Booking Pathao delivery...'),
    editTelegramMessage(
      callback,
      `<b>⏳ Sending to Pathao...</b>\n\nOrder: <b>#${escapeHtml(order.orderNumber)}</b>\nPlease wait while consignment is created...`
    ),
  ]);

  const result = await createPathaoDeliveryForOrder(orderId, {
    preserveOrderStatus: false,
    saveFailureStatus: true,
  }).catch((error) => ({
    success: false as const,
    error: error instanceof Error ? error.message : 'Unknown Pathao error',
  }));

  if (!result.success) {
    const retryButtons = await buildCourierDispatchButtons(orderId, callback).catch(() => undefined);
    await editTelegramMessage(
      callback,
      `<b>\u26A0\uFE0F Pathao Dispatch Failed</b>\n\n` +
        `Order: <b>#${escapeHtml(order.orderNumber)}</b>\n` +
        `Error: <code>${escapeHtml(result.error)}</code>\n\n` +
        `Tap below to retry or send via Steadfast:`,
      retryButtons?.styledMarkup,
      retryButtons?.standardMarkup
    );
    return {
      ok: false,
      status: 'FAILED',
      message: result.error,
      orderNumber: order.orderNumber,
    };
  }

  const consignmentLine = result.consignmentId
    ? `Consignment: <b>${escapeHtml(result.consignmentId)}</b>\n`
    : '';
  const trackingLine = result.trackingCode
    ? `Tracking: <b>${escapeHtml(result.trackingCode)}</b>\n`
    : '';
  await editTelegramMessage(
    callback,
    `<b>✅ Pathao Dispatch ${result.alreadyDispatched ? 'Already Exists' : 'Created'}</b>\n\n` +
      `Order: <b>#${escapeHtml(result.orderNumber)}</b>\n` +
      `${consignmentLine}` +
      `${trackingLine}` +
      `Status: ${escapeHtml(result.pathaoStatus ?? 'BOOKED')}`
  );

  return {
    ok: true,
    status: 'SUCCESS',
    message: result.alreadyDispatched ? 'Already sent to Pathao' : 'Sent to Pathao',
    orderNumber: result.orderNumber,
  };
}

async function handleSteadfastSend(callback: TelegramCallbackQuery, orderId: string): Promise<TelegramActionResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: orderSelectFields() });
  if (!order) {
    await answerCallbackQuery(callback.id, 'Order not found', true);
    return { ok: false, status: 'NOT_FOUND', message: 'Order not found' };
  }

  const allowed = canTelegramSteadfastSend(order);
  if (!allowed.ok) {
    await answerCallbackQuery(callback.id, allowed.reason, true);
    return {
      ok: false,
      status: 'BLOCKED',
      message: allowed.reason,
      orderNumber: order.orderNumber,
    };
  }

  await Promise.all([
    answerCallbackQuery(callback.id, '\u23F3 Booking Steadfast delivery...'),
    editTelegramMessage(
      callback,
      `<b>\u23F3 Sending to Steadfast...</b>\n\nOrder: <b>#${escapeHtml(order.orderNumber)}</b>\nPlease wait while consignment is created...`
    ),
  ]);

  const result = await createSteadfastDeliveryForOrder(orderId, {
    actorId: `telegram:${callback.from.id}`,
  }).catch((error) => ({
    success: false as const,
    error: error instanceof Error ? error.message : 'Unknown Steadfast error',
  }));

  if (!result.success) {
    const retryButtons = await buildCourierDispatchButtons(orderId, callback).catch(() => undefined);
    await editTelegramMessage(
      callback,
      `<b>\u26A0\uFE0F Steadfast Dispatch Failed</b>\n\n` +
        `Order: <b>#${escapeHtml(order.orderNumber)}</b>\n` +
        `Error: <code>${escapeHtml(result.error)}</code>\n\n` +
        `Tap below to retry or send via Pathao:`,
      retryButtons?.styledMarkup,
      retryButtons?.standardMarkup
    );
    return {
      ok: false,
      status: 'FAILED',
      message: result.error,
      orderNumber: order.orderNumber,
    };
  }

  const consignmentLine = result.consignmentId
    ? `Consignment: <code>${escapeHtml(result.consignmentId)}</code>\n`
    : '';
  const trackingLine = result.trackingCode
    ? `Tracking: <code>${escapeHtml(result.trackingCode)}</code>\n`
    : '';
  const trackMarkup = result.trackingCode
    ? {
        inline_keyboard: [
          [
            {
              text: '\u{1F517} Track Steadfast',
              url: `https://steadfast.com.bd/t/${encodeURIComponent(result.trackingCode)}`,
            },
          ],
        ],
      }
    : undefined;

  await editTelegramMessage(
    callback,
    `<b>\u2705 Steadfast Dispatch ${result.alreadyDispatched ? 'Already Exists' : 'Created'}</b>\n\n` +
      `Order: <b>#${escapeHtml(result.orderNumber)}</b>\n` +
      `${consignmentLine}` +
      `${trackingLine}` +
      `Status: ${escapeHtml(result.steadfastStatus ?? 'in_review')}`,
    trackMarkup
  );

  return {
    ok: true,
    status: 'SUCCESS',
    message: result.alreadyDispatched ? 'Already sent to Steadfast' : 'Sent to Steadfast',
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
  if (action === TELEGRAM_ORDER_ACTIONS.STEADFAST_SEND) return handleSteadfastSend(callback, orderId);

  await answerCallbackQuery(callback.id, 'Unknown action');
  return { ok: false, status: 'FAILED' as const, message: 'Unknown action' };
}

export async function GET() {
  const info = await getTelegramWebhookInfo();
  return NextResponse.json({
    ok: true,
    service: 'telegram-order-callback',
    webhook: info,
  });
}

export async function POST(req: NextRequest) {
  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const callback = update?.callback_query;

  if (!callback) {
    const auth = requireTelegramWebhookAuth(req);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ ok: true, skipped: 'not_callback_query' });
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

  const tokenContextValid = isTelegramActionTokenContextValid(resolved.token, {
    telegramChatId: getCallbackChatId(callback),
    messageId: getCallbackMessageId(callback),
  });

  if (!tokenContextValid) {
    await answerCallbackQuery(callback.id, 'This action belongs to another Telegram message. Use the original order message.', true);
    await createTelegramLog({
      callback,
      action: 'TOKEN_CONTEXT_MISMATCH',
      orderId,
      status: 'BLOCKED',
      errorMessage: 'Telegram action token chat/message context mismatch',
    });
    return NextResponse.json({ ok: false, error: 'Telegram token context mismatch' }, { status: 409 });
  }

  if (!isTelegramOrderAction(action)) {
    await answerCallbackQuery(callback.id, 'Unknown action', true);
    await createTelegramLog({ callback, action, orderId, status: 'BLOCKED', errorMessage: 'Unknown Telegram action' });
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  const config = getTelegramOrderBotConfig();
  const callbackChatId = getCallbackChatId(callback);
  const isFromConfiguredChat = Boolean(
    config.chatId && callbackChatId && String(callbackChatId) === String(config.chatId)
  );
  const auth = requireTelegramWebhookAuth(req);
  const isHeaderAuthed = auth.ok;
  const isUserAllowed = assertTelegramUserAllowed(callback.from.id, config.adminUserIds);
  const isTrustedRequest = (resolved.ok && isFromConfiguredChat) || (isHeaderAuthed && isUserAllowed);

  if (!isTrustedRequest) {
    const reason = !isUserAllowed
      ? 'Unauthorized: Telegram user is not in the allowlist.'
      : 'Unauthorized Telegram webhook request.';
    await answerCallbackQuery(callback.id, reason, true);
    await createTelegramLog({
      callback,
      action,
      orderId,
      status: 'BLOCKED',
      errorMessage: reason,
    });
    return isHeaderAuthed ? telegramForbiddenResponse(reason) : telegramUnauthorizedResponse(reason);
  }

  const consumed = await consumeTelegramActionToken(resolved.token.id);
  if (!consumed) {
    await answerCallbackQuery(callback.id, 'Action already processed', false);
    await createTelegramLog({ callback, action, orderId, status: 'DUPLICATE', errorMessage: 'Token already consumed' });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let result: TelegramActionResult;
  try {
    result = await runTelegramOrderAction(callback, action, orderId);
  } catch (actionErr) {
    const errMsg = actionErr instanceof Error ? actionErr.message : String(actionErr);
    console.error(`[TelegramCallback] Unexpected error running action ${action}:`, actionErr);
    await releaseTelegramActionToken(resolved.token.id).catch(() => false);
    await answerCallbackQuery(callback.id, `Error: ${errMsg.slice(0, 140)}`, true);
    await createTelegramLog({
      callback,
      action,
      orderId,
      status: 'FAILED',
      errorMessage: errMsg,
    });
    return NextResponse.json(
      { ok: false, error: errMsg },
      { status: 500 }
    );
  }

  await createTelegramLog({
    callback,
    action,
    orderId,
    status: result.status,
    errorMessage: result.ok ? null : result.message,
  });

  const status = result.ok
    ? 200
    : result.status === 'NOT_FOUND'
      ? 404
      : result.status === 'BLOCKED'
        ? 409
        : result.status === 'FAILED'
          ? 200
          : 500;

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
