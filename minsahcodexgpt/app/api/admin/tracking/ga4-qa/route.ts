import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { buildGa4QaSnapshot } from '@/lib/tracking/ga4-qa';

function parseWindowHours(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('hours');
  const parsed = raw ? Number.parseInt(raw, 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 90);
}

async function requireSuperAdmin(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  if (admin.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'GA4 QA is restricted to SUPER_ADMIN users.' },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request);
  if (denied) return denied;

  const snapshot = await buildGa4QaSnapshot({ windowHours: parseWindowHours(request) });
  return NextResponse.json({ ok: true, snapshot });
}
