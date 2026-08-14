import {
  isMetaNormalizedInstagramConversation,
  type MetaNormalizedInstagramConversation,
} from '../contracts/instagram';
import {
  isMetaNormalizedInstagramSendRequest,
  type MetaInstagramSendMode,
  type MetaNormalizedInstagramSendRequest,
} from '../contracts/instagram-send';

export const META_SOCIAL_REPLY_WINDOW_POLICY_SCHEMA_VERSION = 1 as const;
export const META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS = 24 * 60 * 60 * 1_000;
export const META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export const META_INSTAGRAM_PRIVATE_REPLY_SURFACES = ['POST_OR_REEL', 'LIVE'] as const;
export const META_SOCIAL_REPLY_WINDOW_POLICY_IDS = [
  'INSTAGRAM_STANDARD_24H',
  'INSTAGRAM_PRIVATE_REPLY_7D',
  'INSTAGRAM_PRIVATE_REPLY_LIVE',
] as const;
export const META_SOCIAL_REPLY_WINDOW_DECISIONS = ['ALLOWED', 'BLOCKED'] as const;
export const META_SOCIAL_REPLY_WINDOW_REASONS = [
  'STANDARD_WINDOW_OPEN',
  'STANDARD_LAST_INBOUND_REQUIRED',
  'STANDARD_WINDOW_EXPIRED',
  'STANDARD_WINDOW_STATE_INVALID',
  'STANDARD_WINDOW_STATE_MISMATCH',
  'PRIVATE_REPLY_WINDOW_OPEN',
  'PRIVATE_REPLY_COMMENT_CREATED_AT_REQUIRED',
  'PRIVATE_REPLY_ALREADY_SENT',
  'PRIVATE_REPLY_WINDOW_EXPIRED',
  'PRIVATE_REPLY_STATE_INVALID',
  'PRIVATE_REPLY_LIVE_STATE_REQUIRED',
  'PRIVATE_REPLY_LIVE_ENDED',
] as const;

export type MetaInstagramPrivateReplySurface = (typeof META_INSTAGRAM_PRIVATE_REPLY_SURFACES)[number];
export type MetaSocialReplyWindowPolicyId = (typeof META_SOCIAL_REPLY_WINDOW_POLICY_IDS)[number];
export type MetaSocialReplyWindowDecisionStatus = (typeof META_SOCIAL_REPLY_WINDOW_DECISIONS)[number];
export type MetaSocialReplyWindowReason = (typeof META_SOCIAL_REPLY_WINDOW_REASONS)[number];

export interface MetaSocialReplyWindowDecision {
  readonly schemaVersion: typeof META_SOCIAL_REPLY_WINDOW_POLICY_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly channel: 'INSTAGRAM';
  readonly decisionKey: string;
  readonly policyId: MetaSocialReplyWindowPolicyId;
  readonly decision: MetaSocialReplyWindowDecisionStatus;
  readonly allowed: boolean;
  readonly mode: MetaInstagramSendMode;
  readonly reason: MetaSocialReplyWindowReason;
  readonly conversationKey: string;
  readonly accountIdentityKey: string;
  readonly sourceCommentId: string | null;
  readonly evaluatedAt: string;
  readonly windowOpenedAt: string | null;
  readonly expiresAt: string | null;
  readonly remainingMs: number | null;
  readonly correlationId: string;
}

export interface EvaluateMetaInstagramReplyWindowInput {
  readonly request: MetaNormalizedInstagramSendRequest;
  readonly conversation: MetaNormalizedInstagramConversation;
  readonly evaluatedAt: unknown;
  readonly sourceCommentCreatedAt?: unknown;
  readonly sourcePrivateReplySentAt?: unknown;
  readonly privateReplySurface?: unknown;
  readonly liveBroadcastActive?: unknown;
}

type DecisionInput = Omit<
  MetaSocialReplyWindowDecision,
  'schemaVersion' | 'provider' | 'channel' | 'decisionKey' | 'decision' | 'allowed' | 'remainingMs'
> & {
  readonly allowed: boolean;
};

const DECISION_KEYS = Object.freeze([
  'schemaVersion',
  'provider',
  'channel',
  'decisionKey',
  'policyId',
  'decision',
  'allowed',
  'mode',
  'reason',
  'conversationKey',
  'accountIdentityKey',
  'sourceCommentId',
  'evaluatedAt',
  'windowOpenedAt',
  'expiresAt',
  'remainingMs',
  'correlationId',
] as const);

