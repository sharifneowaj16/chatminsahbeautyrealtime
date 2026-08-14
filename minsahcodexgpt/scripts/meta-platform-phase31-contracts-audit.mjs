#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const includesAll = (source, values) => values.every((value) => source.includes(value));

const required = [
  'lib/meta-platform/contracts/webhook.ts',
  'lib/meta-platform/contracts/index.ts',
  'lib/meta-platform/contracts/social.ts',
  'lib/meta-platform/contracts/pages.ts',
  'lib/meta-platform/contracts/leads.ts',
  'lib/meta-platform/contracts/instagram.ts',
  'lib/meta-platform/contracts/instagram-send.ts',
  'lib/meta-platform/contracts/social-result.ts',
  'lib/meta-platform/errors/social-errors.ts',
  'lib/meta-platform/policies/index.ts',
  'lib/meta-platform/policies/reply-window.ts',
  'lib/meta-platform/policies/attachments.ts',
  'tests/meta-v6/phase31-meta-social-crm-contracts.test.mjs',
  'scripts/meta-platform-phase31-contracts-audit.mjs',
];
check('Phase 31 Layer 1.1-1.9 contract, error, policy, test and audit files exist', required.every(exists), required.filter((file) => !exists(file)).join(', '));

const contract = read('lib/meta-platform/contracts/webhook.ts');
check('normalized webhook contract is versioned and provider independent', includesAll(contract, [
  'META_NORMALIZED_WEBHOOK_SCHEMA_VERSION',
  "readonly provider: 'META'",
  "readonly transport: 'WEBHOOK'",
  'MetaNormalizedWebhookEvent',
]));
check('normalized webhook contract carries receipt, ordering and routing identity', includesAll(contract, [
  'eventKey',
  'providerEventId',
  'payloadDigest',
  'objectType',
  'objectId',
  'field',
  'eventGroup',
  'occurredAt',
  'orderingKey',
  'entryIndex',
  'eventIndex',
]));
check('runtime contract guard fails closed on unsupported groups and malformed values', includesAll(contract, [
  'isMetaNormalizedWebhookEvent',
  'META_WEBHOOK_EVENT_GROUPS.includes',
  'Number.isInteger',
  'isRecord(value.payload)',
]));

const parser = read('lib/meta-platform/transports/webhook/parser.ts');
check('shared parser emits the normalized contract rather than a parallel route shape', includesAll(parser, [
  'META_NORMALIZED_WEBHOOK_SCHEMA_VERSION',
  "provider: 'META'",
  "transport: 'WEBHOOK'",
  'providerEventId: providerEventId(eventRow)',
  'eventGroup: group',
]));
check('provider event identity supports leadgen, messaging and comment payloads', includesAll(parser, [
  'message?.mid',
  'postback?.mid',
  'value?.leadgen_id',
  'value?.comment_id',
]));
check('stable event identity excludes raw delivery byte ordering', parser.includes('stableStringify') && !/fingerprint\s*=\s*stableStringify\([^)]*payloadDigest/.test(parser));

const transportTypes = read('lib/meta-platform/transports/webhook/types.ts');
check('legacy transport notification name aliases the new shared contract', transportTypes.includes('export type MetaWebhookNotification = MetaNormalizedWebhookEvent'));
const transportIndex = read('lib/meta-platform/transports/webhook/index.ts');
const publicIndex = read('lib/meta-platform/index.ts');
check('contract is exported from webhook and public MetaPlatform boundaries', includesAll(transportIndex, ['MetaNormalizedWebhookEvent', 'isMetaNormalizedWebhookEvent']) && includesAll(publicIndex, ['MetaNormalizedWebhookEvent', 'isMetaNormalizedWebhookEvent']));


