import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { buildInstagramLocalMessageKey, type InstagramConversationKind } from './instagram-messages';
import { digestInstagramAttachmentUrl } from './instagram-attachments';

export type PrismaInstagramInboundInput = Readonly<{
  canonicalReceiptId: string;
  accountId: string;
  providerConversationKey: string;
  providerMessageId: string;
  providerParticipantId: string;
  participantUsername?: string | null;
  participantName?: string | null;
  participantAvatarUrl?: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: string;
  text?: string | null;
  occurredAt: Date;
  payloadDigest: string;
  replyToProviderMessageId?: string | null;
  storyMediaId?: string | null;
  commentId?: string | null;
  postId?: string | null;
  correlationId: string;
  conversationKind?: InstagramConversationKind;
  replyWindowMs: number;
  privateReplyWindowMs: number;
}>;

type SqlClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};
type TxClient = SqlClient;
type Db = SqlClient & { $transaction<T>(callback: (tx: TxClient) => Promise<T>): Promise<T> };
const db = prisma as unknown as Db;

function one<T>(rows: T[], code: string): T { if (rows.length !== 1) throw new Error(code); return rows[0]!; }
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function safeCode(value: string) { return value.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 80) || 'INSTAGRAM_PERSISTENCE_FAILED'; }

export async function persistInstagramInboundMessageStorage(input: PrismaInstagramInboundInput) {
  return db.$transaction(async (tx) => {
    const receipt = one(await tx.$queryRawUnsafe<Array<{ id: string; environment: string; connectionKey: string; primaryIdentityReferenceId: string | null; instagramMessageId: string | null }>>(
      `SELECT "id","environment","connectionKey","primaryIdentityReferenceId","instagramMessageId"
       FROM "MetaSocialWebhookReceipt" WHERE "id"=$1 AND "platform"='INSTAGRAM' FOR UPDATE`, input.canonicalReceiptId,
    ), 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND');
    if (!receipt.primaryIdentityReferenceId) throw new Error('INSTAGRAM_ACCOUNT_IDENTITY_REQUIRED');

    const participantId = randomUUID();
    const participants = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaInstagramParticipant" (
         "id","environment","connectionKey","accountIdentityReferenceId","providerParticipantId",
         "username","displayName","avatarUrl","firstSeenAt","lastSeenAt","createdAt","updatedAt"
       ) VALUES ($1,$2::"MetaPlatformEnvironment",$3,$4,$5,$6,$7,$8,$9,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerParticipantId") DO UPDATE SET
         "username"=COALESCE(NULLIF(EXCLUDED."username",''),"MetaInstagramParticipant"."username"),
         "displayName"=COALESCE(NULLIF(EXCLUDED."displayName",''),"MetaInstagramParticipant"."displayName"),
         "avatarUrl"=COALESCE(NULLIF(EXCLUDED."avatarUrl",''),"MetaInstagramParticipant"."avatarUrl"),
         "lastSeenAt"=GREATEST("MetaInstagramParticipant"."lastSeenAt",EXCLUDED."lastSeenAt"),
         "updatedAt"=CURRENT_TIMESTAMP
       RETURNING *`,
      participantId, receipt.environment, receipt.connectionKey, receipt.primaryIdentityReferenceId,
      input.providerParticipantId, input.participantUsername ?? null, input.participantName ?? null,
      input.participantAvatarUrl ?? null, input.occurredAt,
    );
    const participant = one(participants, 'INSTAGRAM_PARTICIPANT_PERSISTENCE_FAILED') as { id: string };

    const conversationId = randomUUID();
    const conversations = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaConversation" (
         "id","platformId","environment","connectionKey","accountIdentityReferenceId","participantIdentityId",
         "providerConversationKey","conversationKind","accountId","participantId","participantUsername","participantName",
         "status","retentionUntil","correlationId","createdAt","updatedAt"
       ) VALUES ($1,$2,$3::"MetaPlatformEnvironment",$4,$5,$6,$2,$7::"MetaInstagramConversationKind",$8,$9,$10,$11,
         'OPEN',CURRENT_TIMESTAMP + INTERVAL '180 days',$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerConversationKey") DO UPDATE SET
         "participantUsername"=COALESCE(NULLIF(EXCLUDED."participantUsername",''),"MetaConversation"."participantUsername"),
         "participantName"=COALESCE(NULLIF(EXCLUDED."participantName",''),"MetaConversation"."participantName"),
         "correlationId"=EXCLUDED."correlationId",
         "retentionUntil"=GREATEST("MetaConversation"."retentionUntil",EXCLUDED."retentionUntil"),
         "updatedAt"=CURRENT_TIMESTAMP
       RETURNING *`,
      conversationId, input.providerConversationKey, receipt.environment, receipt.connectionKey,
      receipt.primaryIdentityReferenceId, participant.id, input.conversationKind ?? 'UNKNOWN',
      input.accountId, input.providerParticipantId, input.participantUsername ?? null,
      input.participantName ?? null, input.correlationId,
    );
    const conversation = one(conversations, 'INSTAGRAM_CONVERSATION_PERSISTENCE_FAILED') as { id: string; participantIdentityId: string | null; accountIdentityReferenceId: string | null };
    if (conversation.accountIdentityReferenceId !== receipt.primaryIdentityReferenceId) throw new Error('INSTAGRAM_CONVERSATION_ACCOUNT_MISMATCH');
    if (conversation.participantIdentityId !== participant.id) throw new Error('INSTAGRAM_CONVERSATION_PARTICIPANT_MISMATCH');

    const messageId = randomUUID();
    const localMessageKey = buildInstagramLocalMessageKey({
      environment: receipt.environment as 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION',
      connectionKey: receipt.connectionKey,
      accountIdentityReferenceId: receipt.primaryIdentityReferenceId,
      seed: `${input.direction.toLowerCase()}:${input.providerMessageId}`,
    });
    const privateReplyExpiresAt = input.commentId ? new Date(input.occurredAt.getTime() + input.privateReplyWindowMs) : null;
    const messages = await tx.$queryRawUnsafe<Array<Record<string, unknown> & { created: boolean }>>(
      `INSERT INTO "MetaMessage" (
         "id","platformId","environment","connectionKey","accountIdentityReferenceId","providerMessageId","localMessageKey",
         "conversationId","direction","messageType","status","providerStatus","text","replyToMessageId","replyToProviderMessageId",
         "storyMediaId","commentId","postId","payloadDigest","providerOccurredAt","receivedAt","sentAt","privateReplyExpiresAt",
         "correlationId","createdAt","updatedAt"
       ) VALUES ($1,$2,$3::"MetaPlatformEnvironment",$4,$5,$2,$6,$7,$8::"MetaInstagramMessageDirection",$9::"MetaInstagramMessageType",
         'PROCESSED','NOT_APPLICABLE',$10,$11,$11,$12,$13,$14,$15,$16,CURRENT_TIMESTAMP,$16,$17,$18,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerMessageId") DO UPDATE SET
         "digestMismatchCount"="MetaMessage"."digestMismatchCount" + CASE WHEN "MetaMessage"."payloadDigest" IS DISTINCT FROM EXCLUDED."payloadDigest" THEN 1 ELSE 0 END,
         "lastDigestMismatchAt"=CASE WHEN "MetaMessage"."payloadDigest" IS DISTINCT FROM EXCLUDED."payloadDigest" THEN CURRENT_TIMESTAMP ELSE "MetaMessage"."lastDigestMismatchAt" END,
         "updatedAt"=CURRENT_TIMESTAMP
       RETURNING *, (xmax = 0) AS "created"`,
      messageId, input.providerMessageId, receipt.environment, receipt.connectionKey, receipt.primaryIdentityReferenceId,
      localMessageKey, conversation.id, input.direction, input.messageType, input.text ?? null,
      input.replyToProviderMessageId ?? null, input.storyMediaId ?? null, input.commentId ?? null,
      input.postId ?? null, input.payloadDigest, input.occurredAt, privateReplyExpiresAt, input.correlationId,
    );
    const message = one(messages, 'INSTAGRAM_MESSAGE_PERSISTENCE_FAILED') as { id: string; created: boolean; payloadDigest: string | null; digestMismatchCount: number };

    const linked = await tx.$executeRawUnsafe(
      `UPDATE "MetaSocialWebhookReceipt" SET "instagramMessageId"=$2,
         "replaySourceType"='INSTAGRAM_MESSAGE'::"MetaSocialWebhookReplaySourceType",
         "replaySourceId"=$2,
         "replayEligibility"=CASE WHEN "state"='DEAD_LETTERED'::"MetaSocialWebhookReceiptState" THEN 'APPROVAL_REQUIRED'::"MetaSocialWebhookReplayEligibility" ELSE "replayEligibility" END,
         "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND ("instagramMessageId" IS NULL OR "instagramMessageId"=$2)`,
      receipt.id, message.id,
    );
    if (linked !== 1) throw new Error('INSTAGRAM_RECEIPT_MESSAGE_LINK_CONFLICT');

    let orderingAdvanced = false;
    if (message.created) {
      const isInbound = input.direction === 'INBOUND';
      const orderingUpdates = await tx.$executeRawUnsafe(
        `UPDATE "MetaConversation" SET
           "lastMessageAt"=$2,
           "lastActivityAt"=$2,
           "lastActivityProviderMessageId"=$3,
           "lastActivityMessageId"=$4,
           "lastInboundAt"=CASE WHEN $5 THEN $2 ELSE "lastInboundAt" END,
           "replyWindowOpenedAt"=CASE WHEN $5 THEN $2 ELSE "replyWindowOpenedAt" END,
           "replyWindowExpiresAt"=CASE WHEN $5 THEN $2 + ($6 * INTERVAL '1 millisecond') ELSE "replyWindowExpiresAt" END,
           "replyWindowSourceMessageId"=CASE WHEN $5 THEN $4 ELSE "replyWindowSourceMessageId" END,
           "orderingVersion"="orderingVersion"+1,
           "status"=CASE WHEN $5 THEN 'OPEN'::"MetaInstagramConversationStatus" ELSE "status" END,
           "updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$1 AND (
           "lastActivityAt" IS NULL OR $2 > "lastActivityAt" OR
           ($2 = "lastActivityAt" AND $3 > COALESCE("lastActivityProviderMessageId",''))
         )`,
        conversation.id, input.occurredAt, input.providerMessageId, message.id, isInbound, input.replyWindowMs,
      );
      orderingAdvanced = orderingUpdates === 1;
    }
    return {
      receipt, participant, conversation, message,
      created: Boolean(message.created),
      orderingAdvanced,
      digestMatches: message.payloadDigest === input.payloadDigest && message.digestMismatchCount === 0,
    };
  });
}

