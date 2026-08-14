#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => exists(file) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const add = (name, pass, evidence = '') => checks.push({ name, pass: Boolean(pass), evidence });

const pkgPath = 'package.json';
const evidencePath = 'docs/release/SHOP_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK.md';
const manualChecklistPath = 'docs/qa/PHASE13_FINAL_PRODUCTION_MANUAL_CHECKLIST.md';
const runbookPath = 'docs/production/SHOP_PRODUCTION_DEPLOY_RUNBOOK.md';
const manifestPath = 'docs/release/SHOP_FINAL_RELEASE_MANIFEST_2026_07_07.md';
const reportPath = 'PHASE13_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK_REPORT.md';
const changesPath = 'CHANGES.md';

const pkg = JSON.parse(read(pkgPath));
const release = String(pkg.scripts?.['audit:shop-release'] || '');
const evidence = read(evidencePath);
const checklist = read(manualChecklistPath);
const runbook = read(runbookPath);
const manifest = read(manifestPath);
const report = read(reportPath);
const changes = read(changesPath);

add('Final evidence pack exists', exists(evidencePath), evidencePath);
add('Manual production checklist exists', exists(manualChecklistPath), manualChecklistPath);
add('Production deploy runbook exists', exists(runbookPath), runbookPath);
add('Final release manifest exists', exists(manifestPath), manifestPath);
add('Phase 13 report exists', exists(reportPath), reportPath);
add('Evidence pack documents automated release gate', /npm run audit:shop-release/.test(evidence) && /qa:shop-production-readiness/.test(evidence), evidencePath);
add('Evidence pack documents runtime-only verification', /qa:shop-a11y-runtime/.test(evidence) && /Lighthouse|Core Web Vitals/.test(evidence), evidencePath);
add('Evidence pack includes go\/no-go rule', /Go \/ no-go rule/.test(evidence) && /No unresolved blocker is marked as P0 or P1/.test(evidence), evidencePath);
add('Manual checklist includes mobile filter\/sort verification', /Mobile filter and sort UX/.test(checklist) && /Swipe down closes/.test(checklist), manualChecklistPath);
add('Manual checklist includes Phase 7B discovery checks', /Phase 7B discovery polish/.test(checklist) && /Brand search input/.test(checklist) && /No-result state/.test(checklist), manualChecklistPath);
add('Manual checklist includes runtime accessibility command', /PLAYWRIGHT_BASE_URL/.test(checklist) && /qa:shop-a11y-runtime/.test(checklist), manualChecklistPath);
add('Manual checklist includes SEO and structured data checks', /SEO and structured data/.test(checklist) && /ItemList JSON-LD/.test(checklist), manualChecklistPath);
add('Manual checklist includes performance evidence', /Performance evidence/.test(checklist) && /X-Approx-Payload-Bytes/.test(checklist), manualChecklistPath);
add('Manual checklist includes CRO analytics evidence', /CRO analytics evidence/.test(checklist) && /buy_now_click/.test(checklist) && /intent_only/.test(checklist), manualChecklistPath);
add('Manual checklist includes rollback readiness', /Rollback readiness/.test(checklist) && /Previous stable artifact/.test(checklist), manualChecklistPath);
add('Deploy runbook includes deploy sequence', /Deploy sequence/.test(runbook) && /db:migrate/.test(runbook) && /elasticsearch:reindex/.test(runbook), runbookPath);
add('Deploy runbook includes rollback plan', /Rollback plan/.test(runbook) && /Database rollback/.test(runbook) && /Elasticsearch rollback/.test(runbook), runbookPath);
add('Deploy runbook includes post-deploy evidence archive list', /Post-deploy evidence/.test(runbook) && /Release artifact SHA256/.test(runbook), runbookPath);
add('Manifest documents final artifact naming', /minsah_shop_phase13_final_production_readiness_evidence_pack_full_project\.zip/.test(manifest), manifestPath);
add('Manifest lists all shop phase reports through Phase 13', /PHASE7B_MOBILE_DISCOVERY_RUNTIME_A11Y_REPORT/.test(manifest) && /PHASE12_VISUAL_POLISH_EMPTY_STATES_REPORT/.test(manifest) && /PHASE13_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK_REPORT/.test(manifest), manifestPath);
add('Package registers qa:shop-production-readiness', pkg.scripts?.['qa:shop-production-readiness'] === 'node scripts/shop-production-readiness-audit.mjs', pkgPath);
add('Release gate includes qa:shop-production-readiness before security audit', release.includes('npm run qa:shop-production-readiness') && release.indexOf('qa:shop-production-readiness') < release.indexOf('audit:security'), pkgPath);
add('Runtime accessibility script remains available but not required inside static gate', pkg.scripts?.['qa:shop-a11y-runtime'] === 'playwright test tests/accessibility/shop-mobile.spec.ts', pkgPath);
add('Phase 13 report states no DB migration and no UI behavior change', /does not add a DB migration/.test(report) && /does not change user-facing shop UI/.test(report), reportPath);
add('CHANGES documents Phase 13', /Phase 13/.test(changes) && /Final Production Readiness Evidence Pack/.test(changes), changesPath);

const passed = checks.filter((check) => check.pass).length;
for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}${check.evidence ? ` — ${check.evidence}` : ''}`);
}
console.log(`\nShop production readiness audit: ${passed}/${checks.length} checks passed`);

if (passed !== checks.length) process.exit(1);
