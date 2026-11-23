import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/session';
import { resolveDeliveryMessage } from '@/lib/delivery-message/resolver';
import { getFreeDeliveryThresholdConfig } from '@/lib/commerce/offer-engine/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || searchParams.get('id') || null;
    const productSlug = searchParams.get('slug') || searchParams.get('productSlug') || null;
    const paramFreeDelivery = searchParams.get('isFreeDelivery');
    const isFreeDelivery = paramFreeDelivery === 'true' || paramFreeDelivery === '1';

    const userId = await getAuthenticatedUserId(request);

    const result = await resolveDeliveryMessage({
      productId,
      productSlug,
      isFreeDelivery,
      userId,
    });

    let safePayload = result || {
      messageType: null,
      messageText: '',
      backgroundColor: '',
      textColor: '',
      active: false,
    };

    if (safePayload.messageText) {
      const freeDelivery = await getFreeDeliveryThresholdConfig();
      const nationwideFormatted = `৳${freeDelivery.nationwideThreshold.toLocaleString('en-IN')}`;
      const dhakaSubsidizedFormatted = `৳${(freeDelivery.outsideDhakaSubsidizedThreshold ?? freeDelivery.dhakaThreshold).toLocaleString('en-IN')}`;

      safePayload = {
        ...safePayload,
        messageText: safePayload.messageText
          .replace(/\{\{nationwideThreshold\}\}/g, nationwideFormatted)
          .replace(/\{\{dhakaSubsidizedThreshold\}\}/g, dhakaSubsidizedFormatted),
      };
    }

    return NextResponse.json(safePayload, {
      headers: {
        'cache-control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[GET /api/delivery-message] Unhandled error:', error);
    return NextResponse.json(
      {
        messageType: null,
        messageText: '',
        backgroundColor: '',
        textColor: '',
        active: false,
      },
      {
        status: 200,
        headers: {
          'cache-control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
