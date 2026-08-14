import contractJson from '../../../../config/meta-phase31-facebook-realtime-cutover.json' with { type: 'json' };
import {
  resolveFacebookRealtimeCutover,
  type FacebookCutoverEnv,
  type FacebookRealtimeCutoverStatus,
} from '../../../../packages/meta-facebook-cutover-contract/src/index.ts';

const contract = contractJson as Readonly<{
  stabilityCriteria: Readonly<{
    minimumShadowSamples: number;
    maximumMismatchRateBasisPoints: number;
    maximumDuplicateEvents: number;
    maximumParallelRetryOwners: number;
    maximumLegacyDirectClientCallsInPlatformMode: number;
    minimumObservationMinutes: number;
    rollbackDrillRequired: boolean;
  }>;
}>;

export const META_FACEBOOK_REALTIME_CUTOVER_STABILITY_CRITERIA = Object.freeze({ ...contract.stabilityCriteria });
export { resolveFacebookRealtimeCutover as getMetaFacebookRealtimeCutoverStatus };
export type { FacebookRealtimeCutoverStatus };

export type MetaFacebookLegacyDisableObservation = Readonly<{
  shadowSamples: number;
  shadowMismatches: number;
  duplicateEvents: number;
  parallelRetryOwners: number;
  legacyDirectClientCallsInPlatformMode: number;
  observationMinutes: number;
  rollbackDrillPassed: boolean;
}>;

export function assertFacebookPlatformSyncAuthority(
  source: FacebookCutoverEnv = (globalThis as { process?: { env?: FacebookCutoverEnv } }).process?.env ?? {},
): FacebookRealtimeCutoverStatus {
  const status = resolveFacebookRealtimeCutover(source);
  if (status.mode === 'PLATFORM' && status.platformSyncEnabled) return status;
  if (status.mode === 'SHADOW' && status.shadowPlatformEvaluationEnabled) return status;
  const error = Object.assign(new Error(status.reasonCode), {
    code: status.reasonCode,
    retryable: false,
    cutover: status,
  });
  throw error;
}

export function evaluateMetaFacebookLegacyDisable(input: MetaFacebookLegacyDisableObservation) {
  const criteria = META_FACEBOOK_REALTIME_CUTOVER_STABILITY_CRITERIA;
  const blockers: string[] = [];
  const mismatchRateBasisPoints = input.shadowSamples > 0
    ? Math.round((input.shadowMismatches * 10_000) / input.shadowSamples)
    : 10_000;
  if (input.shadowSamples < criteria.minimumShadowSamples) blockers.push('INSUFFICIENT_SHADOW_SAMPLES');
  if (mismatchRateBasisPoints > criteria.maximumMismatchRateBasisPoints) blockers.push('SHADOW_MISMATCH_RATE_EXCEEDED');
  if (input.duplicateEvents > criteria.maximumDuplicateEvents) blockers.push('DUPLICATE_EVENTS_DETECTED');
  if (input.parallelRetryOwners > criteria.maximumParallelRetryOwners) blockers.push('PARALLEL_RETRY_OWNERS_DETECTED');
  if (input.legacyDirectClientCallsInPlatformMode > criteria.maximumLegacyDirectClientCallsInPlatformMode) blockers.push('LEGACY_DIRECT_CLIENT_USED_IN_PLATFORM_MODE');
  if (input.observationMinutes < criteria.minimumObservationMinutes) blockers.push('OBSERVATION_WINDOW_INCOMPLETE');
  if (criteria.rollbackDrillRequired && !input.rollbackDrillPassed) blockers.push('ROLLBACK_DRILL_REQUIRED');
  return Object.freeze({
    eligible: blockers.length === 0,
    mismatchRateBasisPoints,
    blockers: Object.freeze(blockers),
    criteria,
  });
}
