import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const config = await prisma.siteConfig.findUnique({
      where: { key: 'TAX_VAT_CONFIG' },
    });

    return NextResponse.json({
      success: true,
      config: config?.value || null,
    });
  } catch (error) {
    console.error('GET /api/admin/tax-settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const config = await prisma.siteConfig.upsert({
      where: { key: 'TAX_VAT_CONFIG' },
      update: { value: body },
      create: { key: 'TAX_VAT_CONFIG', value: body },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('POST /api/admin/tax-settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
