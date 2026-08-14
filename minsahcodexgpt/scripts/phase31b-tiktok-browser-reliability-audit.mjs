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

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const manager = read('lib/tracking/manager.ts');
const tiktokPixel = read('lib/tracking/pixels/TikTokPixel.tsx');
const allPixels = read('lib/tracking/pixels/AllPixels.tsx');
const routeTracker = read('lib/tracking/pixels/TikTokRouteTracker.tsx');
const packageJson = JSON.parse(read('package.json') || '{}');

expect('Window ttq is optional and supports page/track/ready', includesAll(manager, [
  'ttq?: {',
  'page?: () => void;',
  'track?: (...args: any[]) => void;',
  'ready?: (callback: () => void) => void;',
  '__mbTikTokInitReady?: boolean;',
]));

expect('TikTok pixel marks init ready after ttq.ready', includesAll(tiktokPixel, [
  'ttq.ready(function ()',
  'window.__mbTikTokInitReady = true;',
  'ttq.page();',
]));

expect('TikTok tracking has bounded retry before dropping events', includesAll(manager, [
  'private trackTikTok(event: TrackingEvent, data?: TrackingEventData, attempt = 0): void',
  'window.__mbTikTokInitReady === true',
  'attempt < 50',
  'window.setTimeout(() => this.trackTikTok(event, data, attempt + 1), 100)',
  'if (!window.ttq?.track)',
]));

expect('Client-side TikTok Purchase remains blocked with official Purchase diagnostic', includesAll(manager, [
  "if (event === 'Purchase')",
  '[TikTok] Generic client-side Purchase is blocked. TikTok Purchase must be sent only by a verified server-side Events API flow.',
  'mb_tiktok_purchase_blocked',
  "mb_original_event: 'Purchase'",
  'return;',
]));

expect('TikTok mapping uses official Purchase event name and no CompletePayment token remains in manager',
  manager.includes("Purchase: 'Purchase'") && !manager.includes('CompletePayment'));

expect('TikTok-specific payload mapper exists and is only used by TikTok tracker', includesAll(manager, [
  'function buildTikTokPayload(data?: TrackingEventData): Record<string, unknown>',
  'function buildTikTokContents(data?: TrackingEventData): TikTokContentPayload[]',
  'payload.content_type =',
  'payload.content_ids = contentIds;',
  'payload.contents = contents;',
  'payload.quantity = quantity;',
  'payload.search_string = searchString;',
  'window.ttq.track(ttEvent, buildTikTokPayload(data));',
]));

expect('Meta Pixel payload path remains untouched', includesAll(manager, [
  "window.fbq('track', fbEvent, data as Record<string, any>, { eventID: eventId });",
  'this.sendToFacebookCAPI(fbEvent, eventId, data);',
  'const identity = getFacebookIdentity();',
]));

expect('GA4 payload path remains untouched', includesAll(manager, [
  "window.gtag('event', gaEvent, buildGoogleEventPayload(gaEvent, data));",
  "if (gaEvent === 'purchase')",
  'mb_ga4_purchase_blocked',
]));

expect('TikTok route tracker uses Next App Router navigation and skips first render', includesAll(routeTracker, [
  "'use client';",
  "usePathname",
  "useSearchParams",
  'const firstRun = useRef(true);',
  'firstRun.current = false;',
  'window.ttq?.page?.();',
]));

expect('AllPixels loads TikTok route tracker only when TikTok Pixel is enabled', includesAll(allPixels, [
  "const TikTokRouteTracker = dynamic(() => import('./TikTokRouteTracker'), { ssr: false });",
  '<TikTokPixel pixelId={config.tiktok.pixelId} enabled />',
  '<TikTokRouteTracker />',
  "process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true' && !!tiktokPixelId",
]));

expect('Package exposes Phase 31B TikTok browser reliability audit',
  packageJson.scripts?.['qa:phase31b-tiktok-browser'] === 'node scripts/phase31b-tiktok-browser-reliability-audit.mjs');

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