export type PrismaInstagramReplyAttemptInput = Readonly<{
  conversationId: string; sourceMessageId?: string | null; actorId: string; mode: 'MESSAGE' | 'PRIVATE_REPLY';
  idempotencyKey: string; textHash: string; payloadHash: string; eligibility: string; correlationId: string; now: Date;
}>;

export async function createOrGetInstagramReplyAttemptStorage(input: PrismaInstagramReplyAttemptInput) {
  return db.$transaction(async (tx) => {
    const conversation = one(await tx.$queryRawUnsafe<Array<{ id: string; environment: string | null; connectionKey: string | null; accountIdentityReferenceId: string | null }>>(
      `SELECT "id","environment","connectionKey","accountIdentityReferenceId" FROM "MetaConversation" WHERE "id"=$1 FOR UPDATE`, input.conversationId,
    ), 'INSTAGRAM_CONVERSATION_NOT_FOUND');
    if (!conversation.environment || !conversation.connectionKey || !conversation.accountIdentityReferenceId) throw new Error('INSTAGRAM_CONVERSATION_SCOPE_REQUIRED');
    const existing = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM "MetaInstagramReplyAttempt" WHERE "environment"=$1::"MetaPlatformEnvironment" AND "connectionKey"=$2
       AND "accountIdentityReferenceId"=$3 AND "idempotencyKey"=$4`,
      conversation.environment, conversation.connectionKey, conversation.accountIdentityReferenceId, input.idempotencyKey,
    );
    if (existing.length) {
      if (existing[0]!.payloadHash !== input.payloadHash) throw new Error('INSTAGRAM_SEND_IDEMPOTENCY_PAYLOAD_MISMATCH');
      return { created: false, attempt: existing[0], conversation };
    }
    const id = randomUUID(); const localMessageKey = `outbound:${hash(`${conversation.environment}:${conversation.connectionKey}:${conversation.accountIdentityReferenceId}:${input.idempotencyKey}`)}`;
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaInstagramReplyAttempt" (
        "id","idempotencyKey","environment","connectionKey","accountIdentityReferenceId","conversationId","sourceMessageId","actorId","mode",
        "eligibility","status","providerStatus","reconciliationStatus","textHash","payloadHash","localMessageKey","correlationId","requestedAt","queuedAt","attemptedAt"
       ) VALUES ($1,$2,$3::"MetaPlatformEnvironment",$4,$5,$6,$7,$8,$9,$10::"MetaInstagramReplyEligibility",
         CASE WHEN $10='ELIGIBLE' THEN 'QUEUED'::"MetaInstagramMessageStatus" ELSE 'BLOCKED'::"MetaInstagramMessageStatus" END,
         CASE WHEN $10='ELIGIBLE' THEN 'PENDING'::"MetaInstagramProviderDeliveryStatus" ELSE 'FAILED'::"MetaInstagramProviderDeliveryStatus" END,
         'NOT_REQUIRED',$11,$12,$13,$14,$15,CASE WHEN $10='ELIGIBLE' THEN $15 ELSE NULL END,$15)
       RETURNING *`,
      id, input.idempotencyKey, conversation.environment, conversation.connectionKey, conversation.accountIdentityReferenceId,
      input.conversationId, input.sourceMessageId ?? null, input.actorId, input.mode, input.eligibility,
      input.textHash, input.payloadHash, localMessageKey, input.correlationId, input.now,
    );
    return { created: true, attempt: one(rows, 'INSTAGRAM_REPLY_ATTEMPT_CREATE_FAILED'), conversation };
  });
}


