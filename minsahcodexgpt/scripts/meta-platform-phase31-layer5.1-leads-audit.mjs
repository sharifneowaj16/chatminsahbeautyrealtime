import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const evidence = read('evidence/phase31-meta-social-crm/05-leads-legacy-audit.md');
const worker = read('workers/meta-lead.worker.ts');
const service = read('lib/meta/leads/service.ts');
const legacyService = read('lib/meta/leads/legacy-service.ts');
const domainProcess = read('lib/meta-platform/domains/leads/process-lead.ts');
const manual = read('lib/meta-business/leads.ts');
const queue = read('lib/meta-platform/queue/lead-processing-job.ts');
const persistence = read('lib/meta-platform/repositories/prisma-leads.ts');
const schema = read('prisma/schema.prisma');

let passed = 0;
const checks = [];
function check(name, condition) {
  checks.push({ name, condition: Boolean(condition) });
  if (condition) passed += 1;
}

for (const classification of ['MIGRATE', 'WRAP', 'DEPRECATE', 'DELETE_LATER']) {
  check(`audit uses ${classification}`, evidence.includes(`\`${classification}\``));
}
for (const file of fs.readdirSync('lib/meta/leads').filter((name) => name.endsWith('.ts'))) {
  check(`legacy Lead module classified: ${file}`, evidence.includes(`lib/meta/leads/${file}`));
}
check('production worker path mapped', evidence.includes('workers/meta-lead.worker.ts') && worker.includes('processMetaLeadReceipt'));
check('canonical queue reference-only contract mapped', evidence.includes('reference-only') && queue.includes("kind: 'WEBHOOK_RECEIPT'"));
check('canonical processing attempt mapped and retained in domain/rollback ownership', evidence.includes('Processing attempt') && (domainProcess.includes('beginMetaLeadProcessingAttempt') || legacyService.includes('beginMetaLeadProcessingAttempt')) && service.includes('domains/leads/runtime'));
check('canonical transaction and handoff mapped', evidence.includes('one Prisma transaction') && persistence.includes('prisma.$transaction') && persistence.includes('createOrGetMetaLeadHandoff'));
check('manual parallel form-sync path mapped and removed from production authority', evidence.includes('Parallel/legacy path discovered') && manual.includes('LeadgenForm') && !worker.includes('fetchFormLeads') && worker.includes('syncMetaLeadFormProduction'));
check('test-lead isolation gap mapped', evidence.includes('no production test-lead creation service') && schema.includes('isTestLead'));
check('PII custom-field gap mapped', evidence.includes('customFields') && evidence.includes('not acceptable'));
check('5.2-5.4 split frozen', ['### 5.2', '### 5.3', '### 5.4'].every((value) => evidence.includes(value)));
check('5.1 does not request schema change', evidence.includes('Prisma schema changed:** No'));

for (const item of checks) console.log(`[${item.condition ? 'PASS' : 'FAIL'}] ${item.name}`);
console.log(`Layer 5.1 Lead audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
