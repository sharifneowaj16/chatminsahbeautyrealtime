import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { buildPrivacyCatalogQaSnapshot } from '@/lib/tracking/privacy-catalog-qa';

function parseLimit(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('limit');
  const parsed = raw ? Number.parseInt(raw, 10) : 50;
  if (Number.isNaN(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

async function requireSuperAdmin(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  if (admin.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Privacy/catalog QA is restricted to SUPER_ADMIN users.' },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request);
  if (denied) return denied;

  const snapshot = await buildPrivacyCatalogQaSnapshot({ limit: parseLimit(request) });
  return NextResponse.json({ ok: true, snapshot });
}
