import 'server-only';
import { getMetaJobsRedis } from './connection';
import { getMetaQueue } from './queues';
import { META_QUEUE_NAMES, type MetaQueueName } from './job-types';

const QUEUES = Object.values(META_QUEUE_NAMES);

export async function getMetaQueueHealth() {
  const redis = getMetaJobsRedis();
  const queues = await Promise.all(QUEUES.map(async (queueName) => {
    const queue = getMetaQueue(queueName);
    const [counts, jobs, heartbeat] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed', 'paused'),
      queue.getJobs(['waiting', 'delayed'], 0, 0, true),
      redis.get(`meta:v6:worker:${queueName}`),
    ]);
    const oldest = jobs[0];
    return {
      queueName,
      counts,
      oldestJobAgeMs: oldest?.timestamp ? Math.max(0, Date.now() - oldest.timestamp) : 0,
      workerHeartbeatAt: heartbeat,
      workerHealthy: Boolean(heartbeat && Date.now() - Date.parse(heartbeat) < 60_000),
    };
  }));
  return { checkedAt: new Date().toISOString(), queues };
}

export function isKnownMetaQueue(value: string): value is MetaQueueName {
  return (Object.values(META_QUEUE_NAMES) as string[]).includes(value);
}
