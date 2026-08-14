#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const paths = {
  report: 'evidence/phase31-meta-social-crm/08-realtime-facebook-audit.md',
  result: 'evidence/phase31-meta-social-crm/items/phase31_layer6.1_result.md',
  log: 'evidence/phase31-meta-social-crm/logs/phase31_layer6.1_audit.log',
  pubsub: 'realtime-service/src/realtime/pubsub.ts',
};
for (const [label, path] of Object.entries(paths)) check(`${label} historical audit evidence exists`, existsSync(path), path);

const report = read(paths.report);
const result = read(paths.result);
const log = read(paths.log);
const pubsub = read(paths.pubsub);
check('historical audit verdict is preserved', /AUDIT PASS — MIGRATION REQUIRED/.test(report));
check('all RT findings remain documented', /RT-01/.test(report) && /RT-22/.test(report));
check('Items 6.2-6.5 migration map remains documented', ['Item 6.2','Item 6.3','Item 6.4','Item 6.5'].every((value) => report.includes(value)));
check('audit-only change boundary remains explicit', /Runtime implementation: unchanged/.test(result) && /Prisma schema: unchanged/.test(result));
check('exact next item was 6.2', /6\.2 — Realtime normalized event bridge/.test(result));
check('original focused tests recorded 6/6 PASS', /# pass 6/.test(log) && !/# fail [1-9]|not ok \d/i.test(log));
check('original static audit recorded 29/29 PASS', /29\/29 PASS/.test(log) && !/\[FAIL\]/.test(log));
check('verified Layer 5 base checksum is preserved', /1969d2fa2f19ea58fd1ccc5036207f7321c2989177561b8864401515268ae134/.test(log));
check('canonical Prisma schema remains unchanged', sha256('prisma/schema.prisma') === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('post-audit Redis lifecycle is lazy', !/^const (subscriber|publisher) = new Redis/m.test(pubsub) && /function createRedisClient/.test(pubsub));

let passed = 0;
for (const item of checks) {
  console.log(`[${item.ok ? 'PASS' : 'FAIL'}] ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  if (item.ok) passed += 1;
}
console.log(`\nPhase 31 Layer 6.1 historical evidence audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
