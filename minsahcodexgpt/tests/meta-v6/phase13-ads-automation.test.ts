import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMetaAdsMutationPayloadHash,
  evaluateMetaAdsReadOnlyStability,
  getMetaAdsSafetyCaps,
  normalizeMetaAdsMutation,
} from '@/lib/meta/ads/safety';
import { normalizeMetaAdsInsightRow } from '@/lib/meta/ads/insights';
import { generateMetaAdsRecommendationCandidates } from '@/lib/meta/ads/recommendations';
import { META_JOB_NAMES, META_JOB_SCHEMA_VERSION, META_QUEUE_NAMES, validateMetaJobPayload } from '@/lib/jobs/job-types';

const caps = { maxDailyBudgetBdt: 10_000, maxLifetimeBudgetBdt: 100_000, maxBidAmountBdt: 5_000, maxBudgetIncreasePercent: 25 };

test('create mutations are forced to PAUSED', () => {
  const result = normalizeMetaAdsMutation({ operation: 'CREATE_CAMPAIGN', payload: { name: 'Launch' }, caps });
  assert.equal(result.input.status, 'PAUSED');
  assert.equal(result.entityType, 'CAMPAIGN');
});

test('active create is rejected', () => {
  assert.throws(() => normalizeMetaAdsMutation({ operation: 'CREATE_AD', payload: { name: 'A', adSetId: '1', creativeId: '2', status: 'ACTIVE' }, caps }), /created PAUSED/);
});

test('absolute budget cap is enforced server-side', () => {
  assert.throws(() => normalizeMetaAdsMutation({ operation: 'CREATE_CAMPAIGN', payload: { name: 'Launch', dailyBudgetBdt: 10_001 }, caps }), /safety cap/);
});

test('per-approval budget increase cap is enforced from provider minor units', () => {
  assert.throws(() => normalizeMetaAdsMutation({ operation: 'UPDATE_CAMPAIGN', resourceId: 'cmp-1', payload: { dailyBudgetBdt: 1_300 }, before: { daily_budget: '100000' }, caps }), /25%/);
  const allowed = normalizeMetaAdsMutation({ operation: 'UPDATE_CAMPAIGN', resourceId: 'cmp-1', payload: { dailyBudgetBdt: 1_250 }, before: { daily_budget: '100000' }, caps });
  assert.equal(allowed.input.dailyBudgetBdt, 1_250);
});

test('unknown provider fields cannot bypass route allowlists', () => {
  assert.throws(() => normalizeMetaAdsMutation({ operation: 'UPDATE_CAMPAIGN', resourceId: 'cmp-1', payload: { access_token: 'secret' }, caps }), /Unsupported ad mutation field/);
});

test('approval payload hash is canonical across object key order', () => {
  const a = normalizeMetaAdsMutation({ operation: 'UPDATE_AD', resourceId: 'ad-1', payload: { status: 'PAUSED', name: 'A' }, caps });
  const b = normalizeMetaAdsMutation({ operation: 'UPDATE_AD', resourceId: 'ad-1', payload: { name: 'A', status: 'PAUSED' }, caps });
  assert.equal(buildMetaAdsMutationPayloadHash(a), buildMetaAdsMutationPayloadHash(b));
});

test('read-only gate requires three consecutive successful fresh syncs', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const runs = [0, 1, 2].map((hour) => ({ status: 'SUCCEEDED', startedAt: new Date(now.getTime() - hour * 3_600_000), completedAt: new Date(now.getTime() - hour * 3_600_000 + 60_000) }));
  const result = evaluateMetaAdsReadOnlyStability(runs, now);
  assert.equal(result.stable, true);
  assert.equal(result.successfulRuns, 3);
});

test('latest failed sync closes the write gate', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const runs = [
    { status: 'FAILED', startedAt: now, completedAt: now },
    { status: 'SUCCEEDED', startedAt: new Date(now.getTime() - 3_600_000), completedAt: new Date(now.getTime() - 3_500_000) },
    { status: 'SUCCEEDED', startedAt: new Date(now.getTime() - 7_200_000), completedAt: new Date(now.getTime() - 7_100_000) },
    { status: 'SUCCEEDED', startedAt: new Date(now.getTime() - 10_800_000), completedAt: new Date(now.getTime() - 10_700_000) },
  ];
  const result = evaluateMetaAdsReadOnlyStability(runs, now);
  assert.equal(result.stable, false);
  assert.equal(result.successfulRuns, 0);
});

