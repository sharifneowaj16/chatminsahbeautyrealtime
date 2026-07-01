import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    issues.push(`Missing required file: ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireContains(relative, tokens) {
  const text = read(relative);
  if (!text) return;
  for (const token of tokens) {
    if (!text.includes(token)) {
      issues.push(`${relative} missing required Phase 8 token: ${token}`);
    }
  }
}

const phaseDocs = [
  'docs/production/phase-1-payment-bypass-lock.md',
  'docs/production/phase-2-canonical-payment-purchase-contract.md',
  'docs/production/phase-3-meta-catalog-mapping.md',
  'docs/production/phase-4-external-id-alignment.md',
  'docs/production/phase-5-product-analytics-counters.md',
  'docs/production/phase-6-consent-internal-bot-filters.md',
  'docs/production/phase-7-ga4-referral-route-qa.md',
  'docs/production/phase-8-full-qa-regression-locks.md',
  'docs/production/phase-10-telegram-bot-hardening.md',
];

for (const doc of phaseDocs) read(doc);
read('PRODUCTION_QA.md');

requireContains('lib/tracking/full-production-qa-matrix.ts', [
  'FULL_PRODUCTION_QA_MATRIX',
  'QA_LEGACY_PAYMENT_LOCK_VERIFIED',
  'QA_CANONICAL_ONLINE_PURCHASE_VERIFIED',
  'QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED',
  'QA_META_CATALOG_VARIANT_MAPPING_VERIFIED',
  'QA_EXTERNAL_ID_PARITY_VERIFIED',
  'QA_PRODUCT_VIEW_DEDUP_VERIFIED',
  'QA_CONSENT_DENIED_GATE_VERIFIED',
  'QA_INTERNAL_BOT_FILTER_VERIFIED',
  'QA_GA4_PAYMENT_REFERRAL_VERIFIED',
  'QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED',
  'QA_PREDEPLOY_SCRIPTS_VERIFIED',
  'QA_TELEGRAM_BOT_HARDENING_VERIFIED',
  'getFullQaMatrixSummary',
]);

requireContains('lib/tracking/production-qa.ts', [
  'FULL_PRODUCTION_QA_MATRIX',
  'getFullQaMatrixSummary',
  'getQaStepVerification',
  'Required manual QA evidence is not marked verified',
  "blockerCheck(\n          'manual_qa'",
  'manualQaRequiredVerified',
  'manualQaMissingRequired',
]);

requireContains('app/admin/production-qa/page.tsx', [
  'Full Phase 8 QA matrix',
  'ga4_attribution',
  'manualQaRequiredVerified',
  '{step.envKey}=true',
  'Optional evidence URL env',
]);

requireContains('scripts/security-audit.mjs', [
  'assertPhase8FullQaRegressionLocks',
  'phase8-static-contract-check.mjs',
  'FULL_PRODUCTION_QA_MATRIX',
  'qa:predeploy',
]);

const packageJson = JSON.parse(read('package.json') || '{}');
const scripts = packageJson.scripts ?? {};
for (const [scriptName, expected] of Object.entries({
  'audit:security': 'node scripts/security-audit.mjs',
  'qa:production': 'tsx scripts/production-qa.ts',
  'qa:phase8-static': 'node scripts/phase8-static-contract-check.mjs',
  'qa:admin-api-security': 'node scripts/admin-api-security-audit.mjs',
  'qa:predeploy': 'npm run audit:security && npm run qa:phase8-static && npm run qa:admin-api-security && npm run qa:telegram-security && npm run typecheck && npm run build && npm run qa:production',
})) {
  if (scripts[scriptName] !== expected) {
    issues.push(`package.json script ${scriptName} must be exactly: ${expected}`);
  }
}

const matrixText = read('lib/tracking/full-production-qa-matrix.ts');
const requiredQaFlags = (matrixText.match(/envKey:\s*'QA_[A-Z0-9_]+_VERIFIED'/g) ?? []).length;
if (requiredQaFlags < 16) {
  issues.push(`Phase 8 QA matrix should contain broad full-flow coverage; found only ${requiredQaFlags} QA flags.`);
}

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: 9, qaFlags: requiredQaFlags }, null, 2));
