import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildMetaRefundEventId,
  buildMetaCancellationEventId,
  buildMetaRefundPayload,
} from '../../lib/tracking/meta-capi-refund.ts';

test('Meta CAPI Refund: Event ID generation', () => {
  const orderId = 'ord-test-12345';
  const refundId = buildMetaRefundEventId(orderId);
  assert.equal(refundId, 'META-Refund-ord-test-12345');

  const partialRefundId = buildMetaRefundEventId(orderId, 'item-1');
  assert.equal(partialRefundId, 'META-Refund-ord-test-12345-item-1');

  const cancelId = buildMetaCancellationEventId(orderId);
  assert.equal(cancelId, 'META-Cancel-ord-test-12345');
});

test('Meta CAPI Refund: Payload shape, normalization, and LDU options', () => {
  const dummyOrder = {
    id: 'ord-998877',
    total: 2450.0,
    fbp: 'fb.1.123456789.987654',
    fbc: 'fb.1.123456789.fbclid123',
    customerIp: '103.145.12.34',
    customerUa: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    externalId: 'cust-uuid-4455',
    firstLandingUrl: 'https://minsahbeauty.cloud/products/sunscreen?fbclid=xyz',
    metaEventId: 'Purchase-ord-998877',
    user: {
      email: ' Test.Customer@Example.Com ',
      phone: '01711223344',
    },
    shippingAddress: {
      phone: '01711223344',
    },
    items: [
      {
        id: 'item-1',
        name: 'Glow Sunscreen SPF 50',
        price: 1225.0,
        quantity: 2,
        product: { id: 'prod-sunscreen-1', name: 'Glow Sunscreen SPF 50' },
        variant: { id: 'var-50ml', name: '50ml' },
      },
    ],
  };

  const payload = buildMetaRefundPayload({
    order: dummyOrder,
    eventId: 'META-Refund-ord-998877',
    source: 'admin_order_status_refunded',
    refundAmount: 2450.0,
    eventTime: 1727970000,
  });

  assert.equal(payload.data.length, 1);
  const event = payload.data[0];

  assert.equal(event.event_name, 'Refund');
  assert.equal(event.event_id, 'META-Refund-ord-998877');
  assert.equal(event.action_source, 'website');
  assert.equal(event.event_time, 1727970000);

  // User data validation
  assert.equal(event.user_data.fbp, dummyOrder.fbp);
  assert.equal(event.user_data.fbc, dummyOrder.fbc);
  assert.equal(event.user_data.client_ip_address, dummyOrder.customerIp);
  assert.equal(event.user_data.client_user_agent, dummyOrder.customerUa);

  // Hashing verification
  const expectedEmailHash = crypto.createHash('sha256').update('test.customer@example.com').digest('hex');
  assert.equal(event.user_data.em, expectedEmailHash);

  const expectedPhoneHash = crypto.createHash('sha256').update('8801711223344').digest('hex');
  assert.equal(event.user_data.ph, expectedPhoneHash);

  // Custom data validation
  assert.equal(event.custom_data.currency, 'BDT');
  assert.equal(event.custom_data.value, 2450.0);
  assert.equal(event.custom_data.order_id, 'ord-998877');
  assert.equal(event.custom_data.meta_refund_source, 'admin_order_status_refunded');
  assert.equal(event.custom_data.original_purchase_event_id, 'Purchase-ord-998877');
  assert.equal(event.custom_data.num_items, 2);
});

test('Meta CAPI Refund: Missing credentials safely skip without throwing', async () => {
  const prevPixel = process.env.META_PIXEL_ID;
  const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
  try {
    delete process.env.META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;

    const { sendMetaCapiRefund } = await import('../../lib/tracking/meta-capi-refund.ts');
    const result = await sendMetaCapiRefund({
      orderId: 'non-existent-order',
      source: 'test',
    });

    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'META_CREDENTIALS_MISSING');
  } finally {
    if (prevPixel) process.env.META_PIXEL_ID = prevPixel;
    if (prevToken) process.env.META_CAPI_ACCESS_TOKEN = prevToken;
  }
});
