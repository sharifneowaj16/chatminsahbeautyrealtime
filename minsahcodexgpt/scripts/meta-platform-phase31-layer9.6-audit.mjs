#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.6-realtime-admin.test.mjs';
const tests = read(testFile);
const realtimePackage = json('realtime-service/package.json');
const realtimeApp = read('realtime-service/src/app.ts');
const realtimeContract = read('packages/meta-realtime-contract/src/index.ts');
const eventWindow = read('realtime-service/src/realtime/event-window.ts');
const jobsRoute = read('app/api/admin/meta/jobs/route.ts');
const healthRoute = read('app/api/admin/meta/health/route.ts');
const correlationRoute = read('app/api/admin/meta/correlations/[correlationId]/route.ts');
const adminContracts = read('lib/meta-platform/admin/contracts.ts');

assert.equal(fs.existsSync(testFile), true);
assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.6'], 'node --experimental-strip-types --test tests/meta-v6/phase31-layer9.6-realtime-admin.test.mjs');
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.6'], 'node scripts/meta-platform-phase31-layer9.6-audit.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.6'], 'npm run test:meta-v6-phase31-layer9.6 && npm run qa:meta-platform-phase31-layer9.6 && npm run typecheck:phase31-layer6:realtime && npm run build:phase31-layer6:realtime && npm run qa:phase31-meta-realtime && npm run qa:phase31-meta-admin');
assert.equal(realtimePackage.scripts.typecheck, 'bash scripts/typecheck.sh');
assert.equal(realtimePackage.scripts.build, 'bash scripts/build.sh');
assert.match(execution.current_item, /^(?:9\.6|9\.[7-8])$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.6')?.schema_change_expected, false);

for (const phrase of [
  'realtime independent typecheck and build use the standalone service contract',
  'websocket normalized payload rejects content, secrets and provider URLs',
  'duplicate websocket events are suppressed and late events are marked out of order',
  'retry and dead-letter ownership remains singular and replay-safe',
  'realtime and admin token-health ownership is aligned without exposing credentials',
  'admin receipt trace preserves receipt, correlation, source and replay relationships',
  'admin blocked reason is explicit, stable and safely redacted',
  'admin permission health includes scoped remediation and requires ops-view authorization',
  'admin dead-letter visibility is bounded, sanitized and approval-aware',
  'admin replay authorization blocks cross-site requests and requires audited approval',
  'sensitive-data redaction fails closed across admin DTO and realtime contracts',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.match(realtimeApp, /websocketContract: 'minsah-inbox-v1'/);
assert.match(realtimeApp, /retryOwner: cutover\.retryOwner/);
assert.match(realtimeApp, /tokenHealthOwner/);
assert.match(realtimeContract, /FORBIDDEN_KEYS/);
assert.match(eventWindow, /DUPLICATE_EVENT/);
assert.match(jobsRoute, /requireAdminMutationPermission/);
assert.match(jobsRoute, /approvalId/);
assert.match(healthRoute, /META_OPS_VIEW/);
assert.match(healthRoute, /assertMetaAdminSafeDto/);
assert.match(correlationRoute, /getMetaCorrelationTimeline/);
assert.match(adminContracts, /META_ADMIN_DTO_SENSITIVE_KEY/);
assert.match(adminContracts, /META_ADMIN_DTO_SECRET_LEAK/);

assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.6 realtime/admin audit: PASS');
console.log('- independent realtime typecheck/build contract: covered and executed by the gate');
console.log('- normalized WebSocket, duplicate handling, retry and health ownership: covered');
console.log('- admin trace, blocked reason, health, dead-letter and replay authorization: covered');
console.log('- sensitive-data redaction: covered');
console.log('- live Redis/BullMQ interruption and Meta provider evidence: deferred to later Layer 9 gates');
console.log('- Prisma schema change: NONE');
