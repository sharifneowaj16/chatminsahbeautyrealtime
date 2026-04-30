import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) {
    return adminUnauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number.parseInt(searchParams.get('limit') ?? '30', 10);
  const limit = Number.isNaN(limitRaw) ? 30 : Math.min(MAX_LIMIT, Math.max(1, limitRaw));
  const cursor = searchParams.get('cursor')?.trim() || undefined;
  const processingStatus = searchParams.get('status')?.trim() || undefined;
  const where = processingStatus ? { processingStatus } : {};

  try {
    const rows = await prisma.pathaoWebhookEvent.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        eventType: true,
        orderRef: true,
        consignmentId: true,
        signature: true,
        processingStatus: true,
        receivedAt: true,
        processedAt: true,
        orderId: true,
        error: true,
        order: { select: { orderNumber: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return NextResponse.json({
      events: page.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        orderRef: event.orderRef,
        consignmentId: event.consignmentId,
        hasSignature: Boolean(event.signature),
        processingStatus: event.processingStatus,
        receivedAt: event.receivedAt.toISOString(),
        processedAt: event.processedAt?.toISOString() ?? null,
        orderId: event.orderId,
        orderNumber: event.order?.orderNumber ?? null,
        error: event.error,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error('Pathao webhook events admin API failed:', error);
    return NextResponse.json(
      { error: 'Pathao webhook log table is not available. Run pending database migrations first.' },
      { status: 503 }
    );
  }
}
