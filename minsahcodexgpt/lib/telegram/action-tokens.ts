import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

export const TELEGRAM_CALLBACK_PREFIX = 't:' as const;
export const TELEGRAM_ACTION_TOKEN_TTL_MINUTES = 7 * 24 * 60;
export const TELEGRAM_ACTION_TOKEN_CLEANUP_GRACE_DAYS = 14;

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

  const tokenRow = await prisma.telegramActionToken.create({
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
    tokenId: tokenRow.id,
    callbackData: buildTelegramCallbackData(token),
    expiresAt,
  };
}


export async function attachTelegramActionTokenContext(params: {
  tokenIds: string[];
  telegramChatId?: string | number | null;
  messageId?: string | number | null;
}) {
  const tokenIds = Array.from(new Set(params.tokenIds.filter(Boolean)));
  if (!tokenIds.length) return 0;

  const result = await prisma.telegramActionToken.updateMany({
    where: {
      id: { in: tokenIds },
      consumedAt: null,
    },
    data: {
      telegramChatId: params.telegramChatId == null ? null : String(params.telegramChatId),
      messageId: params.messageId == null ? null : String(params.messageId),
    },
  });

  return result.count;
}

export function isTelegramActionTokenContextValid(
  token: { telegramChatId?: string | null; messageId?: string | null },
  context: { telegramChatId?: string | number | null; messageId?: string | number | null }
) {
  const expectedChatId = token.telegramChatId == null ? null : String(token.telegramChatId);
  const actualChatId = context.telegramChatId == null ? null : String(context.telegramChatId);
  const expectedMessageId = token.messageId == null ? null : String(token.messageId);
  const actualMessageId = context.messageId == null ? null : String(context.messageId);

  if (expectedChatId && expectedChatId !== actualChatId) return false;
  if (expectedMessageId && expectedMessageId !== actualMessageId) return false;

  return true;
}

export async function cleanupExpiredTelegramActionTokens(params?: {
  before?: Date;
  limit?: number;
}) {
  const now = params?.before ?? new Date();
  const retentionCutoff = new Date(
    now.getTime() - TELEGRAM_ACTION_TOKEN_CLEANUP_GRACE_DAYS * 24 * 60 * 60 * 1000
  );
  const limit = Math.max(1, Math.min(params?.limit ?? 1000, 5000));

  const rows = await prisma.telegramActionToken.findMany({
    where: {
      OR: [
        { expiresAt: { lt: retentionCutoff } },
        { consumedAt: { not: null, lt: retentionCutoff } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  if (!rows.length) return 0;

  const result = await prisma.telegramActionToken.deleteMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });

  return result.count;
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

export async function releaseTelegramActionToken(tokenId: string) {
  const result = await prisma.telegramActionToken.updateMany({
    where: {
      id: tokenId,
      consumedAt: { not: null },
    },
    data: {
      consumedAt: null,
    },
  });

  return result.count === 1;
}
