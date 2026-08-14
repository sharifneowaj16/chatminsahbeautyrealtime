import fs from 'node:fs';

const checks = [];
const check = (name, ok) => { checks.push({ name, ok: Boolean(ok) }); console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`); };
const read = (path) => fs.readFileSync(path, 'utf8');
const worker = read('workers/meta-lead.worker.ts');
const runtime = read('lib/meta-platform/domains/leads/runtime.ts');
const production = read('lib/meta-platform/domains/leads/production.ts');
const formSync = read('lib/meta-platform/domains/leads/form-sync.ts');
const cutover = read('lib/meta-platform/domains/leads/cutover.ts');
const prismaRepo = read('lib/meta-platform/repositories/prisma-leads.ts');
const schema = read('prisma/schema.prisma');

check('Lead process domain exists', fs.existsSync('lib/meta-platform/domains/leads/process-lead.ts'));
check('production worker calls domain runtime dispatch', worker.includes('processMetaLeadReceiptProduction'));
check('manual form sync enqueues canonical processing', worker.includes('syncMetaLeadFormProduction') && formSync.includes('enqueueMetaLeadProcessingJob'));
check('legacy manual fetch path is not worker-authoritative', !worker.includes('fetchFormLeads'));
check('legacy rollback requires explicit feature flag', production.includes('executeMetaLeadCutover') && cutover.includes("mode: 'LEGACY_ROLLBACK'") && cutover.includes('EXPLICIT_LEGACY_ROLLBACK'));
check('domain runtime owns receipt processing orchestration', runtime.includes('export async function processMetaLeadReceipt'));
check('CRM handoff is claimed before execution', runtime.indexOf('claimMetaLeadHandoff') < runtime.indexOf('assignMetaLead(leadId)'));
check('CRM handoff completion is durable', prismaRepo.includes('completeMetaLeadHandoff') && prismaRepo.includes("'COMPLETED'::\"MetaLeadHandoffStatus\""));
check('CRM handoff replay uses existing unique key', schema.includes('@@unique([leadId, destination]') && schema.includes('idempotencyKey String') && schema.includes('@unique'));
check('failure summaries use centralized redaction', read('lib/meta-platform/domains/leads/process-lead.ts').includes('redactMetaLeadSensitiveText'));
check('queue payload only contains references', formSync.includes('providerLeadId: raw.id') && !formSync.includes('field_data:'));
check('Prisma schema unchanged by item', !fs.existsSync('prisma/migrations/phase31_layer5_3'));

const passed = checks.filter((item) => item.ok).length;
console.log(`Layer 5.3 Lead processing audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
