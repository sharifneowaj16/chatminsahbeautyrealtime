#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const checks = [];
function pass(name) {
  checks.push({ name, ok: true });
  console.log(`✅ ${name}`);
}
function fail(name, details = '') {
  checks.push({ name, ok: false, details });
  console.error(`❌ ${name}${details ? ` — ${details}` : ''}`);
}
function file(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(file(rel));
}
function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}
function includes(rel, needle) {
  return exists(rel) && read(rel).includes(needle);
}
function expect(name, condition, details = '') {
  if (condition) pass(name);
  else fail(name, details);
}
function runScript(rel) {
  const result = spawnSync(process.execPath, [file(rel)], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status === 0) {
    pass(`${rel} passes`);
  } else {
    const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    fail(`${rel} passes`, output.slice(-1200));
  }
}

const phaseDocs = [
  'PHASE1_PRODUCT_PAGE_FIXES.md',
  'PHASE2_STICKY_CTA_FIXES.md',
  'PHASE3_PRODUCT_PAGE_UI_FIXES.md',
  'PHASE4A_DELIVERY_PRICING_FOUNDATION.md',
  'PHASE4B_ADMIN_DELIVERY_OFFER.md',
  'PHASE4C_PRODUCT_DELIVERY_MESSAGE.md',
  'PHASE4D_CART_CHECKOUT_DELIVERY_CALCULATION.md',
  'PHASE4E_ORDER_SAVE_ACCOUNTING.md',
  'PHASE4F_COURIER_SEND_LOGIC.md',
  'PHASE4G_TRACKING_WEBHOOK_SAFETY.md',
  'PHASE4H_ADMIN_REPORTING_NOTIFICATIONS.md',
  'PHASE4I_FINAL_REGRESSION_AND_FULL_ZIP.md',
  'PHASE5_REVIEWS_TRUST_PLACEMENT_POLISH.md',
  'PHASE6_PRODUCT_DETAILS_RESTRUCTURE.md',
  'PHASE7_FREQUENTLY_BOUGHT_TOGETHER_FIX.md',
  'PHASE8_RELATED_PRODUCTS_CLEANUP.md',
  'PHASE9_GALLERY_MOBILE_USABILITY.md',
  'PHASE10_LANGUAGE_VISUAL_ACCESSIBILITY_POLISH.md',
  'PHASE11_FINAL_QA_PRODUCTION_READINESS.md',
];

console.log('\nPhase 11 final production readiness audit\n');

for (const doc of phaseDocs) {
  expect(`${doc} exists`, exists(doc));
}

const previousAuditScripts = [
  'scripts/phase4-delivery-regression-audit.mjs',
  'scripts/phase5-product-trust-audit.mjs',
  'scripts/phase6-product-details-audit.mjs',
  'scripts/phase7-fbt-audit.mjs',
  'scripts/phase8-related-products-audit.mjs',
  'scripts/phase9-gallery-mobile-audit.mjs',
  'scripts/phase10-language-accessibility-audit.mjs',
];
for (const rel of previousAuditScripts) runScript(rel);

const packageJson = JSON.parse(read('package.json'));
expect('package.json pins Node engine >=20.19.0', packageJson.engines?.node === '>=20.19.0');
expect('build script generates Prisma before Next build', packageJson.scripts?.build?.includes('prisma generate') && packageJson.scripts?.build?.includes('next build'));
expect('start script runs prisma migrate deploy before next start', packageJson.scripts?.start?.includes('prisma migrate deploy') && packageJson.scripts?.start?.includes('next start'));
expect('typecheck script generates Prisma before tsc', packageJson.scripts?.typecheck?.includes('prisma generate') && packageJson.scripts?.typecheck?.includes('tsc --noEmit'));
expect('Phase 11 package script exists', packageJson.scripts?.['qa:phase11'] === 'node scripts/phase11-final-production-readiness-audit.mjs');
expect('Product roadmap package script exists', Boolean(packageJson.scripts?.['qa:product-page-roadmap']));

expect('CI workflow exists', exists('.github/workflows/ci.yml'));
expect('CI workflow uses Node 20.19.0', includes('.github/workflows/ci.yml', "NODE_VERSION: '20.19.0'"));
expect('CI workflow runs lint', includes('.github/workflows/ci.yml', 'npm run lint'));
expect('CI workflow runs type check', includes('.github/workflows/ci.yml', 'tsc --noEmit') || includes('.github/workflows/ci.yml', 'npm run typecheck'));
expect('CI workflow runs build', includes('.github/workflows/ci.yml', 'npm run build'));

