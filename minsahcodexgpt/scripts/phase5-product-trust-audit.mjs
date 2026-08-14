#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const reviewSection = read('app/products/[id]/components/ReviewSection.tsx');
const phaseDocExists = fs.existsSync('PHASE5_REVIEWS_TRUST_PLACEMENT_POLISH.md');

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('ProductClient has top trust snapshot', productClient.includes('TopTrustSnapshot'));
check('ProductClient renders top trust snapshot before variant section', productClient.indexOf('<TopTrustSnapshot') < productClient.indexOf('<VariantSelector'));
check('ProductClient has trust promise card', productClient.includes('TrustPromiseCard'));
check('ProductClient renders trust promise before review section', productClient.indexOf('<TrustPromiseCard') < productClient.indexOf('id="product-reviews"'));
check('Gift feature flag remains off', productClient.includes('const ENABLE_GIFT_REQUEST = false;'));
check('ReviewSection has improved empty state', reviewSection.includes('published review নেই'));
check('ReviewSection shows verified purchase badge', reviewSection.includes('Verified purchase') || reviewSection.includes('ভেরিফায়েড ক্রয়'));
check('ReviewSection shows verified buyer count', reviewSection.includes('verified buyer') || reviewSection.includes('ভেরিফায়েড ক্রেতা'));
check('ReviewSection uses rating distribution for bars', reviewSection.includes('rating.distribution[star]'));
check('ReviewSection positive percentage uses rating distribution', reviewSection.includes('rating.distribution[5]') && reviewSection.includes('rating.distribution[4]'));
check('Phase 5 documentation exists', phaseDocExists);
check('Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 5 product trust audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
