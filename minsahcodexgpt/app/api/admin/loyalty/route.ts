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

    const [usersWithPoints, configDoc] = await Promise.all([
      prisma.user.findMany({
        where: { loyaltyPoints: { gte: 0 } },
        orderBy: { loyaltyPoints: 'desc' },
        take: 50,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          verifiedPhone: true,
          loyaltyPoints: true,
          updatedAt: true,
          orders: {
            where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
            select: { total: true },
          },
        },
      }),
      prisma.siteConfig.findUnique({
        where: { key: 'LOYALTY_PROGRAM_CONFIG' },
      }),
    ]);

    const members = usersWithPoints.map((u) => {
      const lifetimeSpent = u.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const points = u.loyaltyPoints || 0;
      let tier: 'Gold' | 'Silver' | 'Bronze' = 'Bronze';
      if (points >= 3000) tier = 'Gold';
      else if (points >= 1500) tier = 'Silver';

      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Registered Member';

      return {
        id: `MEM-${u.id.slice(-4).toUpperCase()}`,
        dbId: u.id,
        name: fullName,
        phone: u.verifiedPhone || u.phone || 'N/A',
        tier,
        points,
        lifetimeSpent,
        lastActivity: `Active member balance (${points} pts)`,
      };
    });

    const totalPoints = members.reduce((sum, m) => sum + m.points, 0);

    return NextResponse.json({
      success: true,
      members,
      config: configDoc?.value || {
        pointsPer100: 10,
        minRedemption: 500,
      },
      stats: {
        totalPointsInCirculation: totalPoints,
        goldCount: members.filter((m) => m.tier === 'Gold').length,
        silverCount: members.filter((m) => m.tier === 'Silver').length,
        bronzeCount: members.filter((m) => m.tier === 'Bronze').length,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/loyalty error:', error);
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
    const { action } = body;

    if (action === 'ADJUST_POINTS') {
      const { userId, delta } = body;
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: { increment: Number(delta || 0) },
        },
        select: { id: true, loyaltyPoints: true },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'SAVE_RULES') {
      const { pointsPer100, minRedemption } = body;
      const config = await prisma.siteConfig.upsert({
        where: { key: 'LOYALTY_PROGRAM_CONFIG' },
        update: { value: { pointsPer100, minRedemption } },
        create: { key: 'LOYALTY_PROGRAM_CONFIG', value: { pointsPer100, minRedemption } },
      });
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/loyalty error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
