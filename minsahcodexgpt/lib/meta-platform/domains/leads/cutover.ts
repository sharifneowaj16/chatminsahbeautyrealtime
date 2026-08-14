import contractJson from '../../../../config/meta-phase31-lead-cutover.json' with { type: 'json' };
import {
  META_PHASE31_CUTOVER_FLAG_DEFINITIONS,
  resolveMetaPhase31CutoverFlag,
} from '../../config/phase31-cutover.ts';

export type MetaLeadCutoverMode = 'LEGACY' | 'SHADOW' | 'PLATFORM' | 'LEGACY_ROLLBACK';
export type MetaLeadCutoverAuthority = 'LEGACY' | 'PLATFORM';

type EnvSource = Readonly<Record<string, string | undefined>>;
type LeadCutoverContract = Readonly<{
  schemaVersion: number;
  phase: number;
  item: string;
  title: string;
  runtimeSelector: string;
  acceptedRuntimeValues: string[];
  platformPrerequisites: string[];
  shadowAuthority: MetaLeadCutoverAuthority;
  platformAuthority: MetaLeadCutoverAuthority;
  invalidRuntimePolicy: MetaLeadCutoverMode;
  stabilityCriteria: Readonly<{
    minimumShadowSamples: number;
    maximumMismatchRateBasisPoints: number;
    maximumDuplicateHandoffs: number;
    maximumUnresolvedPermanentFailures: number;
    minimumObservationMinutes: number;
    rollbackDrillRequired: boolean;
  }>;
}>;

const contract = contractJson as LeadCutoverContract;
function requiredCutoverFlag(name: string) {
  const definition = META_PHASE31_CUTOVER_FLAG_DEFINITIONS.find((item) => item.name === name);
  if (!definition) throw new Error(`META_LEAD_CUTOVER_FLAG_CONTRACT_MISSING:${name}`);
  return definition;
}
const leadFlag = requiredCutoverFlag('META_PLATFORM_LEADS');
const webhookFlag = requiredCutoverFlag('META_PLATFORM_SOCIAL_WEBHOOKS');

export const META_LEAD_CUTOVER_STABILITY_CRITERIA = Object.freeze({ ...contract.stabilityCriteria });

export type MetaLeadCutoverStatus = Readonly<{
  mode: MetaLeadCutoverMode;
  authority: MetaLeadCutoverAuthority;
  valid: boolean;
  reasonCode: string;
  runtimeSelectorConfigured: boolean;
  platformLeadEnabled: boolean;
  platformWebhookEnabled: boolean;
  shadowSideEffectsAllowed: false;
  rollbackAvailable: true;
  legacyDisableEligible: false;
}>;

function normalizeRuntime(value: string | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}

