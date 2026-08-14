import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  assertInstagramReplyWriteEnabledAtExecution,
  decideInstagramReplyExecutionAction,
  normalizeInstagramReplyIdempotencyKey,
  normalizeInstagramReplyText,
} from '../../lib/meta-platform/domains/instagram/send-reply.ts';
import { getInstagramOutboundRuntimeMode } from '../../lib/meta-platform/domains/instagram/feature-flags.ts';

test('empty and whitespace-only replies are rejected', () => {
  for (const value of ['', '   ', '\n\t']) assert.throws(() => normalizeInstagramReplyText(value), /INSTAGRAM_REPLY_TEXT_INVALID/);
  assert.equal(normalizeInstagramReplyText(' hello '), 'hello');
  assert.equal(normalizeInstagramReplyIdempotencyKey('reply:key-123'), 'reply:key-123');
});

test('standard replies evaluate the current execution-time kill switch', () => {
  assert.doesNotThrow(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', { META_PLATFORM_INSTAGRAM_WRITES: 'true' }));
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', {}), /META_PLATFORM_INSTAGRAM_WRITES_DISABLED/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', { META_PLATFORM_GLOBAL_KILL_SWITCH: 'true', META_PLATFORM_INSTAGRAM_WRITES: 'true' }), /META_PLATFORM_GLOBAL_KILL_SWITCH_ACTIVE/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', { META_PLATFORM_INSTAGRAM_WRITES: 'false' }), /META_PLATFORM_INSTAGRAM_WRITES_DISABLED/);
});

test('unknown and in-flight provider states require reconciliation instead of retry', () => {
  assert.equal(decideInstagramReplyExecutionAction({ providerStatus: 'UNKNOWN_OUTCOME', reconciliationStatus: null }), 'RECONCILE');
  assert.equal(decideInstagramReplyExecutionAction({ providerStatus: 'PENDING', reconciliationStatus: 'REQUIRED' }), 'RECONCILE');
  assert.equal(decideInstagramReplyExecutionAction({ providerStatus: 'SENDING', reconciliationStatus: null }), 'MARK_UNKNOWN_AND_RECONCILE');
  assert.equal(decideInstagramReplyExecutionAction({ providerStatus: 'SENT', reconciliationStatus: null, providerMessageId: 'mid-1' }), 'DEDUPLICATE_SENT');
});

test('production route and worker use the standard reply domain', () => {
  const route = fs.readFileSync('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts', 'utf8');
  const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  const legacy = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  assert.match(route, /requestInstagramStandardReplyProduction/);
  assert.match(worker, /executeInstagramStandardReplyProduction/);
  assert.match(legacy, /normalizeInstagramReplyText/);
  assert.match(legacy, /decideInstagramReplyExecutionAction/);
  assert.equal(getInstagramOutboundRuntimeMode({}), 'DOMAIN');
  assert.equal(getInstagramOutboundRuntimeMode({ META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME: 'LEGACY_ROLLBACK' }), 'LEGACY_ROLLBACK');
});

test('worker sends unknown writes to reconciliation and does not retry them', () => {
  const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  assert.match(worker, /decision\.reconciliationRequired \|\| decision\.action === 'RECONCILE'/);
  assert.match(worker, /new UnrecoverableError\(`UNKNOWN_WRITE:/);
});
