import policyJson from '../../../config/meta-api-version-policy.json';

import {
  META_FEATURE_IDS,
  isMetaFeatureId,
  type MetaApiVersionPolicy,
  type MetaFeatureCompatibilityDefinition,
  type MetaFeatureCompatibilityResult,
  type MetaFeatureId,
  type MetaVersionEntry,
  type MetaVersionPolicyResult,
  type MetaVersionRegressionStatus,
} from './types';

export { META_FEATURE_IDS, isMetaFeatureId } from './types';
export type {
  MetaApiVersionPolicy,
  MetaFeatureCompatibilityDefinition,
  MetaFeatureCompatibilityResult,
  MetaFeatureId,
  MetaVersionEntry,
  MetaVersionPolicyResult,
  MetaVersionRegressionStatus,
} from './types';

function freezePolicy(input: MetaApiVersionPolicy): MetaApiVersionPolicy {
  const versions = Object.freeze(Object.fromEntries(
    Object.entries(input.versions).map(([key, value]) => [key, Object.freeze({ ...value })]),
  )) as Readonly<Record<string, MetaVersionEntry>>;
  const features = Object.freeze(Object.fromEntries(
    META_FEATURE_IDS.map((featureId) => {
      const value = input.features[featureId];
      return [featureId, Object.freeze({
        ...value,
        approvedGraphVersions: Object.freeze([...value.approvedGraphVersions]),
      })];
    }),
  )) as Readonly<Record<MetaFeatureId, MetaFeatureCompatibilityDefinition>>;
  return Object.freeze({ ...input, versions, features });
}

function assertPolicy(input: unknown): asserts input is MetaApiVersionPolicy {
  const policy = input as Partial<MetaApiVersionPolicy>;
  if (policy.schemaVersion !== 2) throw new Error('META_VERSION_POLICY_SCHEMA_UNSUPPORTED');
  if (!policy.defaultVersion || !policy.businessSdkVersion || !policy.versions || !policy.features) {
    throw new Error('META_VERSION_POLICY_INVALID');
  }
  const featureIds = Object.keys(policy.features).sort();
  const expected = [...META_FEATURE_IDS].sort();
  if (JSON.stringify(featureIds) !== JSON.stringify(expected)) throw new Error('META_FEATURE_POLICY_INCOMPLETE');
}

assertPolicy(policyJson);
export const META_API_VERSION_POLICY = freezePolicy(policyJson);
export const META_BUSINESS_SDK_VERSION = META_API_VERSION_POLICY.businessSdkVersion;
export const DEFAULT_META_GRAPH_API_VERSION = META_API_VERSION_POLICY.defaultVersion;