const ALLOWED_REASONS = new Set<MetaSocialReplyWindowReason>([
  'STANDARD_WINDOW_OPEN',
  'PRIVATE_REPLY_WINDOW_OPEN',
]);

const POLICY_REASONS: Readonly<Record<MetaSocialReplyWindowPolicyId, ReadonlySet<MetaSocialReplyWindowReason>>> = Object.freeze({
  INSTAGRAM_STANDARD_24H: new Set<MetaSocialReplyWindowReason>([
    'STANDARD_WINDOW_OPEN',
    'STANDARD_LAST_INBOUND_REQUIRED',
    'STANDARD_WINDOW_EXPIRED',
    'STANDARD_WINDOW_STATE_INVALID',
    'STANDARD_WINDOW_STATE_MISMATCH',
  ]),
  INSTAGRAM_PRIVATE_REPLY_7D: new Set<MetaSocialReplyWindowReason>([
    'PRIVATE_REPLY_WINDOW_OPEN',
    'PRIVATE_REPLY_COMMENT_CREATED_AT_REQUIRED',
    'PRIVATE_REPLY_ALREADY_SENT',
    'PRIVATE_REPLY_WINDOW_EXPIRED',
    'PRIVATE_REPLY_STATE_INVALID',
  ]),
  INSTAGRAM_PRIVATE_REPLY_LIVE: new Set<MetaSocialReplyWindowReason>([
    'PRIVATE_REPLY_WINDOW_OPEN',
    'PRIVATE_REPLY_COMMENT_CREATED_AT_REQUIRED',
    'PRIVATE_REPLY_ALREADY_SENT',
    'PRIVATE_REPLY_STATE_INVALID',
    'PRIVATE_REPLY_LIVE_STATE_REQUIRED',
    'PRIVATE_REPLY_LIVE_ENDED',
  ]),
});

const PROVIDER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,255}$/;
const SCOPED_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,768}$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], code: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new TypeError(code);
  return value as T;
}

function boundedString(value: unknown, code: string, maxLength: number, pattern?: RegExp): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || (pattern && !pattern.test(normalized))) {
    throw new TypeError(code);
  }
  return normalized;
}

function canonicalDate(value: unknown, code: string, required = true): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) throw new TypeError(code);
    return null;
  }

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value < 1_000_000_000_000 ? value * 1_000 : value);
  } else if (typeof value === 'string') {
    const normalized = value.trim();
    const numeric = /^\d{10,13}$/.test(normalized) ? Number(normalized) : null;
    date = numeric === null
      ? new Date(normalized)
      : new Date(numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric);
  } else {
    throw new TypeError(code);
  }

  if (Number.isNaN(date.getTime())) throw new TypeError(code);
  return date.toISOString();
}

