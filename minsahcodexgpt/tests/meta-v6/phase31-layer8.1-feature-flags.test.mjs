import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  META_PHASE31_CUTOVER_FLAG_DEFINITIONS,
  getMetaPhase31CutoverStatus,
  getMetaPhase31CutoverValidationIssues,
} from '../../lib/meta-platform/config/phase31-cutover.ts';

const expectedFlags = [
  'META_PLATFORM_LEADS',
  'META_PLATFORM_INSTAGRAM',
  'META_PLATFORM_LEGACY_FACEBOOK',
  'META_PLATFORM_SOCIAL_REALTIME',
  'META_PLATFORM_SOCIAL_WEBHOOKS',
  'META_PLATFORM_INSTAGRAM_WRITES',
  'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY',
  'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS',
  'META_PLATFORM_SOCIAL_REPLAY',
];

test('8.1 manifest exposes the exact canonical flag inventory', () => {
  assert.deepEqual(META_PHASE31_CUTOVER_FLAG_DEFINITIONS.map((flag) => flag.name), expectedFlags);
  assert.equal(new Set(expectedFlags).size, expectedFlags.length);
});

test('8.1 omitted flags use production-safe defaults', () => {
  const status = getMetaPhase31CutoverStatus({});
  assert.equal(status.valid, true);
  assert.equal(status.configuredCount, 0);
  assert.deepEqual(status.enabledFlags, ['META_PLATFORM_LEGACY_FACEBOOK']);
  assert.equal(status.flags.META_PLATFORM_LEADS.enabled, false);
  assert.equal(status.flags.META_PLATFORM_INSTAGRAM.enabled, false);
  assert.equal(status.flags.META_PLATFORM_LEGACY_FACEBOOK.enabled, true);
  assert.equal(status.flags.META_PLATFORM_INSTAGRAM_WRITES.enabled, false);
  assert.equal(status.flags.META_PLATFORM_SOCIAL_REPLAY.enabled, false);
});

test('8.1 accepted boolean aliases resolve deterministically', () => {
  const status = getMetaPhase31CutoverStatus({
    META_PLATFORM_LEADS: 'YES',
    META_PLATFORM_INSTAGRAM: '1',
    META_PLATFORM_LEGACY_FACEBOOK: '0',
    META_PLATFORM_SOCIAL_REALTIME: 'true',
    META_PLATFORM_SOCIAL_WEBHOOKS: 'no',
  });
  assert.equal(status.valid, true);
  assert.equal(status.flags.META_PLATFORM_LEADS.enabled, true);
  assert.equal(status.flags.META_PLATFORM_INSTAGRAM.enabled, true);
  assert.equal(status.flags.META_PLATFORM_LEGACY_FACEBOOK.enabled, false);
  assert.equal(status.flags.META_PLATFORM_SOCIAL_REALTIME.enabled, true);
  assert.equal(status.flags.META_PLATFORM_SOCIAL_WEBHOOKS.enabled, false);
});

test('8.1 invalid values fail safe and never expose raw values', () => {
  const raw = 'super-secret-token-like-invalid-value';
  const status = getMetaPhase31CutoverStatus({
    META_PLATFORM_LEADS: raw,
    META_PLATFORM_LEGACY_FACEBOOK: raw,
  });
  assert.equal(status.valid, false);
  assert.deepEqual(status.invalidFlags, ['META_PLATFORM_LEADS', 'META_PLATFORM_LEGACY_FACEBOOK']);
  assert.equal(status.flags.META_PLATFORM_LEADS.enabled, false);
  assert.equal(status.flags.META_PLATFORM_LEGACY_FACEBOOK.enabled, true);
  assert.equal(status.flags.META_PLATFORM_LEADS.source, 'INVALID_FAIL_SAFE');
  assert.equal(JSON.stringify(status).includes(raw), false);
  assert.deepEqual(getMetaPhase31CutoverValidationIssues({ META_PLATFORM_LEADS: raw }), [
    'META_PLATFORM_LEADS must be true/false, 1/0, or yes/no',
  ]);
});

test('8.1 shared environment validator rejects an invalid canonical flag', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'phase31-layer8.1-'));
  try {
    const envFile = path.join(dir, 'invalid.env');
    writeFileSync(envFile, [
      'DATABASE_URL=postgresql://localhost:5432/app',
      `JWT_SECRET=${'a'.repeat(32)}`,
      `JWT_REFRESH_SECRET=${'b'.repeat(32)}`,
      'META_PLATFORM_LEADS=maybe',
    ].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/validate-env.mjs', '--file', envFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(`${result.stdout}\n${result.stderr}`, /META_PLATFORM_LEADS must be true\/false, 1\/0, or yes\/no/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('8.1 admin provider health includes secret-free cutover status', () => {
  const source = readFileSync('lib/meta-platform/admin/provider-health.ts', 'utf8');
  assert.match(source, /getMetaPhase31CutoverStatus/);
  assert.match(source, /cutover:\s*getMetaPhase31CutoverStatus\(process\.env\)/);
});

test('8.1 second brain enforces patch-per-item and ZIP-per-layer packaging', () => {
  const execution = JSON.parse(readFileSync('.ai/phase31-execution-manifest.json', 'utf8'));
  assert.equal(execution.standard_item_contract.no_item_zip, true);
  assert.equal(execution.standard_item_contract.full_layer_zip_only, true);
  assert.equal(execution.standard_item_contract.item_patch_pattern, 'minsahbeauty_phase31_layer{item}.patch');
  assert.match(execution.current_item, /^(?:8\.[2-7]|9\.[1-8])$/);
  assert.equal(execution.layers['8'].items.find((item) => item.id === '8.1').status, 'COMPLETE');
});
