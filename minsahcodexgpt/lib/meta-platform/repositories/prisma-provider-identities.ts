import 'server-only';

import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import type { MetaAssetType, MetaPlatformEnvironment } from '../context/asset-context';
import {
  MetaProviderIdentityError,
  assertMetaProviderIdentityReceiptCompatibility,
  metaProviderIdentityCanonicalKey,
  metaProviderIdentityLocalId,
  normalizeMetaProviderIdentityInput,
  sanitizeMetaProviderIdentityMetadata,
  sanitizeMetaProviderPermissionMetadata,
  type MetaProviderIdentityAssetType,
  type MetaProviderIdentityRecord,
  type MetaProviderIdentityRepository,
  type MetaProviderIdentityStatus,
  type MetaProviderPermissionHealth,
  type RegisterMetaProviderIdentityInput,
} from './provider-identities';
import {
  assertMetaProviderIdentityRelationship,
  type MetaProviderIdentityRelationshipRecord,
  type MetaProviderIdentityRelationshipRepository,
  type MetaProviderIdentityRelationshipStatus,
  type MetaProviderIdentityRelationshipType,
} from './provider-identity-relationships';
import { buildMetaProviderIdentityBackfillPlan } from './provider-identity-backfill';
import type { MetaConnectionAssetSnapshot } from '../references/backfill';

interface SqlClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: readonly unknown[]): Promise<T>;
}

interface IdentityRow {
  id: string;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  assetType: MetaProviderIdentityAssetType;
  providerId: string;
  localId: string;
  canonicalKey: string;
  identityStatus: MetaProviderIdentityStatus;
  permissionHealth: MetaProviderPermissionHealth;
  metadata: Record<string, unknown> | null;
  permissionMetadata: Record<string, readonly string[]> | null;
  source: MetaProviderIdentityRecord['source'];
  lastSeenAt: Date | string | null;
  lastVerifiedAt: Date | string | null;
  disabledAt: Date | string | null;
  revokedAt: Date | string | null;
  statusReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RelationshipRow {
  id: string;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  relationshipType: MetaProviderIdentityRelationshipType;
  parentReferenceId: string;
  childReferenceId: string;
  status: MetaProviderIdentityRelationshipStatus;
  source: MetaProviderIdentityRelationshipRecord['source'];
  metadata: Record<string, unknown> | null;
  lastVerifiedAt: Date | string | null;
  disabledAt: Date | string | null;
  revokedAt: Date | string | null;
  statusReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const IDENTITY_COLUMNS = `
  "id", "environment", "connectionKey", "assetType", "providerId", "localId", "canonicalKey",
  "identityStatus", "permissionHealth", "metadata", "permissionMetadata", "source", "lastSeenAt",
  "lastVerifiedAt", "disabledAt", "revokedAt", "statusReason", "createdAt", "updatedAt"`;
const RELATION_COLUMNS = `
  "id", "environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId",
  "status", "source", "metadata", "lastVerifiedAt", "disabledAt", "revokedAt", "statusReason",
  "createdAt", "updatedAt"`;

function iso(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('META_PROVIDER_IDENTITY_DATABASE_DATE_INVALID');
  return date.toISOString();
}

function mapIdentity(row: IdentityRow): MetaProviderIdentityRecord {
  return Object.freeze({
    id: row.id,
    environment: row.environment,
    connectionKey: row.connectionKey,
    assetType: row.assetType,
    providerId: row.providerId,
    localId: row.localId,
    canonicalKey: row.canonicalKey,
    identityStatus: row.identityStatus,
    permissionHealth: row.permissionHealth,
    metadata: Object.freeze({ ...(row.metadata ?? {}) }),
    permissionMetadata: Object.freeze({ ...(row.permissionMetadata ?? {}) }),
    source: row.source,
    ...(iso(row.lastSeenAt) ? { lastSeenAt: iso(row.lastSeenAt) } : {}),
    ...(iso(row.lastVerifiedAt) ? { lastVerifiedAt: iso(row.lastVerifiedAt) } : {}),
    ...(iso(row.disabledAt) ? { disabledAt: iso(row.disabledAt) } : {}),
    ...(iso(row.revokedAt) ? { revokedAt: iso(row.revokedAt) } : {}),
    ...(row.statusReason ? { statusReason: row.statusReason } : {}),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  });
}

function mapRelationship(row: RelationshipRow): MetaProviderIdentityRelationshipRecord {
  return Object.freeze({
    id: row.id,
    environment: row.environment,
    connectionKey: row.connectionKey,
    relationshipType: row.relationshipType,
    parentReferenceId: row.parentReferenceId,
    childReferenceId: row.childReferenceId,
    status: row.status,
    source: row.source,
    metadata: Object.freeze({ ...(row.metadata ?? {}) }),
    ...(iso(row.lastVerifiedAt) ? { lastVerifiedAt: iso(row.lastVerifiedAt) } : {}),
    ...(iso(row.disabledAt) ? { disabledAt: iso(row.disabledAt) } : {}),
    ...(iso(row.revokedAt) ? { revokedAt: iso(row.revokedAt) } : {}),
    ...(row.statusReason ? { statusReason: row.statusReason } : {}),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  });
}

function requiredText(value: unknown, code: string, maxLength = 255): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const clean = value.trim();
  if (!clean || clean.length > maxLength) throw new TypeError(code);
  return clean;
}

function safeReason(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const clean = requiredText(value, 'META_PROVIDER_IDENTITY_STATUS_REASON_INVALID', 80).toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(clean)) throw new TypeError('META_PROVIDER_IDENTITY_STATUS_REASON_INVALID');
  return clean;
}