function exactKeys(value: Readonly<Record<string, unknown>>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function addMs(value: string, durationMs: number): string {
  return new Date(new Date(value).getTime() + durationMs).toISOString();
}

function sameInstant(left: string | null, right: string | null): boolean {
  if (left === null || right === null) return left === right;
  return new Date(left).getTime() === new Date(right).getTime();
}

function remainingMs(evaluatedAt: string, expiresAt: string | null): number | null {
  if (expiresAt === null) return null;
  return Math.max(0, new Date(expiresAt).getTime() - new Date(evaluatedAt).getTime());
}

function createDecision(input: DecisionInput): MetaSocialReplyWindowDecision {
  const evaluatedAt = canonicalDate(input.evaluatedAt, 'META_REPLY_WINDOW_EVALUATED_AT_INVALID') as string;
  const windowOpenedAt = canonicalDate(input.windowOpenedAt, 'META_REPLY_WINDOW_OPENED_AT_INVALID', false);
  const expiresAt = canonicalDate(input.expiresAt, 'META_REPLY_WINDOW_EXPIRES_AT_INVALID', false);
  const conversationKey = boundedString(
    input.conversationKey,
    'META_REPLY_WINDOW_CONVERSATION_KEY_INVALID',
    768,
    SCOPED_KEY_PATTERN,
  );
  const accountIdentityKey = boundedString(
    input.accountIdentityKey,
    'META_REPLY_WINDOW_ACCOUNT_KEY_INVALID',
    512,
    SCOPED_KEY_PATTERN,
  );
  const correlationId = boundedString(
    input.correlationId,
    'META_REPLY_WINDOW_CORRELATION_ID_INVALID',
    255,
  );
  const sourceCommentId = input.sourceCommentId === null
    ? null
    : boundedString(input.sourceCommentId, 'META_REPLY_WINDOW_COMMENT_ID_INVALID', 255, PROVIDER_ID_PATTERN);
  const expectedDecision = input.allowed ? 'ALLOWED' : 'BLOCKED';
  const reasonIsAllowed = ALLOWED_REASONS.has(input.reason);

  if (input.allowed !== reasonIsAllowed) throw new TypeError('META_REPLY_WINDOW_REASON_DECISION_MISMATCH');
  if (!POLICY_REASONS[input.policyId].has(input.reason)) {
    throw new TypeError('META_REPLY_WINDOW_POLICY_REASON_MISMATCH');
  }
  if (input.mode === 'MESSAGE' && sourceCommentId !== null) {
    throw new TypeError('META_REPLY_WINDOW_STANDARD_COMMENT_NOT_ALLOWED');
  }
  if (input.mode === 'PRIVATE_REPLY' && sourceCommentId === null) {
    throw new TypeError('META_REPLY_WINDOW_PRIVATE_COMMENT_REQUIRED');
  }
  if (!conversationKey.startsWith(`${accountIdentityKey}:CONVERSATION:`)) {
    throw new TypeError('META_REPLY_WINDOW_CONVERSATION_SCOPE_MISMATCH');
  }
  if (windowOpenedAt && new Date(windowOpenedAt).getTime() > new Date(evaluatedAt).getTime()) {
    throw new TypeError('META_REPLY_WINDOW_OPENED_AT_FUTURE');
  }
  if (expiresAt && windowOpenedAt && new Date(expiresAt).getTime() <= new Date(windowOpenedAt).getTime()) {
    throw new TypeError('META_REPLY_WINDOW_RANGE_INVALID');
  }

  const policyModeIsValid = input.mode === 'MESSAGE'
    ? input.policyId === 'INSTAGRAM_STANDARD_24H'
    : input.policyId === 'INSTAGRAM_PRIVATE_REPLY_7D' || input.policyId === 'INSTAGRAM_PRIVATE_REPLY_LIVE';
  if (!policyModeIsValid) throw new TypeError('META_REPLY_WINDOW_POLICY_MODE_MISMATCH');
  if (input.policyId === 'INSTAGRAM_PRIVATE_REPLY_LIVE' && expiresAt !== null) {
    throw new TypeError('META_REPLY_WINDOW_LIVE_EXPIRY_NOT_ALLOWED');
  }
  if (input.policyId !== 'INSTAGRAM_PRIVATE_REPLY_LIVE' && windowOpenedAt !== null && expiresAt === null) {
    throw new TypeError('META_REPLY_WINDOW_EXPIRY_REQUIRED');
  }

  return Object.freeze({
    schemaVersion: META_SOCIAL_REPLY_WINDOW_POLICY_SCHEMA_VERSION,
    provider: 'META' as const,
    channel: 'INSTAGRAM' as const,
    decisionKey: input.mode === 'MESSAGE'
      ? `${conversationKey}:REPLY_POLICY:MESSAGE`
      : `${conversationKey}:REPLY_POLICY:PRIVATE_REPLY:${sourceCommentId}`,
    policyId: input.policyId,
    decision: expectedDecision,
    allowed: input.allowed,
    mode: input.mode,
    reason: input.reason,
    conversationKey,
    accountIdentityKey,
    sourceCommentId,
    evaluatedAt,
    windowOpenedAt,
    expiresAt,
    remainingMs: remainingMs(evaluatedAt, expiresAt),
    correlationId,
  });
}

function assertCanonicalScope(
  request: MetaNormalizedInstagramSendRequest,
  conversation: MetaNormalizedInstagramConversation,
): void {
  if (!isMetaNormalizedInstagramSendRequest(request)) {
    throw new TypeError('META_REPLY_WINDOW_SEND_REQUEST_INVALID');
  }
  if (!isMetaNormalizedInstagramConversation(conversation)) {
    throw new TypeError('META_REPLY_WINDOW_CONVERSATION_INVALID');
  }
  if (request.conversationKey !== conversation.conversationKey) {
    throw new TypeError('META_REPLY_WINDOW_CONVERSATION_MISMATCH');
  }
  if (request.account.identityKey !== conversation.account.identityKey) {
    throw new TypeError('META_REPLY_WINDOW_ACCOUNT_MISMATCH');
  }
  if (request.page.identityKey !== conversation.page.identityKey) {
    throw new TypeError('META_REPLY_WINDOW_PAGE_MISMATCH');
  }
  if (request.participant.participantKey !== conversation.participant.participantKey) {
    throw new TypeError('META_REPLY_WINDOW_PARTICIPANT_MISMATCH');
  }
}

function evaluateStandardWindow(
  request: MetaNormalizedInstagramSendRequest,
  conversation: MetaNormalizedInstagramConversation,
  evaluatedAt: string,
): MetaSocialReplyWindowDecision {
  const base = {
    policyId: 'INSTAGRAM_STANDARD_24H' as const,
    mode: request.mode,
    conversationKey: conversation.conversationKey,
    accountIdentityKey: conversation.account.identityKey,
    sourceCommentId: null,
    evaluatedAt,
    correlationId: request.correlationId,
  };

  if (!conversation.lastInboundAt) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'STANDARD_LAST_INBOUND_REQUIRED',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }

  const windowOpenedAt = canonicalDate(
    conversation.lastInboundAt,
    'META_REPLY_WINDOW_LAST_INBOUND_INVALID',
  ) as string;
  const expiresAt = addMs(windowOpenedAt, META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS);
  const evaluatedMs = new Date(evaluatedAt).getTime();
  const openedMs = new Date(windowOpenedAt).getTime();

  if (openedMs > evaluatedMs) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'STANDARD_WINDOW_STATE_INVALID',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }

  if (conversation.replyWindowExpiresAt && !sameInstant(conversation.replyWindowExpiresAt, expiresAt)) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'STANDARD_WINDOW_STATE_MISMATCH',
      windowOpenedAt,
      expiresAt,
    });
  }

  const allowed = evaluatedMs < new Date(expiresAt).getTime();
  return createDecision({
    ...base,
    allowed,
    reason: allowed ? 'STANDARD_WINDOW_OPEN' : 'STANDARD_WINDOW_EXPIRED',
    windowOpenedAt,
    expiresAt,
  });
}

