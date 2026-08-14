#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const operationsRoot = 'lib/meta-platform/operations';
const migrationRoot = 'prisma/migrations/20260722220500_add_meta_operation_ledger_outbox';

const expected = [
  `${operationsRoot}/index.ts`, `${operationsRoot}/types.ts`, `${operationsRoot}/payload.ts`,
  `${operationsRoot}/transitions.ts`, `${operationsRoot}/store.ts`, `${operationsRoot}/service.ts`,
  `${operationsRoot}/dispatcher.ts`, `${operationsRoot}/execution.ts`, `${operationsRoot}/in-memory-store.ts`,
  `${operationsRoot}/prisma-store.ts`, `${operationsRoot}/bullmq-publisher.ts`,
  `${migrationRoot}/migration.sql`, `${migrationRoot}/recovery.sql`,
  'tests/meta-v6/phase25-operation-ledger-outbox.test.ts',
  'docs/architecture/meta/ADR-025-operation-ledger-transactional-outbox.md',
  'docs/runbooks/meta-operation-poison-messages.md',
  'docs/release/meta-platform/phase-25-evidence.md',
];
for (const file of expected) check(`${file} exists`, exists(file));

const pkg = JSON.parse(read('package.json'));
check('Phase 25 focused test script exists', pkg.scripts?.['test:meta-v6-phase25'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase25-operation-ledger-outbox.test.ts');
check('Phase 25 audit script exists', pkg.scripts?.['qa:meta-platform-phase25'] === 'node scripts/meta-platform-phase25-audit.mjs');
check('Phase 25 aggregate gate includes tests audit migrations and inventory', ['test:meta-v6-phase25', 'qa:meta-platform-phase25', 'qa:meta-v6-migrations', 'qa:meta-platform-inventory'].every((value) => (pkg.scripts?.['qa:meta-v6-phase25'] ?? '').includes(value)));
check('predeploy runs Phase 25 after Phase 24', (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase25') > (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase24'));

const schema = read('prisma/schema.prisma');
for (const symbol of ['enum MetaOperationStatus', 'enum MetaOperationEventType', 'enum MetaOutboxMessageState', 'model MetaOperation', 'model MetaOperationEvent', 'model MetaOutboxMessage']) {
  check(`Prisma schema contains ${symbol}`, schema.includes(symbol));
}
check('operation idempotency is environment and connection scoped', /@@unique\(\[environment, connectionKey, idempotencyKey\]/.test(schema));
check('one durable command outbox exists per operation', /operationId\s+String\s+@unique/.test(schema));
check('operation schema stores payload version and digest', /payloadType\s+String/.test(schema) && /payloadSchemaVersion\s+Int/.test(schema) && /payloadDigest\s+String/.test(schema));
check('operation schema stores no raw access token or app secret', !/model MetaOperation[\s\S]*?\n}\n/.exec(schema)?.[0].match(/accessToken|appSecret|authorization/i));
check('operation supports linked replay without mutating history', /replayOfOperationId/.test(schema) && /MetaOperationReplay/.test(schema));
check('execution and outbox lease indexes exist', /MetaOperation_execution_lease_idx/.test(schema) && /MetaOutboxMessage_lease_idx/.test(schema));

const migration = read(`${migrationRoot}/migration.sql`);
const recovery = read(`${migrationRoot}/recovery.sql`);
check('migration creates all ledger tables and enums', ['MetaOperationStatus', 'MetaOperationEventType', 'MetaOutboxMessageState', 'MetaOperation', 'MetaOperationEvent', 'MetaOutboxMessage'].every((value) => migration.includes(`"${value}"`)));
check('migration enforces positive versions and bounded attempts', /payload_version_positive/.test(migration) && /attempt_bounds/.test(migration));
check('event rows are append-only at database layer', /MetaOperationEvent_no_update/.test(migration) && /MetaOperationEvent_no_delete/.test(migration) && /append-only/.test(migration));
check('operation immutable fields are database protected', /MetaOperation_protect_immutable_fields/.test(migration) && /payloadDigest/.test(migration) && /immutable fields cannot be changed/.test(migration));
check('outbox routing and payload are database protected', /MetaOutboxMessage_protect_immutable_fields/.test(migration) && /MetaOutboxMessage immutable fields cannot be changed/.test(migration));
check('migration has idempotency and ordered event uniqueness', /MetaOperation_idempotency_scope_key/.test(migration) && /MetaOperationEvent_operation_sequence_key/.test(migration));
check('recovery explicitly removes triggers functions tables and enums', ['DROP TRIGGER', 'DROP FUNCTION', 'DROP TABLE', 'DROP TYPE'].every((value) => recovery.includes(value)));
check('recovery warns against rollback after consumer dependency', /forward-fix migration/.test(recovery));

const payload = read(`${operationsRoot}/payload.ts`);
check('payload type and positive version are validated', /PAYLOAD_TYPE_PATTERN/.test(payload) && /schemaVersion < 1/.test(payload));
check('payload size is bounded', /DEFAULT_MAX_PAYLOAD_BYTES/.test(payload) && /META_PAYLOAD_TOO_LARGE/.test(payload));
check('payload rejects non-JSON and circular data', /META_PAYLOAD_NOT_JSON_SAFE/.test(payload) && /circular reference/.test(payload));
check('payload rejects secret-like fields', /META_PAYLOAD_SECRET_FIELD_FORBIDDEN/.test(payload) && /access\[_-\]\?token/.test(payload));
check('payload digest is stable SHA-256', /stableNormalize/.test(payload) && /createHash\('sha256'\)/.test(payload));
check('codec registry keys exact type and schema version', /`\$\{payload\.type\}@\$\{payload\.schemaVersion\}`/.test(payload) && /META_PAYLOAD_CODEC_NOT_FOUND/.test(payload));

const service = read(`${operationsRoot}/service.ts`);
const store = read(`${operationsRoot}/prisma-store.ts`);
check('service validates and decodes before persistence', service.indexOf('assertMetaVersionedPayload') < service.indexOf('commitWithOperation') && service.indexOf('payloadRegistry.decode') < service.indexOf('commitWithOperation'));
check('Prisma store is server-only', /^import 'server-only';/m.test(store));
check('operation insert occurs before business mutation and outbox insert', store.indexOf('INSERT INTO \"MetaOperation\"') < store.indexOf('businessResult = await businessMutation') && store.indexOf('businessResult = await businessMutation') < store.indexOf('INSERT INTO \"MetaOutboxMessage\"'));
check('operation business mutation and outbox use one transaction', /this\.client\.\$transaction\(async \(tx\)/.test(store) && /implementation: 'PRISMA', raw: tx/.test(store));
check('idempotency conflicts fail closed before duplicate audit mutation', /assertMetaOperationIdempotencyMatch/.test(store) && /META_OPERATION_IDEMPOTENCY_CONFLICT/.test(read(`${operationsRoot}/store.ts`)));
check('duplicate idempotency returns existing before business mutation', store.indexOf('if (!inserted[0])') < store.indexOf('businessResult = await businessMutation'));
check('outbox leasing uses SKIP LOCKED and expiry', /FOR UPDATE(?: OF message)? SKIP LOCKED/.test(store) && /leaseExpiresAt/.test(store));
check('outbox claim is bounded', /Math\.min\(input\.limit \?\? 25, 100\)/.test(store));
check('event sequence is atomically incremented', /nextEventSequence" = "nextEventSequence" \+ 1/.test(store));
check('execution claim supports expired RUNNING lease recovery', /operation\.status === 'RUNNING'/.test(store) && /executionLeaseExpiresAt/.test(store));
check('successful operation duplicate is ignored', /ALREADY_SUCCEEDED/.test(store) && /DUPLICATE_IGNORED/.test(store));
check('operation store contains no provider transport imports', !/transports\/|facebook-nodejs-business-sdk|graph\.facebook/.test(store));

const dispatcher = read(`${operationsRoot}/dispatcher.ts`);
check('dispatcher decodes before queue publish', dispatcher.indexOf('payloadRegistry.decode') < dispatcher.indexOf('publisher.publish'));
check('dispatcher uses operation ID as stable message identity', /messageId: message\.operationId/.test(dispatcher));
check('unsupported payloads quarantine rather than retry', /instanceof MetaPayloadPoisonError/.test(dispatcher) && /quarantineOutbox/.test(dispatcher));
check('queue outage releases durable message', /releaseOutbox/.test(dispatcher) && /META_OPERATION_PUBLISH_FAILED/.test(dispatcher));
check('publish acknowledgement ambiguity is preserved for redispatch', /META_OUTBOX_PUBLISH_ACK_AMBIGUOUS/.test(dispatcher) && /summary\.ambiguous/.test(dispatcher));

const execution = read(`${operationsRoot}/execution.ts`);
check('worker claims operation before decoding/provider handler', execution.indexOf('beginExecution') < execution.indexOf('payloadRegistry.decode') && execution.indexOf('beginExecution') < execution.indexOf('handler.execute'));
check('worker records success and failure through lease token', /completeExecution/.test(execution) && /failExecution/.test(execution) && /leaseToken/.test(execution));
check('handler registry rejects duplicate operation handlers', /META_OPERATION_HANDLER_DUPLICATE_OR_INVALID/.test(execution));

const publisher = read(`${operationsRoot}/bullmq-publisher.ts`);
check('BullMQ publisher is server-only and lazy', /^import 'server-only';/m.test(publisher) && /queue \?\?= new Queue/.test(publisher));
check('BullMQ uses operation ID as job ID', /jobId: message\.messageId/.test(publisher));
check('BullMQ retries are disabled in favor of durable PostgreSQL retry', /attempts: 1/.test(publisher));

const testSource = read('tests/meta-v6/phase25-operation-ledger-outbox.test.ts');
for (const phrase of ['rollback together', 'duplicate business mutation', 'conflicting payload reuse', 'Redis outage', 'unsupported payload versions', 'acknowledgement loss', 'worker crash', 'normal execution']) {
  check(`focused test covers ${phrase}`, testSource.includes(phrase));
}

const serverEntry = read('lib/meta-platform/server.ts');
const publicEntry = read('lib/meta-platform/index.ts');
check('server entry loads Prisma operation store lazily', /import\('\.\/operations\/prisma-store'\)/.test(serverEntry));
check('server entry loads BullMQ runtime lazily', /import\('\.\/operations\/bullmq-publisher'\)/.test(serverEntry));
check('client-safe public entry does not expose Prisma or BullMQ implementation', !/prisma-store|bullmq-publisher/.test(publicEntry));
check('public entry exposes provider-neutral operation data contracts only', /MetaOperationRecord/.test(publicEntry) && /MetaVersionedPayload/.test(publicEntry) && !/MetaOperationService|MetaPayloadCodecRegistry|InMemoryMetaOperationStore/.test(publicEntry));

const allOperationSource = fs.readdirSync(path.join(root, operationsRoot))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => read(`${operationsRoot}/${name}`))
  .join('\n');
check('operation layer performs no Meta provider call', !/facebook-nodejs-business-sdk|graph\.facebook\.com|FacebookAdsApi/.test(allOperationSource));
check('existing CAPI producer is not falsely cut over in Phase 25', !/meta-platform\/operations/.test(read('lib/meta/capi/outbox-repository.ts')));
check('Phase 25 status is not claimed complete', /Phase 25[\s\S]{0,300}READY_FOR_GENERATION/.test(read('phases.md')) && !/Phase 25[\s\S]{0,300}`COMPLETE`/.test(read('phases.md')));
check('ADR defers advanced resilience to Phase 26', /remain Phase 26/.test(read('docs/architecture/meta/ADR-025-operation-ledger-transactional-outbox.md')));
check('ADR defers controlled replay orchestration to Phase 27', /remains Phase 27/.test(read('docs/architecture/meta/ADR-025-operation-ledger-transactional-outbox.md')));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 25 operation ledger audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