const social = read('lib/meta-platform/contracts/social.ts');
check('provider identity contract covers app, business, ad account, Page and Instagram account', includesAll(social, [
  'META_PROVIDER_IDENTITY_SCHEMA_VERSION',
  'META_PROVIDER_IDENTITY_TYPES',
  "'APP'",
  "'BUSINESS'",
  "'AD_ACCOUNT'",
  "'PAGE'",
  "'INSTAGRAM_ACCOUNT'",
  'MetaProviderIdentity',
]));
check('provider identity is environment and connection scoped with stable identity keys', includesAll(social, [
  'environment',
  'connectionKey',
  'providerId',
  'graphId',
  'identityKey',
  'isSameMetaProviderIdentity',
]));
check('ad account identity normalizes Graph act_ prefix without changing other provider IDs', includesAll(social, [
  "assetType !== 'AD_ACCOUNT'",
  "normalized.startsWith('act_')",
  "`act_${providerId}`",
]));
check('provider identity runtime guard reconstructs canonical identity and fails closed', includesAll(social, [
  'isMetaProviderIdentity',
  'createMetaProviderIdentity',
  'normalized.graphId === value.graphId',
  'normalized.identityKey === value.identityKey',
  'catch',
]));


const leads = read('lib/meta-platform/contracts/leads.ts');
check('Lead Ads contract is versioned and scoped to a canonical Page identity', includesAll(leads, [
  'META_LEAD_PAYLOAD_SCHEMA_VERSION',
  'MetaNormalizedLeadPayload',
  'MetaPageIdentity',
  'leadKey',
  "provider: 'META'",
  "assetType: 'PAGE'",
]));
check('Lead Ads contract normalizes provider attribution, fields and contact data', includesAll(leads, [
  'MetaLeadAttribution',
  'MetaNormalizedLeadField',
  'MetaNormalizedLeadContact',
  'createMetaLeadPayload',
  'sourceChannel',
  'customFields',
  'productInterest',
]));
check('Lead Ads contact normalization includes canonical phone/email plus hash and mask projections', includesAll(leads, [
  'normalizePhone',
  'normalizeEmail',
  "crypto.createHash('sha256')",
  'phoneHash',
  'phoneMasked',
  'emailHash',
  'emailMasked',
]));
check('Lead Ads field normalization is bounded and merges repeated provider field names', includesAll(leads, [
  'META_LEAD_FIELD_LIMIT',
  'META_LEAD_FIELD_VALUE_LIMIT',
  'META_LEAD_VALUE_MAX_LENGTH',
  'META_LEAD_FIELD_LIMIT_EXCEEDED',
  'META_LEAD_FIELD_VALUE_LIMIT_EXCEEDED',
  'const map = new Map<string, string[]>()',
  '!values.includes(normalized)',
]));
check('Lead Ads provider variants normalize form fallback, provider time and source channel', includesAll(leads, [
  'fallbackFormId',
  'normalizeCreatedAt',
  'normalizeSourceChannel',
  "return 'FACEBOOK'",
  "return 'INSTAGRAM'",
]));
check('Lead Ads runtime guard reconstructs canonical payload and rejects forged or extra fields', includesAll(leads, [
  'isMetaNormalizedLeadPayload',
  'createMetaLeadPayload',
  'stableStringify(canonical) === stableStringify(value)',
  'catch',
]));

const instagram = read('lib/meta-platform/contracts/instagram.ts');
check('Instagram conversation and message contracts are independently versioned', includesAll(instagram, [
  'META_INSTAGRAM_CONVERSATION_SCHEMA_VERSION',
  'META_INSTAGRAM_MESSAGE_SCHEMA_VERSION',
  'MetaNormalizedInstagramConversation',
  'MetaNormalizedInstagramMessage',
  "channel: 'INSTAGRAM'",
]));
check('Instagram contracts are scoped to the canonical Page and Instagram account binding', includesAll(instagram, [
  'createMetaPageAccountBinding',
  'MetaPageIdentity',
  'MetaInstagramAccountIdentity',
  'conversationKey',
  'participantKey',
  'META_INSTAGRAM_PARTICIPANT_ACCOUNT_COLLISION',
]));
check('Instagram message contract carries receipt trace, provider identity and reply relationships', includesAll(instagram, [
  'sourceEventKey',
  'sourcePayloadDigest',
  'providerMessageId',
  'replyToProviderMessageId',
  'storyMediaId',
  'commentId',
  'postId',
]));
check('Instagram directions fail closed when sender and recipient do not match account ownership', includesAll(instagram, [
  'META_INSTAGRAM_MESSAGE_DIRECTIONS',
  "direction === 'INBOUND'",
  'expectedSenderId',
  'expectedRecipientId',
  'META_INSTAGRAM_DIRECTION_IDENTITY_MISMATCH',
]));
check('Instagram text and attachment metadata are bounded before domain persistence', includesAll(instagram, [
  'META_INSTAGRAM_TEXT_MAX_LENGTH',
  'META_INSTAGRAM_ATTACHMENT_LIMIT',
  'META_INSTAGRAM_ATTACHMENT_URL_MAX_LENGTH',
  'META_INSTAGRAM_ATTACHMENT_LIMIT_EXCEEDED',
  'META_INSTAGRAM_ATTACHMENT_ID_DUPLICATE',
  'Number.isSafeInteger',
]));
check('Instagram conversation carries status and reply-window state without route-specific shapes', includesAll(instagram, [
  'META_INSTAGRAM_CONVERSATION_STATUSES',
  'lastMessageAt',
  'lastInboundAt',
  'replyWindowExpiresAt',
  'privateReplyExpiresAt',
  'privateReplySentAt',
]));
check('Instagram runtime guards reconstruct canonical values and reject forged or extra fields', includesAll(instagram, [
  'isMetaNormalizedInstagramConversation',
  'isMetaNormalizedInstagramMessage',
  'stableStringify(canonical) === stableStringify(value)',
  'catch',
]));

