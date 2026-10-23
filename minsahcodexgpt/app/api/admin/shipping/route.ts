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

    const { searchParams } = new URL(request.url);
    const courierFilter = searchParams.get('courier') || 'All';
    const statusFilter = searchParams.get('status') || 'All';

    const ordersDb = await prisma.order.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        shippingAddress: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            verifiedPhone: true,
          },
        },
      },
    });

    const shipments = ordersDb.map((o) => {
      let courier: 'Steadfast' | 'Pathao' = 'Steadfast';
      let consignmentId = o.steadfastConsignmentId || o.steadfastTrackingCode || o.trackingNumber;

      if (o.pathaoConsignmentId || o.pathaoTrackingCode) {
        courier = 'Pathao';
        consignmentId = o.pathaoConsignmentId || o.pathaoTrackingCode;
      }

      if (!consignmentId) {
        consignmentId = `CN-${o.id.slice(-6).toUpperCase()}`;
      }

      let statusDisplay: 'Pending Dispatch' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Returned' = 'Pending Dispatch';
      const rawStatus = (o.courierStatus || o.steadfastStatus || o.pathaoStatus || o.status || '').toLowerCase();

      if (rawStatus.includes('deliver') || rawStatus === 'completed') {
        statusDisplay = 'Delivered';
      } else if (rawStatus.includes('return') || rawStatus.includes('rto')) {
        statusDisplay = 'Returned';
      } else if (rawStatus.includes('transit') || rawStatus.includes('shipped')) {
        statusDisplay = 'In Transit';
      } else if (rawStatus.includes('out') || rawStatus.includes('courier')) {
        statusDisplay = 'Out for Delivery';
      }

      const district = o.shippingAddress?.city || o.shippingAddress?.state || o.shippingAddress?.street1 || 'Dhaka';

      const customerName = o.user
        ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() || 'Verified Customer'
        : 'Customer';

      const phone = o.user?.verifiedPhone || o.user?.phone || o.shippingAddress?.phone || '01700-000000';

      return {
        orderId: `#ORD-${o.orderNumber || o.id.slice(-4)}`,
        dbId: o.id,
        customer: customerName,
        phone,
        district,
        courier,
        consignmentId,
        weight: '0.8 kg',
        codAmount: Number(o.total),
        status: statusDisplay,
        createdAt: o.createdAt.toISOString().replace('T', ' ').substring(0, 16),
      };
    });

    const counts = {
      pending: shipments.filter((s) => s.status === 'Pending Dispatch').length,
      inTransit: shipments.filter((s) => s.status === 'In Transit' || s.status === 'Out for Delivery').length,
      delivered: shipments.filter((s) => s.status === 'Delivered').length,
      returned: shipments.filter((s) => s.status === 'Returned').length,
      total: shipments.length,
    };

    return NextResponse.json({
      success: true,
      shipments,
      counts,
    });
  } catch (error) {
    console.error('GET /api/admin/shipping error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
