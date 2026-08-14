#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const checks = [];
const issues = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function indexOfOrInf(content, token) {
  const index = content.indexOf(token);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

const manager = read('lib/tracking/manager.ts');
const allPixels = read('lib/tracking/pixels/AllPixels.tsx');
const adminTracking = read('app/admin/tracking/page.tsx');
const envExample = read('.env.example');
const prodEnvDocs = read('ENVIRONMENT_VARIABLES_PRODUCTION.md');
const trackingDocs = read('tracking.md');
const phaseDocs = read('docs/production/phase-7-tiktok-tracking-safety.md');
const packageJson = JSON.parse(read('package.json') || '{}');

expect('manager defines canonical TikTok pixel id', manager.includes("const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || ''"));
expect('manager requires explicit TikTok enabled flag plus pixel id', includesAll(manager, [
  'const tiktokPixelEnabled =',
  "process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true' && !!tiktokPixelId",
  'enabled: tiktokPixelEnabled',
  'pixelId: tiktokPixelId',
]));
expect('manager no longer enables TikTok from pixel id alone', !manager.includes('enabled: !!process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID'));

expect('AllPixels defines canonical TikTok pixel id', allPixels.includes("const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || ''"));
expect('AllPixels uses same explicit flag plus pixel id contract', includesAll(allPixels, [
  'const tiktokPixelEnabled =',
  "process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true' && !!tiktokPixelId",
  'enabled: tiktokPixelEnabled',
  'pixelId: tiktokPixelId',
]));

const purchaseGuardIndex = indexOfOrInf(manager, "if (event === 'Purchase')");
const mapIndex = indexOfOrInf(manager, 'const ttEvent = this.mapToTikTokEvent(event);');
const trackIndex = indexOfOrInf(manager, 'window.ttq.track(ttEvent, data);');
expect('TikTok generic Purchase guard exists before event mapping', purchaseGuardIndex < mapIndex);
expect('TikTok generic Purchase guard exists before ttq.track', purchaseGuardIndex < trackIndex);
expect('TikTok Purchase guard blocks browser Purchase and emits diagnostic', includesAll(manager, [
  '[TikTok] Generic client-side Purchase is blocked',
  'server-side Events API flow',
  'mb_tiktok_purchase_blocked',
  'tiktok_purchase_requires_verified_server_side_events_api',
  "mb_original_event: 'Purchase'",
  'transaction_id: data?.transaction_id || data?.orderId',
  'return;',
]));
expect('TikTok mapping uses current official Purchase event name while guard blocks browser firing', includesAll(manager, [
  "Purchase: 'Purchase'",
  'mapToTikTokEvent',
]));

expect('admin tracking dashboard does not show fake TikTok ROAS/revenue as verified', includesAll(adminTracking, [
  'const tiktokBrowserPixelEnabled =',
  'enabled: tiktokBrowserPixelEnabled',
  'events: 0',
  'conversions: 0',
  'revenue: 0',
  'roas: 0',
  'ROAS hidden',
  'Use Tracking Health for verified Purchase status',
]) && !adminTracking.includes('tiktok: { enabled: true, events: 5678') && !adminTracking.includes("source: 'TikTok'"));

expect('.env.example documents TikTok explicit enable flag and server-side gate', includesAll(envExample, [
  'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED=false',
  'NEXT_PUBLIC_TIKTOK_PIXEL_ID=',
  'TIKTOK_EVENTS_API_ENABLED=false',
  'TIKTOK_PURCHASE_LIVE_VERIFIED=false',
]));
expect('production env docs document TikTok browser and Events API gates', includesAll(prodEnvDocs, [
  'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED',
  'NEXT_PUBLIC_TIKTOK_PIXEL_ID',
  'TIKTOK_EVENTS_API_ENABLED',
  'TIKTOK_PURCHASE_LIVE_VERIFIED',
]));
expect('tracking.md documents Phase 7 TikTok safety contract', includesAll(trackingDocs, [
  'Phase 7 — TikTok browser tracking safety',
  'Generic client-side `Purchase` is blocked',
  'mb_tiktok_purchase_blocked',
  'server-side TikTok Events API flow',
]));
expect('Phase 7 production doc exists and explains no Events API Purchase/ROAS yet', exists('docs/production/phase-7-tiktok-tracking-safety.md') && includesAll(phaseDocs, [
  'Prevent accidental unverified TikTok `Purchase` events',
  'server-side TikTok Events API flow',
  'not be treated as verified',
]));
expect('package.json exposes Phase 7 TikTok tracking safety audit', packageJson.scripts?.['qa:phase7-tiktok-tracking-safety'] === 'node scripts/phase7-tiktok-tracking-safety-audit.mjs');

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = {
  ok: failed === 0,
  passed,
  failed,
  issueCount: issues.length,
  issues,
};

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
