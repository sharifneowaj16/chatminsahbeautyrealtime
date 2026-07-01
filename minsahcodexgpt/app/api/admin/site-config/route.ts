import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { requireAdminPermission } from '@/app/api/admin/_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/site-config?key=homeSections
export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_VIEW);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const config = await prisma.siteConfig.findUnique({ where: { key } });

    if (!config) {
      return NextResponse.json({ value: null });
    }

    return NextResponse.json({ value: config.value });
  } catch (error) {
    console.error('Error fetching site config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

// PUT /api/admin/site-config
// Body: { key: string, value: any }
export async function PUT(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_EDIT);
  if (response) return response;

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error saving site config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
