import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';
import { resolveProductAvailability } from '../../lib/commerce/product-availability.ts';
import { resolveProductRating } from '../../lib/commerce/product-rating.ts';

test('MCP-01: expired sale reverts effectivePrice to regular price', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const product = {
    id: 'prod-1',
    sku: 'SKU-001',
    price: 1000,
    compareAtPrice: 1200,
    salePrice: 800,
    offerStartDate: new Date('2026-09-01T00:00:00Z'),
    offerEndDate: new Date('2026-10-01T00:00:00Z'), // expired 2 days ago
    quantity: 10,
    trackInventory: true,
    isActive: true,
  };

  const offer = resolveProductOffer({ product, now });
  assert.equal(offer.regularPrice, 1000);
  assert.equal(offer.effectivePrice, 1000);
  assert.equal(offer.saleState, 'expired');
  assert.equal(offer.salePrice, null);
  assert.equal(offer.compareAtPrice, 1200);
});

test('MCP-01: future sale keeps effectivePrice as regular price', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const product = {
    id: 'prod-1',
    sku: 'SKU-001',
    price: 1000,
    salePrice: 800,
    offerStartDate: new Date('2026-10-10T00:00:00Z'), // future
    offerEndDate: new Date('2026-10-20T00:00:00Z'),
    quantity: 10,
    trackInventory: true,
    isActive: true,
  };

  const offer = resolveProductOffer({ product, now });
  assert.equal(offer.regularPrice, 1000);
  assert.equal(offer.effectivePrice, 1000);
  assert.equal(offer.saleState, 'future');
  assert.equal(offer.salePrice, null);
});

test('MCP-01: active sale applies salePrice to effectivePrice and sets saleEndsAt', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const product = {
    id: 'prod-1',
    sku: 'SKU-001',
    price: 1000,
    compareAtPrice: 1200,
    salePrice: 750,
    offerStartDate: new Date('2026-10-01T00:00:00Z'),
    offerEndDate: new Date('2026-10-05T00:00:00Z'),
    quantity: 5,
    trackInventory: true,
    isActive: true,
  };

  const offer = resolveProductOffer({ product, now });
  assert.equal(offer.regularPrice, 1000);
  assert.equal(offer.effectivePrice, 750);
  assert.equal(offer.salePrice, 750);
  assert.equal(offer.saleState, 'active');
  assert.equal(offer.saleEndsAt, '2026-10-05T00:00:00.000Z');
  assert.equal(offer.currency, 'BDT');
});

test('MCP-01: sale without dates is invalid and falls back to regular price', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const product = {
    id: 'prod-1',
    sku: 'SKU-001',
    price: 1000,
    salePrice: 800,
    offerStartDate: null,
    offerEndDate: null,
    quantity: 5,
    trackInventory: true,
    isActive: true,
  };

  const offer = resolveProductOffer({ product, now });
  assert.equal(offer.effectivePrice, 1000);
  assert.equal(offer.saleState, 'invalid');
  assert.equal(offer.salePrice, null);
});

test('MCP-01: availability matches catalog logic exactly', () => {
  // reserved == quantity -> out of stock
  const outOfStock = resolveProductAvailability({
    isActive: true,
    trackInventory: true,
    quantity: 5,
    reservedQuantity: 5,
    allowBackorder: false,
  });
  assert.equal(outOfStock.availability, 'out of stock');
  assert.equal(outOfStock.availableQuantity, 0);
  assert.equal(outOfStock.canPurchase, false);

  // trackInventory=false -> in stock
  const untracked = resolveProductAvailability({
    isActive: true,
    trackInventory: false,
    quantity: 0,
    reservedQuantity: 0,
    allowBackorder: false,
  });
  assert.equal(untracked.availability, 'in stock');
  assert.equal(untracked.canPurchase, true);

  // backorder -> available for order
  const backorder = resolveProductAvailability({
    isActive: true,
    trackInventory: true,
    quantity: 0,
    reservedQuantity: 0,
    allowBackorder: true,
  });
  assert.equal(backorder.availability, 'available for order');
  assert.equal(backorder.canPurchase, true);

  // PREORDER mirrored
  const preorder = resolveProductAvailability({
    isActive: true,
    trackInventory: true,
    quantity: 0,
    reservedQuantity: 0,
    allowBackorder: false,
    availabilityMode: 'PREORDER',
    preorderAvailableOn: new Date('2026-11-01T00:00:00Z'),
  });
  assert.equal(preorder.availability, 'preorder');
  assert.equal(preorder.canPurchase, true);

  // DISCONTINUED mirrored
  const discontinued = resolveProductAvailability({
    isActive: true,
    trackInventory: true,
    quantity: 10,
    reservedQuantity: 0,
    allowBackorder: false,
    availabilityMode: 'DISCONTINUED',
  });
  assert.equal(discontinued.availability, 'discontinued');
  assert.equal(discontinued.canPurchase, false);
});

test('MCP-01: rating resolver never invents synthetic 5.0 rating', () => {
  // No reviews -> count = 0, average = null, hasReviews = false
  const unreviewed = resolveProductRating({ reviews: [], ratingValue: null, reviewCount: 0 });
  assert.equal(unreviewed.hasReviews, false);
  assert.equal(unreviewed.average, null);
  assert.equal(unreviewed.total, 0);
  assert.deepEqual(unreviewed.distribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  // Real reviews
  const reviewed = resolveProductRating({
    reviews: [
      { rating: 4 },
      { rating: 5 },
    ],
  });
  assert.equal(reviewed.hasReviews, true);
  assert.equal(reviewed.average, 4.5);
  assert.equal(reviewed.total, 2);
  assert.equal(reviewed.distribution[4], 1);
  assert.equal(reviewed.distribution[5], 1);
});
