import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import type { MetaConnectionReadiness } from './types';

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

export async function persistMetaConnectionReadiness(readiness: MetaConnectionReadiness) {
  const connectionId = crypto.randomUUID();
  const checkId = crypto.randomUUID();
  const safeError = readiness.lastError ? JSON.stringify(readiness.lastError) : null;
  const connectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "MetaConnection" (
       "id","name","appId","businessId","catalogId","datasetId","pixelId","adAccountId","pageId","instagramAccountId",
       "tokenRef","tokenExpiresAt","dataAccessExpiresAt","graphApiVersion","sdkVersion","status","permissions","assets","warnings",
       "lastCheckedAt","lastSuccessfulAt","lastError","createdAt","updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::"MetaConnectionStatus",$17::jsonb,$18::jsonb,$19::jsonb,$20,$21,$22::jsonb,NOW(),NOW())
     ON CONFLICT ("name") DO UPDATE SET
       "appId"=EXCLUDED."appId", "businessId"=EXCLUDED."businessId", "catalogId"=EXCLUDED."catalogId",
       "datasetId"=EXCLUDED."datasetId", "pixelId"=EXCLUDED."pixelId", "adAccountId"=EXCLUDED."adAccountId",
       "pageId"=EXCLUDED."pageId", "instagramAccountId"=EXCLUDED."instagramAccountId", "tokenRef"=EXCLUDED."tokenRef",
       "tokenExpiresAt"=EXCLUDED."tokenExpiresAt", "dataAccessExpiresAt"=EXCLUDED."dataAccessExpiresAt",
       "graphApiVersion"=EXCLUDED."graphApiVersion", "sdkVersion"=EXCLUDED."sdkVersion", "status"=EXCLUDED."status",
       "permissions"=EXCLUDED."permissions", "assets"=EXCLUDED."assets", "warnings"=EXCLUDED."warnings",
       "lastCheckedAt"=EXCLUDED."lastCheckedAt",
       "lastSuccessfulAt"=CASE WHEN EXCLUDED."status"='HEALTHY' THEN EXCLUDED."lastCheckedAt" ELSE "MetaConnection"."lastSuccessfulAt" END,
       "lastError"=EXCLUDED."lastError", "updatedAt"=NOW()
     RETURNING "id"`,
    connectionId,
    readiness.connectionName,
    readiness.token.appId,
    readiness.assets.business.id,
    readiness.assets.catalog.id,
    readiness.assets.dataset.id,
    readiness.assets.pixel.id,
    readiness.assets.adAccount.id,
    readiness.assets.page.id,
    readiness.assets.instagramAccount.id,
    readiness.tokenRef,
    toDate(readiness.token.expiresAt),
    toDate(readiness.token.dataAccessExpiresAt),
    readiness.graphApiVersion,
    readiness.sdkVersion,
    readiness.status,
    JSON.stringify(readiness.permissions),
    JSON.stringify(readiness.assets),
    JSON.stringify(readiness.warnings),
    new Date(readiness.checkedAt),
    readiness.status === 'HEALTHY' ? new Date(readiness.checkedAt) : null,
    safeError,
  );
  const persistedId = connectionRows[0]?.id;
  if (!persistedId) throw new Error('META_CONNECTION_PERSIST_FAILED');

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MetaConnectionCheck" (
       "id","connectionId","status","tokenValid","tokenExpiresAt","dataAccessExpiresAt","appIdMatches",
       "permissions","assets","versionPolicy","warnings","safeError","checkedAt"
     ) VALUES ($1,$2,$3::"MetaConnectionStatus",$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13)`,
    checkId,
    persistedId,
    readiness.status,
    readiness.token.verified ? readiness.token.valid : null,
    toDate(readiness.token.expiresAt),
    toDate(readiness.token.dataAccessExpiresAt),
    readiness.token.appIdMatches,
    JSON.stringify(readiness.permissions),
    JSON.stringify(readiness.assets),
    JSON.stringify(readiness.versionPolicy),
    JSON.stringify(readiness.warnings),
    safeError,
    new Date(readiness.checkedAt),
  );
  return { connectionId: persistedId, checkId };
}

export async function getLatestMetaConnectionReadiness(connectionName = 'primary') {
  const rows = await prisma.$queryRawUnsafe<Array<{
    name: string;
    status: string;
    graphApiVersion: string;
    sdkVersion: string | null;
    tokenRef: string | null;
    tokenExpiresAt: Date | null;
    dataAccessExpiresAt: Date | null;
    permissions: unknown;
    assets: unknown;
    warnings: unknown;
    lastCheckedAt: Date | null;
    lastSuccessfulAt: Date | null;
    lastError: unknown;
  }>>(
    `SELECT "name","status"::text AS status,"graphApiVersion","sdkVersion","tokenRef","tokenExpiresAt","dataAccessExpiresAt",
            "permissions","assets","warnings","lastCheckedAt","lastSuccessfulAt","lastError"
       FROM "MetaConnection" WHERE "name"=$1 LIMIT 1`,
    connectionName,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    dataAccessExpiresAt: row.dataAccessExpiresAt?.toISOString() ?? null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastSuccessfulAt: row.lastSuccessfulAt?.toISOString() ?? null,
  };
}
