import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { verifyAccessToken } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  return payload?.userId ?? null;
}

// GET /api/behavior — fetch behavior data for logged-in user or by deviceId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const userId = await getUserId(request);

    if (!userId && !deviceId) {
      return NextResponse.json({ error: 'userId or deviceId required' }, { status: 400 });
    }

    const behavior = await prisma.customerBehavior.findFirst({
      where: userId ? { userId } : { deviceId: deviceId! },
    });

    if (!behavior) {
      return NextResponse.json({ behavior: null });
    }

    return NextResponse.json({ behavior: behavior.data });
  } catch (error) {
    console.error('Error fetching behavior:', error);
    return NextResponse.json({ error: 'Failed to fetch behavior' }, { status: 500 });
  }
}

// PUT /api/behavior — upsert (save or update) behavior data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, data } = body as { deviceId: string; data: Prisma.InputJsonValue };

    if (!deviceId || !data) {
      return NextResponse.json({ error: 'deviceId and data are required' }, { status: 400 });
    }

    const userId = await getUserId(request);

    // Upsert by deviceId; if user is logged in, also link to userId
    const behavior = await prisma.customerBehavior.upsert({
      where: { deviceId },
      create: {
        deviceId,
        userId: userId ?? null,
        data,
      },
      update: {
        data,
        // Link to userId if user just logged in and record was anonymous
        ...(userId && { userId }),
      },
    });

    return NextResponse.json({ behavior: behavior.data });
  } catch (error) {
    console.error('Error saving behavior:', error);
    return NextResponse.json({ error: 'Failed to save behavior' }, { status: 500 });
  }
}
