import 'server-only';

import prisma from '@/lib/prisma';
import { metaCapiPurchaseQueue } from '@/lib/queue/metaCapiQueue';
import { getPaymentGatewayReferralQaConfig } from '@/lib/tracking/payment-gateway-referrals';
import { buildPrivacyCatalogQaSnapshot } from '@/lib/tracking/privacy-catalog-qa';

const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 24 * 30;

type HealthStatus = 'OK' | 'WARN' | 'CRITICAL';

type QueueCounts = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
  waitingChildren: number;
  unknown?: boolean;
  error?: string;
};

type TrackingIssue = {
  code: string;
  severity: HealthStatus;
  message: string;
  value?: number | string;
  expected?: number;
  actual?: number;
};

export type TrackingHealthSnapshot = {
  status: HealthStatus;
  windowHours: number;
  since: string;
  until: string;
  metrics: {
    ordersCreated: number;
    codPhoneConfirmed: number;
    onlinePaid: number;
    expectedMetaPurchases: number;
    metaPurchaseSent: number;
    gaPurchaseSent: number;
    capiFailures: number;
    capiFinalFailures: number;
    tokenInvalidFailures: number;
    pendingMetaPurchaseOrders: number;
    pendingGaPurchaseOrders: number;
    gaFailures: number;
    gaFinalFailures: number;
    gaRefundEligible: number;
    gaRefundSent: number;
    pendingGaRefundOrders: number;
    gaClientIdMissingOrders: number;
    gaClientIdMissingRate: number;
    referralExclusionsVerified: boolean;
    privacyTrackingDisclosureVerified: boolean;
    clarityMaskingVerified: boolean;
    metaCatalogConnected: boolean;
    metaCatalogQaVerified: boolean;
    catalogIssueProducts: number;
    criticalCatalogIssueProducts: number;
    recentFailureCount: number;
  };
  queue: QueueCounts;
  issues: TrackingIssue[];
  notes: string;
};

export type TrackingHealthFailureRow = {
  id: string;
  orderId: string | null;
  eventName: string;
  eventId: string | null;
  provider: string;
  statusCode: number | null;
  errorCode: string | null;
  errorSubcode: string | null;
  errorMessage: string | null;
  retryCount: number;
  finalFailed: boolean;
  hasFbp: boolean;
  hasFbc: boolean;
  hasExternalId: boolean;
  hasEmailHash: boolean;
  hasPhoneHash: boolean;
  hasIp: boolean;
  hasUa: boolean;
  createdAt: string;
  updatedAt: string;
};

function clampWindowHours(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return DEFAULT_WINDOW_HOURS;
  return Math.min(Math.max(Math.floor(value), 1), MAX_WINDOW_HOURS);
}

function getWindowSince(windowHours: number) {
  return new Date(Date.now() - windowHours * 60 * 60 * 1000);
}

function containsTokenError(message: string | null | undefined, code: string | null | undefined) {
  const joined = `${message ?? ''} ${code ?? ''}`.toLowerCase();
  return (
    joined.includes('token') ||
    joined.includes('access_token') ||
    joined.includes('invalid oauth') ||
    joined.includes('oauth') ||
    joined.includes('permission')
  );
}

async function getQueueCounts(): Promise<QueueCounts> {
  try {
    const counts = await metaCapiPurchaseQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed',
      'completed',
      'paused',
      'waiting-children'
    );

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
      paused: counts.paused ?? 0,
      waitingChildren: counts['waiting-children'] ?? 0,
    };
  } catch (error) {
    return {
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 0,
      paused: 0,
      waitingChildren: 0,
      unknown: true,
      error: error instanceof Error ? error.message : 'Unknown queue error',
    };
  }
}

function addIssue(issues: TrackingIssue[], issue: TrackingIssue) {
  issues.push(issue);
}

function getOverallStatus(issues: TrackingIssue[]): HealthStatus {
  if (issues.some((issue) => issue.severity === 'CRITICAL')) return 'CRITICAL';
  if (issues.some((issue) => issue.severity === 'WARN')) return 'WARN';
  return 'OK';
}

function createNotes(status: HealthStatus, issues: TrackingIssue[]) {
  if (issues.length === 0) return 'Tracking health OK.';
  return `${status}: ${issues.map((issue) => issue.message).join(' | ')}`;
}

