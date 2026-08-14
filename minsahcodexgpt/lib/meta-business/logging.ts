import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

function json(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

export async function createMetaSyncLog(input: {
  operation: string;
  resourceId?: string;
  requestData?: unknown;
}) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "MetaBusinessSyncLog"
      ("id", "operation", "resourceId", "status", "itemCount", "requestData", "createdAt")
    VALUES
      (${id}, ${input.operation}, ${input.resourceId ?? null}, 'PROCESSING', 0,
       CAST(${json(input.requestData)} AS JSONB), NOW())
  `;
  return { id };
}

export async function completeMetaSyncLog(input: {
  id: string;
  status: 'SUCCESS' | 'SUBMITTED' | 'FAILED';
  itemCount?: number;
  responseData?: unknown;
  error?: string;
}) {
  await prisma.$executeRaw`
    UPDATE "MetaBusinessSyncLog"
    SET "status" = ${input.status},
        "itemCount" = ${input.itemCount ?? 0},
        "responseData" = CAST(${json(input.responseData)} AS JSONB),
        "error" = ${input.error ?? null},
        "completedAt" = NOW()
    WHERE "id" = ${input.id}
  `;
}

export async function withMetaSyncLog<T>(input: {
  operation: string;
  resourceId?: string;
  requestData?: unknown;
  run: () => Promise<T>;
  count?: (result: T) => number;
  status?: (result: T) => 'SUCCESS' | 'SUBMITTED';
}) {
  const log = await createMetaSyncLog(input);
  try {
    const result = await input.run();
    await completeMetaSyncLog({
      id: log.id,
      status: input.status?.(result) ?? 'SUCCESS',
      itemCount: input.count?.(result) ?? 0,
      responseData: result,
    });
    return result;
  } catch (error) {
    await completeMetaSyncLog({
      id: log.id,
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
