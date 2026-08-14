import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const report = read('evidence/phase31-meta-social-crm/08-realtime-facebook-audit.md');
const result = read('evidence/phase31-meta-social-crm/items/phase31_layer6.1_result.md');
const log = read('evidence/phase31-meta-social-crm/logs/phase31_layer6.1_audit.log');

test('6.1 historical audit evidence remains present and immutable in purpose', () => {
  assert.match(report, /AUDIT PASS — MIGRATION REQUIRED/);
  assert.match(report, /RT-01/);
  assert.match(report, /RT-22/);
  assert.match(report, /Item 6\.2 — Realtime normalized event bridge/);
  assert.match(report, /Item 6\.5/);
});

test('6.1 item result records audit-only boundary and exact next item', () => {
  assert.match(result, /Runtime implementation: unchanged/);
  assert.match(result, /Prisma schema: unchanged/);
  assert.match(result, /6\.2 — Realtime normalized event bridge/);
});

test('6.1 executed evidence records all original focused gates as PASS', () => {
  assert.match(log, /# pass 6/);
  assert.match(log, /29\/29 PASS/);
  assert.doesNotMatch(log, /\[FAIL\]|# fail [1-9]|not ok \d/i);
});

test('6.1 evidence is tied to the verified Layer 5 base and canonical schema', () => {
  assert.match(log, /Authoritative base: minsahbeauty_phase31_layer5_complete\.zip/);
  assert.match(log, /1969d2fa2f19ea58fd1ccc5036207f7321c2989177561b8864401515268ae134/);
  assert.equal(sha256('prisma/schema.prisma'), 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
});

test('post-audit source no longer recreates Redis connections at module import time', () => {
  const pubsub = read('realtime-service/src/realtime/pubsub.ts');
  assert.doesNotMatch(pubsub, /^const (subscriber|publisher) = new Redis/m);
  assert.match(pubsub, /function createRedisClient/);
  assert.match(pubsub, /getSubscriber\(\)/);
  assert.match(pubsub, /getPublisher\(\)/);
});

test('historical audit command validates evidence rather than requiring remediated defects', () => {
  const audit = read('scripts/meta-platform-phase31-layer6.1-realtime-facebook-audit.mjs');
  assert.match(audit, /historical audit evidence/);
  assert.doesNotMatch(audit, /registerLocalInboxListener/);
  assert.doesNotMatch(audit, /directFetchCount === 9/);
});