export async function stageInstagramReplyMessageStorage(input: {
  attemptId: string;
  text: string;
  now: Date;
}) {
  return db.$transaction(async (tx) => {
    const attempt = one(await tx.$queryRawUnsafe<Array<Record<string, unknown> & {
      environment: string;
      connectionKey: string;
      accountIdentityReferenceId: string;
      conversationId: string;
      sourceMessageId: string | null;
      mode: string;
      localMessageKey: string;
      idempotencyKey: string;
      correlationId: string;
    }>>(
      `SELECT * FROM "MetaInstagramReplyAttempt" WHERE "id"=$1 FOR UPDATE`, input.attemptId,
    ), 'INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
    const source = attempt.sourceMessageId ? one(await tx.$queryRawUnsafe<Array<{ platformId: string; commentId: string | null }>>(
      `SELECT "platformId","commentId" FROM "MetaMessage" WHERE "id"=$1`, attempt.sourceMessageId,
    ), 'INSTAGRAM_SOURCE_MESSAGE_NOT_FOUND') : null;
    const id = randomUUID();
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaMessage" (
        "id","platformId","environment","connectionKey","accountIdentityReferenceId","providerMessageId","localMessageKey","outboundIdempotencyKey",
        "conversationId","direction","messageType","status","providerStatus","text","replyToMessageId","replyToProviderMessageId","replyToMessageRecordId",
        "commentId","receivedAt","sentAt","correlationId","createdAt","updatedAt"
       ) VALUES ($1,$2,$3::"MetaPlatformEnvironment",$4,$5,NULL,$6,$7,$8,'OUTBOUND',$9::"MetaInstagramMessageType",'QUEUED','PENDING',$10,$11,$11,$12,$13,$14,$14,$15,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("localMessageKey") DO UPDATE SET "updatedAt"=CURRENT_TIMESTAMP RETURNING *`,
      id, attempt.localMessageKey, attempt.environment, attempt.connectionKey, attempt.accountIdentityReferenceId,
      attempt.localMessageKey, attempt.idempotencyKey, attempt.conversationId,
      attempt.mode === 'PRIVATE_REPLY' ? 'COMMENT_PRIVATE_REPLY' : 'TEXT', input.text,
      source?.platformId ?? null, attempt.sourceMessageId, source?.commentId ?? null, input.now, attempt.correlationId,
    );
    return one(rows, 'INSTAGRAM_OUTBOUND_MESSAGE_STAGE_FAILED');
  });
}

export async function loadInstagramReplyExecutionStorage(attemptId: string) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT
       a.*,
       c."accountId" AS "conversationAccountId", c."participantId" AS "conversationParticipantId",
       c."status" AS "conversationStatus", c."lastInboundAt", c."replyWindowExpiresAt", c."privateReplySentAt",
       c."policyData" AS "conversationPolicyData", c."correlationId" AS "conversationCorrelationId",
       s."conversationId" AS "sourceConversationIdResolved", s."accountIdentityReferenceId" AS "sourceAccountIdentityReferenceIdResolved",
       s."commentId" AS "sourceCommentIdResolved", s."postId" AS "sourcePostIdResolved",
       s."providerOccurredAt" AS "sourceProviderOccurredAtResolved", s."sentAt" AS "sourceSentAtResolved",
       s."privateReplyExpiresAt" AS "sourcePrivateReplyExpiresAt",
       m."id" AS "pendingMessageId", m."text" AS "pendingText", m."providerStatus" AS "pendingProviderStatus",
       r."id" AS "privateReservationId", r."status" AS "privateReservationStatus", r."expiresAt" AS "privateReservationExpiresAt"
     FROM "MetaInstagramReplyAttempt" a
     JOIN "MetaConversation" c ON c."id"=a."conversationId"
     LEFT JOIN "MetaMessage" s ON s."id"=a."sourceMessageId"
     LEFT JOIN "MetaMessage" m ON m."localMessageKey"=a."localMessageKey"
     LEFT JOIN "MetaInstagramPrivateReplyReservation" r ON r."replyAttemptId"=a."id"
     WHERE a."id"=$1`, attemptId,
  );
  return one(rows, 'INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
}

export async function markInstagramReplyRetryableStorage(input: {
  attemptId: string;
  failureCode: string;
  failureSummary?: string;
  now?: Date;
}) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE "MetaInstagramReplyAttempt" SET "status"='QUEUED',"providerStatus"='PENDING',"reconciliationStatus"='NOT_REQUIRED',
     "failureCode"=$2,"failureCategory"='RETRYABLE',"failureSummary"=$3,"sendingAt"=NULL,"completedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "id"=$1 AND "providerStatus" IN ('PENDING','SENDING') RETURNING *`,
    input.attemptId, safeCode(input.failureCode), input.failureSummary?.slice(0, 500) ?? 'Transient provider failure; safe retry scheduled.',
  );
  if (rows.length !== 1) throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_RETRYABLE');
  await db.$executeRawUnsafe(
    `UPDATE "MetaMessage" SET "status"='QUEUED',"providerStatus"='PENDING',"failedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "localMessageKey"=(SELECT "localMessageKey" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1)
       AND "providerStatus" IN ('PENDING','SENDING')`, input.attemptId,
  );
  await db.$executeRawUnsafe(
    `UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='RESERVED',"failureCode"=$2,"failureSummary"=$3,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "replyAttemptId"=$1 AND "status" IN ('RESERVED','SENDING')`,
    input.attemptId, safeCode(input.failureCode), input.failureSummary?.slice(0, 500) ?? 'Transient provider failure; safe retry scheduled.',
  );
  return rows[0]!;
}

export async function markInstagramReplyBlockedStorage(input: {
  attemptId: string;
  failureCode: string;
  failureSummary?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE "MetaInstagramReplyAttempt" SET "status"='BLOCKED',"providerStatus"='FAILED',"reconciliationStatus"='NOT_REQUIRED',
     "failureCode"=$2,"failureCategory"='POLICY_BLOCKED',"failureSummary"=$3,"completedAt"=$4,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "id"=$1 AND "providerStatus" IN ('PENDING','SENDING') RETURNING *`,
    input.attemptId, safeCode(input.failureCode), input.failureSummary?.slice(0, 500) ?? 'Instagram outbound write blocked by current policy.', now,
  );
  if (rows.length !== 1) throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_BLOCKABLE');
  await db.$executeRawUnsafe(
    `UPDATE "MetaMessage" SET "status"='BLOCKED',"providerStatus"='FAILED',"failedAt"=$2,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "localMessageKey"=(SELECT "localMessageKey" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1)
       AND "providerStatus" IN ('PENDING','SENDING')`, input.attemptId, now,
  );
  await db.$executeRawUnsafe(
    `UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='BLOCKED',"failureCode"=$2,"failureSummary"=$3,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "replyAttemptId"=$1 AND "status" IN ('RESERVED','SENDING')`,
    input.attemptId, safeCode(input.failureCode), input.failureSummary?.slice(0, 500) ?? 'Instagram outbound write blocked by current policy.',
  );
  return rows[0]!;
}

export async function reserveInstagramPrivateReplyStorage(input: { attemptId: string; conversationId: string; sourceMessageId: string; sourceCommentId: string; expiresAt: Date; now: Date }) {
  return db.$transaction(async (tx) => {
    if (input.expiresAt <= input.now) throw new Error('INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED');
    const attempt = one(await tx.$queryRawUnsafe<Array<{ environment: string | null; connectionKey: string | null; accountIdentityReferenceId: string | null }>>(
      `SELECT "environment","connectionKey","accountIdentityReferenceId" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1 FOR UPDATE`, input.attemptId,
    ), 'INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
    if (!attempt.environment || !attempt.connectionKey || !attempt.accountIdentityReferenceId) throw new Error('INSTAGRAM_REPLY_ATTEMPT_SCOPE_REQUIRED');
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaInstagramPrivateReplyReservation" (
        "id","environment","connectionKey","accountIdentityReferenceId","sourceCommentId","sourceMessageId","conversationId","replyAttemptId","status","reservedAt","expiresAt","createdAt","updatedAt"
       ) VALUES ($1,$2::"MetaPlatformEnvironment",$3,$4,$5,$6,$7,$8,'RESERVED',$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","sourceCommentId") DO NOTHING RETURNING *`,
      randomUUID(), attempt.environment, attempt.connectionKey, attempt.accountIdentityReferenceId, input.sourceCommentId,
      input.sourceMessageId, input.conversationId, input.attemptId, input.now, input.expiresAt,
    );
    if (rows.length === 1) return rows[0]!;
    const existing = one(await tx.$queryRawUnsafe<Array<Record<string, unknown> & { replyAttemptId: string | null }>>(
      `SELECT * FROM "MetaInstagramPrivateReplyReservation"
       WHERE "environment"=$1::"MetaPlatformEnvironment" AND "connectionKey"=$2
         AND "accountIdentityReferenceId"=$3 AND "sourceCommentId"=$4 FOR UPDATE`,
      attempt.environment, attempt.connectionKey, attempt.accountIdentityReferenceId, input.sourceCommentId,
    ), 'INSTAGRAM_PRIVATE_REPLY_ALREADY_RESERVED');
    if (existing.replyAttemptId !== input.attemptId) throw new Error('INSTAGRAM_PRIVATE_REPLY_ALREADY_RESERVED');
    return existing;
  });
}

