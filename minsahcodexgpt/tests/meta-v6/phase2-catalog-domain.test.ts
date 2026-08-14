import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeCsvRecord } from '../../lib/meta/catalog/adapters/csv-feed';
import { serializeItemsBatchUpdate } from '../../lib/meta/catalog/adapters/items-batch';
import { resolveCatalogAvailability } from '../../lib/meta/catalog/domain/availability';
import { resolveCatalogSale } from '../../lib/meta/catalog/domain/sale-period';
import { catalogPayloadHash } from '../../lib/meta/catalog/fingerprint';
import { mapProductToCatalogItems, type CatalogProductSource } from '../../lib/meta/catalog/mapper';

const NOW = new Date('2026-07-17T12:00:00.000Z');

function product(overrides: Partial<CatalogProductSource> = {}): CatalogProductSource {
  return {
    id: 'product-db-id',
    sku: 'SKU-100',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    description: 'A hydrating face serum with a lightweight texture for daily use.',
    price: 1250,
    salePrice: null,
    offerStartDate: null,
    offerEndDate: null,
    quantity: 10,
    reservedQuantity: 2,
    trackInventory: true,
    allowBackorder: false,
    isActive: true,
    deletedAt: null,
    availabilityMode: 'STANDARD',
    preorderAvailableOn: null,
    condition: 'NEW',
    gtin: '0123456789012',
    mpn: 'MS-SERUM-100',
    googleProductCategory: 'Health & Beauty > Personal Care > Cosmetics',
    facebookProductCategory: 'health_beauty',
    canonicalUrl: '/products/hydrating-serum',
    ogImageUrl: null,
    isNew: true,
    isFeatured: true,
    productAttributes: null,
    images: [
      { url: '/images/serum-main.jpg', isDefault: true, sortOrder: 0 },
      { url: '/images/serum-side.jpg', isDefault: false, sortOrder: 1 },
    ],
    variants: [],
    category: { name: 'Serum' },
    brand: { name: 'Minsah Beauty' },
    ...overrides,
  };
}

const identity = () => ({ itemId: 'SKU-100' });

test('zero-stock backorder is available for order', () => {
  const result = resolveCatalogAvailability({
    isActive: true,
    deletedAt: null,
    availabilityMode: 'STANDARD',
    preorderAvailableOn: null,
    trackInventory: true,
    quantity: 4,
    reservedQuantity: 4,
    allowBackorder: true,
  });
  assert.equal(result.availability, 'available for order');
  assert.equal(result.quantityToSellOnFacebook, 0);
});

test('future sale is serialized immediately with its effective range', () => {
  const future = resolveCatalogSale({
    regularPrice: 1250,
    salePrice: 1100,
    offerStartDate: new Date('2026-07-20T00:00:00.000Z'),
    offerEndDate: new Date('2026-07-31T23:59:59.000Z'),
    currency: 'BDT',
    now: NOW,
  });
  assert.equal(future.state, 'future');
  assert.equal(future.sale?.price.amount, 1100);
  assert.equal(future.sale?.effectiveDate, '2026-07-20T00:00:00.000Z/2026-07-31T23:59:59.000Z');
});

test('expired sale is removed and base price remains', () => {
  const expired = resolveCatalogSale({
    regularPrice: 1250,
    salePrice: 1100,
    offerStartDate: new Date('2026-07-01T00:00:00.000Z'),
    offerEndDate: new Date('2026-07-10T23:59:59.000Z'),
    currency: 'BDT',
    now: NOW,
  });
  assert.equal(expired.state, 'expired');
  assert.equal(expired.sale, undefined);
});

test('Items Batch uses write fields and formatted money', () => {
  const [mapped] = mapProductToCatalogItems({
    product: product({
      salePrice: 1100,
      offerStartDate: new Date('2026-07-20T00:00:00.000Z'),
      offerEndDate: new Date('2026-07-31T23:59:59.000Z'),
    }),
    resolveIdentity: identity,
    siteUrl: 'https://minsahbeauty.example',
    now: NOW,
  });
  assert.deepEqual(mapped.validation.errors, []);
  const request = serializeItemsBatchUpdate(mapped.item);
  assert.equal(request.data?.price, '1250.00 BDT');
  assert.equal(request.data?.sale_price, '1100.00 BDT');
  assert.equal(request.data?.quantity_to_sell_on_facebook, 8);
  assert.equal(request.data?.link, 'https://minsahbeauty.example/products/hydrating-serum');
  assert.equal(request.data?.image_link, 'https://minsahbeauty.example/images/serum-main.jpg');
  assert.equal('inventory' in (request.data ?? {}), false);
  assert.equal('url' in (request.data ?? {}), false);
  assert.equal('image_url' in (request.data ?? {}), false);
  assert.equal('retailer_product_group_id' in (request.data ?? {}), false);
});

