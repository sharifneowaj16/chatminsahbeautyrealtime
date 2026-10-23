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

    const giftRequestsDb = await prisma.giftRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        sender: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    const requests = giftRequestsDb.map((g) => {
      let statusDisplay: 'Pending Packaging' | 'Packed' | 'Dispatched' = 'Pending Packaging';
      const statusUpper = String(g.status).toUpperCase();
      if (statusUpper === 'FULFILLED' || statusUpper === 'ACCEPTED') {
        statusDisplay = 'Dispatched';
      } else if (statusUpper === 'ORDERED' || statusUpper === 'VIEWED') {
        statusDisplay = 'Packed';
      }

      return {
        id: `GFT-${g.id.slice(-4).toUpperCase()}`,
        dbId: g.id,
        token: g.token,
        orderId: g.orderedAt ? `#ORD-${g.id.slice(-4)}` : `#REQ-${g.token.slice(0, 6)}`,
        recipientName: g.recipientName,
        recipientPhone: g.requesterPhone || g.senderPhone || '01700-000000',
        occasion: g.giftType === 'SEND_GIFT' ? 'Surprise Gift' : 'Special Request',
        message: g.message || 'Enjoy your exclusive Minsah Beauty skincare gift!',
        boxStyle: 'Luxury Velvet Rose Box with Gold Foil Ribbon',
        status: statusDisplay,
        productName: g.product?.name || 'Skincare Gift Set',
        productPrice: Number(g.product?.price || 0),
        expiresAt: g.expiresAt.toISOString().split('T')[0],
      };
    });

    const stats = {
      totalRequests: requests.length,
      pendingCount: requests.filter((r) => r.status === 'Pending Packaging').length,
      packedCount: requests.filter((r) => r.status === 'Packed').length,
      dispatchedCount: requests.filter((r) => r.status === 'Dispatched').length,
    };

    return NextResponse.json({
      success: true,
      requests,
      stats,
    });
  } catch (error) {
    console.error('GET /api/admin/gifts error:', error);
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
    const { action, id, status } = body;

    if (action === 'UPDATE_STATUS' && id) {
      const updated = await prisma.giftRequest.update({
        where: { id },
        data: {
          status: status || 'FULFILLED',
        },
      });
      return NextResponse.json({ success: true, giftRequest: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/gifts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