function dateOrNull(value: Date | string | undefined, code: string): Date | null {
  if (value === undefined) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(code);
  return date;
}

export function createPrismaMetaProviderIdentityRepository(client: SqlClient = prisma): MetaProviderIdentityRepository {
  const repository: MetaProviderIdentityRepository = {
    async register(raw: RegisterMetaProviderIdentityInput) {
      const input = normalizeMetaProviderIdentityInput(raw);
      const rows = await client.$queryRawUnsafe<IdentityRow[]>(`
        INSERT INTO "MetaExternalReference" (
          "id", "environment", "connectionKey", "assetType", "assetId", "objectType", "localId", "providerId",
          "canonicalKey", "source", "metadata", "identityStatus", "permissionHealth", "permissionMetadata",
          "lastSeenAt", "lastVerifiedAt", "disabledAt", "revokedAt", "statusReason", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2::"MetaPlatformEnvironment", $3, $4::"MetaAssetType", $5, 'PROVIDER_IDENTITY', $6, $5,
          $7, $8::"MetaExternalReferenceSource", $9::jsonb, $10::"MetaProviderIdentityStatus",
          $11::"MetaProviderPermissionHealth", $12::jsonb, $13, $14,
          CASE WHEN $10::"MetaProviderIdentityStatus"='INACTIVE' THEN COALESCE($14, NOW()) ELSE NULL END,
          CASE WHEN $10::"MetaProviderIdentityStatus"='REVOKED' THEN COALESCE($14, NOW()) ELSE NULL END,
          $15, NOW(), NOW()
        )
        ON CONFLICT ("environment", "connectionKey", "assetType", "assetId", "objectType", "localId")
        DO UPDATE SET
          "source" = EXCLUDED."source",
          "metadata" = CASE WHEN EXCLUDED."metadata" = '{}'::jsonb THEN "MetaExternalReference"."metadata" ELSE EXCLUDED."metadata" END,
          "identityStatus" = CASE WHEN $16::boolean THEN EXCLUDED."identityStatus" ELSE "MetaExternalReference"."identityStatus" END,
          "permissionHealth" = CASE WHEN $17::boolean THEN EXCLUDED."permissionHealth" ELSE "MetaExternalReference"."permissionHealth" END,
          "permissionMetadata" = CASE WHEN EXCLUDED."permissionMetadata" = '{}'::jsonb THEN "MetaExternalReference"."permissionMetadata" ELSE EXCLUDED."permissionMetadata" END,
          "lastSeenAt" = GREATEST("MetaExternalReference"."lastSeenAt", EXCLUDED."lastSeenAt"),
          "lastVerifiedAt" = GREATEST("MetaExternalReference"."lastVerifiedAt", EXCLUDED."lastVerifiedAt"),
          "disabledAt" = CASE WHEN (CASE WHEN $16::boolean THEN EXCLUDED."identityStatus" ELSE "MetaExternalReference"."identityStatus" END)='INACTIVE' THEN COALESCE("MetaExternalReference"."disabledAt", NOW()) ELSE "MetaExternalReference"."disabledAt" END,
          "revokedAt" = CASE WHEN (CASE WHEN $16::boolean THEN EXCLUDED."identityStatus" ELSE "MetaExternalReference"."identityStatus" END)='REVOKED' THEN COALESCE("MetaExternalReference"."revokedAt", NOW()) ELSE "MetaExternalReference"."revokedAt" END,
          "statusReason" = COALESCE(EXCLUDED."statusReason", "MetaExternalReference"."statusReason"),
          "updatedAt" = NOW()
        WHERE "MetaExternalReference"."providerId" = EXCLUDED."providerId"
          AND NOT ("MetaExternalReference"."identityStatus"='REVOKED' AND $16::boolean AND EXCLUDED."identityStatus"<>'REVOKED')
        RETURNING ${IDENTITY_COLUMNS}`,
      randomUUID(), input.environment, input.connectionKey, input.assetType, input.providerId,
      input.localId, input.canonicalKey, input.source, JSON.stringify(input.metadata), input.identityStatus,
      input.permissionHealth, JSON.stringify(input.permissionMetadata), input.seenAt ? new Date(input.seenAt) : null,
      input.verifiedAt ? new Date(input.verifiedAt) : null, input.statusReason ?? null,
      input.identityStatusExplicit, input.permissionHealthExplicit);
      if (!rows[0]) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_CONFLICT');
      return mapIdentity(rows[0]);
    },

    async resolve(lookup) {
      const rows = await client.$queryRawUnsafe<IdentityRow[]>(`
        SELECT ${IDENTITY_COLUMNS}
        FROM "MetaExternalReference"
        WHERE "environment"=$1::"MetaPlatformEnvironment" AND "connectionKey"=$2
          AND "assetType"=$3::"MetaAssetType" AND "assetId"=$4
          AND "objectType"='PROVIDER_IDENTITY' AND "providerId"=$4
        LIMIT 2`, lookup.environment, lookup.connectionKey.trim(), lookup.assetType, lookup.providerId.trim());
      if (rows.length > 1) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_AMBIGUOUS');
      return rows[0] ? mapIdentity(rows[0]) : null;
    },

    async getById(id) {
      const rows = await client.$queryRawUnsafe<IdentityRow[]>(`
        SELECT ${IDENTITY_COLUMNS} FROM "MetaExternalReference"
        WHERE "id"=$1 AND "objectType"='PROVIDER_IDENTITY' LIMIT 1`, requiredText(id, 'META_PROVIDER_IDENTITY_ID_INVALID'));
      return rows[0] ? mapIdentity(rows[0]) : null;
    },

    async updateHealth(input) {
      const identityId = requiredText(input.identityId, 'META_PROVIDER_IDENTITY_ID_INVALID');
      const currentRows = await client.$queryRawUnsafe<IdentityRow[]>(`
        SELECT ${IDENTITY_COLUMNS} FROM "MetaExternalReference"
        WHERE "id"=$1 AND "objectType"='PROVIDER_IDENTITY' LIMIT 1`, identityId);
      const current = currentRows[0];
      if (!current) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND');
      const nextStatus = input.identityStatus ?? current.identityStatus;
      if (current.identityStatus === 'REVOKED' && nextStatus !== 'REVOKED') {
        throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID');
      }
      const rows = await client.$queryRawUnsafe<IdentityRow[]>(`
        UPDATE "MetaExternalReference" SET
          "identityStatus"=$2::"MetaProviderIdentityStatus",
          "permissionHealth"=$3::"MetaProviderPermissionHealth",
          "permissionMetadata"=COALESCE($4::jsonb, "permissionMetadata"),
          "lastVerifiedAt"=COALESCE($5, "lastVerifiedAt"),
          "disabledAt"=CASE WHEN $2::"MetaProviderIdentityStatus"='INACTIVE' THEN COALESCE("disabledAt", COALESCE($5,NOW())) ELSE "disabledAt" END,
          "revokedAt"=CASE WHEN $2::"MetaProviderIdentityStatus"='REVOKED' THEN COALESCE("revokedAt", COALESCE($5,NOW())) ELSE "revokedAt" END,
          "statusReason"=COALESCE($6, "statusReason"),
          "updatedAt"=NOW()
        WHERE "id"=$1 AND "objectType"='PROVIDER_IDENTITY'
          AND NOT ("identityStatus"='REVOKED' AND $2::"MetaProviderIdentityStatus"<>'REVOKED')
        RETURNING ${IDENTITY_COLUMNS}`,
      identityId, nextStatus, input.permissionHealth ?? current.permissionHealth,
      input.permissionMetadata === undefined ? null : JSON.stringify(sanitizeMetaProviderPermissionMetadata(input.permissionMetadata)),
      dateOrNull(input.verifiedAt, 'META_PROVIDER_IDENTITY_VERIFIED_AT_INVALID'), safeReason(input.statusReason));
      if (!rows[0]) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID');
      return mapIdentity(rows[0]);
    },

    disable(input) {
      return this.updateHealth({ identityId: input.identityId, identityStatus: 'INACTIVE', statusReason: input.reason, verifiedAt: input.at });
    },

    revoke(input) {
      return this.updateHealth({ identityId: input.identityId, identityStatus: 'REVOKED', permissionHealth: 'BLOCKED', statusReason: input.reason, verifiedAt: input.at });
    },
  };
  return Object.freeze(repository);
}

