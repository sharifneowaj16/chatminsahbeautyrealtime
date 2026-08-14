/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import prisma from '@/lib/prisma';
import { buildMetaAdminPayloadHash } from '@/lib/meta/admin/policy';
import { buildMetaAdsRecommendationKey } from './safety';

type RecommendationDb = {
  metaAdsInsightSnapshot: { findMany(args: any): Promise<any[]> };
  metaAdsRecommendation: {
    upsert(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
    findMany(args: any): Promise<any[]>;
    update(args: any): Promise<any>;
  };
};
const db = prisma as unknown as RecommendationDb;

export type MetaAdsRecommendationCandidate = {
  snapshotId?: string | null;
  accountId: string;
  entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
  entityId: string;
  entityName?: string | null;
  dateStart: string;
  dateStop: string;
  spend: number;
  purchases: number;
  roas: number;
  ctr: number;
  frequency: number;
};

export function generateMetaAdsRecommendationCandidates(row: MetaAdsRecommendationCandidate) {
  const output: Array<{ type: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; rationale: string; proposedMutation: Record<string, unknown> }> = [];
  if (row.spend >= 5_000 && row.purchases === 0) {
    output.push({ type: 'PAUSE_ENTITY', severity: 'CRITICAL', rationale: `Spent BDT ${row.spend.toFixed(2)} with no attributed purchases in the selected window.`, proposedMutation: { operation: `UPDATE_${row.entityType}`, entityType: row.entityType, resourceId: row.entityId, input: { status: 'PAUSED' } } });
  } else if (row.spend >= 2_000 && row.purchases > 0 && row.roas < 1) {
    output.push({ type: 'REDUCE_BUDGET', severity: 'WARNING', rationale: `ROAS ${row.roas.toFixed(2)} is below 1.0 after BDT ${row.spend.toFixed(2)} spend.`, proposedMutation: { operation: `UPDATE_${row.entityType}`, entityType: row.entityType, resourceId: row.entityId, intent: { budgetChangePercent: -20 } } });
  }
  if (row.purchases >= 3 && row.roas >= 3) {
    output.push({ type: 'SCALE_BUDGET', severity: 'INFO', rationale: `${row.purchases} purchases at ${row.roas.toFixed(2)} ROAS meet the controlled scale threshold.`, proposedMutation: { operation: `UPDATE_${row.entityType}`, entityType: row.entityType, resourceId: row.entityId, intent: { budgetChangePercent: 20 } } });
  }
  if (row.entityType === 'AD' && row.frequency >= 4 && row.ctr < 0.8) {
    output.push({ type: 'REVIEW_CREATIVE', severity: 'WARNING', rationale: `Frequency ${row.frequency.toFixed(2)} with CTR ${row.ctr.toFixed(2)}% suggests creative fatigue.`, proposedMutation: { operation: 'REVIEW_CREATIVE', entityType: 'AD', resourceId: row.entityId } });
  }
  return output;
}

export async function generateMetaAdsRecommendations(input: { expiresInHours?: number } = {}) {
  const snapshots = await db.metaAdsInsightSnapshot.findMany({
    where: { level: { in: ['CAMPAIGN', 'ADSET', 'AD'] } },
    orderBy: [{ dateStop: 'desc' }, { spend: 'desc' }],
    take: 500,
  });
  const expiresAt = new Date(Date.now() + Math.max(1, input.expiresInHours ?? 72) * 3_600_000);
  const activeKeys: string[] = [];
  let generated = 0;
  for (const snapshot of snapshots) {
    const base: MetaAdsRecommendationCandidate = {
      snapshotId: snapshot.id,
      accountId: snapshot.accountId,
      entityType: snapshot.level,
      entityId: snapshot.entityId,
      entityName: snapshot.entityName,
      dateStart: snapshot.dateStart.toISOString(),
      dateStop: snapshot.dateStop.toISOString(),
      spend: Number(snapshot.spend ?? 0), purchases: Number(snapshot.purchases ?? 0), roas: Number(snapshot.roas ?? 0), ctr: Number(snapshot.ctr ?? 0), frequency: Number(snapshot.frequency ?? 0),
    };
    for (const candidate of generateMetaAdsRecommendationCandidates(base)) {
      const recommendationKey = buildMetaAdsRecommendationKey({ entityType: base.entityType, entityId: base.entityId, type: candidate.type, dateStart: base.dateStart, dateStop: base.dateStop });
      activeKeys.push(recommendationKey);
      await db.metaAdsRecommendation.upsert({
        where: { recommendationKey },
        create: { recommendationKey, snapshotId: base.snapshotId, accountId: base.accountId, entityType: base.entityType, entityId: base.entityId, entityName: base.entityName, type: candidate.type, severity: candidate.severity, rationale: candidate.rationale, proposedMutation: candidate.proposedMutation, payloadHash: buildMetaAdminPayloadHash(candidate.proposedMutation), expiresAt },
        update: { snapshotId: base.snapshotId, entityName: base.entityName, severity: candidate.severity, rationale: candidate.rationale, proposedMutation: candidate.proposedMutation, payloadHash: buildMetaAdminPayloadHash(candidate.proposedMutation), expiresAt, status: 'OPEN', dismissedAt: null },
      });
      generated += 1;
    }
  }
  await db.metaAdsRecommendation.updateMany({ where: { status: 'OPEN', recommendationKey: { notIn: activeKeys.length ? activeKeys : ['__none__'] } }, data: { status: 'EXPIRED' } });
  return { generated, expiresAt: expiresAt.toISOString() };
}

export async function listMetaAdsRecommendations(input: { status?: string; limit?: number } = {}) {
  const rows = await db.metaAdsRecommendation.findMany({
    where: { status: input.status ? input.status : { in: ['OPEN', 'APPROVAL_REQUESTED'] }, expiresAt: { gt: new Date() } },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(200, Math.max(1, input.limit ?? 100)),
  });
  return rows.map((row) => ({ ...row, expiresAt: row.expiresAt.toISOString(), appliedAt: row.appliedAt?.toISOString() ?? null, dismissedAt: row.dismissedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function dismissMetaAdsRecommendation(input: { recommendationId: string }) {
  return db.metaAdsRecommendation.update({ where: { id: input.recommendationId }, data: { status: 'DISMISSED', dismissedAt: new Date() } });
}
