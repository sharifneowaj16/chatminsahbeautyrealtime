import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { createMetaGraphClient, type MetaGraphClient } from '@/lib/meta/connection/client';
import { getMetaConnectionBootstrap } from '@/lib/meta/connection/config';
import { getLatestMetaConnectionReadiness } from '@/lib/meta/connection/repository';
import { enqueueMetaJob } from '@/lib/jobs/queues';
import { createBullMqSocialQueueAdapter, createMetaSocialJobEnvelope } from '@/lib/meta-platform/queue';
import { persistFacebookInboxMessage } from '@/lib/meta-platform/repositories/facebook-inbox';
import { assertMetaPageHealthReady, evaluateMetaPageHealth } from '@/lib/meta-platform/domains/pages/page-identity';
import { assertFacebookPlatformSyncAuthority } from './cutover';
import {
  compareFacebookInboxSummaries,
  planFacebookInboxSnapshot,
  summarizeFacebookInboxPlan,
  type FacebookInboxConversation,
  type FacebookInboxProfile,
  type FacebookInboxSafeSummary,
  type FacebookInboxSnapshot,
} from './inbox-sync';

const DEFAULT_CONVERSATION_BATCH = 50;
const MAX_CONVERSATIONS = 2_000;
const MAX_MESSAGES_PER_CONVERSATION = 100;

type GraphPage<T> = Readonly<{
  data?: readonly T[];
  paging?: Readonly<{ cursors?: Readonly<{ after?: string }> }>;
}>;

type ProfilePayload = Readonly<{
  id?: string;
  name?: string;
  picture?: Readonly<{ data?: Readonly<{ url?: string }> }>;
}>;

export type FacebookInboxSyncProgress = Readonly<{
  stage: 'fetching' | 'persisting' | 'completed';
  processedConversations: number;
  totalConversations: number;
  processedMessages: number;
  processedAttachments: number;
}>;

function boundedInt(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('META_FACEBOOK_SYNC_LIMIT_INVALID');
  return Math.min(value, max);
}

function assertNever(value: never): never {
  void value;
  throw new TypeError('META_SOCIAL_QUEUE_OUTCOME_UNHANDLED');
}

function safeEnvironment(): 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' {
  if (process.env.NODE_ENV === 'production') return 'PRODUCTION';
  if (process.env.NODE_ENV === 'test') return 'STAGING';
  return 'DEVELOPMENT';
}

function profile(payload: ProfilePayload | null | undefined, fallbackId?: string | null): FacebookInboxProfile {
  return Object.freeze({
    id: payload?.id?.trim() || fallbackId?.trim() || null,
    name: payload?.name?.trim().slice(0, 500) || null,
    avatar: payload?.picture?.data?.url?.trim().slice(0, 4_096) || null,
  });
}

async function fetchProfile(client: MetaGraphClient, id: string, token: string): Promise<FacebookInboxProfile> {
  const payload = await client.get<ProfilePayload>(
    `/${encodeURIComponent(id)}`,
    { fields: 'id,name,picture.type(large){url}' },
    token,
  );
  return profile(payload, id);
}

