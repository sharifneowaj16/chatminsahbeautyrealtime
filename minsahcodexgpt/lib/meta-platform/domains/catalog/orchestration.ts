import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { resolveMetaCatalogIdentity } from '@/lib/tracking/meta-content-id';
import { getServerMetaCatalogIdSource } from '@/lib/tracking/meta-content-id-server';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { serializeCatalogCsv } from '@/lib/meta/catalog/adapters/csv-feed';
import { serializeItemsBatchDelete, serializeItemsBatchUpdate, type MetaItemsBatchRequest } from '@/lib/meta/catalog/adapters/items-batch';
import type { CanonicalCatalogItem } from '@/lib/meta/catalog/domain/types';
import { catalogPayloadHash } from '@/lib/meta/catalog/fingerprint';
import { mapProductToCatalogItems, type CatalogProductSource } from '@/lib/meta/catalog/mapper';
import { MetaPlatformCatalogService } from './service';
import { assertCatalogDeletePlanIntegrity, buildCatalogDeletePlanPayload, stableCatalogHash } from './normalization';
import type { MetaCatalogDeletePlanPayload, MetaCatalogPreparedSubmission } from './types';
import { assertMetaPhase30MassDeleteOverride, assertMetaPhase30WriteAllowed } from '../../migration/phase30-cutover';

export type PreparedCatalogUpdate = {
  request: MetaItemsBatchRequest;
  item: CanonicalCatalogItem;
  payloadHash: string;
};
export type InvalidCatalogItem = {
  retailerId: string;
  sourceType: string;
  sourceId: string;
  errors: string[];
  warnings: string[];
};

type MetaCatalogBatchItemRecord = {
  id: string;
  batchId: string;
  retailerId: string;
  method: string;
  payloadHash: string | null;
  status: string;
  errorData: unknown;
  providerIndex: number;
  attempt: number;
  retryOfBatchItemId: string | null;
};
type MetaCatalogBatchRecord = {
  id: string;
  handle: string;
  catalogId: string;
  status: string;
  deletePlanId: string | null;
  items: MetaCatalogBatchItemRecord[];
};
type MetaCatalogManagedRecord = {
  retailerId: string;
  sourceType: string;
  sourceId: string;
  payloadHash: string | null;
  status: string;
};
type MetaCatalogDeletePlanRecord = {
  id: string;
  catalogId: string;
  digest: string;
  retailerIds: string[];
  itemCount: number;
  sourceSnapshotHash: string;
  managedItemCount: number;
  deleteRatio: number;
  requiresEmergencyOverride: boolean;
  status: string;
  approvalId: string | null;
  requestedById: string;
  executedById: string | null;
  correlationId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  resultData: unknown;
  errorData: unknown;
};

type Delegate<T> = {
  findUnique(input: unknown): Promise<T | null>;
  findMany(input: unknown): Promise<T[]>;
  create(input: unknown): Promise<T>;
  update(input: unknown): Promise<T>;
  updateMany(input: unknown): Promise<{ count: number }>;
  upsert(input: unknown): Promise<T>;
  deleteMany(input: unknown): Promise<{ count: number }>;
  createMany(input: unknown): Promise<{ count: number }>;
};
type MetaCatalogClient = {
  metaCatalogBatch: Delegate<MetaCatalogBatchRecord>;
  metaCatalogBatchItem: Delegate<MetaCatalogBatchItemRecord>;
  metaCatalogSyncItem: Delegate<MetaCatalogManagedRecord>;
  metaCatalogDeletePlan: Delegate<MetaCatalogDeletePlanRecord>;
  $transaction<T>(run: (tx: MetaCatalogClient) => Promise<T>): Promise<T>;
};
const db = prisma as unknown as MetaCatalogClient;

