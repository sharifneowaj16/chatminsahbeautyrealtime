import 'server-only';

import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { getMetaJobsRedis } from '@/lib/jobs/connection';
import type { MetaCircuitPermit, MetaCircuitSnapshot, MetaRateLimitBudget } from './types';
import type { MetaCircuitStateStore } from './circuit-breaker';
import type { MetaRateLimitStateStore } from './rate-limit';

const CIRCUIT_ACQUIRE = `
local state = redis.call('HGET', KEYS[1], 'state') or 'CLOSED'
local failures = tonumber(redis.call('HGET', KEYS[1], 'failures') or '0')
local openUntil = tonumber(redis.call('HGET', KEYS[1], 'openUntil') or '0')
local probeUntil = tonumber(redis.call('HGET', KEYS[1], 'probeUntil') or '0')
if state == 'CLOSED' then
  return {1, state, failures, openUntil, '', probeUntil}
end
if state == 'OPEN' and openUntil > tonumber(ARGV[1]) then
  return {0, state, failures, openUntil, '', probeUntil}
end
if state == 'HALF_OPEN' and probeUntil > tonumber(ARGV[1]) then
  return {0, state, failures, openUntil, redis.call('HGET', KEYS[1], 'probeToken') or '', probeUntil}
end
redis.call('HSET', KEYS[1], 'state', 'HALF_OPEN', 'probeToken', ARGV[2], 'probeUntil', tonumber(ARGV[1]) + tonumber(ARGV[3]), 'updatedAt', ARGV[1])
redis.call('PEXPIRE', KEYS[1], math.max(tonumber(ARGV[3]) * 4, 60000))
return {1, 'HALF_OPEN', failures, openUntil, ARGV[2], tonumber(ARGV[1]) + tonumber(ARGV[3])}
`;

const CIRCUIT_SUCCESS = `
local state = redis.call('HGET', KEYS[1], 'state') or 'CLOSED'
local token = redis.call('HGET', KEYS[1], 'probeToken') or ''
if state == 'HALF_OPEN' and token ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

const CIRCUIT_FAILURE = `
local state = redis.call('HGET', KEYS[1], 'state') or 'CLOSED'
local token = redis.call('HGET', KEYS[1], 'probeToken') or ''
if state == 'HALF_OPEN' and token ~= ARGV[1] then return 0 end
local failures = tonumber(redis.call('HGET', KEYS[1], 'failures') or '0') + 1
local shouldOpen = state == 'HALF_OPEN' or failures >= tonumber(ARGV[3])
if shouldOpen then
  local openUntil = tonumber(ARGV[2]) + tonumber(ARGV[4])
  redis.call('HSET', KEYS[1], 'state', 'OPEN', 'failures', failures, 'openedAt', ARGV[2], 'openUntil', openUntil, 'probeToken', '', 'probeUntil', 0, 'updatedAt', ARGV[2])
  redis.call('PEXPIRE', KEYS[1], math.max(tonumber(ARGV[4]) * 4, 60000))
else
  redis.call('HSET', KEYS[1], 'state', 'CLOSED', 'failures', failures, 'updatedAt', ARGV[2])
