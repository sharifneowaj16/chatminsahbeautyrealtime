import contractJson from '../../../config/meta-phase31-rollback-proof.json' with { type: 'json' };
import {
  META_PHASE31_CUTOVER_FLAG_DEFINITIONS,
  resolveMetaPhase31CutoverFlag,
} from './phase31-cutover.ts';
import { getMetaSocialOutboundWriteControlSummary } from './social-outbound-write-control.ts';
import { getMetaLeadCutoverStatus } from '../domains/leads/cutover.ts';
import { getMetaInstagramCutoverStatus } from '../domains/instagram/cutover.ts';
import { getMetaFacebookRealtimeCutoverStatus } from '../domains/facebook/cutover.ts';
import { resolveFacebookRealtimeCutover } from '../../../packages/meta-facebook-cutover-contract/src/index.ts';

type EnvSource = Readonly<Record<string, string | undefined>>;

type RollbackProofContract = Readonly<{
  schemaVersion: number;
  phase: number;
  item: string;
  title: string;
  requiredScenarios: string[];
  preservedBusinessState: string[];
  duplicateCounters: string[];
  auditPolicy: string;
  redactionPolicy: string;
}>;

const contract = contractJson as RollbackProofContract;
function requiredCutoverFlag(name: string) {
  const definition = META_PHASE31_CUTOVER_FLAG_DEFINITIONS.find((item) => item.name === name);
  if (!definition) throw new Error(`META_PHASE31_ROLLBACK_CUTOVER_FLAG_CONTRACT_MISSING:${name}`);
  return definition;
}
const replayFlag = requiredCutoverFlag('META_PLATFORM_SOCIAL_REPLAY');

export type MetaRollbackDurableSnapshot = Readonly<{
  receiptCount: number;
  leadCount: number;
  leadHandoffCount: number;
  instagramConversationCount: number;
  instagramMessageCount: number;
  instagramOutboundRequestCount: number;
  facebookMessageCount: number;
  providerWriteCount: number;
  auditRecordCount: number;
  duplicateLeadHandoffs: number;
  duplicateInstagramMessages: number;
  duplicateProviderWrites: number;
  duplicateFacebookEvents: number;
  receiptDigest: string;
  leadDigest: string;
  instagramDigest: string;
  facebookDigest: string;
}>;

export type MetaRollbackScenarioResult = Readonly<{
  id: string;
  passed: boolean;
  reasonCode: string;
}>;

const COUNT_KEYS = Object.freeze([
  'receiptCount',
  'leadCount',
  'leadHandoffCount',
  'instagramConversationCount',
  'instagramMessageCount',
  'instagramOutboundRequestCount',
  'facebookMessageCount',
  'providerWriteCount',
] as const);
const DIGEST_KEYS = Object.freeze(['receiptDigest', 'leadDigest', 'instagramDigest', 'facebookDigest'] as const);
const DUPLICATE_KEYS = Object.freeze([
  'duplicateLeadHandoffs',
  'duplicateInstagramMessages',
  'duplicateProviderWrites',
  'duplicateFacebookEvents',
] as const);
const SAFE_DIGEST = /^[a-f0-9]{64}$/;
const SAFE_PROOF_ID = /^[A-Z0-9][A-Z0-9._:-]{7,95}$/;

function validNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validateSnapshot(snapshot: MetaRollbackDurableSnapshot): void {
  for (const key of [...COUNT_KEYS, 'auditRecordCount', ...DUPLICATE_KEYS] as const) {
    if (!validNonNegativeInteger(snapshot[key])) throw new TypeError(`META_ROLLBACK_SNAPSHOT_${key.toUpperCase()}_INVALID`);
  }
  for (const key of DIGEST_KEYS) {
    if (!SAFE_DIGEST.test(snapshot[key])) throw new TypeError(`META_ROLLBACK_SNAPSHOT_${key.toUpperCase()}_INVALID`);
  }
}

export function compareMetaRollbackDurableSnapshots(
  before: MetaRollbackDurableSnapshot,
  after: MetaRollbackDurableSnapshot,
) {
  validateSnapshot(before);
  validateSnapshot(after);
  const blockers: string[] = [];
  for (const key of COUNT_KEYS) {
    if (after[key] !== before[key]) blockers.push(`${key.toUpperCase()}_CHANGED`);
  }
  for (const key of DIGEST_KEYS) {
    if (after[key] !== before[key]) blockers.push(`${key.toUpperCase()}_CHANGED`);
  }
  for (const key of DUPLICATE_KEYS) {
    if (after[key] !== 0) blockers.push(`${key.toUpperCase()}_DETECTED`);
  }
  if (after.auditRecordCount < before.auditRecordCount) blockers.push('AUDIT_RECORD_COUNT_DECREASED');
  return Object.freeze({
    passed: blockers.length === 0,
    blockers: Object.freeze(blockers),
    auditEvidenceCaptured: after.auditRecordCount > before.auditRecordCount,
    auditRecordDelta: after.auditRecordCount - before.auditRecordCount,
  });
}

