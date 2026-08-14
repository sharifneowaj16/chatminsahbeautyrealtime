/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { getInsights } from '@/lib/meta-business/marketing';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';
import { evaluateMetaAdsReadOnlyStability } from './safety';

export type MetaAdsInsightLevel = 'ACCOUNT' | 'CAMPAIGN' | 'ADSET' | 'AD';

type InsightDb = {
  metaAdsInsightSyncRun: {
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
  };
  metaAdsInsightSnapshot: {
    upsert(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args: any): Promise<number>;
  };
};
const db = prisma as unknown as InsightDb;

const IDENTITY_KEYS = new Set([
  'account_id', 'account_name', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
  'ad_id', 'ad_name', 'date_start', 'date_stop', 'impressions', 'reach', 'frequency',
  'clicks', 'inline_link_clicks', 'ctr', 'cpc', 'cpm', 'spend', 'actions', 'action_values',
  'purchase_roas', 'cost_per_action_type', 'calculated_purchase_value', 'calculated_purchases', 'calculated_roas',
]);

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function integer(value: unknown) { return BigInt(Math.max(0, Math.trunc(number(value)))); }
function dateOnly(value: unknown, fallback: Date) {
  const text = typeof value === 'string' ? value : '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00.000Z`) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
function levelForProvider(level: MetaAdsInsightLevel) { return level.toLowerCase() as 'account' | 'campaign' | 'adset' | 'ad'; }
function entityId(level: MetaAdsInsightLevel, row: Record<string, unknown>, accountId: string) {
  if (level === 'ACCOUNT') return String(row.account_id ?? accountId);
  if (level === 'CAMPAIGN') return String(row.campaign_id ?? 'unknown-campaign');
  if (level === 'ADSET') return String(row.adset_id ?? 'unknown-adset');
  return String(row.ad_id ?? 'unknown-ad');
}
function entityName(level: MetaAdsInsightLevel, row: Record<string, unknown>) {
  if (level === 'ACCOUNT') return typeof row.account_name === 'string' ? row.account_name : null;
  if (level === 'CAMPAIGN') return typeof row.campaign_name === 'string' ? row.campaign_name : null;
  if (level === 'ADSET') return typeof row.adset_name === 'string' ? row.adset_name : null;
  return typeof row.ad_name === 'string' ? row.ad_name : null;
}
function breakdownData(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([key, value]) => !IDENTITY_KEYS.has(key) && value !== undefined));
}
function canonical(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
function breakdownHash(value: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export function defaultMetaAdsInsightWindow(now = new Date()) {
  const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(stop.getTime() - 6 * 86_400_000);
  return { since: isoDate(start), until: isoDate(stop), dateStart: start, dateStop: stop };
}

export function normalizeMetaAdsInsightRow(input: {
  accountId: string;
  level: MetaAdsInsightLevel;
  row: Record<string, unknown>;
  fallbackStart: Date;
  fallbackStop: Date;
}) {
  const breakdown = breakdownData(input.row);
  const spend = number(input.row.spend);
  const purchaseValue = number(input.row.calculated_purchase_value);
  const purchases = number(input.row.calculated_purchases);
  return {
    accountId: input.accountId,
    level: input.level,
    entityId: entityId(input.level, input.row, input.accountId),
    entityName: entityName(input.level, input.row),
    campaignId: typeof input.row.campaign_id === 'string' ? input.row.campaign_id : null,
    campaignName: typeof input.row.campaign_name === 'string' ? input.row.campaign_name : null,
    adSetId: typeof input.row.adset_id === 'string' ? input.row.adset_id : null,
    adSetName: typeof input.row.adset_name === 'string' ? input.row.adset_name : null,
    adId: typeof input.row.ad_id === 'string' ? input.row.ad_id : null,
    adName: typeof input.row.ad_name === 'string' ? input.row.ad_name : null,
    dateStart: dateOnly(input.row.date_start, input.fallbackStart),
    dateStop: dateOnly(input.row.date_stop, input.fallbackStop),
    breakdownHash: breakdownHash(breakdown),
    breakdown,
    impressions: integer(input.row.impressions),
    reach: integer(input.row.reach),
    clicks: integer(input.row.clicks),
    inlineLinkClicks: integer(input.row.inline_link_clicks),
    spend,
    ctr: number(input.row.ctr),
    cpc: number(input.row.cpc),
    cpm: number(input.row.cpm),
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : number(input.row.calculated_roas),
    frequency: number(input.row.frequency),
    actions: Array.isArray(input.row.actions) ? input.row.actions : null,
    actionValues: Array.isArray(input.row.action_values) ? input.row.action_values : null,
  };
}

export async function syncMetaAdsInsights(input: {
  level?: MetaAdsInsightLevel;
  since?: string;
  until?: string;
  requestedById?: string | null;
  correlationId?: string | null;
}) {
  const config = getMetaBusinessConfig();
  const accountId = config.adAccountId?.trim();
  if (!accountId) throw new Error('META_AD_ACCOUNT_ID is required for Ads Insights synchronization.');
  const defaults = defaultMetaAdsInsightWindow();
  const since = input.since && /^\d{4}-\d{2}-\d{2}$/.test(input.since) ? input.since : defaults.since;
  const until = input.until && /^\d{4}-\d{2}-\d{2}$/.test(input.until) ? input.until : defaults.until;
  const dateStart = new Date(`${since}T00:00:00.000Z`);
  const dateStop = new Date(`${until}T00:00:00.000Z`);
  if (dateStart > dateStop) throw new Error('Ads Insights since must be on or before until.');
  const level = input.level ?? 'CAMPAIGN';
  const correlationId = input.correlationId ?? randomUUID();
  const run = await db.metaAdsInsightSyncRun.create({
    data: { accountId, level, dateStart, dateStop, requestedById: input.requestedById ?? null, correlationId },
  });
  try {
    const provider = await getInsights({ level: levelForProvider(level), since, until, limit: 500 });
    if (provider.migration?.stale) throw new Error('META_ADS_INSIGHTS_STALE_FALLBACK_NOT_SYNCABLE');
    let rowCount = 0;
    for (const raw of provider.data) {
      const row = normalizeMetaAdsInsightRow({ accountId, level, row: raw as Record<string, unknown>, fallbackStart: dateStart, fallbackStop: dateStop });
      await db.metaAdsInsightSnapshot.upsert({
        where: { accountId_level_entityId_dateStart_dateStop_breakdownHash: {
          accountId: row.accountId, level: row.level, entityId: row.entityId,
          dateStart: row.dateStart, dateStop: row.dateStop, breakdownHash: row.breakdownHash,
        } },
        create: { ...row, syncRunId: run.id },
        update: { ...row, syncRunId: run.id, capturedAt: new Date() },
      });
      rowCount += 1;
    }
    await db.metaAdsInsightSyncRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', rowCount, completedAt: new Date() } });
    return { syncRunId: run.id, correlationId, accountId, level, since, until, rowCount, providerPaging: provider.paging ?? null };
  } catch (error) {
    const safeError = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error);
    await db.metaAdsInsightSyncRun.update({ where: { id: run.id }, data: { status: 'FAILED', errorData: safeError, completedAt: new Date() } }).catch(() => undefined);
    throw error;
  }
}

function serializeSnapshot(row: any) {
  return {
    ...row,
    impressions: Number(row.impressions ?? 0), reach: Number(row.reach ?? 0), clicks: Number(row.clicks ?? 0), inlineLinkClicks: Number(row.inlineLinkClicks ?? 0),
    spend: number(row.spend), ctr: number(row.ctr), cpc: number(row.cpc), cpm: number(row.cpm), purchases: number(row.purchases), purchaseValue: number(row.purchaseValue), roas: number(row.roas), frequency: number(row.frequency),
    dateStart: row.dateStart.toISOString(), dateStop: row.dateStop.toISOString(), capturedAt: row.capturedAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMetaAdsInsights(input: { level?: MetaAdsInsightLevel; since?: Date; until?: Date; limit?: number }) {
  const rows = await db.metaAdsInsightSnapshot.findMany({
    where: {
      level: input.level ?? 'CAMPAIGN',
      dateStart: input.since ? { gte: input.since } : undefined,
      dateStop: input.until ? { lte: input.until } : undefined,
    },
    orderBy: [{ dateStop: 'desc' }, { spend: 'desc' }],
    take: Math.min(500, Math.max(1, input.limit ?? 100)),
  });
  const snapshots = rows.map(serializeSnapshot);
  const summary = snapshots.reduce((total, row) => ({
    spend: total.spend + row.spend,
    impressions: total.impressions + row.impressions,
    clicks: total.clicks + row.clicks,
    purchases: total.purchases + row.purchases,
    purchaseValue: total.purchaseValue + row.purchaseValue,
  }), { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0 });
  return {
    snapshots,
    summary: {
      ...summary,
      ctr: summary.impressions > 0 ? summary.clicks / summary.impressions * 100 : 0,
      cpc: summary.clicks > 0 ? summary.spend / summary.clicks : 0,
      roas: summary.spend > 0 ? summary.purchaseValue / summary.spend : 0,
    },
  };
}

export async function getMetaAdsReadOnlyStability(now = new Date()) {
  const runs = await db.metaAdsInsightSyncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 });
  return evaluateMetaAdsReadOnlyStability(runs, now);
}
