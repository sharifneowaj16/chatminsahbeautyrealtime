import 'server-only';

import prisma from '@/lib/prisma';
import {
  createCustomerFileAudienceThroughMetaPlatform,
  createLookalikeAudienceThroughMetaPlatform,
  createWebsiteAudienceThroughMetaPlatform,
  getAudienceThroughMetaPlatform,
  listAudiencesThroughMetaPlatform,
  syncHashedAudienceMembersThroughMetaPlatform,
  updateAudienceThroughMetaPlatform,
} from '@/lib/meta-platform/migration/phase29-audiences-facade';
import { assertMetaAudienceConsentBatch, hashMetaAudienceCustomers } from '@/lib/meta-platform/domains/audiences/hashing';
import type { MetaAudienceCustomerRecord, MetaAudienceSegment } from '@/lib/meta-platform/domains/audiences/types';

export type CustomerRecord = MetaAudienceCustomerRecord;

/** @deprecated Phase 29 compatibility facade. */
export function listAudiences(params: Record<string, unknown> = {}) { return listAudiencesThroughMetaPlatform(params); }
/** @deprecated Phase 29 compatibility facade. */
export function getAudience(audienceId: string) { return getAudienceThroughMetaPlatform(audienceId); }
/** @deprecated Phase 29 compatibility facade. */
export function createCustomerFileAudience(input: { name: string; description?: string; customerFileSource?: string; valueBased?: boolean }) {
  return createCustomerFileAudienceThroughMetaPlatform(input);
}

export async function syncAudienceMembers(input: {
  audienceId: string;
  customers: CustomerRecord[];
  mode?: 'add' | 'remove' | 'replace';
  valueBased?: boolean;
}) {
  const batch = hashMetaAudienceCustomers({ customers: input.customers, valueBased: input.valueBased, requireExplicitConsent: true });
  assertMetaAudienceConsentBatch(batch);
  return syncHashedAudienceMembersThroughMetaPlatform({ audienceId: input.audienceId, batch, mode: input.mode });
}

export async function loadSegmentCustomers(segment: MetaAudienceSegment, limit = 10_000): Promise<CustomerRecord[]> {
  const now = new Date();
  const since180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const where = segment === 'purchasers_180d'
    ? { promotions: true, orders: { some: { createdAt: { gte: since180 } } } }
    : segment === 'newsletter'
      ? { newsletter: true }
      : { promotions: true };
  const users = await prisma.user.findMany({
    where,
    take: Math.min(Math.max(limit, 1), 10_000),
    select: {
      id: true, email: true, phone: true, firstName: true, lastName: true,
      addresses: { where: { isDefault: true }, take: 1, select: { city: true, state: true, postalCode: true, country: true } },
      orders: { where: { createdAt: { gte: since180 } }, select: { total: true, status: true } },
    },
  });
  return users.map((user: any) => {
    const address = user.addresses[0];
    const value = user.orders.reduce((sum: number, order: any) => ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(String(order.status)) ? sum : sum + Number(order.total), 0);
    return {
      email: user.email, phone: user.phone, firstName: user.firstName, lastName: user.lastName,
      city: address?.city, state: address?.state, postalCode: address?.postalCode, country: address?.country ?? 'BD',
      externalId: `user:${user.id}`, value,
    };
  });
}

export async function prepareDatabaseSegmentBatch(input: { segment: MetaAudienceSegment; valueBased?: boolean; limit?: number }) {
  const customers = await loadSegmentCustomers(input.segment, input.limit);
  return hashMetaAudienceCustomers({ customers, valueBased: input.valueBased, requireExplicitConsent: false });
}

export async function syncDatabaseSegment(input: {
  audienceId: string; segment: MetaAudienceSegment; mode?: 'add' | 'remove' | 'replace'; valueBased?: boolean; limit?: number;
}) {
  const batch = await prepareDatabaseSegmentBatch(input);
  assertMetaAudienceConsentBatch(batch);
  return syncHashedAudienceMembersThroughMetaPlatform({ audienceId: input.audienceId, batch, mode: input.mode });
}

/** @deprecated Phase 29 compatibility facade. */
export function createLookalikeAudience(input: { name: string; originAudienceId: string; country?: string; ratio?: number; description?: string }) {
  return createLookalikeAudienceThroughMetaPlatform(input);
}
/** @deprecated Phase 29 compatibility facade. */
export function createWebsiteRetargetingAudience(input: { name: string; eventName: string; retentionDays?: number; description?: string; rule?: Record<string, unknown> }) {
  return createWebsiteAudienceThroughMetaPlatform(input);
}
/** @deprecated Phase 29 compatibility facade. */
export function updateAudience(audienceId: string, input: Record<string, unknown>) { return updateAudienceThroughMetaPlatform(audienceId, input); }
