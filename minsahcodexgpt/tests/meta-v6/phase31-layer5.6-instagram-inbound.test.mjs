import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { normalizeInstagramInboundMessage } from '../../lib/meta-platform/domains/instagram/normalize-message.ts';
import { planInstagramInboundSideEffects } from '../../lib/meta-platform/domains/instagram/conversations.ts';
import { getInstagramInboundRuntimeMode } from '../../lib/meta-platform/domains/instagram/feature-flags.ts';

test('inbound normalization validates identities, time and attachments', () => {
  const message = normalizeInstagramInboundMessage({ eventKey:'evt-1',eventType:'MESSAGE',accountId:'acct-1',senderId:'sender-1',recipientId:'acct-1',conversationKey:'conv-1',platformMessageId:'mid-1',direction:'INBOUND',messageType:'TEXT',text:' hello ',sentAt:'2026-07-26T00:00:00Z',correlationId:'corr-1',payloadDigest:'a'.repeat(64),attachments:[{type:'IMAGE',externalId:'att-1',url:'https://example.invalid/image'}] });
  assert.equal(message.text,'hello');
  assert.equal(message.attachments.length,1);
  assert.equal(message.occurredAt,'2026-07-26T00:00:00.000Z');
});

test('duplicate inbound event emits no duplicate media job or realtime event', () => {
  const first=planInstagramInboundSideEffects({messageCreated:true,direction:'INBOUND',participantProfileMissing:true,attachmentCount:2});
  assert.equal(first.emitRealtime,true); assert.equal(first.scheduleAttachments,true);
  const duplicate=planInstagramInboundSideEffects({messageCreated:false,direction:'INBOUND',participantProfileMissing:true,attachmentCount:2});
  assert.deepEqual(duplicate,{emitRealtime:false,scheduleAttachments:false,refreshParticipantProfile:false,deduplicated:true});
});

test('out-of-order persistence does not disable first-message side effects',()=>{
  const plan=planInstagramInboundSideEffects({messageCreated:true,direction:'INBOUND',participantProfileMissing:false,attachmentCount:0});
  assert.equal(plan.emitRealtime,true); assert.equal(plan.scheduleAttachments,false);
});

test('production worker uses domain inbound runtime and rollback is explicit',()=>{
  const worker=fs.readFileSync('workers/meta-instagram.worker.ts','utf8');
  const messages=fs.readFileSync('lib/meta/instagram/messages.ts','utf8');
  assert.match(worker,/processInstagramInboundReceiptProduction/);
  assert.match(worker,/processInstagramInboundReceiptProduction as processInstagramWebhookReceipt/);
  assert.doesNotMatch(worker,/import\s*\{[^}]*processInstagramWebhookReceipt[^}]*\}\s*from\s*['"]@\/lib\/meta\/instagram\/messages['"]/s);
  assert.match(messages,/planInstagramInboundSideEffects/);
  assert.match(messages,/if \(sideEffects\.scheduleAttachments\)/);
  assert.match(messages,/if \(realtimeEvent\)/);
  assert.equal(getInstagramInboundRuntimeMode({}),'DOMAIN');
  assert.equal(getInstagramInboundRuntimeMode({META_PHASE31_INSTAGRAM_INBOUND_RUNTIME:'LEGACY_ROLLBACK'}),'LEGACY_ROLLBACK');
});