export function createPrismaMetaProviderIdentityRelationshipRepository(input: {
  readonly identities?: MetaProviderIdentityRepository;
  readonly client?: SqlClient;
} = {}): MetaProviderIdentityRelationshipRepository {
  const client = input.client ?? prisma;
  const identities = input.identities ?? createPrismaMetaProviderIdentityRepository(client);
  const repository: MetaProviderIdentityRelationshipRepository = {
    async link(raw) {
      const parent = await identities.getById(requiredText(raw.parentIdentityId, 'META_PROVIDER_RELATION_PARENT_ID_INVALID'));
      const child = await identities.getById(requiredText(raw.childIdentityId, 'META_PROVIDER_RELATION_CHILD_ID_INVALID'));
      if (!parent || !child) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND');
      assertMetaProviderIdentityRelationship({ relationshipType: raw.relationshipType, parent, child });
      const status = raw.status ?? 'UNVERIFIED';
      const source = raw.source ?? 'RUNTIME';
      const verifiedAt = dateOrNull(raw.verifiedAt, 'META_PROVIDER_RELATION_DATE_INVALID');
      const metadata = sanitizeMetaProviderIdentityMetadata(raw.metadata);
      const rows = await client.$queryRawUnsafe<RelationshipRow[]>(`
        INSERT INTO "MetaProviderIdentityRelationship" (
          "id", "environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId",
          "status", "source", "metadata", "lastVerifiedAt", "disabledAt", "revokedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2::"MetaPlatformEnvironment", $3, $4::"MetaProviderIdentityRelationshipType", $5, $6,
          $7::"MetaProviderIdentityRelationshipStatus", $8::"MetaExternalReferenceSource", $9::jsonb, $10,
          CASE WHEN $7::"MetaProviderIdentityRelationshipStatus"='INACTIVE' THEN COALESCE($10,NOW()) ELSE NULL END,
          CASE WHEN $7::"MetaProviderIdentityRelationshipStatus"='REVOKED' THEN COALESCE($10,NOW()) ELSE NULL END,
          NOW(), NOW()
        )
        ON CONFLICT ("environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId")
        DO UPDATE SET
          "status"=EXCLUDED."status", "source"=EXCLUDED."source",
          "metadata"=CASE WHEN EXCLUDED."metadata"='{}'::jsonb THEN "MetaProviderIdentityRelationship"."metadata" ELSE EXCLUDED."metadata" END,
          "lastVerifiedAt"=GREATEST("MetaProviderIdentityRelationship"."lastVerifiedAt", EXCLUDED."lastVerifiedAt"),
          "disabledAt"=CASE WHEN EXCLUDED."status"='INACTIVE' THEN COALESCE("MetaProviderIdentityRelationship"."disabledAt",NOW()) ELSE "MetaProviderIdentityRelationship"."disabledAt" END,
          "revokedAt"=CASE WHEN EXCLUDED."status"='REVOKED' THEN COALESCE("MetaProviderIdentityRelationship"."revokedAt",NOW()) ELSE "MetaProviderIdentityRelationship"."revokedAt" END,
          "updatedAt"=NOW()
        WHERE NOT ("MetaProviderIdentityRelationship"."status"='REVOKED' AND EXCLUDED."status"<>'REVOKED')
        RETURNING ${RELATION_COLUMNS}`,
      randomUUID(), parent.environment, parent.connectionKey, raw.relationshipType, parent.id, child.id,
      status, source, JSON.stringify(metadata), verifiedAt);
      if (!rows[0]) throw new MetaProviderIdentityError('META_PROVIDER_RELATION_STATUS_TRANSITION_INVALID');
      return mapRelationship(rows[0]);
    },

    async find(raw) {
      const rows = await client.$queryRawUnsafe<RelationshipRow[]>(`
        SELECT ${RELATION_COLUMNS} FROM "MetaProviderIdentityRelationship"
        WHERE "relationshipType"=$1::"MetaProviderIdentityRelationshipType"
          AND "parentReferenceId"=$2 AND "childReferenceId"=$3 LIMIT 1`,
      raw.relationshipType, raw.parentIdentityId, raw.childIdentityId);
      return rows[0] ? mapRelationship(rows[0]) : null;
    },

    async listByParent(raw) {
      const rows = await client.$queryRawUnsafe<RelationshipRow[]>(`
        SELECT ${RELATION_COLUMNS} FROM "MetaProviderIdentityRelationship"
        WHERE "relationshipType"=$1::"MetaProviderIdentityRelationshipType" AND "parentReferenceId"=$2
        ORDER BY "createdAt" ASC`, raw.relationshipType, raw.parentIdentityId);
      return Object.freeze(rows.map(mapRelationship));
    },

    async listByChild(raw) {
      const rows = await client.$queryRawUnsafe<RelationshipRow[]>(`
        SELECT ${RELATION_COLUMNS} FROM "MetaProviderIdentityRelationship"
        WHERE "relationshipType"=$1::"MetaProviderIdentityRelationshipType" AND "childReferenceId"=$2
        ORDER BY "createdAt" ASC`, raw.relationshipType, raw.childIdentityId);
      return Object.freeze(rows.map(mapRelationship));
    },
  };
  return Object.freeze(repository);
}

