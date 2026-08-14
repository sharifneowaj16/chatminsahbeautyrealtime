import { createHash } from 'node:crypto';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import { buildMetaAdminPayloadHash } from '@/lib/meta/admin/policy';
import type {
  MetaAdsEntityType,
  MetaAdsMutationApprovalPayload,
  MetaAdsMutationOperation,
  MetaAdsReadOnlyStability,
  MetaAdsSafetyCaps,
  MetaAdsStabilityRun,
} from './types';

const OPERATION_ENTITY: Record<MetaAdsMutationOperation, MetaAdsEntityType> = {
  CREATE_CAMPAIGN: 'CAMPAIGN',
  UPDATE_CAMPAIGN: 'CAMPAIGN',
  CREATE_ADSET: 'ADSET',
  UPDATE_ADSET: 'ADSET',
  CREATE_CREATIVE: 'CREATIVE',
  UPDATE_CREATIVE: 'CREATIVE',
  CREATE_AD: 'AD',
  UPDATE_AD: 'AD',
};

const ALLOWED_FIELDS: Record<MetaAdsMutationOperation, ReadonlySet<string>> = {
  CREATE_CAMPAIGN: new Set(['name', 'objective', 'status', 'specialAdCategories', 'buyingType', 'dailyBudgetBdt', 'lifetimeBudgetBdt', 'bidStrategy']),
  UPDATE_CAMPAIGN: new Set(['name', 'status', 'dailyBudgetBdt', 'lifetimeBudgetBdt', 'bidStrategy']),
  CREATE_ADSET: new Set(['name', 'campaignId', 'status', 'dailyBudgetBdt', 'lifetimeBudgetBdt', 'bidAmountBdt', 'bidStrategy', 'billingEvent', 'optimizationGoal', 'targeting', 'promotedObject', 'startTime', 'endTime', 'attributionSpec']),
  UPDATE_ADSET: new Set(['name', 'status', 'dailyBudgetBdt', 'lifetimeBudgetBdt', 'bidAmountBdt', 'bidStrategy', 'billingEvent', 'optimizationGoal', 'targeting', 'promotedObject', 'startTime', 'endTime', 'attributionSpec']),
  CREATE_CREATIVE: new Set(['name', 'pageId', 'instagramActorId', 'link', 'message', 'headline', 'description', 'imageHash', 'picture', 'callToActionType', 'objectStorySpec', 'assetFeedSpec', 'degreesOfFreedomSpec', 'urlTags']),
  UPDATE_CREATIVE: new Set(['name', 'object_story_spec', 'asset_feed_spec', 'degrees_of_freedom_spec', 'url_tags']),
  CREATE_AD: new Set(['name', 'adSetId', 'creativeId', 'status', 'trackingSpecs']),
  UPDATE_AD: new Set(['name', 'status', 'creative', 'tracking_specs']),
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMetaAdsSafetyCaps(env: NodeJS.ProcessEnv = process.env): MetaAdsSafetyCaps {
  return {
    maxDailyBudgetBdt: positiveNumber(env.META_ADS_MAX_DAILY_BUDGET_BDT, 50_000),
    maxLifetimeBudgetBdt: positiveNumber(env.META_ADS_MAX_LIFETIME_BUDGET_BDT, 500_000),
    maxBidAmountBdt: positiveNumber(env.META_ADS_MAX_BID_BDT, 10_000),
    maxBudgetIncreasePercent: positiveNumber(env.META_ADS_MAX_BUDGET_INCREASE_PERCENT, 25),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOptional(value: unknown, name: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new MetaAdminActionError(`${name} must be a non-negative number.`, 400, 'META_ADS_BUDGET_INVALID');
  }
  return parsed;
}

function providerMinorToBdt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed / 100 : undefined;
}

function currentBudgetBdt(before: Record<string, unknown> | null | undefined, camel: string, snake: string) {
  const direct = finiteOptional(before?.[camel], camel);
  if (direct !== undefined) return direct;
  return providerMinorToBdt(before?.[snake]);
}

function assertAbsoluteCap(value: number | undefined, cap: number, label: string) {
  if (value !== undefined && value > cap) {
    throw new MetaAdminActionError(`${label} exceeds the server-side safety cap of BDT ${cap}.`, 409, 'META_ADS_BUDGET_CAP_EXCEEDED');
  }
}

function assertIncreaseCap(next: number | undefined, current: number | undefined, percent: number, label: string) {
  if (next === undefined || current === undefined || current <= 0 || next <= current) return;
  const maximum = current * (1 + percent / 100);
  if (next > maximum + 0.0001) {
    throw new MetaAdminActionError(`${label} increase exceeds the ${percent}% per-approval limit.`, 409, 'META_ADS_BUDGET_INCREASE_EXCEEDED');
  }
}

function cleanObject(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function normalizeMetaAdsMutation(input: {
  operation: MetaAdsMutationOperation;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  caps?: MetaAdsSafetyCaps;
}): MetaAdsMutationApprovalPayload {
  const allowed = ALLOWED_FIELDS[input.operation];
  const unknownFields = Object.keys(input.payload).filter((key) => !allowed.has(key));
  if (unknownFields.length) {
    throw new MetaAdminActionError(`Unsupported ad mutation field(s): ${unknownFields.join(', ')}`, 400, 'META_ADS_FIELD_NOT_ALLOWED');
  }

  const entityType = OPERATION_ENTITY[input.operation];
  const creating = input.operation.startsWith('CREATE_');
  const resourceId = input.resourceId?.trim() || null;
  if (!creating && !resourceId) {
    throw new MetaAdminActionError('resourceId is required for ad updates.', 400, 'META_ADS_RESOURCE_ID_REQUIRED');
  }

  const normalized = cleanObject({ ...input.payload });
  if (creating && 'status' in normalized) {
    const status = String(normalized.status ?? '').toUpperCase();
    if (status && status !== 'PAUSED') {
      throw new MetaAdminActionError('New Meta ad entities must be created PAUSED.', 409, 'META_ADS_CREATE_MUST_BE_PAUSED');
    }
    normalized.status = 'PAUSED';
  } else if (creating && entityType !== 'CREATIVE') {
    normalized.status = 'PAUSED';
  }

  if (typeof normalized.name === 'string') normalized.name = normalized.name.trim();
  const caps = input.caps ?? getMetaAdsSafetyCaps();
  const daily = finiteOptional(normalized.dailyBudgetBdt, 'dailyBudgetBdt');
  const lifetime = finiteOptional(normalized.lifetimeBudgetBdt, 'lifetimeBudgetBdt');
  const bid = finiteOptional(normalized.bidAmountBdt, 'bidAmountBdt');
  assertAbsoluteCap(daily, caps.maxDailyBudgetBdt, 'Daily budget');
  assertAbsoluteCap(lifetime, caps.maxLifetimeBudgetBdt, 'Lifetime budget');
  assertAbsoluteCap(bid, caps.maxBidAmountBdt, 'Bid amount');
  if (!creating) {
    assertIncreaseCap(daily, currentBudgetBdt(input.before, 'dailyBudgetBdt', 'daily_budget'), caps.maxBudgetIncreasePercent, 'Daily budget');
    assertIncreaseCap(lifetime, currentBudgetBdt(input.before, 'lifetimeBudgetBdt', 'lifetime_budget'), caps.maxBudgetIncreasePercent, 'Lifetime budget');
    assertIncreaseCap(bid, currentBudgetBdt(input.before, 'bidAmountBdt', 'bid_amount'), caps.maxBudgetIncreasePercent, 'Bid amount');
  }

  return { operation: input.operation, entityType, resourceId, input: normalized };
}

export function buildMetaAdsMutationPayloadHash(payload: MetaAdsMutationApprovalPayload) {
  return buildMetaAdminPayloadHash(payload);
}

export function buildMetaAdsRecommendationKey(input: { entityType: string; entityId: string; type: string; dateStart: string; dateStop: string }) {
  return createHash('sha256').update(`${input.entityType}:${input.entityId}:${input.type}:${input.dateStart}:${input.dateStop}`).digest('hex');
}

export function evaluateMetaAdsReadOnlyStability(
  runs: MetaAdsStabilityRun[],
  now = new Date(),
  options: { requiredSuccessfulRuns?: number; maxAgeHours?: number } = {}
): MetaAdsReadOnlyStability {
  const requiredSuccessfulRuns = Math.max(1, options.requiredSuccessfulRuns ?? 3);
  const maxAgeHours = Math.max(1, options.maxAgeHours ?? 26);
  const ordered = [...runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const latestCompleted = ordered.find((run) => run.status === 'SUCCEEDED' && run.completedAt);
  const latestCompletedAt = latestCompleted?.completedAt ? new Date(latestCompleted.completedAt) : null;
  const stale = !latestCompletedAt || now.getTime() - latestCompletedAt.getTime() > maxAgeHours * 3_600_000;
  let successfulRuns = 0;
  for (const run of ordered) {
    if (run.status !== 'SUCCEEDED') break;
    successfulRuns += 1;
  }
  const stable = successfulRuns >= requiredSuccessfulRuns && !stale;
  const reason = stable
    ? 'Read-only Ads Insights ingestion is stable.'
    : stale
      ? 'Latest successful Ads Insights snapshot is stale or missing.'
      : `Requires ${requiredSuccessfulRuns} consecutive successful read-only syncs; found ${successfulRuns}.`;
  return { stable, successfulRuns, requiredSuccessfulRuns, latestCompletedAt: latestCompletedAt?.toISOString() ?? null, stale, reason };
}

export function assertMetaAdsReadOnlyStability(stability: MetaAdsReadOnlyStability) {
  if (!stability.stable) {
    throw new MetaAdminActionError(stability.reason, 409, 'META_ADS_READ_ONLY_GATE_NOT_STABLE');
  }
}

export function assertMetaAdsApprovalPayloadMatch(expected: MetaAdsMutationApprovalPayload, actual: unknown) {
  if (!isRecord(actual) || buildMetaAdminPayloadHash(actual) !== buildMetaAdminPayloadHash(expected)) {
    throw new MetaAdminActionError('Approved ad mutation payload does not match the executable payload.', 409, 'META_ADS_APPROVAL_PAYLOAD_MISMATCH');
  }
}
