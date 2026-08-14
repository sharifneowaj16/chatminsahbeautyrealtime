import 'server-only';
import prisma from '@/lib/prisma';
import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';
import { buildMetaPurchaseOutboxInput } from './builder';
import {
  createMetaEventOutbox,
  type MetaOutboxDb,
} from './outbox-repository';

export async function resolveOrderPolicyDecision(tx: MetaOutboxDb, orderId: string) {
  const rows = await tx.$queryRawUnsafe<Array<{
    trackingConsent: string | null;
    trackingConsentVersion: string | null;
    nonEssentialTrackingAllowed: boolean;
    isTest: boolean;
  }>>(
    `SELECT "trackingConsent", "trackingConsentVersion", "nonEssentialTrackingAllowed", "isTest"
     FROM "Order" WHERE "id"=$1 LIMIT 1`,
    orderId
  );
  const order = rows[0];
  return resolveTrackingDecision({
    eventName: 'Purchase',
    consentState: order?.nonEssentialTrackingAllowed ? order.trackingConsent : 'UNKNOWN',
    consentVersion: order?.trackingConsentVersion,
    testTraffic: Boolean(order?.isTest),
  });
}

export async function createMetaPurchaseOutboxInTransaction(
  tx: MetaOutboxDb,
  input: {
    purchaseType: 'cod_purchase' | 'online_paid_purchase';
    orderId: string;
    eventTime: Date;
    eventSourceUrl?: string | null;
    sourceType: string;
    sourceId?: string | null;
    safePayload?: Record<string, unknown> | null;
  }
) {
  const policyDecision = await resolveOrderPolicyDecision(tx, input.orderId);
  return createMetaEventOutbox(buildMetaPurchaseOutboxInput({ ...input, policyDecision }), tx);
}

export async function createMetaPurchaseOutbox(input: {
  purchaseType: 'cod_purchase' | 'online_paid_purchase';
  orderId: string;
  eventTime: Date;
  eventSourceUrl?: string | null;
  sourceType: string;
  sourceId?: string | null;
  safePayload?: Record<string, unknown> | null;
}) {
  return createMetaPurchaseOutboxInTransaction(prisma as unknown as MetaOutboxDb, input);
}