export function parseMetaVersion(value: string) {
  const match = /^v(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function compareMetaVersions(left: string, right: string) {
  const a = parseMetaVersion(left);
  const b = parseMetaVersion(right);
  if (!a || !b) return Number.NaN;
  return a.major === b.major ? a.minor - b.minor : a.major - b.major;
}

export function normalizeMetaGraphApiVersion(version?: string | null): string {
  const rawVersion = version?.trim();
  if (!rawVersion) return DEFAULT_META_GRAPH_API_VERSION;
  if (/^v\d{2,3}\.\d+$/.test(rawVersion)) return rawVersion;
  if (/^\d{2,3}\.\d+$/.test(rawVersion)) return `v${rawVersion}`;
  return DEFAULT_META_GRAPH_API_VERSION;
}

export function loadMetaApiVersionPolicy(): MetaApiVersionPolicy {
  return META_API_VERSION_POLICY;
}

function isReached(value: string | null, now: Date) {
  return Boolean(value && Date.parse(value) <= now.getTime());
}

export function evaluateMetaVersionPolicy(input: {
  readonly configuredVersion: string;
  readonly sdkVersion: string;
  readonly now?: Date;
  readonly policy?: MetaApiVersionPolicy;
}): MetaVersionPolicyResult {
  const now = input.now ?? new Date();
  const policy = input.policy ?? META_API_VERSION_POLICY;
  const entry = policy.versions[input.configuredVersion];
  const warnings: string[] = [];
  let status: MetaVersionPolicyResult['status'] = 'HEALTHY';

  if (!parseMetaVersion(input.configuredVersion) || !entry) {
    status = 'ERROR';
    warnings.push('CONFIGURED_VERSION_NOT_IN_POLICY');
  } else {
    if (compareMetaVersions(input.configuredVersion, policy.minimumSupportedVersion) < 0) {
      status = 'ERROR';
      warnings.push('GRAPH_API_VERSION_BELOW_MINIMUM');
    }
    if (isReached(entry.officialExpirationDate, now) || isReached(entry.internalBlockDate, now)) {
      status = 'ERROR';
      warnings.push(entry.officialExpirationDate ? 'GRAPH_API_VERSION_EXPIRED' : 'INTERNAL_VERSION_MIGRATION_DEADLINE_REACHED');
    }
    if (input.configuredVersion !== policy.latestOfficialVersion) {
      if (status !== 'ERROR') status = 'VERSION_WARNING';
      warnings.push('GRAPH_API_VERSION_UPGRADE_AVAILABLE');
    }
    if (isReached(entry.internalWarningDate, now) || isReached(entry.reviewBy, now)) {
      if (status !== 'ERROR') status = 'VERSION_WARNING';
      warnings.push(isReached(entry.reviewBy, now) ? 'GRAPH_API_VERSION_REVIEW_OVERDUE' : 'GRAPH_API_VERSION_WARNING_WINDOW');
    }
    if (entry.regressionStatus === 'FAIL') {
      status = 'ERROR';
      warnings.push('GRAPH_API_REGRESSION_FAILED');
    } else if (input.configuredVersion === policy.targetVersion && entry.regressionStatus === 'PENDING') {
      if (status !== 'ERROR') status = 'VERSION_WARNING';
      warnings.push('TARGET_VERSION_REGRESSION_PENDING');
    }
    if (entry.sdkVersion && entry.sdkVersion !== input.sdkVersion) {
      if (status !== 'ERROR') status = 'VERSION_WARNING';
      warnings.push('BUSINESS_SDK_VERSION_POLICY_MISMATCH');
    }
  }

  return Object.freeze({
    configuredVersion: input.configuredVersion,
    latestOfficialVersion: policy.latestOfficialVersion,
    minimumSupportedVersion: policy.minimumSupportedVersion,
    targetVersion: policy.targetVersion,
    officialExpirationDate: entry?.officialExpirationDate ?? null,
    internalWarningDate: entry?.internalWarningDate ?? null,
    internalBlockDate: entry?.internalBlockDate ?? null,
    reviewBy: entry?.reviewBy ?? null,
    sdkVersion: entry?.sdkVersion ?? null,
    regressionStatus: entry?.regressionStatus ?? 'PENDING',
    status,
    warnings: Object.freeze([...new Set(warnings)]),
  });
}

export function evaluateMetaFeatureCompatibility(input: {
  readonly featureId: MetaFeatureId;
  readonly graphApiVersion: string;
  readonly sdkVersion?: string;
  readonly policy?: MetaApiVersionPolicy;
}): MetaFeatureCompatibilityResult {
  const policy = input.policy ?? META_API_VERSION_POLICY;
  const definition = policy.features[input.featureId];
  const sdkVersion = input.sdkVersion ?? policy.businessSdkVersion;
  const reasons: string[] = [];

  if (input.featureId === 'NONE') {
    return Object.freeze({ featureId: input.featureId, graphApiVersion: input.graphApiVersion, sdkVersion, compatible: true, reasons: Object.freeze([]) });
  }
  if (!parseMetaVersion(input.graphApiVersion) || !policy.versions[input.graphApiVersion]) {
    reasons.push('GRAPH_API_VERSION_NOT_REGISTERED');
  }
  if (definition.minimumGraphVersion && compareMetaVersions(input.graphApiVersion, definition.minimumGraphVersion) < 0) {
    reasons.push('GRAPH_API_VERSION_BELOW_FEATURE_MINIMUM');
  }
  if (!definition.approvedGraphVersions.includes(input.graphApiVersion)) {
    reasons.push('GRAPH_API_VERSION_NOT_APPROVED_FOR_FEATURE');
  }
  const versionEntry = policy.versions[input.graphApiVersion];
  if (versionEntry && !['PASS', 'WAIVED'].includes(versionEntry.regressionStatus)) {
    reasons.push('GRAPH_API_REGRESSION_NOT_APPROVED');
  }
  if (definition.requiresBusinessSdk && sdkVersion !== policy.businessSdkVersion) {
    reasons.push('BUSINESS_SDK_VERSION_NOT_APPROVED');
  }

  return Object.freeze({
    featureId: input.featureId,
    graphApiVersion: input.graphApiVersion,
    sdkVersion,
    compatible: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
  });
}
