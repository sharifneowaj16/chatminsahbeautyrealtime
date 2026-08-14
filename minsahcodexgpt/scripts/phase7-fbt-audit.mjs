#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const phaseDocExists = fs.existsSync('PHASE7_FREQUENTLY_BOUGHT_TOGETHER_FIX.md');

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('ProductClient imports useCart for bundle add-to-cart', productClient.includes('useCart'));
check('FBT uses bundleProducts derived from frequentlyBoughtTogether', productClient.includes('const bundleProducts = useMemo') && productClient.includes('frequentlyBoughtTogether.slice(0, 4)'));
check('FBT has selected add-on state', productClient.includes('selectedBundleProductIds'));
check('FBT has selectable add-on filtering', productClient.includes('selectableBundleProducts') && productClient.includes('!bundleProduct.hasVariants'));
check('FBT has selected add-on checkbox list', productClient.includes('type="checkbox"') && productClient.includes('Select ${bundleProduct.name} for bundle') || productClient.includes('বান্ডেলের জন্য নির্বাচন করুন'));
check('FBT includes current product row', (productClient.includes('Current product') || productClient.includes('মূল পণ্য')) && productClient.includes('bundleCurrentProductTotal'));
check('FBT calculates bundle total', productClient.includes('const bundleTotal = bundleCurrentProductTotal + bundleAddOnsTotal'));
check('FBT calculates savings', productClient.includes('bundleSavings'));
check('FBT has one-click bundle CTA', (productClient.includes('Selected bundle cart-এ add করুন') || productClient.includes('নির্বাচিত বান্ডেল কার্টে যোগ করুন')) && productClient.includes('handleAddBundleToCart'));
check('FBT blocks missing main variant', productClient.includes('requiresVariantSelection') && productClient.includes('product-variant-selector') && productClient.includes('variant select করুন') || productClient.includes('ভ্যারিয়েন্ট নির্বাচন করুন'));
check('FBT disables variant add-ons with guide', productClient.includes('Variant select দরকার') || productClient.includes('ভ্যারিয়েন্ট দরকার'));
check('FBT disables out-of-stock add-ons with guide', productClient.includes('Stock শেষ') || productClient.includes('স্টক শেষ'));
check('FBT no longer renders CardBuyNowButton inside bundle block', (productClient.indexOf('Selected bundle cart-এ add করুন') > productClient.indexOf('Frequently Bought Together') || productClient.indexOf('নির্বাচিত বান্ডেল কার্টে যোগ করুন') > productClient.indexOf('একসাথে বেশি কেনা হয়')));
check('Phase 7 documentation exists', phaseDocExists);
check('Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));
check('Phase 5 trust audit script still exists', fs.existsSync('scripts/phase5-product-trust-audit.mjs'));
check('Phase 6 details audit script still exists', fs.existsSync('scripts/phase6-product-details-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 7 FBT audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