function evaluatePrivateReplyWindow(
  input: EvaluateMetaInstagramReplyWindowInput,
  request: MetaNormalizedInstagramSendRequest,
  conversation: MetaNormalizedInstagramConversation,
  evaluatedAt: string,
): MetaSocialReplyWindowDecision {
  const sourceCommentId = request.sourceCommentId;
  if (!sourceCommentId) throw new TypeError('META_REPLY_WINDOW_PRIVATE_COMMENT_REQUIRED');
  const surface = enumValue(
    input.privateReplySurface,
    META_INSTAGRAM_PRIVATE_REPLY_SURFACES,
    'META_REPLY_WINDOW_PRIVATE_SURFACE_REQUIRED',
  );
  const policyId = surface === 'LIVE'
    ? 'INSTAGRAM_PRIVATE_REPLY_LIVE' as const
    : 'INSTAGRAM_PRIVATE_REPLY_7D' as const;
  const base = {
    policyId,
    mode: request.mode,
    conversationKey: conversation.conversationKey,
    accountIdentityKey: conversation.account.identityKey,
    sourceCommentId,
    evaluatedAt,
    correlationId: request.correlationId,
  };

  if (!hasOwn(input, 'sourceCommentCreatedAt')) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'PRIVATE_REPLY_COMMENT_CREATED_AT_REQUIRED',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }
  if (!hasOwn(input, 'sourcePrivateReplySentAt')) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'PRIVATE_REPLY_STATE_INVALID',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }

  const commentCreatedAt = canonicalDate(
    input.sourceCommentCreatedAt,
    'META_REPLY_WINDOW_COMMENT_CREATED_AT_INVALID',
    false,
  );
  if (!commentCreatedAt) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'PRIVATE_REPLY_COMMENT_CREATED_AT_REQUIRED',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }
  const sentAt = canonicalDate(
    input.sourcePrivateReplySentAt,
    'META_REPLY_WINDOW_PRIVATE_SENT_AT_INVALID',
    false,
  );
  const evaluatedMs = new Date(evaluatedAt).getTime();
  const commentCreatedMs = new Date(commentCreatedAt).getTime();

  if (commentCreatedMs > evaluatedMs || (sentAt && new Date(sentAt).getTime() > evaluatedMs)) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'PRIVATE_REPLY_STATE_INVALID',
      windowOpenedAt: null,
      expiresAt: null,
    });
  }

  if (sentAt) {
    return createDecision({
      ...base,
      allowed: false,
      reason: 'PRIVATE_REPLY_ALREADY_SENT',
      windowOpenedAt: commentCreatedAt,
      expiresAt: surface === 'LIVE'
        ? null
        : addMs(commentCreatedAt, META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS),
    });
  }

  if (surface === 'LIVE') {
    if (typeof input.liveBroadcastActive !== 'boolean') {
      return createDecision({
        ...base,
        allowed: false,
        reason: 'PRIVATE_REPLY_LIVE_STATE_REQUIRED',
        windowOpenedAt: commentCreatedAt,
        expiresAt: null,
      });
    }
    return createDecision({
      ...base,
      allowed: input.liveBroadcastActive,
      reason: input.liveBroadcastActive ? 'PRIVATE_REPLY_WINDOW_OPEN' : 'PRIVATE_REPLY_LIVE_ENDED',
      windowOpenedAt: commentCreatedAt,
      expiresAt: null,
    });
  }

  const expiresAt = addMs(commentCreatedAt, META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS);
  const allowed = evaluatedMs < new Date(expiresAt).getTime();
  return createDecision({
    ...base,
    allowed,
    reason: allowed ? 'PRIVATE_REPLY_WINDOW_OPEN' : 'PRIVATE_REPLY_WINDOW_EXPIRED',
    windowOpenedAt: commentCreatedAt,
    expiresAt,
  });
}

