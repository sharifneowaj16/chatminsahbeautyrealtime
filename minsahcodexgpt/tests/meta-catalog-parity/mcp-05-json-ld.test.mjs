import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDynamicProductJsonLd } from '../../app/(storefront)/products/[id]/components/seo/buildProductJsonLd.ts';
import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';

test('MCP-05: JSON-LD price matches effectivePrice and ignores expired sale', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const mockProduct = {
    id: 'p-1',
    sku: 'MB-101',
    slug: 'glow-cream',
    name: 'Glow Cream',
    price: 1500,
    compareAtPrice: 1800,
    salePrice: 1200,
    offerStartDate: new Date('2026-08-01T00:00:00Z'),
    offerEndDate: new Date('2026-08-15T00:00:00Z'), // expired!
    quantity: 20,
    trackInventory: true,
  };

  const offer = resolveProductOffer({ product: mockProduct, now });
  const jsonLd = buildDynamicProductJsonLd({
    product: { ...mockProduct, offer, variants: [] },
    productUrl: 'https://minsahbeauty.com/products/glow-cream',
    now,
  });

  const mainOffer = jsonLd.offers;
  assert.equal(mainOffer.price, 1500); // Reverted to regular price!
  assert.equal(mainOffer.priceCurrency, 'BDT');
  assert.equal(mainOffer.availability, 'https://schema.org/InStock');
  assert.equal(typeof mainOffer.priceValidUntil, 'string');
});

test('MCP-05: JSON-LD maps out of stock and backorder availability accurately', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const oosProduct = {
    id: 'p-oos',
    sku: 'MB-OOS',
    slug: 'oos-item',
    name: 'OOS Item',
    price: 1000,
    quantity: 0,
    trackInventory: true,
    allowBackorder: false,
  };
  const oosOffer = resolveProductOffer({ product: oosProduct, now });
  const oosJsonLd = buildDynamicProductJsonLd({
    product: { ...oosProduct, offer: oosOffer, variants: [] },
    productUrl: 'https://minsahbeauty.com/products/oos-item',
    now,
  });
  assert.equal(oosJsonLd.offers.availability, 'https://schema.org/OutOfStock');

  const backorderProduct = {
    id: 'p-bo',
    sku: 'MB-BO',
    slug: 'bo-item',
    name: 'BO Item',
    price: 1000,
    quantity: 0,
    trackInventory: true,
    allowBackorder: true,
  };
  const boOffer = resolveProductOffer({ product: backorderProduct, now });
  const boJsonLd = buildDynamicProductJsonLd({
    product: { ...backorderProduct, offer: boOffer, variants: [] },
    productUrl: 'https://minsahbeauty.com/products/bo-item',
    now,
  });
  assert.equal(boJsonLd.offers.availability, 'https://schema.org/BackOrder');
});

test('MCP-05: Variants are mapped with individual deep-linked offers', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const parentProduct = {
    id: 'p-multi',
    sku: 'MB-MULTI',
    slug: 'multi-cream',
    name: 'Multi Cream',
    price: 1000,
    quantity: 10,
    variants: [
      {
        id: 'var-1',
        sku: 'MB-MULTI-50ML',
        name: '50ml',
        price: 1100,
        stock: 5,
        offer: {
          regularPrice: 1100,
          effectivePrice: 1100,
          currency: 'BDT',
          availability: 'in stock',
          retailerId: 'MB-MULTI-50ML',
          canPurchase: true,
        },
      },
      {
        id: 'var-2',
        sku: 'MB-MULTI-100ML',
        name: '100ml',
        price: 1800,
        stock: 0,
        offer: {
          regularPrice: 1800,
          effectivePrice: 1800,
          currency: 'BDT',
          availability: 'out of stock',
          retailerId: 'MB-MULTI-100ML',
          canPurchase: false,
        },
      },
    ],
  };

  const offer = resolveProductOffer({ product: parentProduct, now });
  const jsonLd = buildDynamicProductJsonLd({
    product: { ...parentProduct, offer },
    productUrl: 'https://minsahbeauty.com/products/multi-cream',
    now,
  });

  assert.ok(Array.isArray(jsonLd.offers));
  assert.equal(jsonLd.offers.length, 2);
  assert.equal(jsonLd.offers[0].price, 1100);
  assert.equal(jsonLd.offers[0].url, 'https://minsahbeauty.com/products/multi-cream?variant=var-1');
  assert.equal(jsonLd.offers[0].availability, 'https://schema.org/InStock');

  assert.equal(jsonLd.offers[1].price, 1800);
  assert.equal(jsonLd.offers[1].url, 'https://minsahbeauty.com/products/multi-cream?variant=var-2');
  assert.equal(jsonLd.offers[1].availability, 'https://schema.org/OutOfStock');
});

test('MCP-05: Admin-stored JSON-LD cannot override resolver pricing/availability', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const mockProduct = {
    id: 'p-poison',
    sku: 'MB-POISON',
    slug: 'poison-item',
    name: 'Poison Item',
    price: 1000,
    structuredDataJsonLd: {
      customField: 'verified-safe',
      offers: {
        price: 50, // Stale/poisoned price in DB
        availability: 'https://schema.org/InStock', // Fake stock
      },
    },
    quantity: 0,
    trackInventory: true,
  };

  const offer = resolveProductOffer({ product: mockProduct, now });
  const jsonLd = buildDynamicProductJsonLd({
    product: { ...mockProduct, offer, variants: [] },
    productUrl: 'https://minsahbeauty.com/products/poison-item',
    now,
  });

  assert.equal(jsonLd.customField, 'verified-safe'); // Supplemental metadata preserved
  assert.equal(jsonLd.offers.price, 1000); // Resolver strictly enforced!
  assert.equal(jsonLd.offers.availability, 'https://schema.org/OutOfStock'); // Resolver strictly enforced!
});