export async function buildTrackingHealthSnapshot(options?: {
  windowHours?: number;
}): Promise<TrackingHealthSnapshot> {
  const windowHours = clampWindowHours(options?.windowHours);
  const since = getWindowSince(windowHours);
  const until = new Date();

  const [
    ordersCreated,
    codPhoneConfirmed,
    onlinePaidByPaymentPaidAt,
    onlinePaidByPaidAt,
    metaPurchaseSent,
    gaPurchaseSent,
    capiFailures,
    capiFinalFailures,
    recentFailures,
    pendingMetaPurchaseOrders,
    pendingGaPurchaseOrders,
    gaFailures,
    gaFinalFailures,
    gaRefundEligible,
    gaRefundSent,
    pendingGaRefundOrders,
    gaClientIdMissingOrders,
    queue,
    privacyCatalogQa,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since }, isTest: false } }),
    prisma.order.count({ where: { phoneConfirmedAt: { gte: since }, isTest: false } }),
    prisma.order.count({ where: { paymentPaidAt: { gte: since }, isTest: false } }),
    prisma.order.count({
      where: {
        paidAt: { gte: since },
        paymentPaidAt: null,
        isTest: false,
      },
    }),
    prisma.order.count({ where: { metaPurchaseSent: true, metaPurchaseSentAt: { gte: since }, isTest: false } }),
    prisma.order.count({ where: { gaPurchaseSent: true, gaPurchaseSentAt: { gte: since }, isTest: false } }),
    prisma.metaCapiFailure.count({ where: { createdAt: { gte: since } } }),
    prisma.metaCapiFailure.count({ where: { createdAt: { gte: since }, finalFailed: true } }),
    prisma.metaCapiFailure.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { errorMessage: true, errorCode: true },
    }),
    prisma.order.count({
      where: {
        isTest: false,
        metaPurchaseSent: false,
        OR: [
          { phoneConfirmedAt: { gte: since } },
          { paymentPaidAt: { gte: since } },
          { paidAt: { gte: since } },
        ],
      },
    }),
    prisma.order.count({
      where: {
        isTest: false,
        gaPurchaseSent: false,
        OR: [
          { phoneConfirmedAt: { gte: since } },
          { paymentPaidAt: { gte: since } },
          { paidAt: { gte: since } },
        ],
      },
    }),
    prisma.metaCapiFailure.count({ where: { provider: 'GA4', createdAt: { gte: since } } }),
    prisma.metaCapiFailure.count({ where: { provider: 'GA4', finalFailed: true, createdAt: { gte: since } } }),
    prisma.order.count({
      where: {
        isTest: false,
        gaPurchaseSent: true,
        OR: [
          { refundedAt: { gte: since } },
          { status: 'REFUNDED' },
          { paymentStatus: 'REFUNDED' },
          { returns: { some: { status: 'COMPLETED', updatedAt: { gte: since } } } },
        ],
      },
    }),
    prisma.order.count({ where: { isTest: false, gaRefundSent: true, gaRefundSentAt: { gte: since } } }),
    prisma.order.count({
      where: {
        isTest: false,
        gaPurchaseSent: true,
        gaRefundSent: false,
        OR: [
          { refundedAt: { gte: since } },
          { status: 'REFUNDED' },
          { paymentStatus: 'REFUNDED' },
          { returns: { some: { status: 'COMPLETED', updatedAt: { gte: since } } } },
        ],
      },
    }),
    prisma.order.count({
      where: {
        isTest: false,
        gaClientId: null,
        OR: [
          { phoneConfirmedAt: { gte: since } },
          { paymentPaidAt: { gte: since } },
          { paidAt: { gte: since } },
        ],
      },
    }),
    getQueueCounts(),
    buildPrivacyCatalogQaSnapshot({ limit: 25 }),
  ]);

  const onlinePaid = onlinePaidByPaymentPaidAt + onlinePaidByPaidAt;
  const expectedMetaPurchases = codPhoneConfirmed + onlinePaid;
  const gaClientIdMissingRate = expectedMetaPurchases > 0 ? gaClientIdMissingOrders / expectedMetaPurchases : 0;
  const referralExclusionsVerified = getPaymentGatewayReferralQaConfig().verified;
  const tokenInvalidFailures = (recentFailures as Array<{ errorMessage: string | null; errorCode: string | null }>).filter((failure) =>
    containsTokenError(failure.errorMessage, failure.errorCode)
  ).length;

  const issues: TrackingIssue[] = [];

  if (expectedMetaPurchases > 0 && metaPurchaseSent === 0) {
    addIssue(issues, {
      code: 'ZERO_META_PURCHASE',
      severity: 'CRITICAL',
      message: 'Expected purchase signals exist, but Meta Purchase sent count is zero.',
      expected: expectedMetaPurchases,
      actual: metaPurchaseSent,
    });
  }

  if (expectedMetaPurchases >= 3) {
    const metaGap = expectedMetaPurchases - metaPurchaseSent;
    const gaGap = expectedMetaPurchases - gaPurchaseSent;

    if (metaGap > 0 && metaGap / expectedMetaPurchases >= 0.2) {
      addIssue(issues, {
        code: 'META_PURCHASE_GAP',
        severity: metaGap >= 3 ? 'CRITICAL' : 'WARN',
        message: 'Meta Purchase sent count is materially lower than confirmed/paid backend orders.',
        expected: expectedMetaPurchases,
        actual: metaPurchaseSent,
      });
    }

    if (gaGap > 0 && gaGap / expectedMetaPurchases >= 0.2) {
      addIssue(issues, {
        code: 'GA4_PURCHASE_GAP',
        severity: gaGap >= 3 ? 'CRITICAL' : 'WARN',
        message: 'GA4 Purchase sent count is materially lower than confirmed/paid backend orders.',
        expected: expectedMetaPurchases,
        actual: gaPurchaseSent,
      });
    }
  }

  if (!process.env.GA4_API_SECRET && !process.env.GOOGLE_ANALYTICS_API_SECRET) {
    addIssue(issues, {
      code: 'GA4_API_SECRET_MISSING',
      severity: 'CRITICAL',
      message: 'GA4 Measurement Protocol API secret is missing; server-side purchase/refund events cannot be sent.',
    });
  }

  if (!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && !process.env.GA4_MEASUREMENT_ID) {
    addIssue(issues, {
      code: 'GA4_MEASUREMENT_ID_MISSING',
      severity: 'CRITICAL',
      message: 'GA4 Measurement ID is missing; GA4 browser and Measurement Protocol events may be disabled.',
    });
  }

  if (expectedMetaPurchases >= 3 && gaClientIdMissingRate >= 0.3) {
    addIssue(issues, {
      code: 'GA_CLIENT_ID_MISSING_RATE_HIGH',
      severity: gaClientIdMissingRate >= 0.5 ? 'CRITICAL' : 'WARN',
      message: 'GA4 client ID missing rate is high for confirmed/paid orders.',
      value: `${Math.round(gaClientIdMissingRate * 100)}%`,
      expected: expectedMetaPurchases,
      actual: gaClientIdMissingOrders,
    });
  }

  if (gaFinalFailures > 0) {
    addIssue(issues, {
      code: 'GA4_FINAL_FAILURES',
      severity: 'CRITICAL',
      message: 'Final GA4 purchase/refund failures exist in the selected window.',
      value: gaFinalFailures,
    });
  }

  if (pendingGaRefundOrders > 0) {
    addIssue(issues, {
      code: 'PENDING_GA4_REFUND_ORDERS',
      severity: pendingGaRefundOrders >= 3 ? 'CRITICAL' : 'WARN',
      message: 'Refund-eligible orders need GA4 refund events.',
      value: pendingGaRefundOrders,
    });
  }

  if (!referralExclusionsVerified) {
    addIssue(issues, {
      code: 'GA4_REFERRAL_EXCLUSIONS_NOT_VERIFIED',
      severity: 'WARN',
      message: 'Payment gateway referral exclusions are not marked verified; GA4 source/medium may be overwritten by payment referrals.',
    });
  }

  if (!privacyCatalogQa.env.trackingDisclosureVerified || !privacyCatalogQa.env.cookieDisclosureVerified) {
    addIssue(issues, {
      code: 'PRIVACY_TRACKING_DISCLOSURE_NOT_VERIFIED',
      severity: 'WARN',
      message: 'Privacy/cookie tracking disclosure is not marked verified for Meta Pixel/CAPI, GA4, and Clarity.',
    });
  }

  if (privacyCatalogQa.env.consentModeRequired && !privacyCatalogQa.env.consentModeVerified) {
    addIssue(issues, {
      code: 'CONSENT_MODE_NOT_VERIFIED',
      severity: 'WARN',
      message: 'Consent mode is required but not marked verified.',
    });
  }

  if (privacyCatalogQa.env.clarityEnabled && !privacyCatalogQa.env.clarityMaskingVerified) {
    addIssue(issues, {
      code: 'CLARITY_MASKING_NOT_VERIFIED',
      severity: 'WARN',
      message: 'Microsoft Clarity is enabled but sensitive input masking is not marked verified.',
    });
  }

  if (!privacyCatalogQa.env.metaCatalogConnected || !privacyCatalogQa.env.metaCatalogQaVerified) {
    addIssue(issues, {
      code: 'META_CATALOG_QA_NOT_VERIFIED',
      severity: 'WARN',
      message: 'Meta Catalog connection/QA is not marked verified; dynamic ads catalog matching may be weak.',
    });
  }

  if (privacyCatalogQa.metrics.criticalCatalogIssueProducts > 0) {
    addIssue(issues, {
      code: 'CATALOG_CRITICAL_PRODUCT_ISSUES',
      severity: 'CRITICAL',
      message: 'Active products have critical catalog readiness issues such as missing image, SKU, or price.',
      value: privacyCatalogQa.metrics.criticalCatalogIssueProducts,
    });
  } else if (privacyCatalogQa.metrics.catalogIssueProducts > 0) {
    addIssue(issues, {
      code: 'CATALOG_PRODUCT_WARNINGS',
      severity: 'WARN',
      message: 'Active products have catalog readiness warnings.',
      value: privacyCatalogQa.metrics.catalogIssueProducts,
    });
  }

  if (capiFinalFailures > 0) {
    addIssue(issues, {
      code: 'FINAL_FAILURES',
      severity: 'CRITICAL',
      message: 'Final/dead-letter CAPI failures exist in the selected window.',
      value: capiFinalFailures,
    });
  } else if (capiFailures > 0) {
    addIssue(issues, {
      code: 'CAPI_FAILURES',
      severity: 'WARN',
      message: 'CAPI failures exist in the selected window. Check retry status and error messages.',
      value: capiFailures,
    });
  }

  if (tokenInvalidFailures > 0) {
    addIssue(issues, {
      code: 'TOKEN_OR_PERMISSION_FAILURE',
      severity: 'CRITICAL',
      message: 'Recent failure messages indicate token/permission/OAuth issues.',
      value: tokenInvalidFailures,
    });
  }

  if (!queue.unknown && queue.failed > 0) {
    addIssue(issues, {
      code: 'QUEUE_FAILED_JOBS',
      severity: 'WARN',
      message: 'Meta CAPI queue has failed jobs retained in Redis.',
      value: queue.failed,
    });
  }

  if (!queue.unknown && queue.waiting + queue.delayed > 100) {
    addIssue(issues, {
      code: 'QUEUE_BACKLOG',
      severity: 'WARN',
      message: 'Meta CAPI queue backlog is high. Worker may be down or rate-limited.',
      value: queue.waiting + queue.delayed,
    });
  }

  if (queue.unknown) {
    addIssue(issues, {
      code: 'QUEUE_STATUS_UNKNOWN',
      severity: 'WARN',
      message: 'Could not read Meta CAPI queue counts. Redis/worker connection may need checking.',
      value: queue.error,
    });
  }

  if (pendingMetaPurchaseOrders > 0) {
    addIssue(issues, {
      code: 'PENDING_META_PURCHASE_ORDERS',
      severity: pendingMetaPurchaseOrders >= 3 ? 'CRITICAL' : 'WARN',
      message: 'Backend orders need Meta Purchase sending or retry.',
      value: pendingMetaPurchaseOrders,
    });
  }

  const status = getOverallStatus(issues);

  return {
    status,
    windowHours,
    since: since.toISOString(),
    until: until.toISOString(),
    metrics: {
      ordersCreated,
      codPhoneConfirmed,
      onlinePaid,
      expectedMetaPurchases,
      metaPurchaseSent,
      gaPurchaseSent,
      capiFailures,
      capiFinalFailures,
      tokenInvalidFailures,
      pendingMetaPurchaseOrders,
      pendingGaPurchaseOrders,
      gaFailures,
      gaFinalFailures,
      gaRefundEligible,
      gaRefundSent,
      pendingGaRefundOrders,
      gaClientIdMissingOrders,
      gaClientIdMissingRate,
      referralExclusionsVerified,
      privacyTrackingDisclosureVerified: privacyCatalogQa.env.trackingDisclosureVerified && privacyCatalogQa.env.cookieDisclosureVerified,
      clarityMaskingVerified: privacyCatalogQa.env.clarityMaskingVerified,
      metaCatalogConnected: privacyCatalogQa.env.metaCatalogConnected,
      metaCatalogQaVerified: privacyCatalogQa.env.metaCatalogQaVerified,
      catalogIssueProducts: privacyCatalogQa.metrics.catalogIssueProducts,
      criticalCatalogIssueProducts: privacyCatalogQa.metrics.criticalCatalogIssueProducts,
      recentFailureCount: recentFailures.length,
    },
    queue,
    issues,
    notes: createNotes(status, issues),
  };
}