async function fetchFacebookInboxSnapshot(input: Readonly<{
  client: MetaGraphClient;
  accessToken: string;
  pageId: string;
  conversationLimit: number;
  messageLimitPerConversation: number;
  onProgress?: (progress: FacebookInboxSyncProgress) => void | Promise<void>;
}>): Promise<FacebookInboxSnapshot> {
  const pageProfile = await fetchProfile(input.client, input.pageId, input.accessToken);
  const conversations: FacebookInboxConversation[] = [];
  let after: string | undefined;

  do {
    const remaining = input.conversationLimit > 0 ? input.conversationLimit - conversations.length : DEFAULT_CONVERSATION_BATCH;
    if (input.conversationLimit > 0 && remaining <= 0) break;
    const page = await input.client.get<GraphPage<FacebookInboxConversation>>(
      `/${encodeURIComponent(input.pageId)}/conversations`,
      {
        fields: `id,updated_time,senders.limit(10){id,name},messages.limit(${input.messageLimitPerConversation}){id,message,created_time,from,attachments{id,type,mime_type,name,file_url,image_data,video_data,audio_data,payload}}`,
        platform: 'messenger',
        limit: Math.min(DEFAULT_CONVERSATION_BATCH, input.conversationLimit > 0 ? remaining : DEFAULT_CONVERSATION_BATCH),
        ...(after ? { after } : {}),
      },
      input.accessToken,
    );
    conversations.push(...(page.data ?? []));
    after = page.paging?.cursors?.after;
    await input.onProgress?.({
      stage: 'fetching',
      processedConversations: 0,
      totalConversations: conversations.length,
      processedMessages: 0,
      processedAttachments: 0,
    });
  } while (after && conversations.length < MAX_CONVERSATIONS);

  const profileIds = new Set<string>();
  for (const conversation of conversations) {
    for (const participant of conversation.senders?.data ?? []) {
      if (participant.id && participant.id !== input.pageId) profileIds.add(participant.id);
    }
    for (const message of conversation.messages?.data ?? []) {
      if (message.from?.id && message.from.id !== input.pageId) profileIds.add(message.from.id);
    }
  }
  const profiles: Record<string, FacebookInboxProfile> = { [input.pageId]: pageProfile };
  for (const id of profileIds) {
    profiles[id] = await fetchProfile(input.client, id, input.accessToken).catch(() => profile(null, id));
  }
  return Object.freeze({
    pageId: input.pageId,
    pageProfile,
    conversations: Object.freeze(conversations),
    profiles: Object.freeze(profiles),
  });
}

export async function requestFacebookInboxSyncProduction(input: Readonly<{
  pageId: string;
  actorId?: string;
  correlationId?: string;
  requestKey?: string;
}>) {
  const pageId = input.pageId.trim();
  if (!/^[A-Za-z0-9._:-]{1,191}$/.test(pageId)) throw new TypeError('META_FACEBOOK_PAGE_ID_INVALID');
  const cutover = assertFacebookPlatformSyncAuthority(process.env);
  const requestId = input.requestKey
    ? `fb-sync-${createHash('sha256').update(input.requestKey).digest('hex').slice(0, 40)}`
    : `fb-sync-${randomUUID()}`;
  const correlationId = input.correlationId?.trim() || `fb-sync:${randomUUID()}`;
  const envelope = createMetaSocialJobEnvelope({
    jobType: 'SYNC_FACEBOOK_PAGE_INBOX',
    receiptId: null,
    correlationId,
    dedupeKey: `social:sync-facebook-page-inbox:${requestId}`,
    payloadRef: {
      kind: 'FACEBOOK_PAGE_SYNC_REQUEST',
      id: requestId,
      scope: { pageId },
    },
    observability: {
      component: 'facebook-inbox-domain',
      operation: 'queue-sync',
      platform: 'FACEBOOK_PAGE',
      environment: safeEnvironment(),
    },
  });
  const adapter = createBullMqSocialQueueAdapter({ enqueueMetaJob });
  const queued = await adapter.enqueue(envelope);
  const cutoverSummary = Object.freeze({
    mode: cutover.mode,
    authority: cutover.authority,
    reasonCode: cutover.reasonCode,
  });
  switch (queued.outcome) {
    case 'ENQUEUED':
    case 'DEDUPLICATED':
      return Object.freeze({
        accepted: true,
        deduplicated: queued.outcome === 'DEDUPLICATED',
        requestId,
        auditId: queued.auditId,
        ...(queued.jobId ? { jobId: queued.jobId } : {}),
        cutover: cutoverSummary,
      });
    case 'DEFERRED':
      return Object.freeze({
        accepted: false,
        deduplicated: false,
        requestId,
        reasonCode: queued.code,
        retryAt: queued.retryAt,
        cutover: cutoverSummary,
      });
    case 'REJECTED':
      return Object.freeze({
        accepted: false,
        deduplicated: false,
        requestId,
        reasonCode: queued.code,
        cutover: cutoverSummary,
      });
    default:
      return assertNever(queued);
  }
}