function positiveInteger(value: string | undefined, fallback: number, max = 10_000) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}
function boundedRatio(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : fallback;
}
function maxItemRetryAttempts(env: NodeJS.ProcessEnv = process.env) {
  return positiveInteger(env.META_PLATFORM_CATALOG_ITEM_RETRY_MAX_ATTEMPTS, 3, 10);
}
function deletionGuard(env: NodeJS.ProcessEnv = process.env) {
  return {
    maxDeleteCount: positiveInteger(env.META_PLATFORM_CATALOG_DELETE_MAX_COUNT, 100, 100_000),
    maxDeleteRatio: boundedRatio(env.META_PLATFORM_CATALOG_DELETE_MAX_RATIO, 0.25),
  };
}
function chunks<T>(items: readonly T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
function extractBatchHandle(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const root = value as Record<string, unknown>;
  const handle = root.handle ?? root.batch_handle ?? root.id;
  return typeof handle === 'string' && handle.trim() ? handle.trim() : undefined;
}

export function assertCanonicalCatalogSkuPolicy(env: NodeJS.ProcessEnv = process.env) {
  const source = getServerMetaCatalogIdSource({ source: env, required: true });
  if (source !== 'sku') throw new Error('META_PHASE30_CANONICAL_SKU_REQUIRED');
  return source;
}

function catalogIdentity(input: { productId: string; productSku: string; variantId?: string; variantSku?: string }) {
  const source = assertCanonicalCatalogSkuPolicy();
  const identity = resolveMetaCatalogIdentity(input, source);
  if (!identity) throw new Error('META_CATALOG_SKU_IDENTITY_UNRESOLVED');
  return identity;
}

export async function buildCanonicalCatalogPlan(options: { inventoryOnly?: boolean; now?: Date } = {}) {
  const config = getMetaBusinessConfig();
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }], take: 21 },
      variants: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const updates: PreparedCatalogUpdate[] = [];
  const invalidItems: InvalidCatalogItem[] = [];
  const retailerIds = new Set<string>();
  for (const product of products as unknown as CatalogProductSource[]) {
    const mappedItems = mapProductToCatalogItems({ product, resolveIdentity: catalogIdentity, siteUrl: config.siteUrl, currency: 'BDT', now: options.now });
    for (const mapped of mappedItems) {
      if (retailerIds.has(mapped.item.retailerId)) mapped.validation.errors.push('Duplicate retailer ID in catalog batch.');
      retailerIds.add(mapped.item.retailerId);
      if (mapped.validation.errors.length > 0) {
        invalidItems.push({
          retailerId: mapped.item.retailerId,
          sourceType: mapped.item.sourceType,
          sourceId: mapped.item.sourceId,
          errors: [...mapped.validation.errors],
          warnings: [...mapped.validation.warnings],
        });
        continue;
      }
      updates.push({
        item: mapped.item,
        request: serializeItemsBatchUpdate(mapped.item, { inventoryOnly: options.inventoryOnly }),
        payloadHash: catalogPayloadHash(mapped.item),
      });
    }
  }
  return Object.freeze({ updates: Object.freeze(updates), invalidItems: Object.freeze(invalidItems) });
}

export async function listCanonicalCatalogItemsForProductSets(options: { now?: Date } = {}) {
  const plan = await buildCanonicalCatalogPlan({ now: options.now });
  return {
    items: plan.updates.map((entry) => entry.item),
    invalidItems: plan.invalidItems.map((entry) => ({ retailerId: entry.retailerId, errors: entry.errors })),
  };
}
export async function buildCatalogRequests(options: { inventoryOnly?: boolean } = {}) {
  const plan = await buildCanonicalCatalogPlan(options);
  return plan.updates.map((entry) => entry.request);
}
export async function buildCatalogCsv() {
  const plan = await buildCanonicalCatalogPlan();
  return serializeCatalogCsv(plan.updates.map((entry) => entry.item));
}

