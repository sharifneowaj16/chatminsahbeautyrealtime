import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertMetaLeadSafeProjection,
  mapMetaLeadProviderPayload,
  redactMetaLeadSensitiveText,
  toLegacyNormalizedMetaLead,
  toMetaLeadSafeProjection,
} from '../../lib/meta-platform/domains/leads/index.ts';

test('Lead mapper separates raw contact values from safe projection', () => {
  const record = mapMetaLeadProviderPayload({
    id: 'lead-1', form_id: 'form-1', campaign_id: 'campaign-1', campaign_name: 'Summer',
    field_data: [
      { name: 'full_name', values: ['Jane Customer'] },
      { name: 'phone_number', values: ['01712 345678'] },
      { name: 'email', values: ['Jane@Example.com'] },
      { name: 'city', values: ['Dhaka'] },
      { name: 'favorite_shade', values: ['rose'] },
    ],
  });
  assert.equal(record.contact.phone, '+8801712345678');
  assert.equal(record.contact.email, 'jane@example.com');
  assert.equal(record.safeContact.hasPhone, true);
  assert.equal(record.safeContact.hasEmail, true);
  assert.doesNotMatch(record.safeContact.phoneMasked ?? '', /01712345678/);
  assert.doesNotMatch(record.safeContact.emailMasked ?? '', /jane@example\.com/i);
  assert.deepEqual(record.customFields, [{ name: 'favorite_shade', valueCount: 1, classification: 'METADATA_ONLY' }]);
});

test('generic custom fields never retain PII, tokens, secrets or webhook values', () => {
  const rawEmail = 'private.person@example.com';
  const rawPhone = '+8801711111111';
  const rawToken = 'EA012345678901234567890';
  const record = mapMetaLeadProviderPayload({
    id: 'lead-2',
    field_data: [
      { name: 'notes', values: [`email ${rawEmail}`, rawPhone, `access_token=${rawToken}`] },
      { name: 'webhook_secret', values: ['super-secret'] },
    ],
  });
  const custom = JSON.stringify(record.customFields);
  assert.doesNotMatch(custom, /private\.person@example\.com/i);
  assert.doesNotMatch(custom, /8801711111111/);
  assert.doesNotMatch(custom, /EA012345678901234567890/);
  assert.deepEqual(record.customFields.map((field) => field.classification), ['SENSITIVE_VALUE', 'SENSITIVE_NAME']);
});

test('safe Lead projection is serializable without raw contact or secret leakage', () => {
  const record = mapMetaLeadProviderPayload({
    id: 'lead-3',
    field_data: [
      { name: 'phone', values: ['+8801812345678'] },
      { name: 'email', values: ['safecheck@example.com'] },
      { name: 'api_key_note', values: ['EA012345678901234567890'] },
    ],
  });
  const projection = toMetaLeadSafeProjection(record);
  assert.doesNotThrow(() => assertMetaLeadSafeProjection(projection));
  const json = JSON.stringify(projection);
  assert.doesNotMatch(json, /safecheck@example\.com/i);
  assert.doesNotMatch(json, /8801812345678/);
  assert.doesNotMatch(json, /EA012345678901234567890/);
});

test('legacy adapter preserves known fields but clears generic custom values', () => {
  const record = mapMetaLeadProviderPayload({ id: 'lead-4', field_data: [{ name: 'favorite_shade', values: ['rose'] }] });
  const legacy = toLegacyNormalizedMetaLead(record, (value) => value ? `hash:${value.length}` : undefined);
  assert.deepEqual(legacy.customFields, {});
});

test('missing fields remain optional and sensitive errors are redacted', () => {
  const record = mapMetaLeadProviderPayload({ id: 'lead-5', field_data: [] });
  assert.deepEqual(record.contact, {});
  const safe = redactMetaLeadSensitiveText('failed for private@example.com +8801712345678 access_token=EA012345678901234567890');
  assert.doesNotMatch(safe, /private@example\.com|8801712345678|EA012345678901234567890/);
});
