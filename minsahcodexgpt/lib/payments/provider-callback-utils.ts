import { NextRequest } from 'next/server';

export type CallbackFields = Record<string, string>;

const BODY_READ_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export async function readProviderCallbackFields(request: NextRequest): Promise<CallbackFields> {
  const fields: CallbackFields = {};

  request.nextUrl.searchParams.forEach((value, key) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      fields[key] = String(value).trim();
    }
  });

  if (!BODY_READ_METHODS.has(request.method.toUpperCase())) {
    return fields;
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as unknown;
      if (body && typeof body === 'object') {
        for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
          if (value !== undefined && value !== null && String(value).trim()) {
            fields[key] = String(value).trim();
          }
        }
      }
      return fields;
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData().catch(() => null);
      if (form) {
        form.forEach((value, key) => {
          const str = typeof value === 'string' ? value : value.name;
          if (str && str.trim()) fields[key] = str.trim();
        });
      }
      return fields;
    }

    const text = await request.text().catch(() => '');
    if (!text.trim()) return fields;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (value !== undefined && value !== null && String(value).trim()) {
            fields[key] = String(value).trim();
          }
        }
        return fields;
      }
    } catch {
      // Fall through to URLSearchParams parser.
    }

    const params = new URLSearchParams(text);
    params.forEach((value, key) => {
      if (value && value.trim()) fields[key] = value.trim();
    });
  } catch {
    // Keep query params only; provider callbacks should fail safe.
  }

  return fields;
}

export function firstField(fields: CallbackFields, keys: string[]): string {
  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString().replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeGatewayStatus(value: unknown): 'paid' | 'cancelled' | 'failed' | 'pending' | 'unknown' {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (
    ['success', 'successful', 'completed', 'complete', 'paid', 'validated', 'approved', 'settled'].includes(normalized)
  ) {
    return 'paid';
  }

  if (['cancel', 'cancelled', 'canceled', 'usercancel', 'user_cancel', 'aborted'].includes(normalized)) {
    return 'cancelled';
  }

  if (['failure', 'failed', 'fail', 'declined', 'rejected', 'expired', 'timeout', 'error'].includes(normalized)) {
    return 'failed';
  }

  if (['pending', 'processing', 'initiated', 'created', 'authorized'].includes(normalized)) {
    return 'pending';
  }

  return normalized ? 'unknown' : 'unknown';
}

export function pickPaidAt(value: unknown): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