end
return 1
`;

const RATE_CONSUME = `
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens') or capacity)
local updatedAt = tonumber(redis.call('HGET', KEYS[1], 'updatedAt') or now)
local retryAt = tonumber(redis.call('HGET', KEYS[1], 'retryAt') or '0')
if retryAt > now then return {0, tokens, retryAt, 1} end
tokens = math.min(capacity, tokens + math.max(0, now - updatedAt) / 1000 * refill)
local allowed = 0
local nextRetry = 0
if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
else
  nextRetry = now + math.ceil((cost - tokens) / refill * 1000)
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'updatedAt', now, 'capacity', capacity, 'retryAt', 0)
redis.call('PEXPIRE', KEYS[1], 86400000)
return {allowed, tokens, nextRetry, 0}
`;

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function circuitKey(prefix: string, key: string): string {
  return `${prefix}:circuit:${key}`;
}

function rateKey(prefix: string, key: string): string {
  return `${prefix}:rate:${key}`;
}

export class RedisMetaReliabilityStateStore implements MetaCircuitStateStore, MetaRateLimitStateStore {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(input: { readonly redis?: Redis; readonly prefix?: string } = {}) {
    this.redis = input.redis ?? getMetaJobsRedis();
    this.prefix = input.prefix?.trim() || 'meta:reliability:v1';
  }

  async get(key: string): Promise<MetaCircuitSnapshot> {
    const values = await this.redis.hgetall(circuitKey(this.prefix, key));
    const now = new Date();
    const state = values.state === 'OPEN' || values.state === 'HALF_OPEN' ? values.state : 'CLOSED';
    return Object.freeze({
      key,
      state,
      consecutiveFailures: number(values.failures),
      ...(number(values.openedAt) ? { openedAt: new Date(number(values.openedAt)).toISOString() } : {}),
      ...(number(values.openUntil) ? { openUntil: new Date(number(values.openUntil)).toISOString() } : {}),
      ...(values.probeToken ? { probeLeaseToken: values.probeToken } : {}),
      ...(number(values.probeUntil) ? { probeLeaseExpiresAt: new Date(number(values.probeUntil)).toISOString() } : {}),
      updatedAt: number(values.updatedAt) ? new Date(number(values.updatedAt)).toISOString() : now.toISOString(),
    });
  }

  async acquire(input: { readonly key: string; readonly now: Date; readonly probeOwner: string; readonly probeLeaseMs: number }): Promise<{ readonly permit: MetaCircuitPermit | null; readonly snapshot: MetaCircuitSnapshot }> {
    const token = `${input.probeOwner}:${randomUUID()}`;
    const result = asArray(await this.redis.eval(CIRCUIT_ACQUIRE, 1, circuitKey(this.prefix, input.key), input.now.getTime(), token, input.probeLeaseMs));
    const allowed = number(result[0]) === 1;
    const state = result[1] === 'HALF_OPEN' ? 'HALF_OPEN' : result[1] === 'OPEN' ? 'OPEN' : 'CLOSED';
    const snapshot: MetaCircuitSnapshot = Object.freeze({
      key: input.key,
      state,
      consecutiveFailures: number(result[2]),
      ...(number(result[3]) ? { openUntil: new Date(number(result[3])).toISOString() } : {}),
      ...(String(result[4] ?? '') ? { probeLeaseToken: String(result[4]) } : {}),
      ...(number(result[5]) ? { probeLeaseExpiresAt: new Date(number(result[5])).toISOString() } : {}),
      updatedAt: input.now.toISOString(),
    });
    const permit = allowed
      ? Object.freeze({ key: input.key, state: state === 'HALF_OPEN' ? 'HALF_OPEN' as const : 'CLOSED' as const, ...(state === 'HALF_OPEN' ? { probeLeaseToken: token } : {}) })
      : null;
    return { permit, snapshot };
  }

  async success(input: { readonly key: string; readonly permit: MetaCircuitPermit; readonly now: Date }): Promise<MetaCircuitSnapshot> {
    await this.redis.eval(CIRCUIT_SUCCESS, 1, circuitKey(this.prefix, input.key), input.permit.probeLeaseToken ?? '');
    return Object.freeze({ key: input.key, state: 'CLOSED' as const, consecutiveFailures: 0, updatedAt: input.now.toISOString() });
  }

  async failure(input: { readonly key: string; readonly permit: MetaCircuitPermit; readonly now: Date; readonly failureThreshold: number; readonly openDurationMs: number }): Promise<MetaCircuitSnapshot> {
    await this.redis.eval(CIRCUIT_FAILURE, 1, circuitKey(this.prefix, input.key), input.permit.probeLeaseToken ?? '', input.now.getTime(), input.failureThreshold, input.openDurationMs);
    return this.get(input.key);
  }

  async forceOpen(input: { readonly key: string; readonly now: Date; readonly openDurationMs: number }): Promise<MetaCircuitSnapshot> {
    const key = circuitKey(this.prefix, input.key);
    await this.redis.hset(key, {
      state: 'OPEN',
      failures: '1',
      openedAt: String(input.now.getTime()),
      openUntil: String(input.now.getTime() + input.openDurationMs),
      probeToken: '',
      probeUntil: '0',
      updatedAt: String(input.now.getTime()),
    });
    await this.redis.pexpire(key, Math.max(60_000, input.openDurationMs * 4));
    return this.get(input.key);
  }

  async consume(input: { readonly key: string; readonly now: Date; readonly capacity: number; readonly refillPerSecond: number; readonly cost: number }): Promise<MetaRateLimitBudget> {
    const result = asArray(await this.redis.eval(RATE_CONSUME, 1, rateKey(this.prefix, input.key), input.now.getTime(), input.capacity, input.refillPerSecond, input.cost));
    const retryAt = number(result[2]);
    return Object.freeze({
      key: input.key,
      allowed: number(result[0]) === 1,
      remaining: Math.max(0, Math.floor(number(result[1]))),
      limit: input.capacity,
      ...(retryAt ? { retryAt: new Date(retryAt).toISOString() } : {}),
      source: number(result[3]) === 1 ? 'PROVIDER_COOLDOWN' as const : 'LOCAL_BUCKET' as const,
    });
  }

  async blockUntil(input: { readonly key: string; readonly retryAt: Date; readonly now: Date }): Promise<void> {
    const key = rateKey(this.prefix, input.key);
    const current = number(await this.redis.hget(key, 'retryAt'));
    await this.redis.hset(key, { retryAt: String(Math.max(current, input.retryAt.getTime())), updatedAt: String(input.now.getTime()) });
    await this.redis.pexpire(key, Math.max(60_000, input.retryAt.getTime() - input.now.getTime() + 60_000));
  }

  async inspect(key: string, now = new Date()): Promise<MetaRateLimitBudget> {
    const values = await this.redis.hgetall(rateKey(this.prefix, key));
    const retryAt = number(values.retryAt);
    return Object.freeze({
      key,
      allowed: !retryAt || retryAt <= now.getTime(),
      remaining: Math.max(0, Math.floor(number(values.tokens))),
      limit: number(values.capacity),
      ...(retryAt > now.getTime() ? { retryAt: new Date(retryAt).toISOString() } : {}),
      source: retryAt > now.getTime() ? 'PROVIDER_COOLDOWN' as const : 'LOCAL_BUCKET' as const,
    });
  }
}
