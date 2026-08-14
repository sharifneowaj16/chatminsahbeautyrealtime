#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const phaseDocExists = fs.existsSync('PHASE8_RELATED_PRODUCTS_CLEANUP.md');
const relatedStart = productClient.indexOf('{relatedProducts.length > 0 && (');
const relatedEnd = productClient.indexOf('{bundleProducts.length > 0 && (', relatedStart);
const relatedBlock =
  relatedStart >= 0 && relatedEnd > relatedStart
    ? productClient.slice(relatedStart, relatedEnd)
    : '';

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('Related products block exists', relatedBlock.length > 0);
check('Related products block is a section', relatedBlock.includes('<section') && relatedBlock.includes('aria-labelledby="related-products-heading"'));
check('Related cards link to product detail pages', relatedBlock.includes('href={productPath(relatedProduct)}') || relatedBlock.includes('href={`/products/${relatedProduct.slug}`}'));
check('Related cards use one lightweight details action', relatedBlock.includes('পণ্যটি দেখুন'));
check('Related cards guide variant products to option view', relatedBlock.includes('Option দেখে নিন') || relatedBlock.includes('অপশন দেখে নিন'));
check('Related cards show stock labels', (relatedBlock.includes('Stock আছে') || relatedBlock.includes('স্টকে আছে')) && (relatedBlock.includes('Stock শেষ') || relatedBlock.includes('স্টক শেষ')));
check('Related cards retain discount badge', relatedBlock.includes('relatedDiscount') && relatedBlock.includes('-{relatedDiscount}%'));
check('Related cards use object-contain images to avoid product packaging crop', relatedBlock.includes('object-contain'));
check('Related block does not render CartStepper', !relatedBlock.includes('<CartStepper'));
check('Related block does not render CardBuyNowButton', !relatedBlock.includes('<CardBuyNowButton'));
check('FBT bundle section remains present', (productClient.includes('Frequently Bought Together') || productClient.includes('একসাথে বেশি কেনা হয়')) && (productClient.includes('Selected bundle cart-এ add করুন') || productClient.includes('নির্বাচিত বান্ডেল কার্টে যোগ করুন')));
check('Recently viewed section remains present', productClient.includes('Recently Viewed') || productClient.includes('সাম্প্রতিক দেখা পণ্য'));
check('Phase 8 documentation exists', phaseDocExists);
check('Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));
check('Phase 5 trust audit script still exists', fs.existsSync('scripts/phase5-product-trust-audit.mjs'));
check('Phase 6 details audit script still exists', fs.existsSync('scripts/phase6-product-details-audit.mjs'));
check('Phase 7 FBT audit script still exists', fs.existsSync('scripts/phase7-fbt-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 8 related products audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