const instagramSend = read('lib/meta-platform/contracts/instagram-send.ts');
check('Instagram send request contract is versioned and provider independent', includesAll(instagramSend, [
  'META_INSTAGRAM_SEND_REQUEST_SCHEMA_VERSION',
  'MetaNormalizedInstagramSendRequest',
  "readonly provider: 'META'",
  "readonly channel: 'INSTAGRAM'",
  'createMetaInstagramSendRequest',
]));
check('Instagram send request is account-scoped, idempotent and safely auditable', includesAll(instagramSend, [
  'sendKey',
  'idempotencyKey',
  'conversationKey',
  'textHash',
  "createHash('sha256')",
  'requestedAt',
  'correlationId',
]));
check('Instagram standard and private reply modes carry explicit source relationships', includesAll(instagramSend, [
  'META_INSTAGRAM_SEND_MODES',
  "'MESSAGE'",
  "'PRIVATE_REPLY'",
  'sourceMessageKey',
  'sourceProviderMessageId',
  'sourceCommentId',
  'sourcePostId',
]));
check('Instagram private reply and source-conversation ambiguity fail closed', includesAll(instagramSend, [
  'META_INSTAGRAM_SEND_PRIVATE_REPLY_COMMENT_REQUIRED',
  'META_INSTAGRAM_SEND_SOURCE_CONVERSATION_MISMATCH',
  'META_INSTAGRAM_SEND_SOURCE_PROVIDER_MESSAGE_MISMATCH',
  'sourceMessagePrefix',
  'sourceMessageKey !== `${sourceMessagePrefix}${sourceProviderMessageId}`',
  "mode === 'PRIVATE_REPLY' && !sourceCommentId",
]));
check('Instagram send request carries explicit actor identity and requires admin actor IDs', includesAll(instagramSend, [
  'META_INSTAGRAM_SEND_ACTOR_TYPES',
  "'ADMIN'",
  "'SYSTEM'",
  "'AUTOMATION'",
  'META_INSTAGRAM_SEND_ADMIN_ACTOR_REQUIRED',
]));
check('Instagram send runtime guard reconstructs canonical values and rejects forged or extra fields', includesAll(instagramSend, [
  'isMetaNormalizedInstagramSendRequest',
  'createMetaInstagramSendRequest',
  'stableStringify(canonical) === stableStringify(value)',
  'catch',
]));

