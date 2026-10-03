import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProductOgOther } from '../../app/(storefront)/products/[id]/components/seo/buildProductOgOther.ts';
import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';

test('MCP-06: buildProductOgOther outputs exact Meta OpenGraph tags matching catalog resolver', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const mockProduct = {
    id: 'prod-404',
    sku: 'MB-SKU-404',
    slug: 'hydra-boost',
    name: 'Hydra Boost',
    brand: 'Minsah Glow',
    condition: 'NEW',
    price: 1500,
    compareAtPrice: 1800,
    salePrice: 1100,
    offerStartDate: new Date('2026-09-01T00:00:00Z'),
    offerEndDate: new Date('2026-09-20T00:00:00Z'), // expired!
    quantity: 0,
    trackInventory: true,
  };

  const offer = resolveProductOffer({ product: mockProduct, now });
  const ogOther = buildProductOgOther({ product: mockProduct, offer });

  assert.equal(ogOther['product:price:amount'], '1500'); // Reverted to 1500 from expired 1100
  assert.equal(ogOther['product:price:currency'], 'BDT');
  assert.equal(ogOther['product:availability'], 'out of stock');
  assert.equal(ogOther['product:retailer_item_id'], 'MB-SKU-404');
  assert.equal(ogOther['product:condition'], 'new');
  assert.equal(ogOther['product:brand'], 'Minsah Glow');
});

test('MCP-06: active sale outputs sale price in OpenGraph tags', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const mockProduct = {
    id: 'prod-active',
    sku: 'MB-ACTIVE-1',
    slug: 'sunscreen-gel',
    price: 1200,
    salePrice: 950,
    offerStartDate: new Date('2026-10-01T00:00:00Z'),
    offerEndDate: new Date('2026-10-10T00:00:00Z'), // active!
    quantity: 25,
    trackInventory: true,
  };

  const offer = resolveProductOffer({ product: mockProduct, now });
  const ogOther = buildProductOgOther({ product: mockProduct, offer });

  assert.equal(ogOther['product:price:amount'], '950');
  assert.equal(ogOther['product:availability'], 'in stock');
  assert.equal(ogOther['product:retailer_item_id'], 'MB-ACTIVE-1');
});
