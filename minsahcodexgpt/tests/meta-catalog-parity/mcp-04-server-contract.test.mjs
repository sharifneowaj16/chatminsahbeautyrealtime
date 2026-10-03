import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';

test('MCP-04: server contract attaches offer snapshot to product and variants', () => {
  const mockProduct = {
    id: 'prod-101',
    sku: 'MB-SKU-101',
    slug: 'retinol-serum',
    price: 1200,
    compareAtPrice: 1500,
    salePrice: 1000,
    offerStartDate: new Date('2026-01-01T00:00:00Z'),
    offerEndDate: new Date('2026-01-10T00:00:00Z'), // expired relative to 2026-10-03
    quantity: 10,
    reservedQuantity: 10, // reserved = quantity => available is 0
    trackInventory: true,
    allowBackorder: false,
    variants: [
      {
        id: 'var-101-a',
        sku: 'MB-SKU-101-30ML',
        price: 1300,
        compareAtPrice: 1600,
        salePrice: null,
        quantity: 5,
        reservedQuantity: 1,
      },
    ],
  };

  const now = new Date('2026-10-03T12:00:00Z');
  const productOffer = resolveProductOffer({ product: mockProduct, now });
  const variantOffer = resolveProductOffer({
    product: mockProduct,
    variant: mockProduct.variants[0],
    now,
  });

  // 1. Product-level offer checks
  assert.equal(productOffer.retailerId, 'MB-SKU-101');
  assert.equal(productOffer.saleState, 'expired');
  assert.equal(productOffer.effectivePrice, 1200); // Reverted from 1000 to 1200
  assert.equal(productOffer.compareAtPrice, 1500);
  assert.equal(productOffer.availableQuantity, 0); // 10 - 10 = 0
  assert.equal(productOffer.availability, 'out of stock');
  assert.equal(productOffer.canPurchase, false);

  // 2. Variant-level offer checks
  assert.equal(variantOffer.retailerId, 'MB-SKU-101-30ML');
  assert.equal(variantOffer.effectivePrice, 1300);
  assert.equal(variantOffer.availableQuantity, 4); // 5 - 1 = 4
  assert.equal(variantOffer.availability, 'in stock');
  assert.equal(variantOffer.canPurchase, true);
});
