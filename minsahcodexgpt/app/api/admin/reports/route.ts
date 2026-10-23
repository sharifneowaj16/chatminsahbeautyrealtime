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
    const type = searchParams.get('type') || 'summary';

    if (type === 'sales-csv') {
      const orders = await prisma.order.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
        select: {
          orderNumber: true,
          total: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
        },
      });

      let csv = 'Order Number,Total,Status,Payment Method,Payment Status,Date\n';
      for (const o of orders) {
        csv += `"${o.orderNumber || ''}",${Number(o.total)},"${o.status}","${o.paymentMethod || ''}","${o.paymentStatus || ''}","${o.createdAt.toISOString()}"\n`;
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales_report_${Date.now()}.csv"`,
        },
      });
    }

    // Default: summary metrics
    const [ordersCount, totalRevenue, productsCount, customersCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        ordersCount,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        productsCount,
        customersCount,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
