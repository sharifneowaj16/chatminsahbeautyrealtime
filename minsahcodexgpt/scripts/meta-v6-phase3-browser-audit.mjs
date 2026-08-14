#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const has = (file, token) => read(file).includes(token);

for (const file of [
  'lib/meta/browser/types.ts',
  'lib/meta/browser/event-id.ts',
  'lib/meta/browser/payload.ts',
  'lib/meta/browser/commerce.ts',
  'lib/meta/browser/validator.ts',
  'lib/meta/browser/consent.ts',
  'lib/meta/browser/diagnostics.ts',
  'lib/meta/browser/client.ts',
  'components/tracking/MetaPixelProvider.tsx',
  'components/tracking/MetaEventBridge.tsx',
]) {
  check(`phase 3 contract file exists: ${file}`, exists(file));
}

check('manager accepts action-boundary Meta event IDs', has('lib/tracking/manager.ts', 'metaEventId?: string'));
check('manager dispatches canonical browser envelopes', has('lib/tracking/manager.ts', 'dispatchMetaBrowserEvent(metaEvent)'));
check('manager sanitizes browser/session payloads', has('lib/tracking/manager.ts', 'sanitizeMetaBrowserPayload(data)'));
check('commerce funnel uses one canonical item builder', has('lib/tracking/ecommerce.ts', 'buildMetaCommerceBrowserEvent'));
check('wishlist uses canonical commerce builder', has('lib/tracking/events.ts', "eventName: 'AddToWishlist'"));
check('PageView uses shared browser event client', has('lib/tracking/pixels/FacebookPixel.tsx', 'dispatchMetaBrowserEvent(pageViewEvent)'));
check('verified Purchase uses server-issued event ID in shared browser client',
  has('app/checkout/payment-complete/page.tsx', 'eventId,') &&
  has('app/checkout/payment-complete/page.tsx', "eventName: 'Purchase'") &&
  has('app/checkout/payment-complete/page.tsx', '{ sendCapi: false }'));
check('browser CAPI request builder has no raw customer PII fields',
  !/\b(email|phone|firstName|lastName|city|state|zipCode|country)\s*:/.test(read('lib/meta/browser/payload.ts').split('export function buildMetaBrowserCapiRequest')[1] || ''));
check('production debug output is gated',
  has('lib/meta/browser/diagnostics.ts', "process.env.NODE_ENV !== 'production'") &&
  !/\[MB_DEBUG\]/.test(read('lib/tracking/manager.ts') + read('lib/tracking/ecommerce.ts') + read('lib/tracking/events.ts')));
check('no direct commerce fbq calls remain outside shared client',
  !/fbq\(['\"]track['\"],\s*['\"](ViewContent|AddToCart|InitiateCheckout|Purchase)/.test(
    read('app/checkout/payment-complete/page.tsx') +
    read('lib/tracking/ecommerce.ts') +
    read('lib/tracking/events.ts') +
    read('lib/tracking/pixels/FacebookPixel.tsx')
  ));

const failed = checks.filter((item) => !item.ok);
console.log(`Meta v6 Phase 3 browser audit: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
if (failed.length) process.exit(1);
