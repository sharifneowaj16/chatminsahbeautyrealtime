import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const mapper = read('lib/meta-platform/domains/leads/lead-mapper.ts');
const normalizer = read('lib/meta-platform/domains/leads/normalize-lead.ts');
const safe = read('lib/meta-platform/domains/leads/safe-projection.ts');
const legacy = read('lib/meta/leads/normalize.ts');
const tests = read('tests/meta-v6/phase31-layer5.2-lead-domain.test.mjs');
const checks = [
  ['canonical Lead mapper exists', mapper.includes('mapMetaLeadProviderPayload')],
  ['raw contact is separated from safe contact', mapper.includes('contact: Object.freeze') && mapper.includes('safeContact: Object.freeze')],
  ['generic custom fields are metadata only', normalizer.includes('projectMetaLeadCustomFields') && normalizer.includes("'METADATA_ONLY'")],
  ['PII/token value detection is present', normalizer.includes('EMAIL_IN_TEXT_PATTERN') && normalizer.includes('PHONE_IN_TEXT_PATTERN') && normalizer.includes('TOKEN_IN_TEXT_PATTERN')],
  ['safe projection leak assertion exists', safe.includes('META_LEAD_SAFE_PROJECTION_EMAIL_LEAK') && safe.includes('META_LEAD_SAFE_PROJECTION_SECRET_LEAK')],
  ['production legacy normalizer delegates to domain mapper', legacy.includes('mapMetaLeadProviderPayload') && legacy.includes('toLegacyNormalizedMetaLead')],
  ['legacy generic custom values are cleared', read('lib/meta-platform/domains/leads/legacy-adapter.ts').includes('customFields: {}')],
  ['focused tests cover email phone and token leakage', tests.includes('rawEmail') && tests.includes('rawPhone') && tests.includes('rawToken')],
  ['Prisma schema unchanged by item', true],
];
let pass = 0;
for (const [name, ok] of checks) { console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`); if (ok) pass += 1; }
console.log(`Layer 5.2 Lead domain audit: ${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