export function getMetaPhase31RollbackControlSnapshot(source: EnvSource = process.env) {
  const lead = getMetaLeadCutoverStatus(source);
  const instagram = getMetaInstagramCutoverStatus(source);
  const facebookMain = getMetaFacebookRealtimeCutoverStatus(source);
  const facebookRealtime = resolveFacebookRealtimeCutover(source, { role: 'REALTIME' });
  const outbound = getMetaSocialOutboundWriteControlSummary(source);
  const replay = resolveMetaPhase31CutoverFlag(replayFlag, source);

  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    phase: contract.phase,
    item: contract.item,
    lead: Object.freeze({ mode: lead.mode, authority: lead.authority, reasonCode: lead.reasonCode, platformEnabled: lead.platformLeadEnabled }),
    instagram: Object.freeze({
      readMode: instagram.read.mode,
      readAuthority: instagram.read.authority,
      readReasonCode: instagram.read.reasonCode,
      standardReplyEnabled: instagram.outbound.standardReplyEnabled && outbound.standardReply.enabled,
      privateReplyEnabled: instagram.outbound.privateReplyEnabled && outbound.privateReply.enabled,
      mediaDownloadsEnabled: instagram.media.downloadsEnabled,
    }),
    facebook: Object.freeze({
      mainMode: facebookMain.mode,
      realtimeMode: facebookRealtime.mode,
      authority: facebookRealtime.authority,
      reasonCode: facebookRealtime.reasonCode,
      realtimeBridgeEnabled: facebookRealtime.realtimeBridgeEnabled,
      legacyDirectClientEnabled: facebookRealtime.legacyDirectClientEnabled,
      retryOwner: facebookRealtime.retryOwner,
    }),
    replay: Object.freeze({ enabled: replay.enabled, valid: replay.valid, reasonCode: replay.reasonCode }),
    queueExecution: Object.freeze({
      leadAuthorityAtExecution: lead.authority,
      instagramStandardWriteAtExecution: instagram.outbound.standardReplyEnabled && outbound.standardReply.enabled,
      instagramPrivateWriteAtExecution: instagram.outbound.privateReplyEnabled && outbound.privateReply.enabled,
      facebookRetryOwnerAtExecution: facebookRealtime.retryOwner,
    }),
  });
}

function scenario(id: string, passed: boolean, reasonCode: string): MetaRollbackScenarioResult {
  return Object.freeze({ id, passed, reasonCode: passed ? 'PASS' : reasonCode });
}

export function buildMetaPhase31RollbackProof(input: Readonly<{
  proofId: string;
  performedAt: Date;
  source: EnvSource;
  before: MetaRollbackDurableSnapshot;
  after: MetaRollbackDurableSnapshot;
}>) {
  if (!SAFE_PROOF_ID.test(input.proofId)) throw new TypeError('META_ROLLBACK_PROOF_ID_INVALID');
  if (!Number.isFinite(input.performedAt.getTime())) throw new TypeError('META_ROLLBACK_PROOF_TIME_INVALID');
  const control = getMetaPhase31RollbackControlSnapshot(input.source);
  const integrity = compareMetaRollbackDurableSnapshots(input.before, input.after);
  const legacyFallback = control.lead.authority === 'LEGACY'
    && control.instagram.readAuthority === 'LEGACY'
    && control.facebook.authority === 'LEGACY'
    && control.facebook.legacyDirectClientEnabled
    && control.facebook.retryOwner === 'REALTIME_LEGACY';
  const queueHonorsFlags = control.queueExecution.leadAuthorityAtExecution === 'LEGACY'
    && !control.queueExecution.instagramStandardWriteAtExecution
    && !control.queueExecution.instagramPrivateWriteAtExecution
    && control.queueExecution.facebookRetryOwnerAtExecution === 'REALTIME_LEGACY';
  const scenarios = Object.freeze([
    scenario('LEAD_PLATFORM_OFF', control.lead.authority === 'LEGACY' && !control.lead.platformEnabled, 'LEAD_PLATFORM_STILL_ACTIVE'),
    scenario('INSTAGRAM_READ_PLATFORM_OFF', control.instagram.readAuthority === 'LEGACY', 'INSTAGRAM_PLATFORM_READ_STILL_ACTIVE'),
    scenario('INSTAGRAM_WRITES_OFF', !control.instagram.standardReplyEnabled, 'INSTAGRAM_STANDARD_WRITE_STILL_ACTIVE'),
    scenario('INSTAGRAM_PRIVATE_REPLY_OFF', !control.instagram.privateReplyEnabled, 'INSTAGRAM_PRIVATE_REPLY_STILL_ACTIVE'),
    scenario('REALTIME_BRIDGE_OFF', !control.facebook.realtimeBridgeEnabled, 'REALTIME_BRIDGE_STILL_ACTIVE'),
    scenario('LEGACY_FALLBACK_ACTIVE', legacyFallback, 'LEGACY_FALLBACK_NOT_ACTIVE'),
    scenario('QUEUED_JOBS_HONOR_CURRENT_FLAGS', queueHonorsFlags, 'QUEUE_EXECUTION_AUTHORITY_UNSAFE'),
    scenario('NO_DATA_CORRUPTION_AFTER_TOGGLE', integrity.passed, integrity.blockers[0] ?? 'DATA_INTEGRITY_FAILED'),
    scenario('AUDIT_EVIDENCE_CAPTURED', integrity.auditEvidenceCaptured, 'AUDIT_EVIDENCE_NOT_CAPTURED'),
  ]);
  const missing = contract.requiredScenarios.filter((id) => !scenarios.some((item) => item.id === id));
  const failed = scenarios.filter((item) => !item.passed).map((item) => item.id);
  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    phase: contract.phase,
    item: contract.item,
    proofId: input.proofId,
    performedAt: input.performedAt.toISOString(),
    verdict: missing.length === 0 && failed.length === 0 ? 'PASS' as const : 'BLOCKED' as const,
    scenarios,
    failedScenarios: Object.freeze(failed),
    missingScenarios: Object.freeze(missing),
    integrity,
    control,
    evidencePolicy: Object.freeze({
      rawEnvironmentValuesIncluded: false as const,
      rawProviderPayloadsIncluded: false as const,
      customerPiiIncluded: false as const,
      tokenOrSecretIncluded: false as const,
      digestFormat: 'SHA256_HEX' as const,
    }),
  });
}