async function withCatalogSyncLock<T>(catalogId: string, run: () => Promise<T>) {
  const owner = crypto.randomUUID();
  const lockKey = `catalog:${catalogId}`;
  const rows = await prisma.$queryRaw<Array<{ owner: string }>>`
    INSERT INTO "MetaBusinessSyncLock" ("key", "owner", "expiresAt", "createdAt", "updatedAt")
    VALUES (${lockKey}, ${owner}, NOW() + INTERVAL '30 minutes', NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "owner" = EXCLUDED."owner", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = NOW()
      WHERE "MetaBusinessSyncLock"."expiresAt" < NOW()
    RETURNING "owner"
  `;
  if (rows[0]?.owner !== owner) throw new Error('A Meta catalog sync is already running for this catalog');
  try { return await run(); }
  finally {
    await prisma.$executeRaw`DELETE FROM "MetaBusinessSyncLock" WHERE "key" = ${lockKey} AND "owner" = ${owner}`;
  }
}

async function submitCatalogBatches(input: {
  catalogId: string;
  submissions: readonly MetaCatalogPreparedSubmission[];
  correlationId?: string;
  operationKind: 'SYNC' | 'RETRY' | 'DELETE';
  deletePlanId?: string;
}) {
  assertMetaPhase30WriteAllowed({ catalogId: input.catalogId });
  const provider = new MetaPlatformCatalogService();
  const responseRows: unknown[] = [];
  const handles: string[] = [];
  for (const batch of chunks(input.submissions, 500)) {
    const response = await provider.submitItemsBatch({
      catalogId: input.catalogId,
      requests: batch.map((entry) => entry.request as unknown as Record<string, unknown>),
      correlationId: input.correlationId,
    });
    const handle = extractBatchHandle(response);
    if (!handle) throw new Error('META_CATALOG_BATCH_HANDLE_MISSING');
    handles.push(handle);
    responseRows.push(response);
    await db.$transaction(async (tx) => {
      const record = await tx.metaCatalogBatch.upsert({
        where: { handle },
        create: {
          handle,
          catalogId: input.catalogId,
          correlationId: input.correlationId,
          itemCount: batch.length,
          responseData: response as never,
          operationKind: input.operationKind,
          deletePlanId: input.deletePlanId ?? null,
        },
        update: {
          catalogId: input.catalogId,
          correlationId: input.correlationId,
          status: 'SUBMITTED',
          itemCount: batch.length,
          responseData: response as never,
          errorData: null,
          checkedAt: null,
          completedAt: null,
          operationKind: input.operationKind,
          deletePlanId: input.deletePlanId ?? null,
        },
      });
      await tx.metaCatalogBatchItem.deleteMany({ where: { batchId: record.id } });
      await tx.metaCatalogBatchItem.createMany({
        data: batch.map((entry, providerIndex) => ({
          batchId: record.id,
          retailerId: entry.retailerId,
          method: entry.request.method,
          payloadHash: entry.payloadHash,
          status: entry.state,
          providerIndex,
          attempt: entry.attempt,
          retryOfBatchItemId: entry.retryOfBatchItemId ?? null,
        })),
      });
      for (const entry of batch) {
        await tx.metaCatalogSyncItem.upsert({
          where: { catalogId_retailerId: { catalogId: input.catalogId, retailerId: entry.retailerId } },
          create: {
            catalogId: input.catalogId,
            retailerId: entry.retailerId,
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            payloadHash: entry.payloadHash,
            status: entry.state,
            lastSubmittedAt: new Date(),
            deletedAt: entry.state === 'DELETE_SUBMITTED' ? new Date() : null,
          },
          update: {
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            payloadHash: entry.payloadHash,
            status: entry.state,
            lastSubmittedAt: new Date(),
            deletedAt: entry.state === 'DELETE_SUBMITTED' ? new Date() : null,
            lastError: null,
          },
        });
      }
    });
  }
  return Object.freeze({ batches: handles.length, batchHandles: Object.freeze(handles), responses: Object.freeze(responseRows) });
}