const socialErrors = read('lib/meta-platform/errors/social-errors.ts');
check('social provider error taxonomy covers all Phase 31 social domains and request kinds', includesAll(socialErrors, [
  'META_SOCIAL_ERROR_DOMAINS',
  "'WEBHOOK'",
  "'LEADS'",
  "'INSTAGRAM'",
  "'FACEBOOK_PAGE'",
  "'REALTIME'",
  'META_SOCIAL_REQUEST_KINDS',
  "'READ'",
  "'WRITE'",
]));
check('social provider error taxonomy defines stable kinds and processing dispositions', includesAll(socialErrors, [
  'META_SOCIAL_PROVIDER_ERROR_KINDS',
  "'AUTHENTICATION'",
  "'AUTHORIZATION'",
  "'RATE_LIMIT'",
  "'PROVIDER_UNAVAILABLE'",
  "'REPLY_WINDOW_EXPIRED'",
  "'ATTACHMENT_REJECTED'",
  "'UNKNOWN_OUTCOME'",
  'META_SOCIAL_ERROR_DISPOSITIONS',
  "'BLOCKED'",
  "'RETRYABLE_FAILURE'",
  "'PERMANENT_FAILURE'",
  "'RECONCILIATION_REQUIRED'",
]));
check('social provider errors extend the shared safe platform error contract', includesAll(socialErrors, [
  'MetaSocialProviderError extends MetaPlatformError',
  'createMetaPlatformError',
  'safeDetails',
  'correlationId',
  'requestMayHaveSucceeded',
]));
check('Graph, HTTP and legacy social errors normalize through one classifier', includesAll(socialErrors, [
  'extractProviderPayload',
  'extractSignals',
  'record.safeProvider',
  'INVALID_REQUEST_PROVIDER_CODES',
  'AUTHENTICATION_PROVIDER_CODES',
  'RATE_LIMIT_PROVIDER_CODES',
  'classifyPolicyOrLegacyError',
  'classifyKind',
  "'NOT_FOUND'",
  'WINDOW_EXPIRED',
  'ATTACHMENT_INVALID',
  'ECONNRESET',
]));
check('unknown Meta write outcomes require reconciliation rather than blind retry', includesAll(socialErrors, [
  'withUnknownWriteOutcome',
  "requestKind !== 'WRITE'",
  "? 'UNKNOWN_OUTCOME'",
  "category: 'RECONCILIATION_REQUIRED'",
  'Verify provider state before any retry',
]));
check('social taxonomy omits raw provider messages and bounds safe provider metadata', includesAll(socialErrors, [
  'SAFE_IDENTIFIER_PATTERN',
  'safeProviderCode',
  'safeProviderType',
  'boundedHttpStatus',
  'boundedRetryAfterMs',
  'MAX_RETRY_AFTER_MS',
]) && !socialErrors.includes('providerMessage:'));
check('social provider error runtime guard rejects forged code, category, retryability and disposition', includesAll(socialErrors, [
  'isMetaSocialProviderError',
  'KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].code === value.code',
  'KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].category === value.category',
  'KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].retryable === value.retryable',
  'KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].disposition === value.disposition',
  'SAFE_DETAIL_KEYS',
  'hasCanonicalSafeDetails',
  'Object.keys(details).some',
  'SOCIAL_ERROR_KEYS',
  'Object.keys(value).some',
]));


const socialResult = read('lib/meta-platform/contracts/social-result.ts');
check('social platform result is versioned and covers success plus every provider disposition', includesAll(socialResult, [
  'META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION',
  'META_SOCIAL_PLATFORM_RESULT_STATUSES',
  "'SUCCESS'",
  'META_SOCIAL_ERROR_DISPOSITIONS',
  'MetaSocialPlatformResult',
  'MetaSocialPlatformSuccess',
  'MetaSocialPlatformFailure',
]));
check('social success results carry explicit provider, domain, operation and correlation scope', includesAll(socialResult, [
  'createMetaSocialSuccessResult',
  "provider: 'META'",
  'domain: input.domain',
  'operation: normalizeOperation(input.operation)',
  'correlationId: normalizeCorrelationId(input.correlationId)',
  "status: 'SUCCESS'",
  'ok: true',
]));
check('social failure results mirror canonical disposition, retry and unknown-outcome state', includesAll(socialResult, [
  'createMetaSocialFailureResult',
  'canonicalizeError',
  'status: canonicalError.disposition',
  'retryable: canonicalError.retryable',
  'requestMayHaveSucceeded: canonicalError.requestMayHaveSucceeded',
  'retryAfterMs: retryAfterMs(canonicalError)',
]));
check('social failure canonicalization strips unapproved top-level provider error fields', includesAll(socialResult, [
  'createMetaSocialProviderError',
  'sourceCode:',
  'providerCode:',
  'providerSubcode:',
  'providerType:',
  'traceId:',
]) && !socialResult.includes('...error'));
check('social result runtime guard rejects extra fields and forged mirrored state', includesAll(socialResult, [
  'isMetaSocialPlatformResult',
  'SUCCESS_KEYS',
  'FAILURE_KEYS',
  'hasExactKeys',
  'value.domain === error.domain',
  'value.operation === error.operation',
  'value.status === error.disposition',
  'value.retryable === error.retryable',
  'value.requestMayHaveSucceeded === error.requestMayHaveSucceeded',
  'value.retryAfterMs === retryAfterMs(error)',
]));

