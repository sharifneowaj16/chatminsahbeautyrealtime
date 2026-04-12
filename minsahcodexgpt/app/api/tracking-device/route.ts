import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  return payload?.userId ?? null;
}

// GET /api/tracking-device?deviceId=xxx — fetch UTM data for a device
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const userId = await getUserId(request);

    if (!userId && !deviceId) {
      return NextResponse.json({ error: 'userId or deviceId required' }, { status: 400 });
    }

    const record = await prisma.trackingDevice.findFirst({
      where: userId ? { userId } : { deviceId: deviceId! },
    });

    if (!record) {
      return NextResponse.json({ firstTouchUtm: null, lastTouchUtm: null });
    }

    return NextResponse.json({
      deviceId: record.deviceId,
      firstTouchUtm: record.firstTouchUtm,
      lastTouchUtm: record.lastTouchUtm,
    });
  } catch (error) {
    console.error('Error fetching tracking device:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking device' }, { status: 500 });
  }
}

// PUT /api/tracking-device — upsert device UTM data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // No `| null` — the API never intentionally clears UTM data.
    // Absent fields (undefined) simply mean "don't update this field".
    const { deviceId, firstTouchUtm, lastTouchUtm } = body as {
      deviceId: string;
      firstTouchUtm?: Prisma.InputJsonValue;
      lastTouchUtm?: Prisma.InputJsonValue;
    };

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const userId = await getUserId(request);
    const existing = await prisma.trackingDevice.findUnique({ where: { deviceId } });

    // Build update payload using the unchecked variant (scalar userId, no relation object)
    const updateData: Prisma.TrackingDeviceUncheckedUpdateInput = {};

    // firstTouchUtm: server-side "never overwrite" — only set on first occurrence
    if (firstTouchUtm !== undefined && !existing?.firstTouchUtm) {
      updateData.firstTouchUtm = firstTouchUtm;
    }
    if (lastTouchUtm !== undefined) {
      updateData.lastTouchUtm = lastTouchUtm;
    }
    if (userId) {
      updateData.userId = userId;
    }

    await prisma.trackingDevice.upsert({
      where: { deviceId },
      create: {
        deviceId,
        userId: userId ?? null,
        ...(firstTouchUtm !== undefined && { firstTouchUtm }),
        ...(lastTouchUtm !== undefined && { lastTouchUtm }),
      },
      update: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving tracking device:', error);
    return NextResponse.json({ error: 'Failed to save tracking device' }, { status: 500 });
  }
}