export async function attachMetaSocialWebhookPrimaryIdentity(input: {
  readonly receiptId: string;
  readonly identityId: string;
  readonly client?: SqlClient;
}): Promise<Readonly<{ receiptId: string; identityId: string; attached: boolean }>> {
  const client = input.client ?? prisma;
  const receiptId = requiredText(input.receiptId, 'META_SOCIAL_WEBHOOK_RECEIPT_ID_INVALID', 512);
  const identityId = requiredText(input.identityId, 'META_PROVIDER_IDENTITY_ID_INVALID');
  const receiptRows = await client.$queryRawUnsafe<Array<{
    id: string;
    platform: string;
    environment: MetaPlatformEnvironment;
    connectionKey: string;
    primaryIdentityReferenceId: string | null;
  }>>(`SELECT "id", "platform", "environment", "connectionKey", "primaryIdentityReferenceId"
      FROM "MetaSocialWebhookReceipt" WHERE "id"=$1 LIMIT 1`, receiptId);
  const identityRows = await client.$queryRawUnsafe<IdentityRow[]>(`
    SELECT ${IDENTITY_COLUMNS} FROM "MetaExternalReference"
    WHERE "id"=$1 AND "objectType"='PROVIDER_IDENTITY' LIMIT 1`, identityId);
  const receipt = receiptRows[0];
  const identity = identityRows[0] ? mapIdentity(identityRows[0]) : null;
  if (!receipt) throw new MetaProviderIdentityError('META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND');
  if (!identity) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND');
  assertMetaProviderIdentityReceiptCompatibility({
    platform: receipt.platform as 'LEAD_ADS' | 'INSTAGRAM' | 'FACEBOOK_PAGE',
    environment: receipt.environment,
    connectionKey: receipt.connectionKey,
    identity,
  });
  if (receipt.primaryIdentityReferenceId === identity.id) return Object.freeze({ receiptId, identityId, attached: false });
  const updated = await client.$queryRawUnsafe<Array<{ id: string }>>(`
    UPDATE "MetaSocialWebhookReceipt" SET "primaryIdentityReferenceId"=$2, "updatedAt"=NOW()
    WHERE "id"=$1 AND "primaryIdentityReferenceId" IS NULL RETURNING "id"`, receiptId, identityId);
  if (!updated[0]) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_RECEIPT_CONFLICT');
  return Object.freeze({ receiptId, identityId, attached: true });
}

