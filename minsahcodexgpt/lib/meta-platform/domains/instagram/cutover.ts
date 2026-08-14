import contractJson from '../../../../config/meta-phase31-instagram-cutover.json' with { type: 'json' };
import {
  META_PHASE31_CUTOVER_FLAG_DEFINITIONS,
  resolveMetaPhase31CutoverFlag,
} from '../../config/phase31-cutover.ts';

export type InstagramCutoverMode = 'LEGACY' | 'SHADOW' | 'PLATFORM' | 'LEGACY_ROLLBACK';
export type InstagramCutoverAuthority = 'LEGACY' | 'PLATFORM';
export type InstagramReplySurface = 'STANDARD' | 'PRIVATE';

type EnvSource = Readonly<Record<string, string | undefined>>;
type InstagramCutoverContract = Readonly<{
  schemaVersion: number;
  phase: number;
  item: string;
  title: string;
  runtimeSelectors: Readonly<{ inbound: string; outbound: string; media: string }>;
  acceptedRuntimeValues: string[];
  invalidRuntimePolicy: InstagramCutoverMode;
  stabilityCriteria: Readonly<{
    minimumShadowSamples: number;
    maximumMismatchRateBasisPoints: number;
    maximumDuplicateMessages: number;
    maximumDuplicateProviderWrites: number;
    maximumProviderMessageIdMismatches: number;
    maximumAttachmentStateMismatches: number;
    minimumObservationMinutes: number;
    rollbackDrillRequired: boolean;
  }>;
}>;

const contract = contractJson as InstagramCutoverContract;
function flag(name: string) {
  const definition = META_PHASE31_CUTOVER_FLAG_DEFINITIONS.find((item) => item.name === name);
  if (!definition) throw new Error(`META_INSTAGRAM_CUTOVER_FLAG_MISSING:${name}`);
  return definition;
}
const instagramFlag = flag('META_PLATFORM_INSTAGRAM');
const webhookFlag = flag('META_PLATFORM_SOCIAL_WEBHOOKS');
const writesFlag = flag('META_PLATFORM_INSTAGRAM_WRITES');
const privateFlag = flag('META_PLATFORM_INSTAGRAM_PRIVATE_REPLY');
const mediaFlag = flag('META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS');

export const META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA = Object.freeze({ ...contract.stabilityCriteria });

function runtime(value: string | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}

function resolveMode(input: {
  selector: string;
  source: EnvSource;
  platformReady: boolean;
  prerequisitesValid: boolean;
}): Readonly<{ mode: InstagramCutoverMode; authority: InstagramCutoverAuthority; valid: boolean; reasonCode: string; configured: boolean }> {
  const selected = runtime(input.source[input.selector]);
  if (selected && !contract.acceptedRuntimeValues.includes(selected)) {
    return Object.freeze({ mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: false, reasonCode: 'INVALID_RUNTIME_FAIL_SAFE_ROLLBACK', configured: true });
  }
  if (!input.prerequisitesValid) {
    return Object.freeze({ mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: false, reasonCode: 'INVALID_PREREQUISITE_FAIL_SAFE_ROLLBACK', configured: Boolean(selected) });
  }
  if (selected === 'LEGACY_ROLLBACK') return Object.freeze({ mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: true, reasonCode: 'EXPLICIT_LEGACY_ROLLBACK', configured: true });
  if (selected === 'SHADOW') return Object.freeze({ mode: 'SHADOW', authority: 'LEGACY', valid: true, reasonCode: 'SHADOW_LEGACY_AUTHORITY', configured: true });
  if (selected === 'LEGACY') return Object.freeze({ mode: 'LEGACY', authority: 'LEGACY', valid: true, reasonCode: 'EXPLICIT_LEGACY_AUTHORITY', configured: true });
  if (input.platformReady && (!selected || selected === 'PLATFORM' || selected === 'DOMAIN')) {
    return Object.freeze({ mode: 'PLATFORM', authority: 'PLATFORM', valid: true, reasonCode: selected ? 'EXPLICIT_PLATFORM_AUTHORITY' : 'CANONICAL_PLATFORM_AUTHORITY', configured: Boolean(selected) });
  }
  return Object.freeze({
    mode: 'LEGACY', authority: 'LEGACY', valid: true,
    reasonCode: selected === 'PLATFORM' || selected === 'DOMAIN' ? 'PLATFORM_PREREQUISITES_DISABLED' : 'SAFE_DEFAULT_LEGACY_AUTHORITY',
    configured: Boolean(selected),
  });
}

