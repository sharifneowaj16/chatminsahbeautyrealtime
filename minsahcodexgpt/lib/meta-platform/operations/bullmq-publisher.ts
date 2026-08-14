import 'server-only';

import { Queue } from 'bullmq';
import { getMetaJobsRedis } from '@/lib/jobs/connection';
import type { MetaOperationPublisher } from './dispatcher';
import type { MetaOperationDispatchPayload } from './types';

const DEFAULT_QUEUE_NAME = 'meta-platform-operations';
const DEFAULT_JOB_NAME = 'execute-meta-operation';
const BULLMQ_PRIORITY = Object.freeze({ P0: 1, P1: 2, P2: 3, P3: 4, P4: 5 } as const);

export interface MetaOperationQueuePayload extends MetaOperationDispatchPayload {
  readonly schemaVersion: 1;
}

export function createMetaOperationBullMqPublisher(input: {
  readonly queueName?: string;
  readonly jobName?: string;
  readonly queue?: Pick<Queue<MetaOperationQueuePayload>, 'add'>;
} = {}): MetaOperationPublisher {
  const queueName = input.queueName?.trim() || DEFAULT_QUEUE_NAME;
  const jobName = input.jobName?.trim() || DEFAULT_JOB_NAME;
  let queue = input.queue;

  return Object.freeze({
    async publish(message: Parameters<MetaOperationPublisher['publish']>[0]) {
      queue ??= new Queue<MetaOperationQueuePayload>(queueName, {
        connection: getMetaJobsRedis(),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { age: 24 * 60 * 60, count: 5_000 },
          removeOnFail: { age: 14 * 24 * 60 * 60, count: 10_000 },
        },
      });
      const job = await queue.add(
        jobName,
        Object.freeze({ schemaVersion: 1 as const, ...message.payload }),
        {
          jobId: message.messageId,
          priority: BULLMQ_PRIORITY[message.payload.priority],
          attempts: 1,
          removeOnComplete: { age: 24 * 60 * 60, count: 5_000 },
          removeOnFail: { age: 14 * 24 * 60 * 60, count: 10_000 },
        },
      );
      return {
        externalMessageId: String(job.id ?? message.messageId),
        safeDetails: { queueName, jobName },
      };
    },
  });
}
