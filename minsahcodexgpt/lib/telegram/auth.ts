import 'server-only';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type TelegramAuthSuccess = {
  ok: true;
  adminUserIds: Set<string>;
};

type TelegramAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type TelegramAuthResult = TelegramAuthSuccess | TelegramAuthFailure;

export function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function splitCsv(value?: string | null) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getTelegramAdminUserIds() {
  return new Set(splitCsv(process.env.TELEGRAM_ADMIN_USER_IDS));
}

export function getTelegramOrderBotConfig() {
  const relayBase = process.env.TELEGRAM_RELAY_BASE?.trim() || 'https://api.telegram.org/bot';
  const botToken = process.env.TELEGRAM_ORDER_BOT_TOKEN?.trim() || '';
  const chatId = process.env.TELEGRAM_ORDER_CHAT_ID?.trim() || '';
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '';
  const adminUserIds = getTelegramAdminUserIds();

  return {
    relayBase,
    botToken,
    chatId,
    webhookSecret,
    adminUserIds,
  };
}

export function validateTelegramProductionConfig() {
  const config = getTelegramOrderBotConfig();
  const missing: string[] = [];

  if (!config.botToken) missing.push('TELEGRAM_ORDER_BOT_TOKEN');
  if (!config.chatId) missing.push('TELEGRAM_ORDER_CHAT_ID');
  if (!config.webhookSecret) missing.push('TELEGRAM_WEBHOOK_SECRET');
  if (!config.adminUserIds.size) missing.push('TELEGRAM_ADMIN_USER_IDS');

  return {
    ok: missing.length === 0,
    missing,
    config,
  };
}

export function telegramMisconfiguredResponse(missing: string[]) {
  return NextResponse.json(
    {
      ok: false,
      error: 'Telegram order bot is not configured for production callbacks.',
      missing,
    },
    { status: 503 }
  );
}

export function telegramUnauthorizedResponse(message = 'Unauthorized Telegram webhook') {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function telegramForbiddenResponse(message = 'Telegram user is not allowed to perform order actions') {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export function requireTelegramWebhookAuth(request: NextRequest): TelegramAuthResult {
  const validation = validateTelegramProductionConfig();
  const production = isProductionRuntime();

  if (production && !validation.ok) {
    return {
      ok: false,
      response: telegramMisconfiguredResponse(validation.missing),
    };
  }

  if (validation.config.webhookSecret) {
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretHeader !== validation.config.webhookSecret) {
      return {
        ok: false,
        response: telegramUnauthorizedResponse(),
      };
    }
  } else if (production) {
    return {
      ok: false,
      response: telegramMisconfiguredResponse(['TELEGRAM_WEBHOOK_SECRET']),
    };
  }

  if (!validation.config.adminUserIds.size && production) {
    return {
      ok: false,
      response: telegramMisconfiguredResponse(['TELEGRAM_ADMIN_USER_IDS']),
    };
  }

  return {
    ok: true,
    adminUserIds: validation.config.adminUserIds,
  };
}

export function assertTelegramUserAllowed(userId: number | string, allowedUserIds: Set<string>) {
  if (!allowedUserIds.size) {
    return !isProductionRuntime();
  }

  return allowedUserIds.has(String(userId));
}
