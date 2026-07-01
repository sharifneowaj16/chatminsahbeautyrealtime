import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AdminPermission } from '@/lib/auth/admin-permissions';
import {
  adminHasPermission,
  getVerifiedAdmin as getVerifiedAdminFromRequest,
  type VerifiedAdmin,
} from '@/lib/auth/admin-request';

export {
  adminHasPermission,
  getVerifiedAdminFromRequest as getVerifiedAdmin,
  type VerifiedAdmin,
};

export function adminUnauthorizedResponse(message = 'Invalid or expired admin token') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function adminForbiddenResponse(message = 'Admin permission denied') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type AdminGuardResult =
  | { admin: VerifiedAdmin; response: null }
  | { admin: null; response: NextResponse };

export async function requireAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return { admin: null, response: adminUnauthorizedResponse() };
  }
  return { admin, response: null };
}

export async function requireSuperAdmin(
  request: NextRequest,
  message = 'This admin action is restricted to SUPER_ADMIN users.'
): Promise<AdminGuardResult> {
  const result = await requireAdmin(request);
  if (result.response) return result;

  if (result.admin.role !== 'SUPER_ADMIN') {
    return { admin: null, response: adminForbiddenResponse(message) };
  }

  return result;
}

export async function requireAdminPermission(
  request: NextRequest,
  permission: AdminPermission,
  options: { allowSuperAdmin?: boolean; message?: string } = {}
): Promise<AdminGuardResult> {
  const { allowSuperAdmin = true, message } = options;
  const result = await requireAdmin(request);
  if (result.response) return result;

  const isSuperAdmin = result.admin.role === 'SUPER_ADMIN';
  if (allowSuperAdmin && isSuperAdmin) {
    return result;
  }

  if (!adminHasPermission(result.admin, permission)) {
    return {
      admin: null,
      response: adminForbiddenResponse(
        message || `Missing required admin permission: ${permission}`
      ),
    };
  }

  return result;
}

export function parseNonNegativeInt(value: unknown, fallback = 0) {
  const parsed = parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function parseMoney(value: unknown, label: string) {
  const parsed = Number.parseFloat(String(value));
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
}

export function escapeLikeInput(value: string) {
  return value.replace(/[%_]/g, '\\$&');
}