const replyWindow = read('lib/meta-platform/policies/reply-window.ts');
check('reply-window policy is versioned and defines canonical Instagram standard, private and live policies', includesAll(replyWindow, [
  'META_SOCIAL_REPLY_WINDOW_POLICY_SCHEMA_VERSION',
  'META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS',
  'META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS',
  "'INSTAGRAM_STANDARD_24H'",
  "'INSTAGRAM_PRIVATE_REPLY_7D'",
  "'INSTAGRAM_PRIVATE_REPLY_LIVE'",
  'MetaSocialReplyWindowDecision',
]));
check('standard reply eligibility derives the 24-hour expiry from canonical last inbound time', includesAll(replyWindow, [
  'conversation.lastInboundAt',
  'addMs(windowOpenedAt, META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS)',
  'conversation.replyWindowExpiresAt',
  "'STANDARD_WINDOW_STATE_MISMATCH'",
  'evaluatedMs < new Date(expiresAt).getTime()',
]));
check('private reply eligibility derives a one-shot seven-day post or reel window from the source comment', includesAll(replyWindow, [
  'sourceCommentCreatedAt',
  'sourcePrivateReplySentAt',
  "'POST_OR_REEL'",
  'addMs(commentCreatedAt, META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS)',
  "'PRIVATE_REPLY_ALREADY_SENT'",
  "'PRIVATE_REPLY_WINDOW_EXPIRED'",
]));
check('Instagram Live private replies fail closed unless the live broadcast is explicitly active', includesAll(replyWindow, [
  "surface === 'LIVE'",
  "typeof input.liveBroadcastActive !== 'boolean'",
  "'PRIVATE_REPLY_LIVE_STATE_REQUIRED'",
  "'PRIVATE_REPLY_LIVE_ENDED'",
  'expiresAt: null',
]));
check('reply-window evaluator enforces canonical send, conversation, account, Page and participant scope', includesAll(replyWindow, [
  'isMetaNormalizedInstagramSendRequest',
  'isMetaNormalizedInstagramConversation',
  'META_REPLY_WINDOW_CONVERSATION_MISMATCH',
  'META_REPLY_WINDOW_ACCOUNT_MISMATCH',
  'META_REPLY_WINDOW_PAGE_MISMATCH',
  'META_REPLY_WINDOW_PARTICIPANT_MISMATCH',
]));
check('reply-window decisions carry bounded auditable identity and deterministic decision keys', includesAll(replyWindow, [
  'decisionKey',
  ':REPLY_POLICY:MESSAGE',
  ':REPLY_POLICY:PRIVATE_REPLY:',
  'correlationId',
  'remainingMs',
  'SCOPED_KEY_PATTERN',
  'PROVIDER_ID_PATTERN',
]));
check('reply-window policy guard rejects extra fields and forged policy, reason, decision or timing state', includesAll(replyWindow, [
  'isMetaSocialReplyWindowDecision',
  'exactKeys(value, DECISION_KEYS)',
  'POLICY_REASONS[input.policyId].has(input.reason)',
  'META_REPLY_WINDOW_REASON_DECISION_MISMATCH',
  'META_REPLY_WINDOW_POLICY_REASON_MISMATCH',
  'stableStringify(canonical) === stableStringify(value)',
  'catch',
]));