export function evaluateMetaInstagramReplyWindow(
  input: EvaluateMetaInstagramReplyWindowInput,
): MetaSocialReplyWindowDecision {
  assertCanonicalScope(input.request, input.conversation);
  const evaluatedAt = canonicalDate(input.evaluatedAt, 'META_REPLY_WINDOW_EVALUATED_AT_INVALID') as string;

  if (input.request.mode === 'MESSAGE') {
    return evaluateStandardWindow(input.request, input.conversation, evaluatedAt);
  }
  return evaluatePrivateReplyWindow(input, input.request, input.conversation, evaluatedAt);
}

export function isMetaSocialReplyWindowDecision(value: unknown): value is MetaSocialReplyWindowDecision {
  if (!isRecord(value) || !exactKeys(value, DECISION_KEYS)) return false;
  try {
    const mode = enumValue(value.mode, ['MESSAGE', 'PRIVATE_REPLY'] as const, 'META_REPLY_WINDOW_MODE_INVALID');
    const reason = enumValue(value.reason, META_SOCIAL_REPLY_WINDOW_REASONS, 'META_REPLY_WINDOW_REASON_INVALID');
    const policyId = enumValue(value.policyId, META_SOCIAL_REPLY_WINDOW_POLICY_IDS, 'META_REPLY_WINDOW_POLICY_INVALID');
    if (typeof value.allowed !== 'boolean') return false;
    if (typeof value.conversationKey !== 'string' || !value.conversationKey) return false;
    if (typeof value.accountIdentityKey !== 'string' || !value.accountIdentityKey) return false;
    if (typeof value.correlationId !== 'string' || !value.correlationId) return false;
    if (value.sourceCommentId !== null && typeof value.sourceCommentId !== 'string') return false;
    if (typeof value.evaluatedAt !== 'string') return false;
    if (value.windowOpenedAt !== null && typeof value.windowOpenedAt !== 'string') return false;
    if (value.expiresAt !== null && typeof value.expiresAt !== 'string') return false;

    const conversationKey = value.conversationKey;
    const accountIdentityKey = value.accountIdentityKey;
    const correlationId = value.correlationId;
    const sourceCommentId = value.sourceCommentId as string | null;
    const evaluatedAt = value.evaluatedAt;
    const windowOpenedAt = value.windowOpenedAt as string | null;
    const expiresAt = value.expiresAt as string | null;

    const canonical = createDecision({
      policyId,
      allowed: value.allowed,
      mode,
      reason,
      conversationKey,
      accountIdentityKey,
      sourceCommentId,
      evaluatedAt,
      windowOpenedAt,
      expiresAt,
      correlationId,
    });

    return stableStringify(canonical) === stableStringify(value);
  } catch {
    return false;
  }
}