export async function syncCatalogProducts(input: { catalogId?: string; inventoryOnly?: boolean; correlationId?: string }) {
  const provider = new MetaPlatformCatalogService();
  const catalogId = input.catalogId?.trim() || provider.config.catalogId;
  return withCatalogSyncLock(catalogId, async () => {
    const plan = await buildCanonicalCatalogPlan({ inventoryOnly: input.inventoryOnly });
    const previouslyManaged = await db.metaCatalogSyncItem.findMany({
      where: { catalogId },
      select: { retailerId: true, sourceType: true, sourceId: true, payloadHash: true, status: true },
    });
    const managed = new Map(previouslyManaged.map((item) => [item.retailerId, item]));
    const unchangedItems: string[] = [];
    const submissions: MetaCatalogPreparedSubmission[] = [];
    for (const entry of plan.updates) {
      const previous = managed.get(entry.item.retailerId);
      if (previous?.payloadHash === entry.payloadHash && previous.status === 'ACTIVE') {
        unchangedItems.push(entry.item.retailerId);
        continue;
      }
      submissions.push(Object.freeze({
        request: entry.request,
        retailerId: entry.item.retailerId,
        sourceType: entry.item.sourceType,
        sourceId: entry.item.sourceId,
        payloadHash: entry.payloadHash,
        state: 'SUBMITTED' as const,
        attempt: 1,
      }));
    }
    const submitted = submissions.length
      ? await submitCatalogBatches({ catalogId, submissions, correlationId: input.correlationId, operationKind: 'SYNC' })
      : { batches: 0, batchHandles: Object.freeze([] as string[]), responses: Object.freeze([] as unknown[]) };
    return Object.freeze({
      catalogId,
      inventoryOnly: Boolean(input.inventoryOnly),
      validItems: plan.updates.length,
      invalidItems: plan.invalidItems,
      unchangedItems: unchangedItems.length,
      submittedItems: submissions.length,
      submittedDeletes: 0,
      deletionMode: 'DRY_RUN_APPROVAL_REQUIRED' as const,
      processingStatus: submissions.length ? 'SUBMITTED' as const : 'NO_CHANGES' as const,
      ...submitted,
    });
  });
}

export async function buildCatalogDeleteDryRun(input: { catalogId?: string; now?: Date } = {}) {
  const provider = new MetaPlatformCatalogService();
  const catalogId = input.catalogId?.trim() || provider.config.catalogId;
  const plan = await buildCanonicalCatalogPlan({ now: input.now });
  const managed = await db.metaCatalogSyncItem.findMany({
    where: { catalogId },
    select: { retailerId: true, sourceType: true, sourceId: true, payloadHash: true, status: true },
  });
  const desiredIds = new Set([
    ...plan.updates.map((entry) => entry.item.retailerId),
    ...plan.invalidItems.map((entry) => entry.retailerId),
  ]);
  const stale = managed
    .filter((item) => !desiredIds.has(item.retailerId) && item.status !== 'DELETED' && item.status !== 'DELETE_SUBMITTED')
    .sort((left, right) => left.retailerId.localeCompare(right.retailerId));
  const sourceSnapshotHash = stableCatalogHash({
    desired: [...desiredIds].sort(),
    invalid: plan.invalidItems.map((item) => ({ retailerId: item.retailerId, errors: [...item.errors].sort() })).sort((a, b) => a.retailerId.localeCompare(b.retailerId)),
  });
  const guard = deletionGuard();
  const payload = buildCatalogDeletePlanPayload({
    catalogId,
    retailerIds: stale.map((item) => item.retailerId),
    sourceSnapshotHash,
    managedItemCount: managed.filter((item) => item.status !== 'DELETED').length,
    ...guard,
  });
  return Object.freeze({ ...payload, items: Object.freeze(stale.map((item) => Object.freeze({ retailerId: item.retailerId, sourceType: item.sourceType, sourceId: item.sourceId, payloadHash: item.payloadHash }))), invalidItemCount: plan.invalidItems.length });
}