const attachmentPolicy = read('lib/meta-platform/policies/attachments.ts');
check('attachment policy is versioned and models metadata, download, scan and storage lifecycle stages', includesAll(attachmentPolicy, [
  'META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION',
  'META_SOCIAL_ATTACHMENT_POLICY_ID',
  'META_SOCIAL_ATTACHMENT_STAGES',
  "'METADATA'",
  "'DOWNLOADED'",
  "'SCANNED'",
  "'STORED'",
  'MetaSocialAttachmentPolicyDecision',
]));
check('attachment policy defines allowed, quarantined and blocked outcomes with stable reasons', includesAll(attachmentPolicy, [
  'META_SOCIAL_ATTACHMENT_DECISIONS',
  "'ALLOWED'",
  "'QUARANTINED'",
  "'BLOCKED'",
  'META_SOCIAL_ATTACHMENT_REASONS',
  "'MEDIA_READY'",
  "'MEDIA_SCAN_INFECTED'",
  "'MEDIA_STAGE_STATE_INVALID'",
]));
check('attachment policy reuses shared media URL and MIME boundaries', includesAll(attachmentPolicy, [
  'parseAndValidateMetaMediaUrl',
  'isMetaMediaMimeAllowed',
  'normalizeMetaMediaMimeType',
  'META_SOCIAL_ATTACHMENT_MAX_BYTES',
  'ALLOWED_EXACT_MIME_TYPES',
  'ALLOWED_MIME_PREFIXES',
]));
check('attachment metadata blocks unsafe hosts, path-like filenames, oversize declarations and unsupported types', includesAll(attachmentPolicy, [
  "reason: 'MEDIA_URL_REJECTED'",
  'isSafeFileName',
  "reason: 'MEDIA_FILE_NAME_REJECTED'",
  "reason: 'MEDIA_DECLARED_SIZE_BLOCKED'",
  "attachment.type === 'UNKNOWN'",
  "reason: 'MEDIA_TYPE_UNSUPPORTED'",
]));
check('download validation requires actual size, effective MIME and content digest before scan', includesAll(attachmentPolicy, [
  "reason: 'MEDIA_ACTUAL_SIZE_REQUIRED'",
  "reason: 'MEDIA_ACTUAL_SIZE_BLOCKED'",
  "reason: 'MEDIA_MIME_REQUIRED'",
  "reason: 'MEDIA_MIME_MISMATCH'",
  "reason: 'MEDIA_DIGEST_REQUIRED'",
  "reason: 'MEDIA_SCAN_REQUIRED'",
]));
check('attachment policy blocks infected media and only allows clean verified storage', includesAll(attachmentPolicy, [
  "scanResult === 'INFECTED'",
  "reason: 'MEDIA_SCAN_INFECTED'",
  "scanResult !== 'CLEAN'",
  "reason: 'MEDIA_STORAGE_VERIFICATION_REQUIRED'",
  "status: 'ALLOWED'",
  "reason: 'MEDIA_READY'",
]));
check('attachment policy decision carries deterministic non-secret identity and lifecycle obligations', includesAll(attachmentPolicy, [
  'createDecisionKey',
  "createHash('sha256')",
  'sourceHost',
  'contentDigest',
  'requiresDownloadValidation',
  'requiresMalwareScan',
  'requiresStorageVerification',
]));
check('attachment decision guard rejects extra fields and forged lifecycle state', includesAll(attachmentPolicy, [
  'isMetaSocialAttachmentPolicyDecision',
  'hasExactKeys(value, DECISION_KEYS)',
  "value.allowed !== (value.decision === 'ALLOWED')",
  "value.quarantined !== (value.decision === 'QUARANTINED')",
  'createDecisionKey(base) === decisionKey',
]));

const pages = read('lib/meta-platform/contracts/pages.ts');
check('Page and Instagram binding has a versioned shared contract', includesAll(pages, [
  'META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION',
  'MetaPageAccountBinding',
  'MetaPageIdentity',
  'MetaInstagramAccountIdentity',
]));
check('Page and Instagram binding enforces environment, connection, Page, business and app relationships', includesAll(pages, [
  'META_PAGE_INSTAGRAM_ENVIRONMENT_MISMATCH',
  'META_PAGE_INSTAGRAM_CONNECTION_MISMATCH',
  'META_PAGE_INSTAGRAM_PAGE_MISMATCH',
  'META_PAGE_INSTAGRAM_BUSINESS_MISMATCH',
  'META_PAGE_INSTAGRAM_APP_MISMATCH',
]));

const contractsIndex = read('lib/meta-platform/contracts/index.ts');
check('provider identity contracts are exported from contract and public MetaPlatform boundaries',
  includesAll(contractsIndex, ['MetaProviderIdentity', 'MetaPageAccountBinding', 'createMetaProviderIdentity', 'createMetaPageAccountBinding'])
  && includesAll(publicIndex, ['MetaProviderIdentity', 'MetaPageAccountBinding', 'createMetaProviderIdentity', 'createMetaPageAccountBinding']));
