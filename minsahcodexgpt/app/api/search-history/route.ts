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

// GET /api/search-history?deviceId=xxx — fetch history items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const userId = await getUserId(request);

    if (!userId && !deviceId) {
      return NextResponse.json({ error: 'userId or deviceId required' }, { status: 400 });
    }

    const record = await prisma.searchHistory.findFirst({
      where: userId ? { userId } : { deviceId: deviceId! },
    });

    return NextResponse.json({ items: record ? record.items : [] });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Failed to fetch search history' }, { status: 500 });
  }
}

// PUT /api/search-history — upsert history items
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, items } = body as { deviceId: string; items: Prisma.InputJsonValue[] };

    if (!deviceId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'deviceId and items array required' }, { status: 400 });
    }

    const userId = await getUserId(request);

    await prisma.searchHistory.upsert({
      where: { deviceId },
      create: {
        deviceId,
        userId: userId ?? null,
        items,
      },
      update: {
        items,
        ...(userId && { userId }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving search history:', error);
    return NextResponse.json({ error: 'Failed to save search history' }, { status: 500 });
  }
}

// DELETE /api/search-history — clear history
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body as { deviceId: string };
    const userId = await getUserId(request);

    if (!userId && !deviceId) {
      return NextResponse.json({ error: 'userId or deviceId required' }, { status: 400 });
    }

    await prisma.searchHistory.updateMany({
      where: userId ? { userId } : { deviceId },
      data: { items: [] },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json({ error: 'Failed to clear search history' }, { status: 500 });
  }
}
