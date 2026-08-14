import { MetaCircuitBreakerRegistry } from './circuit-breaker';
import { MetaQueueAdmissionController, type MetaQueueDepthProvider } from './admission';
import { MetaRateLimiter } from './rate-limit';
import type { MetaReliabilityHealthSnapshot, MetaReliabilityScope } from './types';

export async function probeMetaReliabilityHealth(input: {
  readonly scope: MetaReliabilityScope;
  readonly circuit: MetaCircuitBreakerRegistry;
  readonly rateLimiter: MetaRateLimiter;
  readonly queueDepthProvider?: MetaQueueDepthProvider;
  readonly now?: Date;
}): Promise<MetaReliabilityHealthSnapshot> {
  const now = input.now ?? new Date();
  const [circuit, rateLimits, queue] = await Promise.all([
    input.circuit.snapshot(input.scope),
    input.rateLimiter.inspect(input.scope, now),
    input.queueDepthProvider?.snapshot(),
  ]);
  const warnings: string[] = [];
  if (circuit.state !== 'CLOSED') warnings.push(`CIRCUIT_${circuit.state}`);
  if (rateLimits.some((budget) => !budget.allowed)) warnings.push('RATE_LIMIT_ACTIVE');
  if (queue && queue.oldestAgeMs && queue.oldestAgeMs > 5 * 60_000) warnings.push('QUEUE_AGE_HIGH');
  return Object.freeze({
    checkedAt: now.toISOString(),
    circuit,
    ...(queue ? { queue } : {}),
    rateLimits: Object.freeze(rateLimits),
    healthy: warnings.length === 0,
    warnings: Object.freeze(warnings),
  });
}

export function createMetaQueueAdmissionHealthController(provider: MetaQueueDepthProvider): MetaQueueAdmissionController {
  return new MetaQueueAdmissionController({ provider });
}
