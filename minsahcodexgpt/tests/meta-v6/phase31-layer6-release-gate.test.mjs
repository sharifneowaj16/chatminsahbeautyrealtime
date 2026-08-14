import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root = new URL('../../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));

test('all Layer 6 item evidence and final report exist', () => {
  for (const path of [
    'evidence/phase31-meta-social-crm/08-realtime-facebook-audit.md',
    'evidence/phase31-meta-social-crm/08-realtime-bridge.md',
    ...['6.1','6.2','6.3','6.4','6.5','6.6'].map((id) => `evidence/phase31-meta-social-crm/items/phase31_layer${id}_result.md`),
  ]) assert.equal(exists(path), true, path);
});

test('post-migration item logs contain PASS and no failure marker', () => {
  for (const id of ['6.2','6.3','6.4','6.5']) {
    const log = source(`evidence/phase31-meta-social-crm/logs/phase31_layer${id}_qa.log`);
    assert.match(log, /PASS/);
    assert.doesNotMatch(log, /^not ok/m);
    assert.match(log, /# fail 0/);
  }
});

test('realtime package has independent typecheck and build scripts', () => {
  const pkg = JSON.parse(source('realtime-service/package.json'));
  assert.equal(pkg.scripts.typecheck, 'bash scripts/typecheck.sh');
  assert.equal(pkg.scripts.build, 'bash scripts/build.sh');
});


test('realtime Redis clients are lazy and do not connect at module import time', () => {
  const pubsub = source('realtime-service/src/realtime/pubsub.ts');
  assert.doesNotMatch(pubsub, /^const (subscriber|publisher) = new Redis/m);
  assert.match(pubsub, /let subscriber: Redis \| null = null/);
  assert.match(pubsub, /function createRedisClient/);
  assert.match(pubsub, /getSubscriber\(\)/);
  assert.match(pubsub, /getPublisher\(\)/);
});

test('Second Brain v4 fast workflow is preserved', () => {
  const state = JSON.parse(source('.ai/project-state.json'));
  assert.equal(state.second_brain?.version, '4.0');
  assert.equal(exists('.ai/phase31-execution-manifest.json'), true);
  assert.equal(exists('.ai/FAST_WORKFLOW.md'), true);
  assert.match(source('package.json'), /ai:fast-start/);
});

test('Prisma schema remains at immutable Layer 4/5 SHA-256', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(new URL('prisma/schema.prisma', root))).digest('hex');
  assert.equal(digest, 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
});

test('Second Brain preserves completed Layer 6 and advances to 7.1 or later', () => {
  const state = JSON.parse(source('.ai/project-state.json'));
  const manifest = JSON.parse(source('.ai/phase31-execution-manifest.json'));
  const completedLayer = Number(String(state.checkpoint?.completed_through ?? '').match(/Layer (\d+)/)?.[1] ?? 0);
  const nextItem = Number.parseFloat(String(state.next_item?.id ?? '0'));
  assert.ok(completedLayer >= 6, `completed layer ${completedLayer}`);
  assert.ok(nextItem >= 7.1, `next item ${nextItem}`);
  assert.equal(state.checkpoint?.layer_status, 'PASS');
  assert.equal(manifest.layers?.['6']?.status, 'COMPLETE');
  assert.equal(manifest.layers?.['6']?.items?.find((item) => item.id === '6.6')?.status, 'COMPLETE');
});