export async function createCatalogDeletePlan(input: { catalogId?: string; requestedById: string; correlationId?: string; expiresInMinutes?: number }) {
  const dryRun = await buildCatalogDeleteDryRun({ catalogId: input.catalogId });
  if (dryRun.itemCount < 1) throw new Error('META_CATALOG_DELETE_PLAN_EMPTY');
  const expiresInMinutes = Math.min(120, Math.max(5, input.expiresInMinutes ?? 30));
  const created = await db.metaCatalogDeletePlan.create({ data: {
    catalogId: dryRun.catalogId,
    digest: dryRun.digest,
    retailerIds: [...dryRun.retailerIds],
    itemCount: dryRun.itemCount,
    sourceSnapshotHash: dryRun.sourceSnapshotHash,
    managedItemCount: dryRun.managedItemCount,
    deleteRatio: dryRun.deleteRatio,
    requiresEmergencyOverride: dryRun.requiresEmergencyOverride,
    status: 'DRAFT',
    requestedById: input.requestedById,
    correlationId: input.correlationId ?? null,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
  } });
  return Object.freeze({ plan: created, dryRun });
}

export async function getCatalogDeletePlan(deletePlanId: string) {
  return db.metaCatalogDeletePlan.findUnique({ where: { id: deletePlanId } });
}

export function catalogDeleteApprovalPayload(plan: MetaCatalogDeletePlanRecord) {
  return Object.freeze({
    deletePlanId: plan.id,
    catalogId: plan.catalogId,
    digest: plan.digest,
    itemCount: plan.itemCount,
    sourceSnapshotHash: plan.sourceSnapshotHash,
    managedItemCount: plan.managedItemCount,
    deleteRatio: plan.deleteRatio,
    requiresEmergencyOverride: plan.requiresEmergencyOverride,
  });
}

export async function attachCatalogDeletePlanApproval(input: { deletePlanId: string; approvalId: string }) {
  const claimed = await db.metaCatalogDeletePlan.updateMany({
    where: { id: input.deletePlanId, status: 'DRAFT', expiresAt: { gt: new Date() } },
    data: { status: 'APPROVAL_PENDING', approvalId: input.approvalId },
  });
  if (claimed.count !== 1) throw new Error('META_CATALOG_DELETE_PLAN_NOT_REQUESTABLE');
  return getCatalogDeletePlan(input.deletePlanId);
}

export async function markCatalogDeletePlanQueued(input: { deletePlanId: string; approvalId: string; executedById: string; correlationId?: string }) {
  const claimed = await db.metaCatalogDeletePlan.updateMany({
    where: { id: input.deletePlanId, status: 'APPROVAL_PENDING', approvalId: input.approvalId, expiresAt: { gt: new Date() } },
    data: { status: 'QUEUED', executedById: input.executedById, correlationId: input.correlationId ?? undefined },
  });
  if (claimed.count !== 1) throw new Error('META_CATALOG_DELETE_PLAN_NOT_EXECUTABLE');
  return getCatalogDeletePlan(input.deletePlanId);
}

export async function failQueuedCatalogDeletePlan(input: { deletePlanId: string; error: unknown }) {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  await db.metaCatalogDeletePlan.updateMany({
    where: { id: input.deletePlanId, status: 'QUEUED' },
    data: { status: 'FAILED', errorData: { code: 'META_CATALOG_DELETE_QUEUE_FAILED', message } as never },
  });
}

function recordToDeletePayload(plan: MetaCatalogDeletePlanRecord): MetaCatalogDeletePlanPayload {
  return Object.freeze({
    catalogId: plan.catalogId,
    retailerIds: Object.freeze([...plan.retailerIds]),
    digest: plan.digest,
    itemCount: plan.itemCount,
    sourceSnapshotHash: plan.sourceSnapshotHash,
    managedItemCount: plan.managedItemCount,
    deleteRatio: plan.deleteRatio,
    requiresEmergencyOverride: plan.requiresEmergencyOverride,
  });
}

