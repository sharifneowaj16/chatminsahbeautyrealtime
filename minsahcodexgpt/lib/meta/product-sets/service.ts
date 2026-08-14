import 'server-only';
import prisma from '@/lib/prisma';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { listCanonicalCatalogItemsForProductSets } from '@/lib/meta-platform/domains/catalog/orchestration';
import { openOrRefreshMetaIncident } from '@/lib/observability/incidents';
import { incrementMetaCounter, setMetaGauge } from '@/lib/observability/metrics';
import { redactObservabilityData } from '@/lib/observability/redaction';
import { evaluateProductSetRule, normalizeProductSetRule, productSetStableHash } from './rules';
import { upsertProviderProductSet } from './provider';
import type { ProductSetRule } from './types';

const PREVIEW_TTL_MS = 30 * 60_000;
const SYSTEM_ACTOR = 'system:meta-product-set-reconcile';

type ProductSetRecord = {
  id: string; catalogId: string; name: string; slug: string; description: string | null; status: string; syncStatus: string;
  providerProductSetId: string | null; ruleVersion: number; ruleJson: unknown; ruleHash: string; membershipHash: string | null;
  memberCount: number; autoSync: boolean; previewedAt: Date | null; previewExpiresAt: Date | null; lastSyncAt: Date | null;
  lastSucceededAt: Date | null; lastError: unknown; createdById: string; updatedById: string; createdAt: Date; updatedAt: Date;
};
type VersionRecord = { id: string; productSetId: string; version: number; ruleJson: unknown; ruleHash: string; membershipHash: string | null; memberCount: number; reason: string | null; createdById: string; createdAt: Date };
type PreviewRecord = { id: string; productSetId: string; ruleVersion: number; ruleHash: string; membershipHash: string; memberCount: number; sampledRetailerIds: string[]; createdById: string; expiresAt: Date; consumedAt: Date | null; createdAt: Date };
type MembershipRecord = { retailerId: string; sourceType: string; sourceId: string };
type Delegate<T> = {
  findUnique(args: unknown): Promise<T | null>;
  findMany(args: unknown): Promise<T[]>;
  create(args: unknown): Promise<T>;
  update(args: unknown): Promise<T>;
  updateMany(args: unknown): Promise<{ count: number }>;
  deleteMany(args: unknown): Promise<{ count: number }>;
  createMany(args: unknown): Promise<{ count: number }>;
};
type ProductSetDb = {
  metaProductSet: Delegate<ProductSetRecord>;
  metaProductSetVersion: Delegate<VersionRecord>;
  metaProductSetPreview: Delegate<PreviewRecord>;
  metaProductSetMembership: Delegate<MembershipRecord>;
  $transaction<T>(run: (tx: ProductSetDb) => Promise<T>): Promise<T>;
};
const db = prisma as unknown as ProductSetDb;

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (!slug) throw new Error('PRODUCT_SET_SLUG_INVALID');
  return slug;
}
function cleanName(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('PRODUCT_SET_NAME_REQUIRED');
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}
function providerId(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export async function listMetaProductSets(input: { catalogId?: string; includeArchived?: boolean } = {}) {
  return db.metaProductSet.findMany({
    where: { ...(input.catalogId ? { catalogId: input.catalogId } : {}), ...(input.includeArchived ? {} : { status: { not: 'ARCHIVED' } }) },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: { versions: { orderBy: { version: 'desc' }, take: 10 }, previews: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
}

export async function createMetaProductSet(input: {
  catalogId?: string; name: string; description?: string; rule: unknown; autoSync?: boolean; actorId: string; reason?: string;
}) {
  const config = getMetaBusinessConfig();
  const catalogId = input.catalogId?.trim() || config.catalogId;
  if (!catalogId) throw new Error('META_CATALOG_ID_REQUIRED');
  const name = cleanName(input.name);
  const rule = normalizeProductSetRule(input.rule);
  const ruleHash = productSetStableHash(rule);
  return db.$transaction(async (tx) => {
    const created = await tx.metaProductSet.create({ data: {
      catalogId, name, slug: slugify(name), description: input.description?.trim().slice(0, 2_000) || null,
      ruleJson: rule as never, ruleHash, autoSync: Boolean(input.autoSync), createdById: input.actorId, updatedById: input.actorId,
    } });
    await tx.metaProductSetVersion.create({ data: {
      productSetId: created.id, version: 1, ruleJson: rule as never, ruleHash,
      reason: input.reason?.trim().slice(0, 1_000) || 'Initial product set rule', createdById: input.actorId,
    } });
    incrementMetaCounter('meta_product_set_rule_mutations_total', { action: 'create', outcome: 'succeeded' });
    return created;
  });
}

export async function updateMetaProductSet(input: {
  productSetId: string; expectedVersion: number; name?: string; description?: string | null; rule?: unknown; autoSync?: boolean; actorId: string; reason?: string;
}) {
  const current = await db.metaProductSet.findUnique({ where: { id: input.productSetId } });
  if (!current) throw new Error('PRODUCT_SET_NOT_FOUND');
  if (current.ruleVersion !== input.expectedVersion) throw new Error('PRODUCT_SET_VERSION_CONFLICT');
  const rule: ProductSetRule = input.rule === undefined ? normalizeProductSetRule(current.ruleJson) : normalizeProductSetRule(input.rule);
  const ruleHash = productSetStableHash(rule);
  const nextVersion = current.ruleVersion + 1;
  return db.$transaction(async (tx) => {
    const claimed = await tx.metaProductSet.updateMany({ where: { id: current.id, ruleVersion: current.ruleVersion }, data: {
      name: input.name === undefined ? undefined : cleanName(input.name),
      slug: input.name === undefined ? undefined : slugify(cleanName(input.name)),
      description: input.description === undefined ? undefined : input.description?.trim().slice(0, 2_000) || null,
      ruleJson: rule as never, ruleHash, ruleVersion: nextVersion, autoSync: input.autoSync,
      status: 'DRAFT', syncStatus: 'NOT_SYNCED', membershipHash: null, memberCount: 0, previewedAt: null, previewExpiresAt: null,
      lastError: null, updatedById: input.actorId,
    } });
    if (claimed.count !== 1) throw new Error('PRODUCT_SET_VERSION_CONFLICT');
    await tx.metaProductSetMembership.deleteMany({ where: { productSetId: current.id } });
    await tx.metaProductSetPreview.deleteMany({ where: { productSetId: current.id, consumedAt: null } });
    await tx.metaProductSetVersion.create({ data: {
      productSetId: current.id, version: nextVersion, ruleJson: rule as never, ruleHash,
      reason: input.reason?.trim().slice(0, 1_000) || 'Product set rule updated', createdById: input.actorId,
    } });
    incrementMetaCounter('meta_product_set_rule_mutations_total', { action: 'update', outcome: 'succeeded' });
    return tx.metaProductSet.findUnique({ where: { id: current.id } });
  });
}

export async function previewMetaProductSet(input: { productSetId: string; actorId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const set = await db.metaProductSet.findUnique({ where: { id: input.productSetId } });
  if (!set || set.status === 'ARCHIVED') throw new Error('PRODUCT_SET_NOT_FOUND');
  const source = await listCanonicalCatalogItemsForProductSets({ now });
  const preview = evaluateProductSetRule(source.items, set.ruleJson);
  const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS);
  const saved = await db.$transaction(async (tx) => {
    await tx.metaProductSetMembership.deleteMany({ where: { productSetId: set.id } });
    if (preview.members.length) await tx.metaProductSetMembership.createMany({ data: preview.members.map((item) => ({ productSetId: set.id, ...item, includedAt: now })) });
    const row = await tx.metaProductSetPreview.create({ data: {
      productSetId: set.id, ruleVersion: set.ruleVersion, ruleHash: preview.ruleHash, membershipHash: preview.membershipHash,
      memberCount: preview.memberCount, sampledRetailerIds: preview.sampledRetailerIds, createdById: input.actorId, expiresAt,
    } });
    await tx.metaProductSet.update({ where: { id: set.id }, data: {
      status: preview.memberCount === 0 ? 'EMPTY' : 'READY', membershipHash: preview.membershipHash, memberCount: preview.memberCount,
      previewedAt: now, previewExpiresAt: expiresAt, lastError: null, updatedById: input.actorId,
    } });
    await tx.metaProductSetVersion.updateMany({ where: { productSetId: set.id, version: set.ruleVersion }, data: { membershipHash: preview.membershipHash, memberCount: preview.memberCount } });
    return row;
  });
  setMetaGauge('meta_product_set_members_total', { status: preview.memberCount === 0 ? 'empty' : 'ready' }, preview.memberCount);
  if (preview.memberCount === 0) {
    await openOrRefreshMetaIncident({
      incidentType: 'PRODUCT_SET_EMPTY', severity: 'WARNING', resourceType: 'META_PRODUCT_SET', resourceId: set.id,
      summary: `Product set ${set.name} has no matching catalog items.`, details: { ruleVersion: set.ruleVersion, invalidCatalogItems: source.invalidItems.length },
      runbookUrl: '/admin/meta?tab=product-sets', at: now, timeWindowMinutes: 240, cooldownMinutes: 60,
    });
  }
  return { previewId: saved.id, expiresAt, ...preview, invalidCatalogItems: source.invalidItems.length };
}

export async function syncMetaProductSetFromPreview(input: { productSetId: string; previewId: string; actorId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const [set, preview, memberships] = await Promise.all([
    db.metaProductSet.findUnique({ where: { id: input.productSetId } }),
    db.metaProductSetPreview.findUnique({ where: { id: input.previewId } }),
    db.metaProductSetMembership.findMany({ where: { productSetId: input.productSetId }, orderBy: { retailerId: 'asc' } }),
  ]);
  if (!set || set.status === 'ARCHIVED') throw new Error('PRODUCT_SET_NOT_FOUND');
  if (!preview || preview.productSetId !== set.id) throw new Error('PRODUCT_SET_PREVIEW_NOT_FOUND');
  if (preview.consumedAt) throw new Error('PRODUCT_SET_PREVIEW_ALREADY_CONSUMED');
  if (preview.expiresAt <= now) throw new Error('PRODUCT_SET_PREVIEW_EXPIRED');
  if (preview.ruleVersion !== set.ruleVersion || preview.ruleHash !== set.ruleHash || preview.membershipHash !== set.membershipHash || preview.memberCount !== memberships.length) throw new Error('PRODUCT_SET_PREVIEW_STALE');
  if (memberships.length === 0) throw new Error('PRODUCT_SET_EMPTY_SYNC_BLOCKED');
  await db.metaProductSet.update({ where: { id: set.id }, data: { status: 'SYNCING', syncStatus: 'SUBMITTED', lastSyncAt: now, updatedById: input.actorId } });
  try {
    const provider = await upsertProviderProductSet({
      catalogId: set.catalogId, providerProductSetId: set.providerProductSetId, name: set.name,
      retailerIds: memberships.map((item) => item.retailerId),
    });
    const externalId = providerId(provider) ?? set.providerProductSetId;
    const updated = await db.$transaction(async (tx) => {
      await tx.metaProductSetPreview.update({ where: { id: preview.id }, data: { consumedAt: now } });
      return tx.metaProductSet.update({ where: { id: set.id }, data: {
        providerProductSetId: externalId, status: 'ACTIVE', syncStatus: 'SUCCEEDED', lastSucceededAt: now,
        lastError: null, updatedById: input.actorId,
      } });
    });
    incrementMetaCounter('meta_product_set_sync_total', { operation: externalId && set.providerProductSetId ? 'update' : 'create', outcome: 'succeeded' });
    return { productSet: updated, provider, verifiedMembershipHash: preview.membershipHash, verifiedMemberCount: memberships.length };
  } catch (error) {
    const safe = redactObservabilityData(error instanceof Error ? { name: error.name, message: error.message } : error);
    await db.metaProductSet.update({ where: { id: set.id }, data: { status: 'BROKEN', syncStatus: 'FAILED', lastError: safe as never, updatedById: input.actorId } });
    incrementMetaCounter('meta_product_set_sync_total', { operation: set.providerProductSetId ? 'update' : 'create', outcome: 'failed' });
    await openOrRefreshMetaIncident({
      incidentType: 'PRODUCT_SET_BROKEN', severity: 'ERROR', resourceType: 'META_PRODUCT_SET', resourceId: set.id,
      summary: `Product set ${set.name} failed to synchronize with Meta.`, details: safe,
      runbookUrl: '/admin/meta?tab=product-sets', at: now, timeWindowMinutes: 120, cooldownMinutes: 30,
    });
    throw error;
  }
}

export async function rollbackMetaProductSetRule(input: { productSetId: string; targetVersion: number; expectedVersion: number; actorId: string; reason?: string }) {
  const [set, target] = await Promise.all([
    db.metaProductSet.findUnique({ where: { id: input.productSetId } }),
    db.metaProductSetVersion.findUnique({ where: { productSetId_version: { productSetId: input.productSetId, version: input.targetVersion } } }),
  ]);
  if (!set || !target) throw new Error('PRODUCT_SET_VERSION_NOT_FOUND');
  if (set.ruleVersion !== input.expectedVersion) throw new Error('PRODUCT_SET_VERSION_CONFLICT');
  const nextVersion = set.ruleVersion + 1;
  return db.$transaction(async (tx) => {
    const claimed = await tx.metaProductSet.updateMany({ where: { id: set.id, ruleVersion: set.ruleVersion }, data: {
      ruleVersion: nextVersion, ruleJson: target.ruleJson as never, ruleHash: target.ruleHash,
      status: 'DRAFT', syncStatus: 'NOT_SYNCED', membershipHash: null, memberCount: 0, previewedAt: null, previewExpiresAt: null,
      lastError: null, updatedById: input.actorId,
    } });
    if (claimed.count !== 1) throw new Error('PRODUCT_SET_VERSION_CONFLICT');
    await tx.metaProductSetMembership.deleteMany({ where: { productSetId: set.id } });
    await tx.metaProductSetPreview.deleteMany({ where: { productSetId: set.id, consumedAt: null } });
    await tx.metaProductSetVersion.create({ data: {
      productSetId: set.id, version: nextVersion, ruleJson: target.ruleJson as never, ruleHash: target.ruleHash,
      reason: input.reason?.trim().slice(0, 1_000) || `Rollback to version ${target.version}`, createdById: input.actorId,
    } });
    incrementMetaCounter('meta_product_set_rule_mutations_total', { action: 'rollback', outcome: 'succeeded' });
    return tx.metaProductSet.findUnique({ where: { id: set.id } });
  });
}

export async function reconcileMetaProductSets(input: { actorId?: string; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const actorId = input.actorId ?? SYSTEM_ACTOR;
  const sets = await db.metaProductSet.findMany({ where: { status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'asc' } });
  const results: Array<{ id: string; status: string; memberCount?: number; error?: string }> = [];
  for (const set of sets) {
    try {
      const preview = await previewMetaProductSet({ productSetId: set.id, actorId, now });
      if (set.autoSync && preview.memberCount > 0) {
        await syncMetaProductSetFromPreview({ productSetId: set.id, previewId: preview.previewId, actorId, now });
        results.push({ id: set.id, status: 'SYNCED', memberCount: preview.memberCount });
      } else results.push({ id: set.id, status: preview.memberCount === 0 ? 'EMPTY' : 'PREVIEWED', memberCount: preview.memberCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PRODUCT_SET_RECONCILE_FAILED';
      await db.metaProductSet.update({ where: { id: set.id }, data: { status: 'BROKEN', syncStatus: 'FAILED', lastError: redactObservabilityData({ message }) as never, updatedById: actorId } }).catch(() => undefined);
      await openOrRefreshMetaIncident({
        incidentType: 'PRODUCT_SET_BROKEN', severity: 'ERROR', resourceType: 'META_PRODUCT_SET', resourceId: set.id,
        summary: `Product set ${set.name} could not be evaluated.`, details: { message }, runbookUrl: '/admin/meta?tab=product-sets',
        at: now, timeWindowMinutes: 120, cooldownMinutes: 30,
      });
      results.push({ id: set.id, status: 'BROKEN', error: message });
    }
  }
  return { checkedAt: now, evaluated: sets.length, results };
}
