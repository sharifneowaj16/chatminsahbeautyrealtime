import { NextResponse } from 'next/server';
export {
  getVerifiedAdmin,
  type VerifiedAdmin,
} from '@/lib/auth/admin-request';

export function adminUnauthorizedResponse() {
  return NextResponse.json({ error: 'Invalid or expired admin token' }, { status: 401 });
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
