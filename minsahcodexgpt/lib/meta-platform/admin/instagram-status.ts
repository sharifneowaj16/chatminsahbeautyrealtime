import 'server-only';

import prisma from '@/lib/prisma';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { hasInstagramMessagingPermission } from '@/lib/meta/instagram/policy';
import { getMetaSocialOutboundWriteControlSummary } from '@/lib/meta-platform/config/social-outbound-write-control';
import { getMetaInstagramCutoverStatus, META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA } from '@/lib/meta-platform/domains/instagram/cutover';
import { projectMetaAdminFailure, safeMetaAdminCode, toMetaAdminIso } from './contracts';

type Delegate = {
  groupBy(args: unknown): Promise<unknown>;
  count?(args: unknown): Promise<number>;
  findFirst?(args: unknown): Promise<unknown>;
  findMany?(args: unknown): Promise<unknown>;
};
type Db = {
  metaSocialWebhookReceipt: Delegate;
  metaConversation: Delegate;
  metaMessage: Delegate;
  metaInstagramReplyAttempt: Delegate;
  metaInstagramPrivateReplyReservation: Delegate;
  metaJobAudit: Delegate;
  metaConnection: Delegate;
  metaExternalReference: Delegate;
};
const db = prisma as unknown as Db;

type CountRow = { _count?: { _all?: number }; [key: string]: unknown };
function grouped(rows: unknown, key: string): Record<string, number> {
  if (!Array.isArray(rows)) return {};
  return Object.fromEntries(rows.map((item) => {
    const row = item as CountRow;
    return [safeMetaAdminCode(row[key], 'UNKNOWN'), Number(row._count?._all ?? 0)];
  }));
}