check('Lead Ads payload contract is exported from contract and public MetaPlatform boundaries',
  includesAll(contractsIndex, ['MetaNormalizedLeadPayload', 'createMetaLeadPayload', 'isMetaNormalizedLeadPayload'])
  && includesAll(publicIndex, ['MetaNormalizedLeadPayload', 'createMetaLeadPayload', 'isMetaNormalizedLeadPayload']));
check('Instagram conversation and message contracts are exported from contract and public MetaPlatform boundaries',
  includesAll(contractsIndex, ['MetaNormalizedInstagramConversation', 'MetaNormalizedInstagramMessage', 'createMetaInstagramConversation', 'createMetaInstagramMessage'])
  && includesAll(publicIndex, ['MetaNormalizedInstagramConversation', 'MetaNormalizedInstagramMessage', 'createMetaInstagramConversation', 'createMetaInstagramMessage']));
check('Instagram send request contract is exported from contract and public MetaPlatform boundaries',
  includesAll(contractsIndex, ['MetaNormalizedInstagramSendRequest', 'createMetaInstagramSendRequest', 'isMetaNormalizedInstagramSendRequest'])
  && includesAll(publicIndex, ['MetaNormalizedInstagramSendRequest', 'createMetaInstagramSendRequest', 'isMetaNormalizedInstagramSendRequest']));
check('social provider taxonomy is exported from the public MetaPlatform boundary', includesAll(publicIndex, [
  'MetaSocialProviderError',
  'MetaSocialProviderErrorKind',
  'createMetaSocialProviderError',
  'normalizeMetaSocialProviderError',
  'isMetaSocialProviderError',
  'META_SOCIAL_ERROR_DOMAINS',
  'META_SOCIAL_ERROR_DISPOSITIONS',
]));
check('social platform result is exported from contract and public MetaPlatform boundaries',
  includesAll(contractsIndex, ['MetaSocialPlatformResult', 'createMetaSocialSuccessResult', 'createMetaSocialFailureResult', 'isMetaSocialPlatformResult'])
  && includesAll(publicIndex, ['MetaSocialPlatformResult', 'createMetaSocialSuccessResult', 'createMetaSocialFailureResult', 'isMetaSocialPlatformResult']));

const policiesIndex = read('lib/meta-platform/policies/index.ts');
check('reply-window policy is exported from policy and public MetaPlatform boundaries',
  includesAll(policiesIndex, ['MetaSocialReplyWindowDecision', 'evaluateMetaInstagramReplyWindow', 'isMetaSocialReplyWindowDecision'])
  && includesAll(publicIndex, ['MetaSocialReplyWindowDecision', 'evaluateMetaInstagramReplyWindow', 'isMetaSocialReplyWindowDecision']));
check('attachment policy is exported from policy and public MetaPlatform boundaries',
  includesAll(policiesIndex, ['MetaSocialAttachmentPolicyDecision', 'evaluateMetaSocialAttachmentPolicy', 'isMetaSocialAttachmentPolicyDecision'])
  && includesAll(publicIndex, ['MetaSocialAttachmentPolicyDecision', 'evaluateMetaSocialAttachmentPolicy', 'isMetaSocialAttachmentPolicyDecision']));

const schema = read('prisma/schema.prisma');
check('Layer 1 contracts do not introduce a schema marker or require a migration', !schema.includes('Phase31NormalizedWebhookContract') && !schema.includes('Phase31ProviderIdentityContract') && !schema.includes('Phase31LeadPayloadContract') && !schema.includes('Phase31InstagramConversationContract') && !schema.includes('Phase31InstagramMessageContract') && !schema.includes('Phase31InstagramSendRequestContract') && !schema.includes('Phase31SocialProviderErrorTaxonomy') && !schema.includes('Phase31SocialPlatformResultContract') && !schema.includes('Phase31ReplyWindowPolicyContract') && !schema.includes('Phase31AttachmentPolicyContract'));

const pkg = JSON.parse(read('package.json'));
check('focused dependency-independent Phase 31 contracts test is registered', pkg.scripts['test:meta-v6-phase31-contracts'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-meta-social-crm-contracts.test.mjs');
check('focused Phase 31 contracts audit is registered', pkg.scripts['qa:meta-platform-phase31-contracts'] === 'node scripts/meta-platform-phase31-contracts-audit.mjs');

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 31 Layer 1 contracts audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