expect('Delivery pricing migration exists', exists('prisma/migrations/20260705000000_add_delivery_offer_pricing_foundation/migration.sql'));
expect('Prisma schema has Product delivery offer fields', includes('prisma/schema.prisma', 'deliveryOfferEnabled') && includes('prisma/schema.prisma', 'deliveryOfferType') && includes('prisma/schema.prisma', 'deliveryOfferAmount'));
expect('Prisma schema has Order delivery accounting fields', includes('prisma/schema.prisma', 'courierDeliveryCharge') && includes('prisma/schema.prisma', 'deliveryDiscountAmount') && includes('prisma/schema.prisma', 'deliveryPricingSource'));
expect('Delivery pricing helper exists', exists('lib/delivery-pricing.ts'));
expect('Order delivery accounting helper exists', exists('lib/order-delivery-accounting.ts'));
expect('Courier send accounting helper exists', exists('lib/courier-send-accounting.ts'));

const dangerousShippingWriteFiles = [
  'lib/pathao-delivery.ts',
  'app/api/admin/shipping/pathao/send/route.ts',
  'app/api/admin/shipping/steadfast/send/route.ts',
  'app/api/admin/shipping/steadfast/send-bulk/route.ts',
  'app/api/webhook/steadfast/route.ts',
  'app/api/webhooks/pathao/route.ts',
];
for (const rel of dangerousShippingWriteFiles) {
  const source = read(rel);
  expect(`${rel} does not assign updateData.shippingCost`, !/updateData\.shippingCost\s*=/.test(source));
  expect(`${rel} does not map courier fee to shippingCost in update data`, !/delivery_charge[^\n]{0,120}shippingCost|shippingCost[^\n]{0,120}delivery_charge/.test(source));
}

expect('Public tracking route avoids selecting courierDeliveryCharge', !includes('app/api/track/route.ts', 'courierDeliveryCharge'));
expect('Customer account tracking route avoids selecting courierDeliveryCharge', !includes('app/api/orders/[id]/tracking/route.ts', 'courierDeliveryCharge'));
expect('Tracking helper maps customer delivery from shippingCost', includes('lib/courier-tracking.ts', 'customerDeliveryCharge') && includes('lib/courier-tracking.ts', 'shippingCost'));
expect('Admin orders API exposes deliveryAccounting', includes('app/api/admin/orders/route.ts', 'deliveryAccounting'));
expect('Admin order detail API exposes deliveryAccounting', includes('app/api/admin/orders/[id]/route.ts', 'deliveryAccounting'));
expect('Telegram notification includes delivery accounting', includes('lib/telegram-notify.ts', 'Courier actual charge') && includes('lib/telegram-notify.ts', 'Delivery subsidy'));

expect('Gift request feature flag remains off', includes('app/products/[id]/components/ProductClient.tsx', 'const ENABLE_GIFT_REQUEST = false'));
expect('Product gallery avoids object-cover crop', exists('app/products/[id]/components/ProductGallery.tsx') && !includes('app/products/[id]/components/ProductGallery.tsx', 'object-cover'));
expect('Variant selector uses object-contain images', includes('app/products/[id]/components/VariantSelector.tsx', 'object-contain'));
expect('Related products remain lightweight discovery', includes('app/products/[id]/components/ProductClient.tsx', 'অপশন দেখে নিন') && includes('app/products/[id]/components/ProductClient.tsx', 'related-products-heading'));
expect('FBT bundle CTA remains present', includes('app/products/[id]/components/ProductClient.tsx', 'নির্বাচিত বান্ডেল কার্টে যোগ করুন'));

const releaseDoc = read('PHASE11_FINAL_QA_PRODUCTION_READINESS.md');
expect('Phase 11 doc has deploy commands', releaseDoc.includes('npm ci') && releaseDoc.includes('npx prisma migrate deploy') && releaseDoc.includes('npm run build'));
expect('Phase 11 doc has manual delivery test matrix', releaseDoc.includes('Normal delivery') && releaseDoc.includes('Free delivery') && releaseDoc.includes('Mixed cart'));
expect('Phase 11 doc has rollback checklist', releaseDoc.includes('Rollback'));
expect('Phase 11 doc mentions gift option remains off', releaseDoc.includes('Gift option remains off'));

const ignoredDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);
const conflictMarkers = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    const rel = path.relative(root, abs);
    if (/\.(png|jpg|jpeg|webp|gif|ico|zip|pdf|woff2?|ttf|eot)$/i.test(rel)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (/^(<<<<<<<|=======|>>>>>>>)\s?.*$/m.test(content)) {
      conflictMarkers.push(rel);
    }
  }
}
walk(root);
expect('No git conflict markers in text files', conflictMarkers.length === 0, conflictMarkers.join(', '));

const passed = checks.filter((item) => item.ok).length;
const failed = checks.length - passed;
console.log(`\nPhase 11 final production readiness audit: ${passed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
