import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { buildUnifiedCourierTracking } from '@/lib/courier-tracking';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const adminAccessToken = request.cookies.get('admin_access_token')?.value;
  const adminPayload = adminAccessToken ? await verifyAdminAccessToken(adminAccessToken) : null;

  if (!session?.user?.id && !adminPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
      ...(adminPayload ? {} : { userId: session!.user!.id }),
    },
    select: {
      shippingMethod: true,
      trackingNumber: true,
      shippingCost: true,
      updatedAt: true,
      pathaoStatus: true,
      pathaoTrackingCode: true,
      pathaoConsignmentId: true,
      pathaoSentAt: true,
      steadfastStatus: true,
      steadfastTrackingCode: true,
      steadfastConsignmentId: true,
      steadfastSentAt: true,
      pathaoWebhookEvents: {
        orderBy: { receivedAt: 'desc' },
        select: {
          eventType: true,
          payload: true,
          processedAt: true,
          receivedAt: true,
        },
      },
      steadfastWebhookEvents: {
        orderBy: { receivedAt: 'desc' },
        select: {
          eventType: true,
          status: true,
          trackingMessage: true,
          processedAt: true,
          receivedAt: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(buildUnifiedCourierTracking(order));
}

