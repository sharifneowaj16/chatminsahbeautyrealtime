import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { sendMetaCapiRefund } from '@/lib/tracking/meta-capi-refund';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_access_token')?.value;
  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized: admin access token required' }, { status: 401 });
  }

  const verified = await verifyAdminAccessToken(adminToken);
  if (!verified) {
    return NextResponse.json({ error: 'Forbidden: invalid admin session' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || '').trim();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const result = await sendMetaCapiRefund({
      orderId,
      source: 'manual_admin',
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason || 'Failed to emit Meta CAPI refund',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      skipped: result.skipped ?? false,
      reason: result.reason,
      eventId: result.eventId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
