import 'server-only';

import { randomUUID } from 'node:crypto';

import prisma from '@/lib/prisma';
import { assertMetaReferenceScope, type MetaAssetContext } from '../context/asset-context';
import type {
  MetaExternalReferenceLocalLookup,
  MetaExternalReferenceProviderLookup,
  MetaExternalReferenceRecord,
  RegisterMetaExternalReferenceInput,
} from './types';
import {
  MetaExternalReferenceConflictError,
  normalizeMetaExternalReferenceInput,
  type MetaExternalReferenceRepository,
} from './repository';

interface MetaReferenceSqlClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: readonly unknown[]): Promise<T>;
}

interface MetaExternalReferenceRow {
  id: string;
  environment: MetaExternalReferenceRecord['environment'];
  connectionKey: string;
  assetType: MetaExternalReferenceRecord['assetType'];
  assetId: string;
  objectType: string;
  localId: string;
  providerId: string;
  providerParentId: string | null;
  canonicalKey: string | null;
  source: MetaExternalReferenceRecord['source'];
  metadata: MetaExternalReferenceRecord['metadata'] | null;
  lastVerifiedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const SELECT_COLUMNS = `
  "id", "environment", "connectionKey", "assetType", "assetId", "objectType",
  "localId", "providerId", "providerParentId", "canonicalKey", "source", "metadata",
  "lastVerifiedAt", "createdAt", "updatedAt"`;

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('META_REFERENCE_DATABASE_DATE_INVALID');
  return date.toISOString();
}

function mapRow(row: MetaExternalReferenceRow): MetaExternalReferenceRecord {
  return Object.freeze({
    id: row.id,
    environment: row.environment,
    connectionKey: row.connectionKey,
    assetType: row.assetType,
    assetId: row.assetId,
    objectType: row.objectType,
    localId: row.localId,
    providerId: row.providerId,
    ...(row.providerParentId ? { providerParentId: row.providerParentId } : {}),
    ...(row.canonicalKey ? { canonicalKey: row.canonicalKey } : {}),
    source: row.source,
    ...(row.metadata ? { metadata: Object.freeze({ ...row.metadata }) } : {}),
    ...(row.lastVerifiedAt ? { lastVerifiedAt: iso(row.lastVerifiedAt) } : {}),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
}

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

export class PrismaMetaExternalReferenceRepository implements MetaExternalReferenceRepository {
  constructor(private readonly client: MetaReferenceSqlClient) {}

  async findByLocal(lookup: MetaExternalReferenceLocalLookup): Promise<MetaExternalReferenceRecord | null> {
    const rows = await this.client.$queryRawUnsafe<MetaExternalReferenceRow[]>(`
      SELECT ${SELECT_COLUMNS}
      FROM "MetaExternalReference"
      WHERE "environment" = $1::"MetaPlatformEnvironment"
        AND "connectionKey" = $2
        AND "assetType" = $3::"MetaAssetType"
        AND "assetId" = $4
        AND "objectType" = $5
        AND "localId" = $6
      LIMIT 1`, lookup.environment, lookup.connectionKey, lookup.assetType, lookup.assetId, lookup.objectType, lookup.localId);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByProvider(lookup: MetaExternalReferenceProviderLookup): Promise<MetaExternalReferenceRecord | null> {
    const rows = await this.client.$queryRawUnsafe<MetaExternalReferenceRow[]>(`
      SELECT ${SELECT_COLUMNS}
      FROM "MetaExternalReference"
      WHERE "environment" = $1::"MetaPlatformEnvironment"
        AND "connectionKey" = $2
        AND "assetType" = $3::"MetaAssetType"
        AND "assetId" = $4
        AND "objectType" = $5
        AND "providerId" = $6
      LIMIT 1`, lookup.environment, lookup.connectionKey, lookup.assetType, lookup.assetId, lookup.objectType, lookup.providerId);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async register(context: MetaAssetContext, rawInput: RegisterMetaExternalReferenceInput): Promise<MetaExternalReferenceRecord> {
    const input = normalizeMetaExternalReferenceInput(rawInput);
    assertMetaReferenceScope(context, input);
    try {
      const rows = await this.client.$queryRawUnsafe<MetaExternalReferenceRow[]>(`
        INSERT INTO "MetaExternalReference" (
          "id", "environment", "connectionKey", "assetType", "assetId", "objectType",
          "localId", "providerId", "providerParentId", "canonicalKey", "source", "metadata", "lastVerifiedAt", "updatedAt"
        ) VALUES (
          $1, $2::"MetaPlatformEnvironment", $3, $4::"MetaAssetType", $5, $6,
          $7, $8, $9, $10, $11::"MetaExternalReferenceSource", $12::jsonb, $13, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("environment", "connectionKey", "assetType", "assetId", "objectType", "localId")
        DO UPDATE SET
          "providerParentId" = EXCLUDED."providerParentId",
          "canonicalKey" = EXCLUDED."canonicalKey",
          "source" = EXCLUDED."source",
          "metadata" = COALESCE(EXCLUDED."metadata", "MetaExternalReference"."metadata"),
          "lastVerifiedAt" = COALESCE(EXCLUDED."lastVerifiedAt", "MetaExternalReference"."lastVerifiedAt"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "MetaExternalReference"."providerId" = EXCLUDED."providerId"
        RETURNING ${SELECT_COLUMNS}`,
      randomUUID(), input.environment, input.connectionKey, input.assetType, input.assetId, input.objectType,
      input.localId, input.providerId, input.providerParentId ?? null, input.canonicalKey ?? null, input.source,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null);

      if (!rows[0]) throw new MetaExternalReferenceConflictError('META_REFERENCE_LOCAL_CONFLICT');
      return mapRow(rows[0]);
    } catch (error) {
      if (error instanceof MetaExternalReferenceConflictError) throw error;
      if (postgresCode(error) === '23505') {
        throw new MetaExternalReferenceConflictError('META_REFERENCE_PROVIDER_CONFLICT');
      }
      throw error;
    }
  }
}

export function createPrismaMetaExternalReferenceRepository(): MetaExternalReferenceRepository {
  return new PrismaMetaExternalReferenceRepository(prisma);
}