export async function executeCatalogDeletePlan(input: { deletePlanId: string; correlationId?: string }) {
  const initial = await getCatalogDeletePlan(input.deletePlanId);
  if (!initial) throw new Error('META_CATALOG_DELETE_PLAN_NOT_FOUND');
  return withCatalogSyncLock(initial.catalogId, async () => {
    const plan = await getCatalogDeletePlan(input.deletePlanId);
    if (!plan) throw new Error('META_CATALOG_DELETE_PLAN_NOT_FOUND');
    if (!['QUEUED', 'EXECUTING', 'SUBMITTED'].includes(plan.status)) throw new Error('META_CATALOG_DELETE_PLAN_NOT_QUEUED');
    if (plan.expiresAt <= new Date() && plan.status !== 'SUBMITTED') {
      await db.metaCatalogDeletePlan.update({ where: { id: plan.id }, data: { status: 'EXPIRED' } });
      throw new Error('META_CATALOG_DELETE_PLAN_EXPIRED');
    }

    const existingBatches = await db.metaCatalogBatch.findMany({ where: { deletePlanId: plan.id }, orderBy: { submittedAt: 'asc' } });
    if (plan.status === 'SUBMITTED' || existingBatches.length > 0) {
      if (plan.status !== 'SUBMITTED') await db.metaCatalogDeletePlan.update({ where: { id: plan.id }, data: { status: 'SUBMITTED' } });
      return Object.freeze({
        deletePlanId: plan.id,
        catalogId: plan.catalogId,
        deletedItemsSubmitted: plan.itemCount,
        batches: existingBatches.length,
        batchHandles: Object.freeze(existingBatches.map((batch) => batch.handle)),
        resumed: true,
      });
    }

    const payload = recordToDeletePayload(plan);
    assertCatalogDeletePlanIntegrity(payload);
    assertMetaPhase30MassDeleteOverride({ required: payload.requiresEmergencyOverride });
    assertMetaPhase30WriteAllowed({ catalogId: payload.catalogId });

    const current = await buildCatalogDeleteDryRun({ catalogId: payload.catalogId });
    if (current.digest !== payload.digest || current.sourceSnapshotHash !== payload.sourceSnapshotHash || current.itemCount !== payload.itemCount) {
      await db.metaCatalogDeletePlan.update({ where: { id: plan.id }, data: { status: 'FAILED', errorData: { code: 'META_CATALOG_DELETE_PLAN_STALE' } as never } });
      throw new Error('META_CATALOG_DELETE_PLAN_STALE');
    }
    if (plan.status === 'QUEUED') {
      const claimed = await db.metaCatalogDeletePlan.updateMany({ where: { id: plan.id, status: 'QUEUED' }, data: { status: 'EXECUTING' } });
      if (claimed.count !== 1) throw new Error('META_CATALOG_DELETE_PLAN_CLAIM_FAILED');
    }

    try {
      const managed = await db.metaCatalogSyncItem.findMany({ where: { catalogId: payload.catalogId, retailerId: { in: [...payload.retailerIds] } } });
      const byId = new Map(managed.map((item) => [item.retailerId, item]));
      const submissions: MetaCatalogPreparedSubmission[] = payload.retailerIds.map((retailerId) => {
        const item = byId.get(retailerId);
        if (!item) throw new Error(`META_CATALOG_DELETE_MANAGED_ITEM_MISSING:${retailerId}`);
        return Object.freeze({
          request: serializeItemsBatchDelete(retailerId),
          retailerId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          payloadHash: item.payloadHash ?? undefined,
          state: 'DELETE_SUBMITTED' as const,
          attempt: 1,
        });
      });
      const submitted = await submitCatalogBatches({ catalogId: payload.catalogId, submissions, correlationId: input.correlationId ?? plan.correlationId ?? undefined, operationKind: 'DELETE', deletePlanId: plan.id });
      await db.metaCatalogDeletePlan.update({ where: { id: plan.id }, data: { status: 'SUBMITTED', resultData: submitted as never } });
      return Object.freeze({ deletePlanId: plan.id, catalogId: payload.catalogId, deletedItemsSubmitted: submissions.length, resumed: false, ...submitted });
    } catch (error) {
      await db.metaCatalogDeletePlan.update({ where: { id: plan.id }, data: { status: 'FAILED', errorData: { message: error instanceof Error ? error.message : String(error) } as never } }).catch(() => undefined);
      throw error;
    }
  });
}

