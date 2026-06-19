import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { AddressType } from '@/generated/prisma/client';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  return payload?.userId ?? null;
}

// GET /api/addresses — fetch all addresses for logged-in user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST /api/addresses — create a new address
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      isDefault = false,
      firstName,
      lastName = '',
      company,
      street1,
      street2,
      city,
      state,
      postalCode = '',
      country = 'Bangladesh',
      phone,
      pathao_city_id,
      pathao_zone_id,
      pathao_area_id,
    } = body as {
      type?: 'SHIPPING' | 'BILLING';
      isDefault?: boolean;
      firstName: string;
      lastName?: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode?: string;
      country?: string;
      phone?: string;
      pathao_city_id?: number;
      pathao_zone_id?: number;
      pathao_area_id?: number;
    };

    if (!firstName || !street1 || !city || !state) {
      return NextResponse.json(
        { error: 'firstName, street1, city, and state are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset previous default of same type
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, type: type ? AddressType[type] : AddressType.SHIPPING },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        type: type ? AddressType[type] : AddressType.SHIPPING,
        isDefault,
        firstName,
        lastName,
        company,
        street1,
        street2,
        city,
        state,
        postalCode,
        country,
        phone,
        pathaoCityId: pathao_city_id ?? null,
        pathaoZoneId: pathao_zone_id ?? null,
        pathaoAreaId: pathao_area_id ?? null,
      },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}