test('variant overrides sale, lifecycle, identifiers and attributes', () => {
  const [mapped] = mapProductToCatalogItems({
    product: product({
      variants: [{
        id: 'variant-db-id',
        sku: 'SKU-100-RED',
        name: 'Red 30ml',
        price: 1400,
        salePrice: 1200,
        offerStartDate: new Date('2026-07-18T00:00:00.000Z'),
        offerEndDate: new Date('2026-07-25T00:00:00.000Z'),
        quantity: 3,
        reservedQuantity: 3,
        allowBackorder: true,
        isActive: true,
        deletedAt: null,
        availabilityMode: 'STANDARD',
        condition: 'REFURBISHED',
        gtin: '9988776655443',
        mpn: 'MS-RED-30',
        barcode: '9988776655443',
        attributes: { shade: 'Ruby', size: '30ml', material: 'Glass' },
        image: '/images/serum-red.jpg',
      }],
    }),
    resolveIdentity: () => ({ itemId: 'SKU-100-RED', groupId: 'SKU-100' }),
    siteUrl: 'https://minsahbeauty.example',
    now: NOW,
  });
  assert.deepEqual(mapped.validation.errors, []);
  assert.equal(mapped.item.itemGroupId, 'SKU-100');
  assert.equal(mapped.item.availability, 'available for order');
  assert.equal(mapped.item.condition, 'refurbished');
  assert.equal(mapped.item.gtin, '9988776655443');
  assert.equal(mapped.item.mpn, 'MS-RED-30');
  assert.equal(mapped.item.color, 'Ruby');
  assert.equal(mapped.item.size, '30ml');
  assert.equal(mapped.item.sale?.price.amount, 1200);
});


test('inactive or deleted variant is excluded so managed reconciliation can DELETE it', () => {
  const mapped = mapProductToCatalogItems({
    product: product({
      variants: [{
        id: 'variant-deleted',
        sku: 'SKU-100-OLD',
        name: 'Retired shade',
        price: 1250,
        quantity: 0,
        reservedQuantity: 0,
        allowBackorder: false,
        isActive: false,
        deletedAt: new Date('2026-07-16T00:00:00.000Z'),
        availabilityMode: 'DISCONTINUED',
        attributes: { shade: 'Old shade' },
        image: '/images/retired.jpg',
      }],
    }),
    resolveIdentity: () => ({ itemId: 'SKU-100-OLD', groupId: 'SKU-100' }),
    siteUrl: 'https://minsahbeauty.example',
    now: NOW,
  });
  assert.deepEqual(mapped, []);
});

test('CSV and Items Batch preserve the same commerce semantics', () => {
  const [mapped] = mapProductToCatalogItems({
    product: product(),
    resolveIdentity: identity,
    siteUrl: 'https://minsahbeauty.example',
    now: NOW,
  });
  const batch = serializeItemsBatchUpdate(mapped.item).data ?? {};
  const csv = serializeCsvRecord(mapped.item);
  assert.equal(batch.availability, csv.availability);
  assert.equal(batch.quantity_to_sell_on_facebook, csv.quantity_to_sell_on_facebook);
  assert.equal(batch.condition, csv.condition);
  assert.equal(batch.price, csv.price);
  assert.equal(batch.link, csv.link);
  assert.equal(batch.image_link, csv.image_link);
  assert.equal(batch.item_group_id, csv.item_group_id);
});

test('canonical payload hash is stable and changes with inventory', () => {
  const [first] = mapProductToCatalogItems({ product: product(), resolveIdentity: identity, siteUrl: 'https://minsahbeauty.example', now: NOW });
  const [same] = mapProductToCatalogItems({ product: product(), resolveIdentity: identity, siteUrl: 'https://minsahbeauty.example', now: NOW });
  const [changed] = mapProductToCatalogItems({ product: product({ quantity: 9 }), resolveIdentity: identity, siteUrl: 'https://minsahbeauty.example', now: NOW });
  assert.equal(catalogPayloadHash(first.item), catalogPayloadHash(same.item));
  assert.notEqual(catalogPayloadHash(first.item), catalogPayloadHash(changed.item));
});