test('stale insights close the write gate', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const old = new Date('2026-07-16T00:00:00.000Z');
  const result = evaluateMetaAdsReadOnlyStability([0, 1, 2].map(() => ({ status: 'SUCCEEDED', startedAt: old, completedAt: old })), now);
  assert.equal(result.stable, false);
  assert.equal(result.stale, true);
});

test('insight normalization calculates purchases, value and ROAS', () => {
  const row = normalizeMetaAdsInsightRow({
    accountId: 'act_1', level: 'CAMPAIGN', fallbackStart: new Date('2026-07-01T00:00:00Z'), fallbackStop: new Date('2026-07-07T00:00:00Z'),
    row: { campaign_id: 'cmp-1', campaign_name: 'Summer', date_start: '2026-07-01', date_stop: '2026-07-07', spend: '100', impressions: '1000', clicks: '50', calculated_purchases: 4, calculated_purchase_value: 400, ctr: '5', country: 'BD' },
  });
  assert.equal(row.entityId, 'cmp-1');
  assert.equal(row.roas, 4);
  assert.equal(row.purchases, 4);
  assert.deepEqual(row.breakdown, { country: 'BD' });
});

test('high-spend zero-purchase campaign creates pause recommendation only', () => {
  const items = generateMetaAdsRecommendationCandidates({ accountId: 'act_1', entityType: 'CAMPAIGN', entityId: 'cmp-1', dateStart: '2026-07-01', dateStop: '2026-07-07', spend: 6_000, purchases: 0, roas: 0, ctr: 1, frequency: 2 });
  assert.equal(items[0]?.type, 'PAUSE_ENTITY');
  assert.equal(items[0]?.proposedMutation.input && (items[0].proposedMutation.input as Record<string, unknown>).status, 'PAUSED');
});

test('strong ROAS creates human-reviewed scale recommendation', () => {
  const items = generateMetaAdsRecommendationCandidates({ accountId: 'act_1', entityType: 'ADSET', entityId: 'set-1', dateStart: '2026-07-01', dateStop: '2026-07-07', spend: 2_000, purchases: 5, roas: 4, ctr: 2, frequency: 2 });
  assert.ok(items.some((item) => item.type === 'SCALE_BUDGET'));
  assert.ok(items.every((item) => !('approvalId' in item.proposedMutation)));
});

test('creative fatigue is detected at ad level', () => {
  const items = generateMetaAdsRecommendationCandidates({ accountId: 'act_1', entityType: 'AD', entityId: 'ad-1', dateStart: '2026-07-01', dateStop: '2026-07-07', spend: 500, purchases: 1, roas: 2, ctr: 0.5, frequency: 5 });
  assert.ok(items.some((item) => item.type === 'REVIEW_CREATIVE'));
});

test('ads insights job contract accepts safe date-only payloads', () => {
  const result = validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.ADS_INSIGHTS,
    jobName: META_JOB_NAMES.ADS_INSIGHTS_SYNC,
    payload: { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'ads-insights:campaign:2026-07-18', requestedAt: '2026-07-18T00:00:00.000Z', type: 'ads_insights_sync', level: 'CAMPAIGN', since: '2026-07-10', until: '2026-07-17' },
  });
  assert.equal(result.valid, true);
});

test('safety caps are environment configurable with safe defaults', () => {
  const configured = getMetaAdsSafetyCaps({ META_ADS_MAX_DAILY_BUDGET_BDT: '12000', META_ADS_MAX_LIFETIME_BUDGET_BDT: '90000', META_ADS_MAX_BID_BDT: '4000', META_ADS_MAX_BUDGET_INCREASE_PERCENT: '15' } as unknown as NodeJS.ProcessEnv);
  assert.deepEqual(configured, { maxDailyBudgetBdt: 12_000, maxLifetimeBudgetBdt: 90_000, maxBidAmountBdt: 4_000, maxBudgetIncreasePercent: 15 });
});