async function retryKnownFailedCatalogItems(input: { catalogId: string; items: readonly MetaCatalogBatchItemRecord[]; correlationId?: string }) {
  if (input.items.length === 0) return { retriedItems: 0, skippedItems: 0, batchHandles: [] as string[] };
  const plan = await buildCanonicalCatalogPlan();
  const current = new Map(plan.updates.map((entry) => [entry.item.retailerId, entry]));
  const submissions: MetaCatalogPreparedSubmission[] = [];
  let skippedItems = 0;
  for (const failed of input.items) {
    const entry = current.get(failed.retailerId);
    if (!entry || entry.payloadHash !== failed.payloadHash || failed.method !== 'UPDATE') {
      skippedItems += 1;
      continue;
    }
    submissions.push(Object.freeze({
      request: entry.request,
      retailerId: entry.item.retailerId,
      sourceType: entry.item.sourceType,
      sourceId: entry.item.sourceId,
      payloadHash: entry.payloadHash,
      state: 'SUBMITTED' as const,
      attempt: failed.attempt + 1,
      retryOfBatchItemId: failed.id,
    }));
  }
  if (submissions.length === 0) return { retriedItems: 0, skippedItems, batchHandles: [] as string[] };
  const submitted = await submitCatalogBatches({ catalogId: input.catalogId, submissions, correlationId: input.correlationId, operationKind: 'RETRY' });
  return { retriedItems: submissions.length, skippedItems, batchHandles: [...submitted.batchHandles] };
}

async function refreshDeletePlanStatus(deletePlanId: string) {
  const batches = await db.metaCatalogBatch.findMany({ where: { deletePlanId }, select: { status: true } });
  if (batches.length === 0 || batches.some((batch) => batch.status === 'SUBMITTED')) return;
  const failed = batches.some((batch) => batch.status === 'FAILED');
  await db.metaCatalogDeletePlan.update({
    where: { id: deletePlanId },
    data: { status: failed ? 'FAILED' : 'SUCCEEDED', consumedAt: new Date(), ...(failed ? { errorData: { code: 'META_CATALOG_DELETE_BATCH_FAILED' } as never } : {}) },
  });
}

