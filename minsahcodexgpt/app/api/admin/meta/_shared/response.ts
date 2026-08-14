import { NextResponse } from 'next/server';
import { MetaBusinessApiError } from '@/lib/meta-business/sdk';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';

export function metaErrorResponse(error: unknown) {
  if (error instanceof MetaBusinessApiError) {
    return NextResponse.json(
      {
        error: error.message,
        meta: {
          code: error.code ?? null,
          subcode: error.subcode ?? null,
          traceId: error.traceId ?? null,
        },
      },
      { status: error.status && error.status >= 400 ? error.status : 502 }
    );
  }
  const message = error instanceof Error ? error.message : 'Meta Business operation failed';
  const status = /Missing Meta configuration|required|invalid/i.test(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonObject(request: Request) {
  const value = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON object body is required');
  }
  return value as Record<string, unknown>;
}

export function requiredString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}


export function metaAdminActionErrorResponse(error: unknown) {
  if (error instanceof MetaAdminActionError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }
  const rawMessage = error instanceof Error ? error.message : 'Meta admin action failed';
  const row = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown } : {};
  const safe = redactMetaAdminData({ message: rawMessage }) as { message?: unknown };
  const message = typeof safe.message === 'string' ? safe.message : 'Meta admin action failed';
  const explicitStatus = typeof row.status === 'number' && row.status >= 400 && row.status <= 599 ? row.status : null;
  const status = explicitStatus ?? (/required|invalid|not found|already|expired|mismatch/i.test(rawMessage) ? 400 : 500);
  const code = typeof row.code === 'string' && /^[A-Z][A-Z0-9_]{1,95}$/.test(row.code) ? row.code : undefined;
  return NextResponse.json({ ok: false, error: message, ...(code ? { code } : {}) }, { status });
}
