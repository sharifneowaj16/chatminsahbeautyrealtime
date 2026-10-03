import assert from 'node:assert/strict';
import test from 'node:test';

import { mapProductToCatalogItems } from '../../lib/meta/catalog/mapper.ts';
import { stableCatalogHash } from '../../lib/meta-platform/domains/catalog/normalization.ts';

const mockProduct = {
  id: 'prod-001',
  sku: 'MB-SUN-001',
  slug: 'ultra-light-invisible-sunscreen-spf50',
  name: 'Ultra-Light Invisible Sunscreen SPF50+',
  description: 'Broad spectrum lightweight sunscreen for sensitive skin.',
  shortDescription: 'Broad spectrum SPF50+ sunscreen',
  price: 1250,
  compareAtPrice: 1500,
  salePrice: 1100,
  offerStartDate: new Date('2026-10-01T00:00:00Z'),
  offerEndDate: new Date('2026-10-15T00:00:00Z'),
  quantity: 25,
  reservedQuantity: 5,
  trackInventory: true,
  allowBackorder: false,
  isActive: true,
  deletedAt: null,
  isNew: true,
  isFeatured: true,
  brand: { name: 'Minsah Beauty' },
  category: { name: 'UV Defense' },
  images: [
    { url: 'https://minsahbeauty.cloud/images/sunscreen-main.jpg', isDefault: true },
    { url: 'https://minsahbeauty.cloud/images/sunscreen-back.jpg', isDefault: false },
  ],
  variants: [],
};

const resolveIdentity = ({ productId, productSku }) => ({
  itemId: productSku,
  itemSource: 'product_sku',
  isVariant: false,
});

test('MCP-02: mapProductToCatalogItems outputs canonical item matching resolveProductOffer output', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const items = mapProductToCatalogItems({
    product: mockProduct,
    resolveIdentity,
    siteUrl: 'https://minsahbeauty.cloud',
    currency: 'BDT',
    now,
  });

  assert.equal(items.length, 1);
  const mapped = items[0].item;

  assert.equal(mapped.retailerId, 'MB-SUN-001');
  assert.equal(mapped.price.amount, 1250);
  assert.equal(mapped.price.currency, 'BDT');
  assert.equal(mapped.sale?.price.amount, 1100);
  assert.equal(mapped.availability, 'in stock');
  assert.equal(mapped.quantityToSellOnFacebook, 20); // 25 - 5
  assert.equal(mapped.customLabels?.custom_label_3, 'active');

  const hash1 = stableCatalogHash(mapped);
  assert.ok(hash1 && hash1.length === 64, 'Payload hash is valid sha256 hex');
});