export async function backfillMetaConnectionProviderIdentities(input: {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly snapshot: MetaConnectionAssetSnapshot;
}) {
  const plan = buildMetaProviderIdentityBackfillPlan(input);
  const identities = createPrismaMetaProviderIdentityRepository();
  const relationships = createPrismaMetaProviderIdentityRelationshipRepository({ identities });
  const byAsset = new Map<MetaAssetType, MetaProviderIdentityRecord>();
  for (const identity of plan.identities) {
    const registered = await identities.register({ ...identity, context: plan.context });
    byAsset.set(registered.assetType, registered);
  }
  const linked: MetaProviderIdentityRelationshipRecord[] = [];
  for (const relation of plan.relationships) {
    const parent = byAsset.get(relation.parentAssetType);
    const child = byAsset.get(relation.childAssetType);
    if (!parent || !child) continue;
    linked.push(await relationships.link({
      relationshipType: relation.relationshipType,
      parentIdentityId: parent.id,
      childIdentityId: child.id,
      status: 'UNVERIFIED',
      source: 'BACKFILL',
    }));
  }
  return Object.freeze({ identities: Object.freeze([...byAsset.values()]), relationships: Object.freeze(linked) });
}

export const prismaMetaProviderIdentities = createPrismaMetaProviderIdentityRepository();
export const prismaMetaProviderIdentityRelationships = createPrismaMetaProviderIdentityRelationshipRepository({
  identities: prismaMetaProviderIdentities,
});
