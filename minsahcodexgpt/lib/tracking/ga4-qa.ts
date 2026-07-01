import 'server-only';
import prisma from '@/lib/prisma';
import { getPaymentGatewayReferralQaConfig } from '@/lib/tracking/payment-gateway-referrals';

const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 24 * 90;

function clampWindowHours(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return DEFAULT_WINDOW_HOURS;
  return Math.min(Math.max(Math.floor(value), 1), MAX_WINDOW_HOURS);
}

function getWindowSince(windowHours: number) {
  return new Date(Date.now() - windowHours * 60 * 60 * 1000);
}

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return 0;
}

function isCodPaymentFilter() {
  return [
    { paymentMethod: { contains: 'cod', mode: 'insensitive' as const } },
    { paymentMethod: { contains: 'cash', mode: 'insensitive' as const } },
  ];
}

export async function buildGa4QaSnapshot(options?: { windowHours?: number }) {
  const windowHours = clampWindowHours(options?.windowHours);
  const since = getWindowSince(windowHours);
  const until = new Date();
  const referralConfig = getPaymentGatewayReferralQaConfig();

  const expectedPurchaseWhere = {
    isTest: false,
    OR: [
      { phoneConfirmedAt: { gte: since } },
      { paymentPaidAt: { gte: since } },
      { paidAt: { gte: since } },
    ],
  };

  const refundEligibleWhere = {
    isTest: false,
    gaPurchaseSent: true,
    OR: [
      { refundedAt: { gte: since } },
      { status: 'REFUNDED' as const },
      { paymentStatus: 'REFUNDED' as const },
      { returns: { some: { status: 'COMPLETED' as const, updatedAt: { gte: since } } } },
    ],
  };

  const [
    expectedPurchases,
    gaPurchaseSent,
    missingGaClientOrders,
    gaFailureCount,
    gaFinalFailureCount,
    gaRefundEligible,
    gaRefundSent,
    gaRefundPendingRows,
    codCancelledRefundRisk,
    recentMissingGaClientRows,
  ] = await Promise.all([
    prisma.order.count({ where: expectedPurchaseWhere }),
    prisma.order.count({ where: { isTest: false, gaPurchaseSent: true, gaPurchaseSentAt: { gte: since } } }),
    prisma.order.count({ where: { ...expectedPurchaseWhere, gaClientId: null } }),
    prisma.metaCapiFailure.count({ where: { provider: 'GA4', createdAt: { gte: since } } }),
    prisma.metaCapiFailure.count({ where: { provider: 'GA4', finalFailed: true, createdAt: { gte: since } } }),
    prisma.order.count({ where: refundEligibleWhere }),
    prisma.order.count({ where: { isTest: false, gaRefundSent: true, gaRefundSentAt: { gte: since } } }),
    prisma.order.findMany({
      where: { ...refundEligibleWhere, gaRefundSent: false },
      orderBy: [{ refundedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        refundedAt: true,
        updatedAt: true,
        returns: {
          where: { status: 'COMPLETED' },
          select: { refundAmount: true, updatedAt: true },
        },
      },
    }),
    prisma.order.count({
      where: {
        isTest: false,
        status: 'CANCELLED',
        paymentStatus: { not: 'REFUNDED' },
        OR: isCodPaymentFilter(),
        createdAt: { gte: since },
      },
    }),
    prisma.order.findMany({
      where: { ...expectedPurchaseWhere, gaClientId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
      },
    }),
  ]);

  const gaClientMissingRate = expectedPurchases > 0 ? missingGaClientOrders / expectedPurchases : 0;
  const refundPending = gaRefundPendingRows.length;

  const issues = [
    !process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && !process.env.GA4_MEASUREMENT_ID
      ? 'GA4 measurement ID is missing.'
      : null,
    !process.env.GA4_API_SECRET && !process.env.GOOGLE_ANALYTICS_API_SECRET
      ? 'GA4 Measurement Protocol API secret is missing.'
      : null,
    expectedPurchases >= 3 && gaClientMissingRate >= 0.3
      ? 'GA4 client ID missing rate is high for confirmed/paid orders.'
      : null,
    gaFinalFailureCount > 0 ? 'Final GA4 failures exist in the selected window.' : null,
    refundPending > 0 ? 'GA4 refund-eligible orders are pending refund event send.' : null,
    !referralConfig.verified ? 'Payment gateway referral exclusions are not marked verified.' : null,
    !referralConfig.routeTrackingVerified ? 'GA4 App Router page_view QA is not marked verified.' : null,
    !referralConfig.paymentReturnSourceVerified ? 'GA4 payment-return source preservation QA is not marked verified.' : null,
  ].filter((issue): issue is string => Boolean(issue));

  return {
    ok: issues.length === 0,
    windowHours,
    since: since.toISOString(),
    until: until.toISOString(),
    env: {
      hasMeasurementId: Boolean(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID),
      hasApiSecret: Boolean(process.env.GA4_API_SECRET || process.env.GOOGLE_ANALYTICS_API_SECRET),
      referralExclusionsVerified: referralConfig.verified,
      appRouterPageViewVerified: referralConfig.routeTrackingVerified,
      paymentReturnSourceVerified: referralConfig.paymentReturnSourceVerified,
      crossDomainCheckVerified: referralConfig.crossDomainVerified,
    },
    metrics: {
      expectedPurchases,
      gaPurchaseSent,
      missingGaClientOrders,
      gaClientMissingRate,
      gaFailureCount,
      gaFinalFailureCount,
      gaRefundEligible,
      gaRefundSent,
      gaRefundPending: refundPending,
      codCancelledRefundRisk,
    },
    referralConfig,
    refundPendingOrders: gaRefundPendingRows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: decimalToNumber(order.total),
      refundAmount: order.returns.reduce((sum, item) => sum + decimalToNumber(item.refundAmount), 0) || decimalToNumber(order.total),
      refundedAt: order.refundedAt?.toISOString() ?? null,
      updatedAt: order.updatedAt.toISOString(),
    })),
    recentMissingGaClientOrders: recentMissingGaClientRows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: decimalToNumber(order.total),
      createdAt: order.createdAt.toISOString(),
    })),
    issues,
  };
}