export async function pollPendingCatalogBatches(input: { catalogId?: string; limit?: number; autoRetry?: boolean; correlationId?: string } = {}) {
  const provider = new MetaPlatformCatalogService();
  const pending = await db.metaCatalogBatch.findMany({
    where: { status: 'SUBMITTED', ...(input.catalogId ? { catalogId: input.catalogId } : {}) },
    include: { items: { orderBy: { providerIndex: 'asc' } } },
    orderBy: { submittedAt: 'asc' },
    take: Math.min(Math.max(input.limit ?? 25, 1), 100),
  });
  const results: unknown[] = [];
  for (const batch of pending) {
    try {
      const result = await provider.checkBatchStatus({ catalogId: batch.catalogId, handle: batch.handle, correlationId: input.correlationId });
      if (result.status === 'SUBMITTED') {
        await db.metaCatalogBatch.update({ where: { handle: batch.handle }, data: { responseData: result.response as never, checkedAt: new Date() } });
        results.push({ ...result, retriedItems: 0 });
        continue;
      }
      const outcomeByRetailer = new Map(result.itemOutcomes.filter((item) => item.retailerId).map((item) => [item.retailerId!, item]));
      const outcomeByIndex = new Map(result.itemOutcomes.filter((item) => item.index !== undefined).map((item) => [item.index!, item]));
      const retryableItems: MetaCatalogBatchItemRecord[] = [];
      let anyFailed = false;
      await db.$transaction(async (tx) => {
        for (const item of batch.items) {
          const outcome = outcomeByRetailer.get(item.retailerId) ?? outcomeByIndex.get(item.providerIndex);
          const failed = outcome ? outcome.status === 'FAILED' : result.status === 'FAILED';
          anyFailed ||= failed;
          const itemStatus = failed ? 'FAILED' : item.method === 'DELETE' ? 'DELETED' : 'ACTIVE';
          const error = failed ? outcome?.error ?? result.errors : null;
          await tx.metaCatalogBatchItem.update({ where: { id: item.id }, data: { status: itemStatus, errorData: error as never } });
          await tx.metaCatalogSyncItem.updateMany({
            where: { catalogId: batch.catalogId, retailerId: item.retailerId },
            data: {
              status: itemStatus,
              ...(failed ? { lastError: error as never, ...(item.method === 'DELETE' ? { deletedAt: null } : {}) } : { lastSucceededAt: new Date(), lastError: null }),
            },
          });
          if (failed && outcome?.retryable && item.method === 'UPDATE' && item.attempt < maxItemRetryAttempts()) retryableItems.push(item);
        }
        await tx.metaCatalogBatch.update({
          where: { handle: batch.handle },
          data: {
            status: anyFailed ? 'FAILED' : 'SUCCESS',
            responseData: result.response as never,
            errorData: anyFailed ? (result.errors ?? { code: 'META_CATALOG_PARTIAL_FAILURE' }) as never : null,
            checkedAt: new Date(),
            completedAt: new Date(),
          },
        });
      });
      const retry = input.autoRetry === false
        ? { retriedItems: 0, skippedItems: retryableItems.length, batchHandles: [] as string[] }
        : await retryKnownFailedCatalogItems({ catalogId: batch.catalogId, items: retryableItems, correlationId: input.correlationId });
      if (batch.deletePlanId) await refreshDeletePlanStatus(batch.deletePlanId);
      results.push({ ...result, status: anyFailed ? 'FAILED' : 'SUCCESS', ...retry });
    } catch (error) {
      results.push({ handle: batch.handle, catalogId: batch.catalogId, status: 'CHECK_FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return Object.freeze({ checked: results.length, results: Object.freeze(results) });
}

export async function retryFailedCatalogBatchItems(input: { catalogId?: string; limit?: number; correlationId?: string } = {}) {
  const failed = await db.metaCatalogBatchItem.findMany({
    where: {
      status: 'FAILED', method: 'UPDATE', attempt: { lt: maxItemRetryAttempts() },
      ...(input.catalogId ? { batch: { catalogId: input.catalogId } } : {}),
    },
    include: { batch: true },
    orderBy: { updatedAt: 'asc' },
    take: Math.min(Math.max(input.limit ?? 100, 1), 500),
  });
  const grouped = new Map<string, MetaCatalogBatchItemRecord[]>();
  for (const item of failed) {
    const catalogId = input.catalogId ?? (item as unknown as { batch?: { catalogId?: string } }).batch?.catalogId;
    if (!catalogId) continue;
    grouped.set(catalogId, [...(grouped.get(catalogId) ?? []), item]);
  }
  const results = [];
  for (const [catalogId, items] of grouped) results.push({ catalogId, ...(await retryKnownFailedCatalogItems({ catalogId, items, correlationId: input.correlationId })) });
  return Object.freeze({ catalogs: results.length, results: Object.freeze(results) });
}

export async function resolveCatalogFeedUrl(input: { url?: string }) {
  const config = getMetaBusinessConfig();
  const url = input.url ?? (config.siteUrl && config.catalogFeedToken
    ? `${config.siteUrl.replace(/\/$/, '')}/api/meta/catalog/feed?token=${encodeURIComponent(config.catalogFeedToken)}`
    : undefined);
  if (!url) throw new Error('Feed URL or META_CATALOG_FEED_TOKEN + site URL is required');
  return url;
}