export function getMetaLeadCutoverStatus(source: EnvSource = process.env): MetaLeadCutoverStatus {
  const runtime = normalizeRuntime(source[contract.runtimeSelector]);
  const lead = resolveMetaPhase31CutoverFlag(leadFlag, source);
  const webhooks = resolveMetaPhase31CutoverFlag(webhookFlag, source);
  const prerequisitesValid = lead.valid && webhooks.valid;
  const platformReady = prerequisitesValid && lead.enabled && webhooks.enabled;

  if (runtime && !contract.acceptedRuntimeValues.includes(runtime)) {
    return Object.freeze({
      mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: false,
      reasonCode: 'INVALID_RUNTIME_FAIL_SAFE_ROLLBACK', runtimeSelectorConfigured: true,
      platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  if (!prerequisitesValid) {
    return Object.freeze({
      mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: false,
      reasonCode: 'INVALID_PREREQUISITE_FAIL_SAFE_ROLLBACK', runtimeSelectorConfigured: Boolean(runtime),
      platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  if (runtime === 'LEGACY_ROLLBACK') {
    return Object.freeze({
      mode: 'LEGACY_ROLLBACK', authority: 'LEGACY', valid: true,
      reasonCode: 'EXPLICIT_LEGACY_ROLLBACK', runtimeSelectorConfigured: true,
      platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  if (runtime === 'SHADOW') {
    return Object.freeze({
      mode: 'SHADOW', authority: 'LEGACY', valid: true,
      reasonCode: 'SHADOW_LEGACY_AUTHORITY', runtimeSelectorConfigured: true,
      platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  if (runtime === 'LEGACY') {
    return Object.freeze({
      mode: 'LEGACY', authority: 'LEGACY', valid: true,
      reasonCode: 'EXPLICIT_LEGACY_AUTHORITY', runtimeSelectorConfigured: true,
      platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  if (platformReady && (!runtime || runtime === 'PLATFORM' || runtime === 'DOMAIN')) {
    return Object.freeze({
      mode: 'PLATFORM', authority: 'PLATFORM', valid: true,
      reasonCode: runtime ? 'EXPLICIT_PLATFORM_AUTHORITY' : 'CANONICAL_PLATFORM_AUTHORITY',
      runtimeSelectorConfigured: Boolean(runtime), platformLeadEnabled: true, platformWebhookEnabled: true,
      shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
    });
  }
  return Object.freeze({
    mode: 'LEGACY', authority: 'LEGACY', valid: true,
    reasonCode: runtime === 'PLATFORM' || runtime === 'DOMAIN'
      ? 'PLATFORM_PREREQUISITES_DISABLED'
      : 'SAFE_DEFAULT_LEGACY_AUTHORITY',
    runtimeSelectorConfigured: Boolean(runtime),
    platformLeadEnabled: lead.enabled, platformWebhookEnabled: webhooks.enabled,
    shadowSideEffectsAllowed: false, rollbackAvailable: true, legacyDisableEligible: false,
  });
}

export type MetaLeadShadowComparison = Readonly<{
  status: 'MATCH' | 'MISMATCH' | 'NOT_OBSERVED';
  matched: boolean | null;
  differenceCodes: readonly string[];
  safeMetrics: Readonly<{
    comparedFieldCount: number;
    mismatchCount: number;
  }>;
}>;

export async function executeMetaLeadCutover<T>(input: {
  source?: EnvSource;
  runLegacy: (context: Readonly<{ captureShadow: boolean }>) => Promise<Readonly<{ value: T; comparison?: MetaLeadShadowComparison }>>;
  runPlatform: () => Promise<T>;
}): Promise<Readonly<{ value: T; cutover: MetaLeadCutoverStatus; comparison?: MetaLeadShadowComparison }>> {
  const cutover = getMetaLeadCutoverStatus(input.source);
  if (cutover.mode === 'PLATFORM') {
    return Object.freeze({ value: await input.runPlatform(), cutover });
  }
  const legacy = await input.runLegacy({ captureShadow: cutover.mode === 'SHADOW' });
  return Object.freeze({ value: legacy.value, cutover, ...(legacy.comparison ? { comparison: legacy.comparison } : {}) });
}

export type MetaLeadStabilityMetrics = Readonly<{
  shadowSamples: number;
  shadowMismatches: number;
  duplicateHandoffs: number;
  unresolvedPermanentFailures: number;
  observationMinutes: number;
  rollbackDrillPassed: boolean;
}>;

export function evaluateMetaLeadLegacyDisable(input: MetaLeadStabilityMetrics) {
  const criteria = META_LEAD_CUTOVER_STABILITY_CRITERIA;
  const mismatchRateBasisPoints = input.shadowSamples > 0
    ? Math.round((input.shadowMismatches / input.shadowSamples) * 10_000)
    : 10_000;
  const blockers: string[] = [];
  if (input.shadowSamples < criteria.minimumShadowSamples) blockers.push('INSUFFICIENT_SHADOW_SAMPLES');
  if (mismatchRateBasisPoints > criteria.maximumMismatchRateBasisPoints) blockers.push('SHADOW_MISMATCH_RATE_TOO_HIGH');
  if (input.duplicateHandoffs > criteria.maximumDuplicateHandoffs) blockers.push('DUPLICATE_HANDOFF_DETECTED');
  if (input.unresolvedPermanentFailures > criteria.maximumUnresolvedPermanentFailures) blockers.push('UNRESOLVED_PERMANENT_FAILURES');
  if (input.observationMinutes < criteria.minimumObservationMinutes) blockers.push('OBSERVATION_WINDOW_INCOMPLETE');
  if (criteria.rollbackDrillRequired && !input.rollbackDrillPassed) blockers.push('ROLLBACK_DRILL_REQUIRED');
  return Object.freeze({
    eligible: blockers.length === 0,
    mismatchRateBasisPoints,
    blockers: Object.freeze(blockers),
    criteria,
  });
}