export async function markInstagramReplySendingStorage(attemptId: string, now = new Date()) {
  const count = await db.$executeRawUnsafe(
    `UPDATE "MetaInstagramReplyAttempt" SET "status"='QUEUED',"providerStatus"='SENDING',"sendingAt"=$2,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "id"=$1 AND "providerStatus"='PENDING'`, attemptId, now,
  );
  if (count !== 1) throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_SENDABLE');
  await db.$executeRawUnsafe(
    `UPDATE "MetaMessage" SET "status"='QUEUED',"providerStatus"='SENDING',"updatedAt"=CURRENT_TIMESTAMP
     WHERE "localMessageKey"=(SELECT "localMessageKey" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1)
       AND "providerStatus"='PENDING'`, attemptId,
  );
  await db.$executeRawUnsafe(
    `UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='SENDING',"updatedAt"=CURRENT_TIMESTAMP
     WHERE "replyAttemptId"=$1 AND "status"='RESERVED'`, attemptId,
  );
}

export async function markInstagramReplySentStorage(input: { attemptId: string; providerMessageId: string; text: string; now: Date; providerResponseDigest?: string | null }) {
  return db.$transaction(async (tx) => {
    const attempt = one(await tx.$queryRawUnsafe<Array<Record<string, unknown> & { environment: string; connectionKey: string; accountIdentityReferenceId: string; conversationId: string; sourceMessageId: string | null; mode: string; localMessageKey: string; correlationId: string }>>(
      `SELECT * FROM "MetaInstagramReplyAttempt" WHERE "id"=$1 FOR UPDATE`, input.attemptId,
    ), 'INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
    if (attempt.providerStatus !== 'SENDING' && attempt.providerStatus !== 'PENDING') throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_COMPLETABLE');
    const source = attempt.sourceMessageId ? one(await tx.$queryRawUnsafe<Array<{ platformId: string; commentId: string | null }>>(
      `SELECT "platformId","commentId" FROM "MetaMessage" WHERE "id"=$1`, attempt.sourceMessageId,
    ), 'INSTAGRAM_SOURCE_MESSAGE_NOT_FOUND') : null;
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE "MetaMessage" SET "platformId"=$2,"providerMessageId"=$2,"status"='SENT',"providerStatus"='SENT',
       "text"=$3,"providerOccurredAt"=$4,"receivedAt"=$4,"sentAt"=$4,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "localMessageKey"=$1 AND "outboundIdempotencyKey"=$5 AND "providerStatus" IN ('PENDING','SENDING')
       RETURNING *`,
      attempt.localMessageKey, input.providerMessageId, input.text, input.now, attempt.idempotencyKey,
    );
    const message = one(rows, 'INSTAGRAM_OUTBOUND_MESSAGE_COMPLETE_FAILED');
    const updated = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE "MetaInstagramReplyAttempt" SET "status"='SENT',"providerStatus"='SENT',"reconciliationStatus"='NOT_REQUIRED',
       "providerMessageId"=$2,"completedAt"=$3,"providerResponseDigest"=COALESCE($4,"providerResponseDigest"),"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 RETURNING *`,
      input.attemptId, input.providerMessageId, input.now, input.providerResponseDigest ?? null,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='SENT',"sentAt"=$2,"providerMessageId"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "replyAttemptId"=$1`,
      input.attemptId, input.now, input.providerMessageId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "MetaConversation" SET "lastMessageAt"=$2,"lastActivityAt"=$2,"lastActivityProviderMessageId"=$3,"lastActivityMessageId"=$4,
       "orderingVersion"="orderingVersion"+1,"privateReplySentAt"=CASE WHEN $5 THEN $2 ELSE "privateReplySentAt" END,
       "status"=CASE WHEN "status"='RESOLVED' THEN 'OPEN'::"MetaInstagramConversationStatus" ELSE "status" END,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND ("lastActivityAt" IS NULL OR $2>"lastActivityAt" OR ($2="lastActivityAt" AND $3>COALESCE("lastActivityProviderMessageId",'')))`,
      attempt.conversationId, input.now, input.providerMessageId, (message as { id: string }).id, attempt.mode === 'PRIVATE_REPLY',
    );
    return { attempt: one(updated, 'INSTAGRAM_REPLY_ATTEMPT_UPDATE_FAILED'), message };
  });
}

