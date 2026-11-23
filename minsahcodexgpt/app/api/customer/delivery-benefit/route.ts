import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/session';
import { resolveDeliveryMessage } from '@/lib/delivery-message/resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || searchParams.get('id') || null;
    const productSlug = searchParams.get('slug') || searchParams.get('productSlug') || null;
    const paramFreeDelivery = searchParams.get('isFreeDelivery');
    const isFreeDelivery = paramFreeDelivery === 'true' || paramFreeDelivery === '1';

    const userId = await getAuthenticatedUserId(request);

    const messageResult = await resolveDeliveryMessage({
      productId,
      productSlug,
      isFreeDelivery,
      userId,
    });

    const isReturning = messageResult?.messageType === 'RETURNING_CUSTOMER';
    const isProductFree = messageResult?.messageType === 'PRODUCT_FREE';

    return NextResponse.json(
      {
        messageType: messageResult?.messageType || null,
        messageText: messageResult?.messageText || '',
        backgroundColor: messageResult?.backgroundColor || '',
        textColor: messageResult?.textColor || '',
        active: Boolean(messageResult?.active),
        identified: Boolean(userId),
        isReturning,
        isProductFree,
      },
      {
        headers: {
          'cache-control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/customer/delivery-benefit:', error);
    return NextResponse.json(
      {
        messageType: null,
        messageText: '',
        backgroundColor: '',
        textColor: '',
        active: false,
        identified: false,
        isReturning: false,
        isProductFree: false,
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