export async function persistTrackingHealthCheck(snapshot: TrackingHealthSnapshot) {
  const checkDate = new Date(snapshot.until);

  return prisma.trackingHealthCheck.create({
    data: {
      checkDate,
      ordersCreated: snapshot.metrics.ordersCreated,
      ordersConfirmed: snapshot.metrics.codPhoneConfirmed + snapshot.metrics.onlinePaid,
      metaPurchaseSent: snapshot.metrics.metaPurchaseSent,
      gaPurchaseSent: snapshot.metrics.gaPurchaseSent,
      capiFailureCount: snapshot.metrics.capiFailures,
      status: snapshot.status,
      notes: snapshot.notes,
      details: snapshot,
    },
  });
}

export async function listTrackingHealthHistory(limit = 14) {
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.trackingHealthCheck.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      checkDate: true,
      status: true,
      ordersCreated: true,
      ordersConfirmed: true,
      metaPurchaseSent: true,
      gaPurchaseSent: true,
      capiFailureCount: true,
      notes: true,
      createdAt: true,
    },
  });

  return (rows as Array<{
    id: string;
    checkDate: Date;
    status: string;
    ordersCreated: number;
    ordersConfirmed: number;
    metaPurchaseSent: number;
    gaPurchaseSent: number;
    capiFailureCount: number;
    notes: string | null;
    createdAt: Date;
  }>).map((row) => ({
    ...row,
    status: row.status as HealthStatus,
    checkDate: row.checkDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listRecentTrackingFailures(limit = 25): Promise<TrackingHealthFailureRow[]> {
  const take = Math.min(Math.max(limit, 1), 100);
  const rows = await prisma.metaCapiFailure.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      orderId: true,
      eventName: true,
      eventId: true,
      provider: true,
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
  });

  return (rows as Array<{
    id: string;
    orderId: string | null;
    eventName: string;
    eventId: string | null;
    provider: string;
    statusCode: number | null;
    errorCode: string | null;
    errorSubcode: string | null;
    errorMessage: string | null;
    retryCount: number;
    finalFailed: boolean;
    hasFbp: boolean;
    hasFbc: boolean;
    hasExternalId: boolean;
    hasEmailHash: boolean;
    hasPhoneHash: boolean;
    hasIp: boolean;
    hasUa: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

function resolveAlertWebhookUrl() {
  return (
    process.env.TRACKING_HEALTH_ALERT_WEBHOOK_URL ||
    process.env.TRACKING_ALERT_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL ||
    null
  );
}

export async function sendTrackingHealthAlert(snapshot: TrackingHealthSnapshot) {
  const webhookUrl = resolveAlertWebhookUrl();
  if (!webhookUrl || snapshot.status === 'OK') {
    return { sent: false, reason: !webhookUrl ? 'NO_WEBHOOK_URL' : 'STATUS_OK' };
  }

  const payload = {
    text: `[Minsah Tracking Health] ${snapshot.status}: ${snapshot.notes}`,
    status: snapshot.status,
    windowHours: snapshot.windowHours,
    metrics: snapshot.metrics,
    queue: snapshot.queue,
    issues: snapshot.issues,
    checkedAt: snapshot.until,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { sent: false, reason: `WEBHOOK_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'WEBHOOK_ERROR',
    };
  }
}
