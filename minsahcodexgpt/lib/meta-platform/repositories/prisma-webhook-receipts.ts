import 'server-only';
import prisma from '@/lib/prisma';
import { createMetaSocialWebhookReceiptLifecycleRepository } from './webhook-receipt-lifecycle';
import {
  createMetaSocialWebhookReceiptRepository,
  type CreateMetaSocialWebhookReceiptInput,
} from './webhook-receipts';

const executor = {
  query<T>(sql: string, ...values: unknown[]) {
    return prisma.$queryRawUnsafe<T[]>(sql, ...values);
  },
};

const repository = createMetaSocialWebhookReceiptRepository(executor);
const lifecycle = createMetaSocialWebhookReceiptLifecycleRepository(executor);

export function createOrGetMetaSocialWebhookReceipt(input: CreateMetaSocialWebhookReceiptInput) {
  return repository.createOrGet(input);
}

export function linkMetaSocialWebhookLegacyReceipt(input: {
  readonly receiptId: string;
  readonly legacyReceiptType: string;
  readonly legacyReceiptId: string;
}) {
  return repository.linkLegacyReceipt(input);
}

export const getMetaSocialWebhookReceipt = lifecycle.getById;
export const findMetaSocialWebhookReceiptByLegacyReceipt = lifecycle.findByLegacyReceipt;
export const markMetaSocialWebhookReceiptQueued = lifecycle.markQueued;
export const markMetaSocialWebhookReceiptBlocked = lifecycle.markBlocked;
export const claimMetaSocialWebhookReceipt = lifecycle.claim;
export const renewMetaSocialWebhookReceiptLease = lifecycle.renewLease;
export const markMetaSocialWebhookReceiptProcessed = lifecycle.markProcessed;
export const markMetaSocialWebhookReceiptFailed = lifecycle.markFailed;
export const requeueFailedMetaSocialWebhookReceipt = lifecycle.requeueFailed;
export const markMetaSocialWebhookReceiptDeadLettered = lifecycle.markDeadLettered;
export const createMetaSocialWebhookReceiptReplay = lifecycle.createReplayAttempt;
