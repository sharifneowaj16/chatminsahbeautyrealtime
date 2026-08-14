import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMetaCommerceBrowserEvent,
  buildMetaCommercePayload,
} from '../../lib/meta/browser/commerce';
import { createMetaBrowserEventId, isValidMetaBrowserEventId } from '../../lib/meta/browser/event-id';
import {
  buildMetaBrowserCapiRequest,
  buildMetaBrowserEvent,
  sanitizeMetaBrowserPayload,
} from '../../lib/meta/browser/payload';
import { validateMetaBrowserEvent } from '../../lib/meta/browser/validator';

process.env.NEXT_PUBLIC_META_CATALOG_ID_SOURCE = 'sku';

const simple = {
  id: 'db-product-1',
  productId: 'db-product-1',
  productSku: 'SKU-100',
  sku: 'SKU-100',
  name: 'Hydrating Serum',
  quantity: 1,
  price: 1250,
};

const variant = {
  id: 'db-variant-red',
  productId: 'db-product-1',
  productSku: 'SKU-100',
  variantId: 'db-variant-red',
  variantSku: 'SKU-100-RED',
  sku: 'SKU-100-RED',
  name: 'Hydrating Serum - Red',
  variantName: 'Red / 30ml',
  color: 'Red',
  size: '30ml',
  quantity: 2,
  price: 1300,
};

test('event IDs are generated once in a Meta-safe format', () => {
  const eventId = createMetaBrowserEventId('AddToCart', 1_721_218_400_000);
  assert.equal(isValidMetaBrowserEventId(eventId), true);
  assert.match(eventId, /^AddToCart-1721218400000-/);
});

test('unselected variant-capable ViewContent uses the parent product group', () => {
  const event = buildMetaCommerceBrowserEvent({
    eventName: 'ViewContent',
    items: [simple],
    viewContentHasVariants: true,
    value: 1250,
  });
  assert.equal(event.validation.valid, true);
  assert.deepEqual(event.payload.content_ids, ['SKU-100']);
  assert.equal(event.payload.content_type, 'product_group');
  assert.equal(event.payload.contents?.[0]?.id, 'SKU-100');
});

test('selected variant commerce events use the exact sellable variant SKU', () => {
  const event = buildMetaCommerceBrowserEvent({
    eventName: 'AddToCart',
    items: [variant],
    value: 2600,
  });
  assert.equal(event.validation.valid, true);
  assert.deepEqual(event.payload.content_ids, ['SKU-100-RED']);
  assert.equal(event.payload.content_type, 'product');
  assert.equal(event.payload.contents?.[0]?.item_group_id, 'SKU-100');
  assert.equal(event.payload.contents?.[0]?.quantity, 2);
});

test('checkout payload preserves every canonical line item and merchandise subtotal', () => {
  const payload = buildMetaCommercePayload({
    eventName: 'InitiateCheckout',
    items: [simple, { ...variant, quantity: 2 }],
  });
  assert.deepEqual(payload.content_ids, ['SKU-100', 'SKU-100-RED']);
  assert.equal(payload.contents?.length, 2);
  assert.equal(payload.num_items, 3);
  assert.equal(payload.value, 3850);
  assert.equal(payload.currency, 'BDT');
});

test('provided event ID is reused by browser and CAPI request contracts', () => {
  const eventId = 'InitiateCheckout-order-session-123';
  const event = buildMetaCommerceBrowserEvent({
    eventName: 'InitiateCheckout',
    eventId,
    items: [simple],
  });
  const capi = buildMetaBrowserCapiRequest(event, {
    fbc: 'fb.1.1.click',
    fbp: 'fb.1.1.browser',
    externalId: 'visitor:abc',
    eventSourceUrl: 'https://minsahbeauty.example/checkout',
  });
  assert.equal(event.eventId, eventId);
  assert.equal(capi.eventId, eventId);
  assert.equal(capi.eventName, 'InitiateCheckout');
  assert.deepEqual(capi.contentIds, ['SKU-100']);
});

test('browser payload strips raw PII, secrets and query-string URL data', () => {
  const payload = sanitizeMetaBrowserPayload({
    email: 'customer@example.com',
    phone: '+8801700000000',
    first_name: 'Asha',
    lastName: 'Rahman',
    accessToken: 'secret-token',
    authorization: 'Bearer secret',
    event_source_url: 'https://shop.example/checkout?email=customer@example.com&token=abc',
    content_name: 'Hydrating Serum',
    value: 1250,
    currency: 'bdt',
  });
  assert.equal('email' in payload, false);
  assert.equal('phone' in payload, false);
  assert.equal('first_name' in payload, false);
  assert.equal('lastName' in payload, false);
  assert.equal('accessToken' in payload, false);
  assert.equal('authorization' in payload, false);
  assert.equal(payload.event_source_url, 'https://shop.example/checkout');
  assert.equal(payload.currency, 'BDT');
});

test('malformed partial catalog payload is stripped fail-closed', () => {
  const event = buildMetaBrowserEvent({
    eventName: 'AddToCart',
    payload: {
      content_ids: [],
      content_type: 'product',
      contents: [],
      value: 100,
      currency: 'BDT',
    },
  });
  assert.equal(event.validation.valid, true);
  assert.equal(event.payload.content_ids, undefined);
  assert.equal(event.payload.contents, undefined);
  assert.equal(event.payload.content_type, undefined);
});

test('validator blocks product_group outside ViewContent and invalid quantities', () => {
  const validation = validateMetaBrowserEvent({
    eventName: 'AddToCart',
    eventId: 'AddToCart-valid-123',
    payload: {
      content_ids: ['SKU-100'],
      content_type: 'product_group',
      contents: [{ id: 'SKU-100', quantity: 0, item_price: 1250 }],
      value: 1250,
      currency: 'BDT',
    },
  });
  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.issues.map((issue) => issue.code).sort(),
    ['PRODUCT_GROUP_EVENT_INVALID', 'QUANTITY_INVALID']
  );
});

test('verified browser Purchase keeps the server-issued event ID and strips PII', () => {
  const event = buildMetaBrowserEvent({
    eventName: 'Purchase',
    eventId: 'Purchase-order-1001',
    payload: {
      ...buildMetaCommercePayload({ eventName: 'Purchase', items: [simple] }),
      transaction_id: 'ORDER-1001',
      email: 'customer@example.com',
      phone: '+8801700000000',
    },
  });
  assert.equal(event.validation.valid, true);
  assert.equal(event.eventId, 'Purchase-order-1001');
  assert.equal(event.payload.transaction_id, 'ORDER-1001');
  assert.equal('email' in event.payload, false);
  assert.equal('phone' in event.payload, false);
});