export async function getInstagramAdminHealth() {
  const config = getMetaBusinessConfig();
  const [connection, webhookStates, conversationStates, messageStates, providerStates, replyStates, reconciliationStates, privateReplyStates, jobs, deadLetters, accountIdentity] = await Promise.all([
    db.metaConnection.findFirst?.({
      orderBy: { updatedAt: 'desc' },
      select: { status: true, permissions: true, lastCheckedAt: true, lastSuccessfulAt: true, tokenExpiresAt: true, dataAccessExpiresAt: true, lastError: true },
    }),
    db.metaSocialWebhookReceipt.groupBy({ where: { platform: 'INSTAGRAM' }, by: ['state'], _count: { _all: true } }),
    db.metaConversation.groupBy({ by: ['status'], _count: { _all: true } }),
    db.metaMessage.groupBy({ by: ['status'], _count: { _all: true } }),
    db.metaMessage.groupBy({ by: ['providerStatus'], _count: { _all: true } }),
    db.metaInstagramReplyAttempt.groupBy({ by: ['status'], _count: { _all: true } }),
    db.metaInstagramReplyAttempt.groupBy({ by: ['reconciliationStatus'], _count: { _all: true } }),
    db.metaInstagramPrivateReplyReservation.groupBy({ by: ['status'], _count: { _all: true } }),
    db.metaJobAudit.groupBy({ where: { queueName: { in: ['meta-instagram', 'meta-social'] } }, by: ['status'], _count: { _all: true } }),
    db.metaJobAudit.findMany?.({
      where: { queueName: { in: ['meta-instagram', 'meta-social'] }, status: { in: ['FAILED', 'DEAD_LETTER'] } },
      orderBy: { updatedAt: 'desc' }, take: 10,
      select: { id: true, queueName: true, jobName: true, status: true, attempts: true, maxAttempts: true, nextRunAt: true, lastError: true, updatedAt: true },
    }),
    db.metaExternalReference.findFirst?.({
      where: { objectType: { in: ['INSTAGRAM_ACCOUNT', 'INSTAGRAM_BUSINESS_ACCOUNT'] } },
      orderBy: { updatedAt: 'desc' },
      select: { identityStatus: true, permissionHealth: true, lastVerifiedAt: true, disabledAt: true, revokedAt: true, statusReason: true },
    }),
  ]);
  const connectionRow = connection && typeof connection === 'object' ? connection as Record<string, unknown> : {};
  const identityRow = accountIdentity && typeof accountIdentity === 'object' ? accountIdentity as Record<string, unknown> : {};
  const configured = Boolean(config.instagramActorId && (config.pageAccessToken || config.accessToken) && config.appSecret && config.webhookVerifyToken);
  const permissionGranted = hasInstagramMessagingPermission(connectionRow.permissions);
  const connectionStatus = safeMetaAdminCode(connectionRow.status, 'UNCONFIGURED');
  const identityStatus = safeMetaAdminCode(identityRow.identityStatus, 'UNVERIFIED');
  const permissionHealth = safeMetaAdminCode(identityRow.permissionHealth, 'UNKNOWN');
  const revoked = Boolean(identityRow.revokedAt) || ['REVOKED', 'DISABLED'].includes(identityStatus) || permissionHealth === 'REVOKED';
  const accountHealthy = configured && permissionGranted && !revoked && !['INVALID_TOKEN', 'DISABLED'].includes(connectionStatus);
  const outboundWriteControl = getMetaSocialOutboundWriteControlSummary(process.env);
  const instagramCutover = getMetaInstagramCutoverStatus(process.env);
  return Object.freeze({
    configured,
    accountConfigured: Boolean(config.instagramActorId),
    tokenConfigured: Boolean(config.pageAccessToken || config.accessToken),
    appSecretConfigured: Boolean(config.appSecret),
    verifyTokenConfigured: Boolean(config.webhookVerifyToken),
    permissionGranted,
    connectionStatus,
    identityStatus,
    permissionHealth,
    lastCheckedAt: toMetaAdminIso(connectionRow.lastCheckedAt),
    lastSuccessfulAt: toMetaAdminIso(connectionRow.lastSuccessfulAt),
    tokenExpiresAt: toMetaAdminIso(connectionRow.tokenExpiresAt),
    dataAccessExpiresAt: toMetaAdminIso(connectionRow.dataAccessExpiresAt),
    accountLastVerifiedAt: toMetaAdminIso(identityRow.lastVerifiedAt),
    revokedAt: toMetaAdminIso(identityRow.revokedAt),
    disabledAt: toMetaAdminIso(identityRow.disabledAt),
    cutover: Object.freeze({ ...instagramCutover, stabilityCriteria: META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA }),
    replyEnabled: accountHealthy && instagramCutover.outbound.standardReplyEnabled && outboundWriteControl.standardReply.enabled,
    replyControl: Object.freeze({
      standard: outboundWriteControl.standardReply,
      private: outboundWriteControl.privateReply,
    }),
    failure: projectMetaAdminFailure(connectionRow.lastError),
    states: Object.freeze({
      webhooks: grouped(webhookStates, 'state'),
      conversations: grouped(conversationStates, 'status'),
      messages: grouped(messageStates, 'status'),
      providerDelivery: grouped(providerStates, 'providerStatus'),
      replies: grouped(replyStates, 'status'),
      reconciliation: grouped(reconciliationStates, 'reconciliationStatus'),
      privateReplies: grouped(privateReplyStates, 'status'),
      jobs: grouped(jobs, 'status'),
    }),
    deadLetters: Array.isArray(deadLetters) ? deadLetters.map((item) => {
      const row = item as Record<string, unknown>;
      return Object.freeze({
        id: String(row.id ?? ''), queueName: String(row.queueName ?? ''), jobName: String(row.jobName ?? ''),
        status: safeMetaAdminCode(row.status, 'UNKNOWN'), attempts: Number(row.attempts ?? 0), maxAttempts: Number(row.maxAttempts ?? 0),
        nextRunAt: toMetaAdminIso(row.nextRunAt), updatedAt: toMetaAdminIso(row.updatedAt), failure: projectMetaAdminFailure(row.lastError),
      });
    }) : [],
    checkedAt: new Date().toISOString(),
  });
}
