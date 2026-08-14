/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import prisma from '@/lib/prisma';
import {
  createAd,
  createAdSet,
  createCampaign,
  createCreative,
  getAd,
  getAdSet,
  getCampaign,
  getCreative,
  updateAd,
  updateAdSet,
  updateCampaign,
  updateCreative,
} from '@/lib/meta-business/marketing';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import { buildMetaAdsMutationPayloadHash, assertMetaAdsReadOnlyStability, normalizeMetaAdsMutation } from './safety';
import { getMetaAdsReadOnlyStability } from './insights';
import type { MetaAdsEntityType, MetaAdsMutationApprovalPayload, MetaAdsMutationOperation } from './types';

type MutationDb = {
  metaAdsMutationExecution: {
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    findUnique(args: any): Promise<any | null>;
    findMany(args: any): Promise<any[]>;
  };
};
const db = prisma as unknown as MutationDb;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function providerId(value: unknown) {
  const record = asRecord(value);
  const id = record.id ?? (record._data ? asRecord(record._data).id : undefined);
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export async function getMetaAdsProviderState(entityType: MetaAdsEntityType, resourceId: string) {
  if (entityType === 'CAMPAIGN') return asRecord(await getCampaign(resourceId));
  if (entityType === 'ADSET') return asRecord(await getAdSet(resourceId));
  if (entityType === 'CREATIVE') return asRecord(await getCreative(resourceId));
  return asRecord(await getAd(resourceId));
}

export async function prepareMetaAdsMutation(input: {
  operation: MetaAdsMutationOperation;
  resourceId?: string | null;
  payload: Record<string, unknown>;
}) {
  const creating = input.operation.startsWith('CREATE_');
  const entityType = input.operation.replace(/^CREATE_|^UPDATE_/, '') as MetaAdsEntityType;
  const before = creating ? null : await getMetaAdsProviderState(entityType, input.resourceId?.trim() || '');
  const approvalPayload = normalizeMetaAdsMutation({ operation: input.operation, resourceId: input.resourceId, payload: input.payload, before });
  return { before, approvalPayload };
}

async function mutateProvider(payload: MetaAdsMutationApprovalPayload) {
  const input = payload.input;
  switch (payload.operation) {
    case 'CREATE_CAMPAIGN': return createCampaign(input as Parameters<typeof createCampaign>[0]);
    case 'UPDATE_CAMPAIGN': return updateCampaign(payload.resourceId!, input);
    case 'CREATE_ADSET': return createAdSet(input as Parameters<typeof createAdSet>[0]);
    case 'UPDATE_ADSET': return updateAdSet(payload.resourceId!, input);
    case 'CREATE_CREATIVE': return createCreative(input as Parameters<typeof createCreative>[0]);
    case 'UPDATE_CREATIVE': return updateCreative(payload.resourceId!, input);
    case 'CREATE_AD': return createAd(input as Parameters<typeof createAd>[0]);
    case 'UPDATE_AD': return updateAd(payload.resourceId!, input);
    default: throw new MetaAdminActionError('Unsupported Meta ad mutation operation.', 400, 'META_ADS_OPERATION_UNSUPPORTED');
  }
}

export async function executeMetaAdsMutation(input: {
  approvalId: string;
  actorId: string;
  correlationId?: string | null;
  payload: MetaAdsMutationApprovalPayload;
  before: Record<string, unknown> | null;
}) {
  if (!input.approvalId.trim()) throw new MetaAdminActionError('approvalId is required.', 428, 'APPROVAL_REQUIRED');
  assertMetaAdsReadOnlyStability(await getMetaAdsReadOnlyStability());
  const normalized = normalizeMetaAdsMutation({
    operation: input.payload.operation,
    resourceId: input.payload.resourceId,
    payload: input.payload.input,
    before: input.before,
  });
  const payloadHash = buildMetaAdsMutationPayloadHash(normalized);
  let execution: any;
  try {
    execution = await db.metaAdsMutationExecution.create({
      data: {
        approvalId: input.approvalId,
        operation: normalized.operation,
        entityType: normalized.entityType,
        entityId: normalized.resourceId,
        payloadHash,
        requestedById: input.actorId,
        correlationId: input.correlationId ?? null,
        beforeData: redactMetaAdminData(input.before),
      },
    });
  } catch (error) {
    const existing = await db.metaAdsMutationExecution.findUnique({
      where: { approvalId: input.approvalId },
      select: { id: true },
    }).catch(() => null);
    if (existing) {
      throw new MetaAdminActionError(
        'This approval already has an ad mutation execution record.',
        409,
        'META_ADS_APPROVAL_ALREADY_EXECUTED'
      );
    }
    throw error;
  }

  try {
    const providerResult = await mutateProvider(normalized);
    const entityId = normalized.resourceId ?? providerId(providerResult);
    let afterData: Record<string, unknown> | null = null;
    let status: 'SUCCEEDED' | 'RECONCILIATION_REQUIRED' = 'SUCCEEDED';
    let reconcileError: unknown = null;
    if (!entityId) {
      status = 'RECONCILIATION_REQUIRED';
      reconcileError = { code: 'PROVIDER_ENTITY_ID_MISSING', message: 'Provider mutation returned no entity ID.' };
    } else {
      try {
        afterData = await getMetaAdsProviderState(normalized.entityType, entityId);
      } catch (error) {
        status = 'RECONCILIATION_REQUIRED';
        reconcileError = error instanceof Error ? { name: error.name, message: error.message } : { message: 'Provider state re-read failed.' };
      }
    }
    await db.metaAdsMutationExecution.update({
      where: { id: execution.id },
      data: {
        entityId,
        status,
        providerResult: redactMetaAdminData(providerResult),
        afterData: redactMetaAdminData(afterData),
        errorData: reconcileError ? redactMetaAdminData(reconcileError) : null,
        completedAt: new Date(),
      },
    });
    return {
      executionId: execution.id,
      status,
      entityId,
      providerResult: redactMetaAdminData(providerResult),
      afterData: redactMetaAdminData(afterData),
      reconciliationRequired: status === 'RECONCILIATION_REQUIRED',
    };
  } catch (error) {
    await db.metaAdsMutationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorData: redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error),
        completedAt: new Date(),
      },
    }).catch(() => undefined);
    throw error;
  }
}

export async function listMetaAdsMutationExecutions(input: { limit?: number } = {}) {
  const rows = await db.metaAdsMutationExecution.findMany({ orderBy: { startedAt: 'desc' }, take: Math.min(100, Math.max(1, input.limit ?? 50)) });
  return rows.map((row) => ({
    ...row,
    startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  }));
}
