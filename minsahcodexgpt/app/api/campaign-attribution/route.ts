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

// GET /api/campaign-attribution?deviceId=xxx — fetch attribution data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const userId = await getUserId(request);

    if (!userId && !deviceId) {
      return NextResponse.json({ error: 'userId or deviceId required' }, { status: 400 });
    }

    const record = await prisma.campaignAttribution.findFirst({
      where: userId ? { userId } : { deviceId: deviceId! },
    });

    if (!record) {
      return NextResponse.json({ firstTouch: null, lastTouch: null, touchpoints: [] });
    }

    return NextResponse.json({
      firstTouch: record.firstTouch,
      lastTouch: record.lastTouch,
      touchpoints: record.touchpoints,
    });
  } catch (error) {
    console.error('Error fetching campaign attribution:', error);
    return NextResponse.json({ error: 'Failed to fetch attribution' }, { status: 500 });
  }
}

// PUT /api/campaign-attribution — upsert attribution data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // No `| null` — the API never intentionally clears UTM data.
    // Absent fields (undefined) simply mean "don't update this field".
    const { deviceId, lastTouch, touchpoints, firstTouch: incomingFirstTouch } = body as {
      deviceId: string;
      firstTouch?: Prisma.InputJsonValue;
      lastTouch?: Prisma.InputJsonValue;
      touchpoints?: Prisma.InputJsonValue[];
    };

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const userId = await getUserId(request);

    // Check if record already exists to preserve firstTouch
    const existing = await prisma.campaignAttribution.findUnique({ where: { deviceId } });

    // Build update payload using the unchecked variant (scalar userId, no relation object)
    const updateData: Prisma.CampaignAttributionUncheckedUpdateInput = {};

    // firstTouch: server-side "never overwrite" — only set on first occurrence
    if (incomingFirstTouch !== undefined && !existing?.firstTouch) {
      updateData.firstTouch = incomingFirstTouch;
    }
    if (lastTouch !== undefined) {
      updateData.lastTouch = lastTouch;
    }
    if (touchpoints !== undefined) {
      updateData.touchpoints = touchpoints;
    }
    if (userId) {
      updateData.userId = userId;
    }

    await prisma.campaignAttribution.upsert({
      where: { deviceId },
      create: {
        deviceId,
        userId: userId ?? null,
        ...(incomingFirstTouch !== undefined && { firstTouch: incomingFirstTouch }),
        ...(lastTouch !== undefined && { lastTouch }),
        touchpoints: touchpoints ?? [],
      },
      update: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving campaign attribution:', error);
    return NextResponse.json({ error: 'Failed to save attribution' }, { status: 500 });
  }
}
