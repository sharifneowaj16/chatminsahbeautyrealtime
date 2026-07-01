import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

export const TELEGRAM_CALLBACK_PREFIX = 't:' as const;
export const TELEGRAM_ACTION_TOKEN_TTL_MINUTES = 7 * 24 * 60;

export const TELEGRAM_ORDER_ACTIONS = {
  PHONE_CONFIRM: 'PHONE_CONFIRM',
  PHONE_OFF: 'PHONE_OFF',
  CANCEL: 'CANCEL',
  PATHAO_SEND: 'PATHAO_SEND',
} as const;

export type TelegramOrderAction =
  (typeof TELEGRAM_ORDER_ACTIONS)[keyof typeof TELEGRAM_ORDER_ACTIONS];

type CreateTelegramActionTokenParams = {
  action: TelegramOrderAction;
  orderId: string;
  telegramChatId?: string | number | null;
  messageId?: string | number | null;
  expiresInMinutes?: number;
};

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomCallbackToken() {
  return crypto.randomBytes(18).toString('base64url');
}

function normalizeToken(token: string) {
  return token.trim();
}

export function buildTelegramCallbackData(rawToken: string) {
  return `${TELEGRAM_CALLBACK_PREFIX}${rawToken}`;
}

export function parseTelegramCallbackToken(callbackData?: string | null) {
  const data = String(callbackData ?? '').trim();
  if (!data.startsWith(TELEGRAM_CALLBACK_PREFIX)) return null;

  const token = data.slice(TELEGRAM_CALLBACK_PREFIX.length).trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;

  return token;
}

export async function createTelegramActionToken(params: CreateTelegramActionTokenParams) {
  const token = randomCallbackToken();
  const expiresInMinutes = Math.max(1, params.expiresInMinutes ?? TELEGRAM_ACTION_TOKEN_TTL_MINUTES);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.telegramActionToken.create({
    data: {
      tokenHash: sha256(normalizeToken(token)),
      action: params.action,
      orderId: params.orderId,
      telegramChatId: params.telegramChatId == null ? null : String(params.telegramChatId),
      messageId: params.messageId == null ? null : String(params.messageId),
      expiresAt,
    },
  });

  return {
    token,
    callbackData: buildTelegramCallbackData(token),
    expiresAt,
  };
}

export async function resolveTelegramActionToken(rawToken: string) {
  const tokenHash = sha256(normalizeToken(rawToken));
  const token = await prisma.telegramActionToken.findUnique({
    where: { tokenHash },
  });

  if (!token) {
    return { ok: false as const, code: 'TOKEN_NOT_FOUND', message: 'Invalid Telegram action token' };
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, code: 'TOKEN_EXPIRED', message: 'Telegram action expired' };
  }

  if (token.consumedAt) {
    return { ok: false as const, code: 'TOKEN_CONSUMED', message: 'Telegram action already used' };
  }

  return {
    ok: true as const,
    token,
  };
}

export async function consumeTelegramActionToken(tokenId: string) {
  const result = await prisma.telegramActionToken.updateMany({
    where: {
      id: tokenId,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  return result.count === 1;
}
