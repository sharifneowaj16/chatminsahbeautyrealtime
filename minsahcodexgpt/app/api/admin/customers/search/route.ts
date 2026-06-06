import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/customers/search?q=query
// Quick search for customers during order creation
// Returns: id, name, email, phone, avatar
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
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ customers: [] });
    }

    const query = q.trim();
    const limit = 10;

    // Search: email, firstName, lastName, phone
    const where: Prisma.UserWhereInput = {
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ],
    };

    const customers = await prisma.user.findMany({
      where,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Shape response
    const result = customers.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
    }));

    return NextResponse.json({ customers: result });
  } catch (error) {
    console.error('Admin customer search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
