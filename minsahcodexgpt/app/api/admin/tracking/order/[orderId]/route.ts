import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  adminUnauthorizedResponse,
  getVerifiedAdmin,
} from '@/app/api/admin/_utils';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

// GET /api/admin/tracking/order/[orderId]
// Safe tracking diagnostics for manual Meta Pixel/CAPI/GA4 verification.
// This endpoint intentionally returns only booleans, timestamps, status fields,
// and safe summaries. It never returns raw email, phone, _fbp/_fbc values, IP,
// user-agent, access tokens, browser purchase tokens, or raw gateway payloads.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) return adminUnauthorizedResponse();

    const { orderId } = await params;
    const lookup = orderId?.trim();
    if (!lookup) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: lookup }, { orderNumber: lookup }],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
        phoneConfirmedAt: true,
        paymentPaidAt: true,
        isTest: true,
        trackingSchemaVersion: true,

        fbp: true,
        fbc: true,
        externalId: true,
        anonymousVisitorId: true,
        customerIp: true,
        customerUa: true,
        gaClientId: true,
        gaSessionId: true,

        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        campaignId: true,
        adsetId: true,
        adId: true,
        placement: true,
        firstLandingUrl: true,
        referrer: true,

        metaPurchaseSent: true,
        metaPurchaseSentAt: true,
        metaPurchaseProcessingAt: true,
        metaBrowserPurchaseClaimedAt: true,
        metaEventId: true,

        gaPurchaseSent: true,
        gaPurchaseSentAt: true,
        gaPurchaseProcessingAt: true,

        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            currency: true,
            gateway: true,
            rawStatus: true,
            verifiedAt: true,
            signatureVerified: true,
            amountMatched: true,
            currencyMatched: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        metaCapiFailures: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            provider: true,
            eventName: true,
            eventId: true,
            statusCode: true,
            errorCode: true,
            errorSubcode: true,
            errorMessage: true,
            retryCount: true,
            finalFailed: true,
            hasFbp: true,
            hasFbc: true,
            hasExternalId: true,
            hasEmailHash: true,
            hasPhoneHash: true,
            hasIp: true,
            hasUa: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const expectedMetaPurchaseEventId = `Purchase-${order.id}`;
    const isCod = (order.paymentMethod ?? '').toLowerCase() === 'cod';
    const isOnlinePaid = order.paymentStatus === 'COMPLETED' && Boolean(order.paymentPaidAt);
    const hasVerifiedPaidPayment = order.payments.some(
      (payment) =>
        payment.status === 'COMPLETED' &&
        payment.signatureVerified &&
        payment.amountMatched &&
        payment.currencyMatched &&
        payment.currency === 'BDT'
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: toNumber(order.total),
        currency: 'BDT',
        isTest: order.isTest,
        trackingSchemaVersion: order.trackingSchemaVersion,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paidAt: order.paidAt,
        paymentPaidAt: order.paymentPaidAt,
        phoneConfirmedAt: order.phoneConfirmedAt,
      },
      meta: {
        expectedPurchaseEventId: expectedMetaPurchaseEventId,
        metaPurchaseSent: order.metaPurchaseSent,
        metaPurchaseSentAt: order.metaPurchaseSentAt,
        metaPurchaseProcessingAt: order.metaPurchaseProcessingAt,
        metaBrowserPurchaseClaimedAt: order.metaBrowserPurchaseClaimedAt,
        metaEventId: order.metaEventId,
        metaEventIdMatchesExpected: order.metaEventId === expectedMetaPurchaseEventId,
      },
      ga4: {
        gaPurchaseSent: order.gaPurchaseSent,
        gaPurchaseSentAt: order.gaPurchaseSentAt,
        gaPurchaseProcessingAt: order.gaPurchaseProcessingAt,
      },
      identifiersPresent: {
        hasFbp: hasValue(order.fbp),
        hasFbc: hasValue(order.fbc),
        hasExternalId: hasValue(order.externalId),
        hasAnonymousVisitorId: hasValue(order.anonymousVisitorId),
        hasCustomerIp: hasValue(order.customerIp),
        hasCustomerUa: hasValue(order.customerUa),
        hasGaClientId: hasValue(order.gaClientId),
        hasGaSessionId: hasValue(order.gaSessionId),
      },
      attributionPresent: {
        hasUtmSource: hasValue(order.utmSource),
        hasUtmMedium: hasValue(order.utmMedium),
        hasUtmCampaign: hasValue(order.utmCampaign),
        hasUtmContent: hasValue(order.utmContent),
        hasCampaignId: hasValue(order.campaignId),
        hasAdsetId: hasValue(order.adsetId),
        hasAdId: hasValue(order.adId),
        hasPlacement: hasValue(order.placement),
        hasFirstLandingUrl: hasValue(order.firstLandingUrl),
        hasReferrer: hasValue(order.referrer),
      },
      purchaseReadiness: {
        codCapiEligible:
          isCod &&
          Boolean(order.phoneConfirmedAt) &&
          !order.metaPurchaseSent &&
          !order.isTest,
        onlineCapiEligible:
          !isCod &&
          isOnlinePaid &&
          hasVerifiedPaidPayment &&
          !order.metaPurchaseSent &&
          !order.isTest,
        onlineBrowserPixelClaimEligible:
          !isCod &&
          isOnlinePaid &&
          hasVerifiedPaidPayment &&
          !order.metaBrowserPurchaseClaimedAt &&
          !order.isTest,
        ga4PurchaseEligible:
          (isCod ? Boolean(order.phoneConfirmedAt) : isOnlinePaid && hasVerifiedPaidPayment) &&
          !order.gaPurchaseSent &&
          !order.isTest &&
          hasValue(order.gaClientId),
        hasVerifiedPaidPayment,
      },
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        status: payment.status,
        amount: toNumber(payment.amount),
        currency: payment.currency,
        gateway: payment.gateway,
        rawStatus: payment.rawStatus,
        verifiedAt: payment.verifiedAt,
        signatureVerified: payment.signatureVerified,
        amountMatched: payment.amountMatched,
        currencyMatched: payment.currencyMatched,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })),
      recentFailures: order.metaCapiFailures.map((failure) => ({
        id: failure.id,
        provider: failure.provider,
        eventName: failure.eventName,
        eventId: failure.eventId,
        statusCode: failure.statusCode,
        errorCode: failure.errorCode,
        errorSubcode: failure.errorSubcode,
        errorMessage: failure.errorMessage,
        retryCount: failure.retryCount,
        finalFailed: failure.finalFailed,
        hasFbp: failure.hasFbp,
        hasFbc: failure.hasFbc,
        hasExternalId: failure.hasExternalId,
        hasEmailHash: failure.hasEmailHash,
        hasPhoneHash: failure.hasPhoneHash,
        hasIp: failure.hasIp,
        hasUa: failure.hasUa,
        createdAt: failure.createdAt,
        updatedAt: failure.updatedAt,
      })),
      privacy: {
        rawEmailReturned: false,
        rawPhoneReturned: false,
        rawFbpReturned: false,
        rawFbcReturned: false,
        rawIpReturned: false,
        rawUserAgentReturned: false,
        accessTokenReturned: false,
        browserPurchaseTokenReturned: false,
        rawGatewayPayloadReturned: false,
      },
    });
  } catch (error) {
    console.error('Admin tracking order diagnostics error:', error);
    return NextResponse.json({ error: 'Failed to load tracking diagnostics' }, { status: 500 });
  }
}
