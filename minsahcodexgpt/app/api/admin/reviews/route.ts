import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        product: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const formatted = reviews.map((r) => {
      const productName = r.product?.name || 'Unknown Product';
      const customerName =
        [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') ||
        r.user?.email ||
        'Anonymous';
      const status = r.isApproved ? 'approved' : 'pending';

      return {
        id: r.id,
        product: productName,
        customer: customerName,
        rating: r.rating,
        title: r.title || 'Review',
        content: r.comment || '',
        status,
        createdAt: r.createdAt.toISOString().slice(0, 10),
      };
    });

    return NextResponse.json({ reviews: formatted });
  } catch (error) {
    console.error('Admin reviews GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
