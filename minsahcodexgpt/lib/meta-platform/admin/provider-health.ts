import 'server-only';

import prisma from '@/lib/prisma';
import { getMetaAggregateHealth } from '@/lib/observability/health';
import { getMetaPhase31CutoverStatus } from '@/lib/meta-platform/config/phase31-cutover';
import { getMetaLeadCutoverStatus, META_LEAD_CUTOVER_STABILITY_CRITERIA } from '@/lib/meta-platform/domains/leads/cutover';
import { getMetaInstagramCutoverStatus, META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA } from '@/lib/meta-platform/domains/instagram/cutover';
import { getMetaFacebookRealtimeCutoverStatus, META_FACEBOOK_REALTIME_CUTOVER_STABILITY_CRITERIA } from '@/lib/meta-platform/domains/facebook/cutover';
import { getMetaSocialOutboundWriteControlSummary } from '@/lib/meta-platform/config/social-outbound-write-control';
import { getMetaPhase31RollbackControlSnapshot } from '@/lib/meta-platform/config/phase31-rollback-proof';
import {
  projectMetaAdminFailure,
  projectMetaAdminProviderId,
  safeMetaAdminCode,
  safeMetaAdminText,
  toMetaAdminIso,
} from './contracts';

type Delegate = { findFirst(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown> };
type Db = {
  metaConnection: Delegate;
  metaExternalReference: Delegate;
  metaProviderIdentityRelationship: Delegate;
};
const db = prisma as unknown as Db;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function remediationFor(status: string, permissionHealth: string, revoked: boolean) {
  if (revoked || permissionHealth === 'REVOKED') {
    return Object.freeze({ code: 'REAUTHORIZE_PROVIDER_ASSET', action: 'Reconnect the affected Meta asset and verify required permissions.' });
  }
  if (permissionHealth === 'MISSING' || permissionHealth === 'INSUFFICIENT') {
    return Object.freeze({ code: 'REVIEW_REQUIRED_PERMISSIONS', action: 'Grant the required least-privilege permissions, then run a connection check.' });
  }
  if (['UNVERIFIED', 'STALE'].includes(status)) {
    return Object.freeze({ code: 'VERIFY_PROVIDER_IDENTITY', action: 'Run identity discovery and verify the provider-to-local mapping.' });
  }
  if (status === 'DISABLED') {
    return Object.freeze({ code: 'REVIEW_DISABLED_ASSET', action: 'Confirm the asset is active in Meta and re-enable it only after verification.' });
  }
  return null;
}

export async function getMetaProviderAdminHealth() {
  const [aggregate, connectionValue, identitiesValue, relationshipsValue] = await Promise.all([
    getMetaAggregateHealth(),
    db.metaConnection.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, appId: true, businessId: true, catalogId: true, datasetId: true, pixelId: true,
        adAccountId: true, pageId: true, instagramAccountId: true, graphApiVersion: true, sdkVersion: true,
        status: true, tokenExpiresAt: true, dataAccessExpiresAt: true, lastCheckedAt: true, lastSuccessfulAt: true,
        lastError: true, updatedAt: true,
        credentialMetadata: { orderBy: { updatedAt: 'desc' }, select: { id: true, role: true, credentialVersion: true, expiresAt: true, dataAccessExpiresAt: true, lastVerifiedAt: true, rotatedAt: true, updatedAt: true } },
        checks: { orderBy: { checkedAt: 'desc' }, take: 10, select: { id: true, status: true, tokenValid: true, tokenExpiresAt: true, dataAccessExpiresAt: true, appIdMatches: true, safeError: true, checkedAt: true } },
      },
    }),
    db.metaExternalReference.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200,
      select: {
        id: true, environment: true, connectionKey: true, assetType: true, objectType: true, providerId: true,
        providerParentId: true, identityStatus: true, permissionHealth: true, lastSeenAt: true, lastVerifiedAt: true,
        disabledAt: true, revokedAt: true, statusReason: true, updatedAt: true,
      },
    }),
    db.metaProviderIdentityRelationship.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200,
      select: {
        id: true, environment: true, connectionKey: true, relationshipType: true, status: true,
        parentReferenceId: true, childReferenceId: true, lastVerifiedAt: true, disabledAt: true, revokedAt: true, statusReason: true, updatedAt: true,
      },
    }),
  ]);
  const connection = connectionValue ? record(connectionValue) : null;
  const identities = Array.isArray(identitiesValue) ? identitiesValue.map((value) => {
    const item = record(value);
    const identityStatus = safeMetaAdminCode(item.identityStatus, 'UNKNOWN');
    const permissionHealth = safeMetaAdminCode(item.permissionHealth, 'UNKNOWN');
    const revoked = Boolean(item.revokedAt);
    return Object.freeze({
      id: String(item.id ?? ''),
      environment: safeMetaAdminCode(item.environment, 'UNKNOWN'),
      connectionKey: safeMetaAdminText(item.connectionKey, 120),
      assetType: safeMetaAdminCode(item.assetType, 'UNKNOWN'),
      objectType: safeMetaAdminCode(item.objectType, 'UNKNOWN'),
      providerId: projectMetaAdminProviderId(item.providerId),
      providerParentId: projectMetaAdminProviderId(item.providerParentId),
      identityStatus,
      permissionHealth,
      lastSeenAt: toMetaAdminIso(item.lastSeenAt),
      lastVerifiedAt: toMetaAdminIso(item.lastVerifiedAt),
      disabledAt: toMetaAdminIso(item.disabledAt),
      revokedAt: toMetaAdminIso(item.revokedAt),
      statusReason: safeMetaAdminText(item.statusReason, 300),
      remediation: remediationFor(identityStatus, permissionHealth, revoked),
      updatedAt: toMetaAdminIso(item.updatedAt),
    });
  }) : [];
  const scopes = ['APP', 'BUSINESS', 'PAGE', 'INSTAGRAM_ACCOUNT', 'AD_ACCOUNT', 'FORM'].map((scope) => {
    const aliases = scope === 'INSTAGRAM_ACCOUNT' ? ['INSTAGRAM_ACCOUNT', 'INSTAGRAM_BUSINESS_ACCOUNT'] : [scope];
    const rows = identities.filter((item) => aliases.includes(item.objectType) || aliases.includes(item.assetType));
    const revoked = rows.filter((item) => Boolean(item.revokedAt) || item.permissionHealth === 'REVOKED').length;
    const unhealthy = rows.filter((item) => item.identityStatus !== 'VERIFIED' || !['HEALTHY', 'GRANTED'].includes(item.permissionHealth)).length;
    return Object.freeze({ scope, total: rows.length, verified: rows.length - unhealthy, unhealthy, revoked, assets: rows });
  });
  const checks = connection && Array.isArray(connection.checks) ? connection.checks.map((value) => {
    const item = record(value);
    return Object.freeze({
      id: String(item.id ?? ''), status: safeMetaAdminCode(item.status, 'UNKNOWN'), tokenValid: item.tokenValid === true,
      tokenExpiresAt: toMetaAdminIso(item.tokenExpiresAt), dataAccessExpiresAt: toMetaAdminIso(item.dataAccessExpiresAt),
      appIdMatches: item.appIdMatches === true, checkedAt: toMetaAdminIso(item.checkedAt), failure: projectMetaAdminFailure(item.safeError),
    });
  }) : [];
  const credentials = connection && Array.isArray(connection.credentialMetadata) ? connection.credentialMetadata.map((value) => {
    const item = record(value);
    return Object.freeze({
      id: String(item.id ?? ''), role: safeMetaAdminCode(item.role, 'UNKNOWN'), credentialVersion: safeMetaAdminText(item.credentialVersion, 80),
      expiresAt: toMetaAdminIso(item.expiresAt), dataAccessExpiresAt: toMetaAdminIso(item.dataAccessExpiresAt),
      lastVerifiedAt: toMetaAdminIso(item.lastVerifiedAt), rotatedAt: toMetaAdminIso(item.rotatedAt), updatedAt: toMetaAdminIso(item.updatedAt),
    });
  }) : [];
  const relationships = Array.isArray(relationshipsValue) ? relationshipsValue.map((value) => {
    const item = record(value);
    return Object.freeze({
      id: String(item.id ?? ''), environment: safeMetaAdminCode(item.environment, 'UNKNOWN'), connectionKey: safeMetaAdminText(item.connectionKey, 120),
      relationshipType: safeMetaAdminCode(item.relationshipType, 'UNKNOWN'), status: safeMetaAdminCode(item.status, 'UNKNOWN'),
      parentReferenceId: String(item.parentReferenceId ?? ''), childReferenceId: String(item.childReferenceId ?? ''),
      lastVerifiedAt: toMetaAdminIso(item.lastVerifiedAt), disabledAt: toMetaAdminIso(item.disabledAt), revokedAt: toMetaAdminIso(item.revokedAt),
      statusReason: safeMetaAdminText(item.statusReason, 300), updatedAt: toMetaAdminIso(item.updatedAt),
    });
  }) : [];
  return Object.freeze({
    aggregate,
    cutover: getMetaPhase31CutoverStatus(process.env),
    leadCutover: Object.freeze({ ...getMetaLeadCutoverStatus(process.env), stabilityCriteria: META_LEAD_CUTOVER_STABILITY_CRITERIA }),
    instagramCutover: Object.freeze({ ...getMetaInstagramCutoverStatus(process.env), stabilityCriteria: META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA }),
    facebookRealtimeCutover: Object.freeze({ ...getMetaFacebookRealtimeCutoverStatus(process.env), stabilityCriteria: META_FACEBOOK_REALTIME_CUTOVER_STABILITY_CRITERIA }),
    outboundWriteControl: getMetaSocialOutboundWriteControlSummary(process.env),
    rollbackControl: getMetaPhase31RollbackControlSnapshot(process.env),
    connection: connection ? Object.freeze({
      id: String(connection.id ?? ''), name: safeMetaAdminText(connection.name, 120), status: safeMetaAdminCode(connection.status, 'UNCONFIGURED'),
      providerIds: Object.freeze({
        app: projectMetaAdminProviderId(connection.appId), business: projectMetaAdminProviderId(connection.businessId),
        catalog: projectMetaAdminProviderId(connection.catalogId), dataset: projectMetaAdminProviderId(connection.datasetId),
        pixel: projectMetaAdminProviderId(connection.pixelId), adAccount: projectMetaAdminProviderId(connection.adAccountId),
        page: projectMetaAdminProviderId(connection.pageId), instagramAccount: projectMetaAdminProviderId(connection.instagramAccountId),
      }),
      graphApiVersion: safeMetaAdminText(connection.graphApiVersion, 40), sdkVersion: safeMetaAdminText(connection.sdkVersion, 40),
      tokenExpiresAt: toMetaAdminIso(connection.tokenExpiresAt), dataAccessExpiresAt: toMetaAdminIso(connection.dataAccessExpiresAt),
      lastCheckedAt: toMetaAdminIso(connection.lastCheckedAt), lastSuccessfulAt: toMetaAdminIso(connection.lastSuccessfulAt),
      updatedAt: toMetaAdminIso(connection.updatedAt), failure: projectMetaAdminFailure(connection.lastError), credentials, checks,
    }) : null,
    scopes,
    relationships,
    checkedAt: new Date().toISOString(),
  });
}
