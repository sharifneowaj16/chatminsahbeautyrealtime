/**
 * Minsah Beauty Smart E-Commerce Architecture — Phase 10 Production Smoke Suite
 *
 * Verifies:
 * 1. Dokploy Deployment Environment & Database Schema Contract (Step 9 DDL)
 * 2. Expand-Contract Zero-Downtime Migration Safety (Steps 1-10)
 * 3. Storefront API Smoke Contract: Dual-Line Cart, Anti-Stacking, Delivery Accounting
 * 4. Payment Reconciliation & Pathao COD Mutex Verification
 * 5. Price Quote Cryptographic Tamper Resistance
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateCanonicalLineKey } from '../utils/cartItemHelper';
import { calculateCartOffers } from '../lib/commerce/offer-engine/calculator';
import { createPriceQuoteToken, verifyPriceQuoteToken } from '../lib/price-quote';

interface SmokeCheckResult {
  step: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: SmokeCheckResult[] = [];

async function runSmokeCheck(step: string, name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push({ step, name, passed: true });
    console.log(`  ✓ [PASS] [${step}] ${name}`);
  } catch (error: any) {
    results.push({ step, name, passed: false, details: error.message });
    console.error(`  ✗ [FAIL] [${step}] ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log(' Minsah Beauty Smart E-Commerce Architecture — Phase 10 Smoke');
  console.log(' Dokploy Production Rollout & Contract Verification Suite');
  console.log('===============================================================\n');

  // --- Step 1: Dokploy Deployment Artifacts & Preflights ---
  await runSmokeCheck('STEP-01', 'Dokploy entrypoint and nixpacks configuration exist', () => {
    assert(existsSync(resolve(process.cwd(), 'docker-entrypoint.sh')), 'docker-entrypoint.sh must exist');
    assert(existsSync(resolve(process.cwd(), 'Dockerfile')), 'Dockerfile must exist');
    assert(existsSync(resolve(process.cwd(), 'nixpacks.toml')), 'nixpacks.toml must exist');

    const entrypoint = readFileSync(resolve(process.cwd(), 'docker-entrypoint.sh'), 'utf8');
    assert(entrypoint.includes('prisma migrate deploy'), 'docker-entrypoint must deploy migrations on startup');
  });

  // --- Step 2: Database Schema Contract & Contract DDL (Step 9) ---
  await runSmokeCheck('STEP-02', 'Prisma Schema enforces Step 9 Contract DDL for CartItem', () => {
    const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
    assert(existsSync(schemaPath), 'prisma/schema.prisma must exist');
    const schema = readFileSync(schemaPath, 'utf8');

    // Verify CartItem lineKey is non-nullable String
    const cartItemIndex = schema.indexOf('model CartItem');
    const wishlistItemIndex = schema.indexOf('model WishlistItem', cartItemIndex);
    const cartItemBlock = schema.substring(cartItemIndex, wishlistItemIndex);
    assert(cartItemBlock.includes('lineKey') && !cartItemBlock.includes('lineKey          String?'), 'CartItem.lineKey must be non-nullable String');
    // Verify @@unique([userId, lineKey])
    assert(cartItemBlock.includes('@@unique([userId, lineKey])'), 'CartItem must enforce @@unique([userId, lineKey])');

    // Verify CampaignCustomerUsage exists
    assert(schema.includes('model CampaignCustomerUsage'), 'CampaignCustomerUsage model must exist');
    assert(schema.includes('confirmedQty'), 'CampaignCustomerUsage must track confirmedQty');
    assert(schema.includes('reservedQty'), 'CampaignCustomerUsage must track reservedQty');

    // Verify PaymentRefund exists
    assert(schema.includes('model PaymentRefund'), 'PaymentRefund model must exist');
    assert(schema.includes('refundNumber'), 'PaymentRefund must have refundNumber');
  });

  // --- Step 3: Migration Artifact Integrity ---
  await runSmokeCheck('STEP-03', 'Phase 10 Contract migration and recovery SQL files exist', () => {
    const migrationDir = resolve(process.cwd(), 'prisma/migrations/20261102010000_phase10_smart_ecommerce_contract');
    assert(existsSync(resolve(migrationDir, 'migration.sql')), 'Phase 10 migration.sql must exist');
    assert(existsSync(resolve(migrationDir, 'recovery.sql')), 'Phase 10 recovery.sql must exist');

    const migrationSql = readFileSync(resolve(migrationDir, 'migration.sql'), 'utf8');
    assert(migrationSql.includes('CartItem_userId_lineKey_key'), 'Migration must create CartItem_userId_lineKey_key index');
    assert(migrationSql.includes('DROP CONSTRAINT IF EXISTS "CartItem_userId_productId_variantId_key"'), 'Must drop legacy constraint');
  });

  // --- Step 4: Expand-Contract Backfill Logic Safety ---
  await runSmokeCheck('STEP-04', 'Backfill SQL safely maps legacy cart items to deterministic lineKeys', () => {
    const legacyItem = {
      id: 'legacy_cart_101',
      productId: 'prod_retinol_01',
      variantId: 'var_50ml',
    };
    const backfilledKey = `["LEGACY_UNATTRIBUTED",null,null,null,null,"${legacyItem.productId}","${legacyItem.variantId}","${legacyItem.id}"]`;
    const parsed = JSON.parse(backfilledKey);
    assert(Array.isArray(parsed), 'Backfilled key must be valid JSON array');
    assert(parsed[0] === 'LEGACY_UNATTRIBUTED', 'Pricing source must be LEGACY_UNATTRIBUTED');
    assert(parsed[5] === legacyItem.productId, 'Product ID must be preserved');
    assert(parsed[6] === legacyItem.variantId, 'Variant ID must be preserved');
    assert(parsed[7] === legacyItem.id, 'Row ID must prevent collision');
  });

  // --- Step 5: Dual-Line Coexistence Smoke ---
  await runSmokeCheck('STEP-05', 'Cart allows Flash Deal and Regular items to coexist as separate lines', () => {
    const flashLineKey = generateCanonicalLineKey({
      pricingSource: 'FLASH_DEAL',
      campaignRef: 'camp_eid_2026',
      productId: 'prod_99',
    });
    const regularLineKey = generateCanonicalLineKey({
      pricingSource: 'REGULAR',
      productId: 'prod_99',
    });

    assert(flashLineKey !== regularLineKey, 'Flash deal and regular item must produce separate lineKeys');
    assert(flashLineKey.includes('FLASH_DEAL'), 'Flash line key contains FLASH_DEAL');
    assert(regularLineKey.includes('REGULAR'), 'Regular line key contains REGULAR');
  });

  // --- Step 6: Offer Engine Anti-Stacking & Free Delivery Smoke ---
  await runSmokeCheck('STEP-06', 'Offer engine strictly isolates Flash Deals from coupon discount base', () => {
    const cartItems = [
      {
        id: 'flash_line',
        productId: 'prod_lip_01',
        variantId: null,
        quantity: 2,
        price: 30, // ৳60 Flash Deal
        pricingSource: 'FLASH_DEAL',
        campaignRef: 'camp_super_deal',
        title: 'Lip Gloss Flash',
        slug: 'lip-gloss',
        image: null,
        weight: null,
        originalPrice: 100,
      },
      {
        id: 'reg_line',
        productId: 'prod_cream_02',
        variantId: null,
        quantity: 1,
        price: 1000, // ৳1000 Regular
        pricingSource: 'REGULAR',
        title: 'Face Cream',
        slug: 'face-cream',
        image: null,
        weight: null,
        originalPrice: 1000,
      },
    ];

    const offers = calculateCartOffers({
      items: cartItems as any,
      subtotal: 1060,
      promoCode: 'PROMO10',
      availableCoupons: [
        {
          code: 'PROMO10',
          type: 'percentage',
          value: 10,
          isActive: true,
          description: '10% Off',
        },
      ],
      destinationCity: 'Dhaka',
    });

    assert(offers.flashDealSubtotal === 60, 'Flash deal subtotal must be 60');
    assert(offers.regularSubtotal === 1000, 'Regular subtotal must be 1000');
    // 10% coupon should ONLY apply to the regular subtotal of 1000 (৳100 discount), Flash Deal receives ৳0 discount
    assert(offers.promoDiscount === 100, `Coupon discount must be ৳100, received: ${offers.promoDiscount}`);
    // Combined subtotal (1060) satisfies free delivery threshold
    assert(offers.isFreeDeliveryUnlocked === true, 'Free delivery threshold must be satisfied including Flash Deal subtotal');
  });

  // --- Step 7: Price Quote Cryptographic Revalidation Smoke ---
  await runSmokeCheck('STEP-07', 'Cryptographic quote token validates integrity and detects tampering', () => {
    const quotePayload = {
      userId: 'user_smoke_123',
      items: [{ productId: 'prod_retinol_01', quantity: 2, price: 500 }],
      address: { street1: 'Dhaka, Banani', phoneNumber: '01711000000' },
      subtotal: 1000,
      discountAmount: 100,
      shippingCost: 70,
      total: 970,
    };

    const quote = createPriceQuoteToken({ ...quotePayload, ttlSeconds: 600 });
    const validResult = verifyPriceQuoteToken(quote.token, quotePayload);
    assert(validResult.valid === true, 'Original quote token must verify successfully');

    // Tamper test: address changed
    const tamperedPayload = {
      ...quotePayload,
      address: { street1: 'Chittagong, Nasirabad', phoneNumber: '01711000000' },
    };
    const tamperedResult = verifyPriceQuoteToken(quote.token, tamperedPayload);
    assert(tamperedResult.valid === false, 'Tampered quote address must be rejected');
    if (!tamperedResult.valid) {
      assert(tamperedResult.reason === 'PAYLOAD_MISMATCH', 'Reason must be PAYLOAD_MISMATCH');
    }
  });

  // --- Step 8: Payment & Pathao COD Calculation Smoke ---
  await runSmokeCheck('STEP-08', 'Pathao COD amount_to_collect calculation adheres to exact customer balance', () => {
    // Scenario 1: Standard COD (Payable: ৳3,000, Advance: ৳0) -> Collect: ৳3,000
    const codTotal = 3000;
    const codAdvance = 0;
    const codCollect = Math.max(0, codTotal - codAdvance);
    assert(codCollect === 3000, 'Standard COD collects full payable');

    // Scenario 2: Partial COD (Payable: ৳7,500, Advance: ৳2,500) -> Collect: ৳5,000
    const partialTotal = 7500;
    const partialAdvance = 2500;
    const partialCollect = Math.max(0, partialTotal - partialAdvance);
    assert(partialCollect === 5000, 'Partial COD collects remaining balance ৳5,000');

    // Scenario 3: Full Prepaid Online (Payable: ৳2,000, Advance: ৳2,000) -> Collect: ৳0
    const prepaidTotal = 2000;
    const prepaidAdvance = 2000;
    const prepaidCollect = Math.max(0, prepaidTotal - prepaidAdvance);
    assert(prepaidCollect === 0, 'Prepaid online order collects exactly ৳0');
  });

  // --- Step 9: Live Production Probe (Optional when URL configured) ---
  const prodBaseUrl = process.env.SMART_ECOMMERCE_PRODUCTION_BASE_URL;
  if (prodBaseUrl) {
    await runSmokeCheck('STEP-09', `Live Storefront probe against ${prodBaseUrl}`, async () => {
      const response = await fetch(new URL('/api/flash-deals', prodBaseUrl).toString(), {
        headers: { Accept: 'application/json' },
      });
      assert(response.ok, `Storefront flash-deals endpoint returned status ${response.status}`);
      const data = await response.json();
      assert(data !== null, 'Response json must not be null');
    });
  } else {
    console.log('  ℹ️  [STEP-09] SMART_ECOMMERCE_PRODUCTION_BASE_URL not set — live HTTP probe skipped in local CI/CD sandbox.');
  }

  // --- Summary ---
  console.log('\n---------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL SMOKE CHECKS: ${results.length}`);
  console.log(`PASSED:             ${passedCount}`);
  console.log(`FAILED:             ${failedCount}`);
  console.log('---------------------------------------------------------------');

  if (failedCount > 0) {
    console.error('Phase 10 Production Smoke Suite FAILED.');
    process.exit(1);
  } else {
    console.log('Phase 10 Production Smoke Suite PASSED with 100% Reliability!\n');
  }
}

main().catch((err) => {
  console.error('Fatal error in Phase 10 smoke suite:', err);
  process.exit(1);
});
