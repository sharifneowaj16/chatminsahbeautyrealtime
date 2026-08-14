import 'server-only';
import { safeMetaConnectionError } from './errors';
import type { MetaGraphClient } from './client';
import type { MetaPermissionHealth } from './types';

type PermissionRow = { permission?: string; status?: string };

export async function checkMetaPermissions(input: {
  client: MetaGraphClient;
  required: string[];
  tokenScopes?: string[];
}): Promise<MetaPermissionHealth> {
  const required = [...new Set(input.required.map((value) => value.trim()).filter(Boolean))].sort();
  try {
    const payload = await input.client.get<{ data?: PermissionRow[] }>('/me/permissions', { limit: 200 });
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const grantedFromApi = rows.filter((row) => row.status === 'granted' && row.permission).map((row) => String(row.permission));
    const declined = rows.filter((row) => row.status !== 'granted' && row.permission).map((row) => String(row.permission));
    const granted = [...new Set([...grantedFromApi, ...(input.tokenScopes ?? [])])].sort();
    const missing = required.filter((permission) => !granted.includes(permission));
    return { checked: true, required, granted, declined: [...new Set(declined)].sort(), missing, ok: missing.length === 0 };
  } catch (error) {
    const safe = safeMetaConnectionError(error, 'META_PERMISSION_CHECK_FAILED');
    const granted = [...new Set(input.tokenScopes ?? [])].sort();
    const missing = required.filter((permission) => !granted.includes(permission));
    return {
      checked: false,
      required,
      granted,
      declined: [],
      missing,
      ok: false,
      error: { code: safe.code, message: safe.message },
    };
  }
}
