import 'server-only';

import { normalizeBangladeshPhoneNumber } from '@/lib/phone';

const DEFAULT_QSMS_BASE_URL = 'https://api.qsms.com.bd/v1';
const QSMS_TIMEOUT_MS = 8_000;

export type QsmsSendResult =
  | { ok: true; messageId?: string; sandbox?: boolean }
  | { ok: false; error: string; statusCode?: number };

export function getQsmsConfig() {
  const baseUrl = (process.env.QSMS_BASE_URL?.trim() || DEFAULT_QSMS_BASE_URL).replace(/\/+$/, '');
  const apiKey = process.env.QSMS_API_KEY?.trim() || '';
  const apiSecret = process.env.QSMS_API_SECRET?.trim() || '';
  const senderId = process.env.QSMS_SENDER_ID?.trim() || '';

  return {
    baseUrl,
    apiKey,
    apiSecret,
    senderId,
    configured: Boolean(apiKey),
  };
}

export function isQsmsConfigured(): boolean {
  return getQsmsConfig().configured;
}

/**
 * Formats normalized BD local mobile "01712345678" -> "8801712345678" per QSMS API spec.
 */
export function formatQsmsRecipient(phone: string): string | null {
  const normalized = normalizeBangladeshPhoneNumber(phone);
  if (!normalized) return null;
  return `88${normalized}`;
}

export async function sendQsmsMessage(params: {
  phone: string;
  message: string;
  type?: 'plain' | 'unicode';
}): Promise<QsmsSendResult> {
  const config = getQsmsConfig();
  if (!config.configured) {
    return { ok: false, error: 'QSMS_API_KEY is not configured' };
  }

  const recipient = formatQsmsRecipient(params.phone);
  if (!recipient) {
    return { ok: false, error: 'Invalid Bangladesh mobile number' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QSMS_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': config.apiKey,
    };
    if (config.apiSecret) {
      headers['X-API-SECRET'] = config.apiSecret;
    }

    const payload: Record<string, string> = {
      recipient,
      type: params.type ?? 'plain',
      message: params.message,
    };
    if (config.senderId) {
      payload.sender_id = config.senderId;
    }

    const res = await fetch(`${config.baseUrl}/sms/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok) {
      const apiMsg =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        `QSMS HTTP ${res.status}`;
      console.error('[QSMS] SMS dispatch failed:', res.status, apiMsg);
      return { ok: false, error: apiMsg, statusCode: res.status };
    }

    if (
      data &&
      (data.success === false ||
        String(data.status ?? '').toLowerCase() === 'error' ||
        String(data.status ?? '').toLowerCase() === 'failed')
    ) {
      const apiMsg =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        'QSMS rejected the SMS request';
      console.error('[QSMS] Provider rejected SMS:', apiMsg);
      return { ok: false, error: apiMsg, statusCode: res.status };
    }

    const nested =
      data?.data && typeof data.data === 'object'
        ? (data.data as Record<string, unknown>)
        : undefined;
    const messageIdRaw =
      nested?.message_id ?? nested?.id ?? data?.message_id ?? data?.id;
    const sandbox = Boolean(
      data?.sandbox || nested?.sandbox || String(data?.mode ?? '').toLowerCase() === 'sandbox'
    );

    return {
      ok: true,
      messageId: messageIdRaw != null ? String(messageIdRaw) : undefined,
      sandbox,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const msg = isAbort ? 'SMS gateway timed out' : err instanceof Error ? err.message : 'SMS dispatch error';
    console.error('[QSMS] Request exception:', msg);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}
