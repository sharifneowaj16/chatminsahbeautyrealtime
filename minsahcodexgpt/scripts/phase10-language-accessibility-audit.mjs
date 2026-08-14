#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const variantSelector = read('app/products/[id]/components/VariantSelector.tsx');
const stickyBottomBar = read('app/products/[id]/components/StickyBottomBar.tsx');
const reviewSection = read('app/products/[id]/components/ReviewSection.tsx');
const gallery = read('app/products/[id]/components/ProductGallery.tsx');
const phaseDocExists = fs.existsSync('PHASE10_LANGUAGE_VISUAL_ACCESSIBILITY_POLISH.md');

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('Phase 10 documentation exists', phaseDocExists);
check('Top trust labels are Bengali-first', productClient.includes('কাস্টমার ট্রাস্ট') && productClient.includes('ভেরিফায়েড সিগন্যাল') && productClient.includes('অরিজিনাল গ্যারান্টি'));
check('Trust promise heading is Bengali-first', productClient.includes('ট্রাস্ট ও অরিজিনাল নিশ্চয়তা'));
check('Delivery copy uses Bengali checkout wording', productClient.includes('ডেলিভারি চার্জ চেকআউটে হিসাব হবে'));
check('Product details heading is Bengali-first', productClient.includes('পণ্যের বিস্তারিত') && productClient.includes('ওভারভিউ ও বর্ণনা'));
check('Related products action is Bengali-first', productClient.includes('অপশন দেখে নিন') && productClient.includes('স্টকে আছে'));
check('FBT heading and CTA are Bengali-first', productClient.includes('একসাথে বেশি কেনা হয়') && productClient.includes('নির্বাচিত বান্ডেল কার্টে যোগ করুন'));
check('Recently viewed heading is Bengali-first', productClient.includes('সাম্প্রতিক দেখা পণ্য'));
check('ProductClient interactive links/buttons have focus-visible rings', (productClient.match(/focus-visible:ring-2/g) || []).length >= 5);
check('Accordion summaries have focus-visible state', productClient.includes('marker:hidden focus-visible:outline-none focus-visible:ring-2'));
check('Related cards have focus-visible state', productClient.includes('hover:shadow-md focus-visible:outline-none focus-visible:ring-2'));
check('Variant quantity buttons have Bengali aria labels', variantSelector.includes('aria-label="পরিমাণ কমান"') && variantSelector.includes('aria-label="পরিমাণ বাড়ান"'));
check('Variant option images use object-contain', variantSelector.includes('object-contain p-1'));
check('Variant buttons expose selected/out-of-stock state accessibly', variantSelector.includes('aria-pressed={isSelected}') && variantSelector.includes("স্টক শেষ"));
check('Sticky Buy Now wording is Bengali-first', stickyBottomBar.includes("'অপশন নিয়ে কিনুন'") && stickyBottomBar.includes("'এখনই কিনুন'"));
check('Sticky WhatsApp aria labels are Bengali-friendly', stickyBottomBar.includes('WhatsApp অর্ডারের আগে অপশন নির্বাচন করুন') && stickyBottomBar.includes('WhatsApp-এ অর্ডার করুন'));
check('Sticky actions have focus-visible rings', (stickyBottomBar.match(/focus-visible:ring-2/g) || []).length >= 3);
check('Review verified labels are Bengali-first', reviewSection.includes('ভেরিফায়েড ক্রয়') && reviewSection.includes('ভেরিফায়েড ক্রেতা'));
check('Review show more button has focus-visible state', reviewSection.includes('hover:bg-[#F5E9DC] focus-visible:outline-none'));
check('Gallery aria labels are Bengali-friendly', gallery.includes('ছবি গ্যালারি') && gallery.includes('পণ্যের ছবির thumbnails'));
check('Previous Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));
check('Previous Phase 5 trust audit script still exists', fs.existsSync('scripts/phase5-product-trust-audit.mjs'));
check('Previous Phase 6 details audit script still exists', fs.existsSync('scripts/phase6-product-details-audit.mjs'));
check('Previous Phase 7 FBT audit script still exists', fs.existsSync('scripts/phase7-fbt-audit.mjs'));
check('Previous Phase 8 related audit script still exists', fs.existsSync('scripts/phase8-related-products-audit.mjs'));
check('Previous Phase 9 gallery audit script still exists', fs.existsSync('scripts/phase9-gallery-mobile-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 10 language/accessibility audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