export function getMetaInstagramCutoverStatus(source: EnvSource = process.env) {
  const instagram = resolveMetaPhase31CutoverFlag(instagramFlag, source);
  const webhooks = resolveMetaPhase31CutoverFlag(webhookFlag, source);
  const writes = resolveMetaPhase31CutoverFlag(writesFlag, source);
  const privateReplies = resolveMetaPhase31CutoverFlag(privateFlag, source);
  const mediaDownloads = resolveMetaPhase31CutoverFlag(mediaFlag, source);

  const read = resolveMode({
    selector: contract.runtimeSelectors.inbound,
    source,
    prerequisitesValid: instagram.valid && webhooks.valid,
    platformReady: instagram.enabled && webhooks.enabled,
  });
  const outbound = resolveMode({
    selector: contract.runtimeSelectors.outbound,
    source,
    prerequisitesValid: writes.valid && privateReplies.valid,
    platformReady: instagram.enabled && writes.enabled,
  });
  const media = resolveMode({
    selector: contract.runtimeSelectors.media,
    source,
    prerequisitesValid: mediaDownloads.valid,
    platformReady: instagram.enabled && mediaDownloads.enabled,
  });

  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    phase: contract.phase,
    item: contract.item,
    valid: read.valid && outbound.valid && media.valid,
    read: Object.freeze({ ...read, platformInstagramEnabled: instagram.enabled, platformWebhookEnabled: webhooks.enabled, shadowSideEffectsAllowed: false as const }),
    outbound: Object.freeze({
      ...outbound,
      standardReplyEnabled: writes.enabled,
      privateReplyEnabled: writes.enabled && privateReplies.enabled,
      shadowWritesAllowed: false as const,
    }),
    media: Object.freeze({ ...media, downloadsEnabled: mediaDownloads.enabled, shadowDownloadsAllowed: false as const }),
    rollbackAvailable: true as const,
    durableStatePreservedOnRollback: true as const,
  });
}

export function assertInstagramCutoverWriteAuthority(
  surface: InstagramReplySurface,
  source: EnvSource = process.env,
): void {
  const status = getMetaInstagramCutoverStatus(source);
  const enabled = surface === 'PRIVATE' ? status.outbound.privateReplyEnabled : status.outbound.standardReplyEnabled;
  if (status.outbound.valid && enabled) return;
  const code = !status.outbound.valid
    ? status.outbound.reasonCode
    : surface === 'PRIVATE' ? 'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED' : 'META_PLATFORM_INSTAGRAM_WRITES_DISABLED';
  throw Object.assign(new Error(code), { code, status: 409, retryable: false as const, policyBlocked: true as const });
}

export function shouldScheduleInstagramMediaDownloads(source: EnvSource = process.env): boolean {
  const status = getMetaInstagramCutoverStatus(source);
  return status.media.valid && status.media.downloadsEnabled;
}

export type InstagramCutoverStabilityMetrics = Readonly<{
  shadowSamples: number;
  shadowMismatches: number;
  duplicateMessages: number;
  duplicateProviderWrites: number;
  providerMessageIdMismatches: number;
  attachmentStateMismatches: number;
  observationMinutes: number;
  rollbackDrillPassed: boolean;
}>;

export function evaluateMetaInstagramLegacyDisable(input: InstagramCutoverStabilityMetrics) {
  const criteria = META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA;
  const mismatchRateBasisPoints = input.shadowSamples > 0
    ? Math.round((input.shadowMismatches / input.shadowSamples) * 10_000)
    : 10_000;
  const blockers: string[] = [];
  if (input.shadowSamples < criteria.minimumShadowSamples) blockers.push('INSUFFICIENT_SHADOW_SAMPLES');
  if (mismatchRateBasisPoints > criteria.maximumMismatchRateBasisPoints) blockers.push('SHADOW_MISMATCH_RATE_TOO_HIGH');
  if (input.duplicateMessages > criteria.maximumDuplicateMessages) blockers.push('DUPLICATE_MESSAGE_DETECTED');
  if (input.duplicateProviderWrites > criteria.maximumDuplicateProviderWrites) blockers.push('DUPLICATE_PROVIDER_WRITE_DETECTED');
  if (input.providerMessageIdMismatches > criteria.maximumProviderMessageIdMismatches) blockers.push('PROVIDER_MESSAGE_ID_MISMATCH');
  if (input.attachmentStateMismatches > criteria.maximumAttachmentStateMismatches) blockers.push('ATTACHMENT_STATE_MISMATCH');
  if (input.observationMinutes < criteria.minimumObservationMinutes) blockers.push('OBSERVATION_WINDOW_INCOMPLETE');
  if (criteria.rollbackDrillRequired && !input.rollbackDrillPassed) blockers.push('ROLLBACK_DRILL_REQUIRED');
  return Object.freeze({ eligible: blockers.length === 0, mismatchRateBasisPoints, blockers: Object.freeze(blockers), criteria });
}
