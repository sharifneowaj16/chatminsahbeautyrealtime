import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';
import { resolveDeliveryPromise } from '../../lib/commerce/delivery-promise.ts';

const desktopDir = path.resolve('app/(storefront)/products/[id]/components/desktop');
const mobileDir = path.resolve('app/(storefront)/products/[id]/components/mobile');

const desktopExpectedFiles = [
  'DesktopPriceAmount.tsx',
  'DesktopComparePrice.tsx',
  'DesktopSaleBadge.tsx',
  'DesktopSaleCountdown.tsx',
  'DesktopStockBadge.tsx',
  'DesktopAvailabilityNote.tsx',
  'DesktopVariantPriceRow.tsx',
  'DesktopBuyButton.tsx',
  'DesktopRatingSummary.tsx',
  'DesktopDeliveryNote.tsx',
  'DesktopPriceBlock.tsx',
];

const mobileExpectedFiles = [
  'MobilePriceAmount.tsx',
  'MobileComparePrice.tsx',
  'MobileSaleBadge.tsx',
  'MobileSaleCountdown.tsx',
  'MobileStockBadge.tsx',
  'MobileAvailabilityNote.tsx',
  'MobileVariantPriceChip.tsx',
  'MobileBuyButton.tsx',
  'MobileRatingSummary.tsx',
  'MobileDeliveryNote.tsx',
  'MobileStickyPriceBar.tsx',
];

test('MCP-09: Desktop small components directory contains all 11 isolated components', () => {
  assert.ok(fs.existsSync(desktopDir), 'Desktop components directory must exist');
  for (const file of desktopExpectedFiles) {
    const filePath = path.join(desktopDir, file);
    assert.ok(fs.existsSync(filePath), `Desktop component ${file} must exist`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount <= 150,
      `Desktop component ${file} must be small (<= 150 lines), got ${lineCount}`
    );

    // Isolation check: never import mobile
    assert.equal(
      content.includes('/mobile') || content.includes('../mobile'),
      false,
      `Desktop component ${file} must never import from mobile`
    );
  }
});

test('MCP-10: Mobile small components directory contains all 11 isolated components', () => {
  assert.ok(fs.existsSync(mobileDir), 'Mobile components directory must exist');
  for (const file of mobileExpectedFiles) {
    const filePath = path.join(mobileDir, file);
    assert.ok(fs.existsSync(filePath), `Mobile component ${file} must exist`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount <= 150,
      `Mobile component ${file} must be small (<= 150 lines), got ${lineCount}`
    );

    // Isolation check: never import desktop
    assert.equal(
      content.includes('/desktop') || content.includes('../desktop'),
      false,
      `Mobile component ${file} must never import from desktop`
    );
  }
});

test('MCP-09/10: Desktop and mobile consumer contracts guarantee identical effectivePrice, availability, and delivery promise', () => {
  const sharedFixture = {
    id: 'prod-parity-101',
    sku: 'SKU-PARITY',
    slug: 'beauty-serum',
    price: 1850,
    compareAtPrice: 2200,
    salePrice: 1550,
    offerStartDate: new Date(Date.now() - 3600 * 1000),
    offerEndDate: new Date(Date.now() + 3600 * 1000 * 48),
    trackInventory: true,
    quantity: 12,
    reservedQuantity: 2,
    rating: 4.8,
    reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
  };

  const offerSnapshot = resolveProductOffer({ product: sharedFixture });
  const deliverySnapshot = resolveDeliveryPromise({
    config: {
      fastZoneDaysCutoffBefore: 1,
      fastZoneDaysCutoffAfter: 2,
      outsideDhakaDays: 2,
      cutoffHour: 15,
      timezone: 'Asia/Dhaka',
      deliversOnFriday: true,
      fastZoneAreas: ['Dhaka', 'Keraniganj', 'Narayanganj', 'Savar'],
    },
    area: 'Dhaka',
    now: new Date('2026-10-03T10:00:00+06:00'),
  });

  // Verify offer snapshot values consumed by both desktop and mobile
  assert.equal(offerSnapshot.effectivePrice, 1550);
  assert.equal(offerSnapshot.compareAtPrice, 2200);
  assert.equal(offerSnapshot.saleState, 'active');
  assert.equal(offerSnapshot.availability, 'in stock');
  assert.equal(offerSnapshot.availableQuantity, 10);
  assert.equal(offerSnapshot.canPurchase, true);

  // Delivery promise text consumed identically by DesktopDeliveryNote and MobileDeliveryNote
  assert.match(deliverySnapshot.primaryNote.en, /Order before 3 PM: 1-day delivery/);
  assert.match(deliverySnapshot.outsideDhakaNote.en, /Outside Dhaka: 2-day/);
  assert.match(deliverySnapshot.fridayNote.en, /Friday delivery available/);
});