export async function markInstagramReplyUnknownOutcomeStorage(input: { attemptId: string; failureCode?: string; failureSummary?: string; providerMessageId?: string | null; now?: Date }) {
  const now = input.now ?? new Date();
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE "MetaInstagramReplyAttempt" SET "status"='FAILED',"providerStatus"='UNKNOWN_OUTCOME',"reconciliationStatus"='REQUIRED',
     "failureCode"=$2,"failureCategory"='UNKNOWN_OUTCOME',"failureSummary"=$3,"completedAt"=$4,
     "providerMessageId"=COALESCE($5,"providerMessageId"),"updatedAt"=CURRENT_TIMESTAMP
     WHERE "id"=$1 AND "providerStatus" IN ('PENDING','SENDING') RETURNING *`,
    input.attemptId, safeCode(input.failureCode ?? 'INSTAGRAM_PROVIDER_WRITE_OUTCOME_UNKNOWN'), input.failureSummary?.slice(0, 500) ?? 'Provider write outcome is unknown and requires reconciliation.', now, input.providerMessageId ?? null,
  );
  if (rows.length !== 1) throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_UNKNOWN_OUTCOME_ELIGIBLE');
  await db.$executeRawUnsafe(
    `UPDATE "MetaMessage" SET "status"='FAILED',"providerStatus"='UNKNOWN_OUTCOME',"failedAt"=$2,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "localMessageKey"=(SELECT "localMessageKey" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1)
       AND "providerStatus" IN ('PENDING','SENDING')`, input.attemptId, now,
  );
  await db.$executeRawUnsafe(`UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='UNKNOWN_OUTCOME',"failureCode"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "replyAttemptId"=$1`, input.attemptId, safeCode(input.failureCode ?? 'INSTAGRAM_PROVIDER_WRITE_OUTCOME_UNKNOWN'));
  return rows[0]!;
}

export async function markInstagramReplyFailedStorage(input: { attemptId: string; failureCode?: string; failureSummary?: string; now?: Date }) {
  const now = input.now ?? new Date();
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE "MetaInstagramReplyAttempt" SET "status"='FAILED',"providerStatus"='FAILED',"reconciliationStatus"='NOT_REQUIRED',
     "failureCode"=$2,"failureCategory"='PERMANENT_OR_RETRYABLE',"failureSummary"=$3,"completedAt"=$4,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "id"=$1 AND "providerStatus" IN ('PENDING','SENDING') RETURNING *`,
    input.attemptId, safeCode(input.failureCode ?? 'INSTAGRAM_PROVIDER_REPLY_FAILED'), input.failureSummary?.slice(0, 500) ?? 'Provider reply failed.', now,
  );
  if (rows.length !== 1) throw new Error('INSTAGRAM_SEND_ATTEMPT_NOT_FAILABLE');
  await db.$executeRawUnsafe(
    `UPDATE "MetaMessage" SET "status"='FAILED',"providerStatus"='FAILED',"failedAt"=$2,"updatedAt"=CURRENT_TIMESTAMP
     WHERE "localMessageKey"=(SELECT "localMessageKey" FROM "MetaInstagramReplyAttempt" WHERE "id"=$1)
       AND "providerStatus" IN ('PENDING','SENDING')`, input.attemptId, now,
  );
  await db.$executeRawUnsafe(`UPDATE "MetaInstagramPrivateReplyReservation" SET "status"='FAILED_DEFINITIVE',"failureCode"=$2,"failureSummary"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "replyAttemptId"=$1`, input.attemptId, safeCode(input.failureCode ?? 'INSTAGRAM_PROVIDER_REPLY_FAILED'), input.failureSummary?.slice(0, 500) ?? 'Provider reply failed.');
  return rows[0]!;
}

