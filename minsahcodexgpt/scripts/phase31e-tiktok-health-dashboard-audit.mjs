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
    issues.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const health = read('lib/tracking/health.ts');
const healthPage = read('app/admin/tracking-health/page.tsx');
const trackingPage = read('app/admin/tracking/page.tsx');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260709020000_phase31e_tiktok_tracking_health_dashboard/migration.sql');
const packageJson = JSON.parse(read('package.json') || '{}');

expect('Tracking health snapshot exposes TikTok Events API metrics', includesAll(health, [
  'expectedTikTokPurchases',
  'tiktokEventsApiEnabled',
  'tiktokPurchaseLiveVerified',
  'tiktokPurchaseSent',
  'pendingTiktokPurchaseOrders',
  'tiktokFailures',
  'tiktokFinalFailures',
  'tiktokTokenInvalidFailures',
]));

expect('Tracking health counts TikTok failures provider-specifically', includesAll(health, [
  "provider: 'TIKTOK', createdAt: { gte: since }",
  "provider: 'TIKTOK', createdAt: { gte: since }, finalFailed: true",
  "failure.provider === 'TIKTOK' && containsTokenError",
]));

expect('Meta CAPI failures stay provider-specific and are not polluted by TikTok/GA4', includesAll(health, [
  "provider: 'META', createdAt: { gte: since }",
  "provider: 'META', createdAt: { gte: since }, finalFailed: true",
  "failure.provider === 'META' && containsTokenError",
]));

expect('TikTok Purchase gap and zero-purchase issues only run when Events API/live verification gates are active', includesAll(health, [
  'tiktokEventsApiEnabled && tiktokPurchaseLiveVerified',
  "code: 'TIKTOK_PURCHASE_GAP'",
  "code: 'ZERO_TIKTOK_PURCHASE'",
  "code: 'TIKTOK_PURCHASE_LIVE_NOT_VERIFIED'",
]));

expect('TikTok pending/failure issues are surfaced separately', includesAll(health, [
  "code: 'TIKTOK_FINAL_FAILURES'",
  "code: 'TIKTOK_FAILURES'",
  "code: 'TIKTOK_TOKEN_OR_PERMISSION_FAILURE'",
  "code: 'PENDING_TIKTOK_PURCHASE_ORDERS'",
]));

expect('Tracking health history persists TikTok sent and failure counts additively', includesAll(health, [
  'tiktokPurchaseSent: snapshot.metrics.tiktokPurchaseSent',
  'tiktokFailureCount: snapshot.metrics.tiktokFailures',
  'tiktokPurchaseSent: true',
  'tiktokFailureCount: true',
]));

expect('Prisma TrackingHealthCheck has additive TikTok columns', includesAll(schema, [
  'tiktokPurchaseSent    Int      @default(0)',
  'tiktokFailureCount    Int      @default(0)',
]) && includesAll(migration, [
  'ADD COLUMN IF NOT EXISTS "tiktokPurchaseSent"',
  'ADD COLUMN IF NOT EXISTS "tiktokFailureCount"',
]) && !migration.includes('DROP COLUMN'));

expect('Admin tracking health page renders TikTok Events API health cards', includesAll(healthPage, [
  'TikTok Events API Health',
  'TikTok Purchase Sent',
  'TikTok Pending Orders',
  'TikTok Failures',
  'ttclid Coverage',
  '_ttp Coverage',
  'IP + UA Coverage',
]));

expect('Failure table supports provider-aware TikTok match key labels', includesAll(healthPage, [
  'getFailureSignalLabels',
  "failure.provider === 'TIKTOK'",
  "label: 'ttclid'",
  "label: 'ttp'",
  'Recent Meta/GA4/TikTok Failures',
]));

expect('Manual cleanup/retry copy includes TikTok, not Meta/GA4 only', includesAll(healthPage, [
  'Delete eligible old Meta/GA4/TikTok failure rows now?',
  'unless the selected platform accepts the event',
]));

expect('Tracking analytics page hides fake TikTok ROAS and removes mock TikTok source row',
  includesAll(trackingPage, [
    'ROAS hidden',
    'Use Tracking Health for verified Purchase status',
    'Browser Pixel active; server Events API status lives in Tracking Health. ROAS hidden until verified.',
  ]) && !trackingPage.includes("source: 'TikTok'")
);

expect('Package exposes Phase 31E audit script', packageJson.scripts?.['qa:phase31e-tiktok-health'] === 'node scripts/phase31e-tiktok-health-dashboard-audit.mjs');

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
