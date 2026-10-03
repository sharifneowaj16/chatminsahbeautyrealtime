import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMetaDataProcessingOptions } from '../../lib/tracking/meta-schema.ts';
import { buildMetaRefundPayload } from '../../lib/tracking/meta-capi-refund.ts';

test('Meta LDU: getMetaDataProcessingOptions returns empty object when disabled', () => {
  const prevEnv = process.env.META_LDU_ENABLED;
  try {
    delete process.env.META_LDU_ENABLED;
    const options = getMetaDataProcessingOptions();
    assert.deepEqual(options, {});
  } finally {
    if (prevEnv) process.env.META_LDU_ENABLED = prevEnv;
  }
});

test('Meta LDU: getMetaDataProcessingOptions returns LDU tuple when enabled', () => {
  const prevEnv = process.env.META_LDU_ENABLED;
  try {
    process.env.META_LDU_ENABLED = 'true';
    const options = getMetaDataProcessingOptions();
    assert.deepEqual(options, {
      data_processing_options: ['LDU'],
      data_processing_options_country: 0,
      data_processing_options_state: 0,
    });
  } finally {
    if (prevEnv) process.env.META_LDU_ENABLED = prevEnv;
    else delete process.env.META_LDU_ENABLED;
  }
});

test('Meta LDU: CAPI payload attaches data_processing_options dynamically', () => {
  const prevEnv = process.env.META_LDU_ENABLED;
  try {
    process.env.META_LDU_ENABLED = 'true';

    const dummyOrder = {
      id: 'ord-ldu-test',
      total: 1500,
      items: [{ id: 'item-1', price: 1500, quantity: 1 }],
      user: { email: 'ldu@test.com', phone: '01700000000' },
    };

    const payload = buildMetaRefundPayload({
      order: dummyOrder,
      eventId: 'META-Refund-ord-ldu-test',
      source: 'manual_admin',
      refundAmount: 1500,
      eventTime: 1727970000,
    });

    // Top-level payload has LDU
    assert.deepEqual(payload.data_processing_options, ['LDU']);
    assert.equal(payload.data_processing_options_country, 0);
    assert.equal(payload.data_processing_options_state, 0);

    // Event object has LDU
    const event = payload.data[0];
    assert.deepEqual(event.data_processing_options, ['LDU']);
    assert.equal(event.data_processing_options_country, 0);
    assert.equal(event.data_processing_options_state, 0);
  } finally {
    if (prevEnv) process.env.META_LDU_ENABLED = prevEnv;
    else delete process.env.META_LDU_ENABLED;
  }
});