export async function persistInstagramAttachmentPolicyStorage(input: { attachmentId: string; sourceUrl?: string | null; validationJobReference?: string | null; decision: 'PENDING' | 'ALLOWED' | 'QUARANTINED' | 'REJECTED' | 'FAILED'; reasonCode?: string | null; contentDigest?: string | null }) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE "MetaMessageAttachment" SET "sourceUrlDigest"=$2,"validationJobReference"=$3,"contentDigest"=COALESCE($4,"contentDigest"),
       "quarantinedAt"=CASE WHEN $5='QUARANTINED' THEN CURRENT_TIMESTAMP ELSE "quarantinedAt" END,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,
      input.attachmentId, digestInstagramAttachmentUrl(input.sourceUrl), input.validationJobReference ?? null, input.contentDigest ?? null, input.decision,
    );
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO "MetaInstagramAttachmentPolicyDecision" ("id","attachmentId","decision","reasonCode","contentDigest","validationJobRef","decidedAt","createdAt","updatedAt")
       VALUES ($1,$2,$3::"MetaInstagramAttachmentDecision",$4,$5,$6,CASE WHEN $3='PENDING' THEN NULL ELSE CURRENT_TIMESTAMP END,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("attachmentId") DO UPDATE SET "decision"=EXCLUDED."decision","reasonCode"=EXCLUDED."reasonCode",
       "contentDigest"=COALESCE(EXCLUDED."contentDigest","MetaInstagramAttachmentPolicyDecision"."contentDigest"),
       "validationJobRef"=COALESCE(EXCLUDED."validationJobRef","MetaInstagramAttachmentPolicyDecision"."validationJobRef"),
       "decidedAt"=CASE WHEN EXCLUDED."decision"='PENDING' THEN NULL ELSE CURRENT_TIMESTAMP END,"updatedAt"=CURRENT_TIMESTAMP RETURNING *`,
      randomUUID(), input.attachmentId, input.decision, input.reasonCode ?? null, input.contentDigest ?? null, input.validationJobReference ?? null,
    );
    return one(rows, 'INSTAGRAM_ATTACHMENT_POLICY_PERSISTENCE_FAILED');
  });
}

export type MetaInstagramAttachmentValidationRecord = Readonly<{
  id: string;
  messageId: string;
  conversationId: string;
  accountId: string;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | null;
  connectionKey: string | null;
  correlationId: string | null;
  externalId: string | null;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'UNKNOWN';
  status: 'PENDING' | 'READY' | 'REJECTED' | 'FAILED';
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  sourceUrl: string | null;
  sourceUrlDigest: string | null;
  sourceUrlExpiresAt: Date | null;
  contentDigest: string | null;
  validationJobReference: string | null;
  storageKey: string | null;
}>;

export async function claimInstagramAttachmentValidationStorage(input: {
  attachmentId: string;
  validationJobReference: string;
  expectedSourceDigest?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<MetaInstagramAttachmentValidationRecord>>(
      `SELECT a."id",a."messageId",m."conversationId",c."accountId",c."environment",c."connectionKey",m."correlationId",
        a."externalId",a."type"::text,a."status"::text,a."mimeType",a."fileName",a."fileSize",a."sourceUrl",a."sourceUrlDigest",
        a."sourceUrlExpiresAt",a."contentDigest",a."validationJobReference",a."storageKey"
       FROM "MetaMessageAttachment" a
       JOIN "MetaMessage" m ON m."id"=a."messageId"
       JOIN "MetaConversation" c ON c."id"=m."conversationId"
       WHERE a."id"=$1 FOR UPDATE OF a`, input.attachmentId,
    );
    const record = one(rows, 'INSTAGRAM_ATTACHMENT_NOT_FOUND');
    if (input.expectedSourceDigest && record.sourceUrlDigest !== input.expectedSourceDigest.toLowerCase()) {
      throw Object.assign(new Error('INSTAGRAM_ATTACHMENT_SOURCE_DIGEST_MISMATCH'), { permanent: true, retryable: false });
    }
    if (record.validationJobReference && record.validationJobReference !== input.validationJobReference
      && record.status !== 'READY' && record.status !== 'REJECTED') {
      throw Object.assign(new Error('INSTAGRAM_ATTACHMENT_VALIDATION_CLAIM_CONFLICT'), { retryable: true });
    }
    if (record.status === 'READY' || record.status === 'REJECTED') return record;

    await tx.$executeRawUnsafe(
      `UPDATE "MetaMessageAttachment" SET "validationJobReference"=$2,"status"='PENDING',"failureCode"=NULL,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1`, input.attachmentId, input.validationJobReference,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO "MetaInstagramAttachmentPolicyDecision" ("id","attachmentId","decision","validationJobRef","createdAt","updatedAt")
       VALUES ($1,$2,'PENDING',$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("attachmentId") DO UPDATE SET "decision"='PENDING',"reasonCode"=NULL,"validationJobRef"=EXCLUDED."validationJobRef",
       "decidedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP`, randomUUID(), input.attachmentId, input.validationJobReference,
    );
    return { ...record, status: 'PENDING' as const, validationJobReference: input.validationJobReference };
  });
}