export async function executeFacebookInboxSyncProduction(input: Readonly<{
  pageId?: string;
  conversationLimit?: number;
  messageLimitPerConversation?: number;
  onProgress?: (progress: FacebookInboxSyncProgress) => void | Promise<void>;
}>) {
  const cutover = assertFacebookPlatformSyncAuthority(process.env);
  const mode = cutover.mode;
  const config = getMetaBusinessConfig();
  const pageId = input.pageId?.trim() || config.pageId?.trim() || '';
  const conversationLimit = boundedInt(input.conversationLimit, 0, MAX_CONVERSATIONS);
  const messageLimitPerConversation = boundedInt(input.messageLimitPerConversation, MAX_MESSAGES_PER_CONVERSATION, MAX_MESSAGES_PER_CONVERSATION);


  const bootstrap = getMetaConnectionBootstrap();
  const readiness = await getLatestMetaConnectionReadiness(bootstrap.connectionName);
  const health = evaluateMetaPageHealth({
    operation: 'FACEBOOK_INBOX_SYNC',
    expectedPageId: pageId,
    expectedAppId: bootstrap.appId,
    expectedBusinessId: bootstrap.businessId,
    expectedInstagramAccountId: bootstrap.instagramAccountId,
    readiness,
    now: new Date(),
  });
  assertMetaPageHealthReady(health);
  if (!config.pageAccessToken || !pageId) {
    throw Object.assign(new Error('META_PAGE_TOKEN_NOT_CONFIGURED'), { code: 'META_PAGE_TOKEN_NOT_CONFIGURED', retryable: false });
  }

  const client = createMetaGraphClient({
    accessToken: config.pageAccessToken,
    appSecret: config.appSecret,
    graphApiVersion: config.graphApiVersion,
    timeoutMs: 20_000,
  });
  const snapshot = await fetchFacebookInboxSnapshot({
    client,
    accessToken: config.pageAccessToken,
    pageId,
    conversationLimit,
    messageLimitPerConversation,
    ...(input.onProgress ? { onProgress: input.onProgress } : {}),
  });
  const plan = planFacebookInboxSnapshot(snapshot);
  let shadow: ReturnType<typeof compareFacebookInboxSummaries> | null = null;
  if (mode === 'SHADOW') {
    const legacy = await import('@/lib/facebook/inboxSync');
    const legacySummary = legacy.summarizeLegacyFacebookInboxSnapshot(snapshot) as FacebookInboxSafeSummary;
    shadow = compareFacebookInboxSummaries(summarizeFacebookInboxPlan(plan), legacySummary);
    return Object.freeze({
      mode,
      cutover: Object.freeze({ authority: cutover.authority, reasonCode: cutover.reasonCode }),
      processedConversations: plan.conversations,
      processedMessages: plan.messages.length,
      processedAttachments: plan.messages.reduce((total, message) => total + message.attachments.length, 0),
      createdMessages: 0,
      deduplicatedMessages: plan.duplicateProviderMessages,
      skippedMessages: plan.skippedMessages,
      safeDigest: plan.safeDigest,
      shadow,
      shadowSideEffectsAllowed: false,
      health,
    });
  }

  let createdMessages = 0;
  let deduplicatedMessages = plan.duplicateProviderMessages;
  let processedAttachments = 0;
  for (const message of plan.messages) {
    const persisted = await persistFacebookInboxMessage({ message, attachmentAccessToken: config.pageAccessToken });
    if (persisted.created) createdMessages += 1;
    else deduplicatedMessages += 1;
    processedAttachments += message.attachments.length;
    await input.onProgress?.({
      stage: 'persisting',
      processedConversations: plan.conversations,
      totalConversations: plan.conversations,
      processedMessages: createdMessages + deduplicatedMessages,
      processedAttachments,
    });
  }
  await input.onProgress?.({
    stage: 'completed',
    processedConversations: plan.conversations,
    totalConversations: plan.conversations,
    processedMessages: plan.messages.length,
    processedAttachments,
  });
  return Object.freeze({
    mode,
    cutover: Object.freeze({ authority: cutover.authority, reasonCode: cutover.reasonCode }),
    processedConversations: plan.conversations,
    processedMessages: plan.messages.length,
    processedAttachments,
    createdMessages,
    deduplicatedMessages,
    skippedMessages: plan.skippedMessages,
    safeDigest: plan.safeDigest,
    shadow,
    health,
  });
}
