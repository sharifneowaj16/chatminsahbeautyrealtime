import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/customers
// Query params: search, status, role, sortBy, sortOrder, page, limit
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

    const { searchParams } = new URL(request.url);
    const search    = searchParams.get('search') || '';
    const status    = searchParams.get('status') || '';   // ACTIVE | SUSPENDED | BANNED
    const role      = searchParams.get('role') || '';     // CUSTOMER | ADMIN etc.
    const sortBy    = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip      = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status.toUpperCase() as Prisma.UserWhereInput['status'];
    }

    if (role) {
      where.role = role.toUpperCase() as Prisma.UserWhereInput['role'];
    }

    if (search) {
      where.OR = [
        { email:     { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { phone:     { contains: search } },
      ];
    }

    // Allowed sort fields
    const allowedSortFields: Record<string, Prisma.UserOrderByWithRelationInput> = {
      createdAt:    { createdAt: sortOrder },
      lastLoginAt:  { lastLoginAt: sortOrder },
      email:        { email: sortOrder },
      firstName:    { firstName: sortOrder },
      loyaltyPoints:{ loyaltyPoints: sortOrder },
      totalOrders:  { orders: { _count: sortOrder } },
    };
    const orderBy = allowedSortFields[sortBy] || { createdAt: 'desc' };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id:           true,
          firstName:    true,
          lastName:     true,
          email:        true,
          phone:        true,
          avatar:       true,
          role:         true,
          status:       true,
          loyaltyPoints:true,
          createdAt:    true,
          lastLoginAt:  true,
          newsletter:   true,
          smsNotifications: true,
          _count: {
            select: { orders: true },
          },
          orders: {
            select: { total: true },
          },
          addresses: {
            take: 1,
            where: { isDefault: true },
            select: { city: true, state: true, country: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Shape response
    const customers = users.map((u) => {
      const totalSpent = u.orders.reduce(
        (sum, o) => sum + parseFloat(o.total.toString()),
        0
      );
      const avgOrderValue =
        u._count.orders > 0 ? totalSpent / u._count.orders : 0;

      return {
        id:               u.id,
        name:             [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        email:            u.email,
        phone:            u.phone,
        avatar:           u.avatar,
        role:             u.role,
        status:           u.status.toLowerCase(),
        loyaltyPoints:    u.loyaltyPoints,
        joinDate:         u.createdAt.toISOString(),
        lastLogin:        u.lastLoginAt?.toISOString() ?? null,
        totalOrders:      u._count.orders,
        totalSpent:       parseFloat(totalSpent.toFixed(2)),
        averageOrderValue:parseFloat(avgOrderValue.toFixed(2)),
        address: u.addresses[0] ?? null,
        marketing: {
          emailConsent: u.newsletter,
          smsConsent:   u.smsNotifications,
        },
      };
    });

    if (sortBy === 'totalSpent') {
      customers.sort((a, b) =>
        sortOrder === 'desc' ? b.totalSpent - a.totalSpent : a.totalSpent - b.totalSpent
      );
    } else if (sortBy === 'totalOrders') {
      customers.sort((a, b) =>
        sortOrder === 'desc' ? b.totalOrders - a.totalOrders : a.totalOrders - b.totalOrders
      );
    }

    // Summary stats
    const [activeCount, suspendedCount, totalOrdersAgg, totalRevenueAgg] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalCustomers: totalCount,
        activeCustomers: activeCount,
        suspendedCustomers: suspendedCount,
        totalOrders: totalOrdersAgg,
        totalRevenue: parseFloat((totalRevenueAgg._sum.total ?? 0).toString()),
      },
    });
  } catch (error) {
    console.error('Admin customers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/customers
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload || !['SUPER_ADMIN', 'ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName: (firstName || '').trim() || null,
        lastName: (lastName || '').trim() || null,
        phone: (phone || '').trim() || null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: newUser.id,
        email: newUser.email,
        name: [newUser.firstName, newUser.lastName].filter(Boolean).join(' ') || 'Unnamed',
        phone: newUser.phone,
        status: newUser.status.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('Admin customers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