export async function markInstagramAttachmentReadyStorage(input: {
  attachmentId: string;
  validationJobReference: string;
  mimeType: string;
  fileSize: number;
  contentDigest: string;
  storageKey: string;
  reasonCode: string;
  validatorVersion: string;
}) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE "MetaMessageAttachment" SET "status"='READY',"mimeType"=$3,"fileSize"=$4,"contentDigest"=$5,
       "storageKey"=$6,"storageUrl"=NULL,"failureCode"=NULL,"quarantinedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND "validationJobReference"=$2 AND "status" IN ('PENDING','FAILED') RETURNING *`,
      input.attachmentId, input.validationJobReference, input.mimeType, input.fileSize, input.contentDigest, input.storageKey,
    );
    const attachment = one(rows, 'INSTAGRAM_ATTACHMENT_READY_TRANSITION_REJECTED');
    await tx.$executeRawUnsafe(
      `UPDATE "MetaInstagramAttachmentPolicyDecision" SET "decision"='ALLOWED',"reasonCode"=$2,"validatorVersion"=$3,
       "contentDigest"=$4,"validationJobRef"=$5,"decidedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "attachmentId"=$1`,
      input.attachmentId, safeCode(input.reasonCode), input.validatorVersion.slice(0, 100), input.contentDigest, input.validationJobReference,
    );
    return attachment;
  });
}

