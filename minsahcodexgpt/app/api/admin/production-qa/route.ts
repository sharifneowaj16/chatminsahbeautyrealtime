import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { buildProductionQaSnapshot } from '@/lib/tracking/production-qa';

export const dynamic = 'force-dynamic';

function parseWindowHours(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('hours');
  const parsed = raw ? Number.parseInt(raw, 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

async function requireSuperAdmin(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) {
    return { response: adminUnauthorizedResponse() };
  }

  if (admin.role !== 'SUPER_ADMIN') {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Production QA deploy gate is restricted to SUPER_ADMIN users.' },
        { status: 403 }
      ),
    };
  }

  return { response: null };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  const snapshot = await buildProductionQaSnapshot({ windowHours: parseWindowHours(request) });

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}