export async function markInstagramAttachmentRejectedStorage(input: {
  attachmentId: string;
  validationJobReference: string;
  reasonCode: string;
  validatorVersion: string;
  contentDigest?: string | null;
  quarantined?: boolean;
}) {
  return db.$transaction(async (tx) => {
    const reason = safeCode(input.reasonCode);
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE "MetaMessageAttachment" SET "status"='REJECTED',"failureCode"=$3,"contentDigest"=COALESCE($4,"contentDigest"),
       "storageKey"=NULL,"storageUrl"=NULL,"quarantinedAt"=CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE "quarantinedAt" END,
       "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "validationJobReference"=$2 AND "status" IN ('PENDING','FAILED') RETURNING *`,
      input.attachmentId, input.validationJobReference, reason, input.contentDigest ?? null, input.quarantined === true,
    );
    const attachment = one(rows, 'INSTAGRAM_ATTACHMENT_REJECT_TRANSITION_REJECTED');
    await tx.$executeRawUnsafe(
      `UPDATE "MetaInstagramAttachmentPolicyDecision" SET "decision"=$2::"MetaInstagramAttachmentDecision","reasonCode"=$3,
       "validatorVersion"=$4,"contentDigest"=COALESCE($5,"contentDigest"),"validationJobRef"=$6,
       "decidedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "attachmentId"=$1`,
      input.attachmentId, input.quarantined ? 'QUARANTINED' : 'REJECTED', reason,
      input.validatorVersion.slice(0, 100), input.contentDigest ?? null, input.validationJobReference,
    );
    return attachment;
  });
}

export async function markInstagramAttachmentValidationFailedStorage(input: {
  attachmentId: string;
  validationJobReference: string;
  reasonCode: string;
  validatorVersion: string;
  contentDigest?: string | null;
}) {
  const reason = safeCode(input.reasonCode);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE "MetaMessageAttachment" SET "status"='FAILED',"failureCode"=$3,"contentDigest"=COALESCE($4,"contentDigest"),
       "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "validationJobReference"=$2 AND "status" IN ('PENDING','FAILED') RETURNING *`,
      input.attachmentId, input.validationJobReference, reason, input.contentDigest ?? null,
    );
    const attachment = one(rows, 'INSTAGRAM_ATTACHMENT_FAILURE_TRANSITION_REJECTED');
    await tx.$executeRawUnsafe(
      `UPDATE "MetaInstagramAttachmentPolicyDecision" SET "decision"='FAILED',"reasonCode"=$2,"validatorVersion"=$3,
       "contentDigest"=COALESCE($4,"contentDigest"),"validationJobRef"=$5,"decidedAt"=CURRENT_TIMESTAMP,
       "updatedAt"=CURRENT_TIMESTAMP WHERE "attachmentId"=$1`, input.attachmentId, reason,
      input.validatorVersion.slice(0, 100), input.contentDigest ?? null, input.validationJobReference,
    );
    return attachment;
  });
}
