import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAttributionCapture } from '@/lib/attribution/capture';
import { resolveFirstTouch, firstTouchConflict } from '@/lib/attribution/first-touch';
import { resolveLastTouch, DIRECT_TRAFFIC_POLICY } from '@/lib/attribution/last-touch';
import { calculateAttributionCoverage, labelAttributionModel } from '@/lib/attribution/aggregation';
import { inheritLeadAttribution } from '@/lib/attribution/order-link';
import type { AttributionTouch } from '@/lib/attribution/types';

const paid: AttributionTouch = {
  source: 'facebook', medium: 'paid-social', campaign: 'eid-sale', capturedAt: '2026-07-17T10:00:00.000Z', direct: false,
};
const direct: AttributionTouch = {
  source: 'direct', medium: 'none', campaign: 'unattributed', capturedAt: '2026-07-17T11:00:00.000Z', direct: true,
};

test('first touch is immutable and conflicting later capture is detectable', () => {
  const later = { ...paid, campaign: 'retargeting', capturedAt: '2026-07-17T12:00:00.000Z' };
  assert.equal(resolveFirstTouch(paid, later), paid);
  assert.equal(firstTouchConflict(paid, later), true);
  assert.equal(firstTouchConflict(null, later), false);
});

test('eligible last touch updates while direct traffic does not overwrite paid touch', () => {
  assert.equal(resolveLastTouch(paid, direct), paid);
  const laterPaid = { ...paid, campaign: 'retargeting' };
  assert.equal(resolveLastTouch(paid, laterPaid), laterPaid);
  assert.match(DIRECT_TRAFFIC_POLICY, /does not overwrite/);
});

test('capture contract normalizes UTM, sanitizes landing URL and bounds identifiers', () => {
  const capture = buildAttributionCapture({
    sessionId: 'sid_12345678', visitorId: 'visitor_12345678',
    landingPage: 'https://minsahbeauty.cloud/product/x?utm_source=Facebook&email=secret@example.com&access_token=hidden',
    utm: { source: ' Facebook ', medium: ' PAID-SOCIAL ', campaign: ' Eid Sale ', term: ' lipstick ' },
    fbclid: 'abc.DEF-123', fbc: 'fb.1.1760000000000.abc.DEF-123', fbp: 'fb.1.1760000000000.123456789',
    capturedAt: '2026-07-17T10:00:00.000Z', consentState: 'granted',
  }, new Date('2026-07-17T10:01:00.000Z'));
  assert.equal(capture.utmSource, 'facebook');
  assert.equal(capture.utmMedium, 'paid-social');
  assert.equal(capture.touch.direct, false);
  assert.doesNotMatch(capture.landingPage ?? '', /email|access_token|secret@example|hidden/);
  assert.equal(capture.consentState, 'GRANTED');
  assert.equal(capture.attributionKey, 'session:sid_12345678');
});

test('capture rejects backdated events beyond policy', () => {
  assert.throws(() => buildAttributionCapture({ sessionId: 'sid_12345678', capturedAt: '2025-01-01T00:00:00Z' }, new Date('2026-07-17T00:00:00Z')), /ATTRIBUTION_CAPTURE_TOO_OLD/);
});

test('coverage math exposes unattributed orders without division errors', () => {
  assert.deepEqual(calculateAttributionCoverage({ windowDays: 30, totalOrders: 10, attributedOrders: 7, withFbp: 6, withFbc: 5, consentDenied: 1, leadLinkedOrders: 2 }), {
    windowDays: 30, totalOrders: 10, attributedOrders: 7, unattributedOrders: 3, coverage: 0.7, withFbp: 6, withFbc: 5, consentDenied: 1, leadLinkedOrders: 2,
  });
  assert.equal(calculateAttributionCoverage({ windowDays: 30, totalOrders: 0, attributedOrders: 0, withFbp: 0, withFbc: 0, consentDenied: 0, leadLinkedOrders: 0 }).coverage, null);
});

test('lead attribution fills missing/direct order touch but preserves paid first touch', () => {
  const leadTouch = { ...paid, campaign: 'lead-campaign' };
  const inherited = inheritLeadAttribution({ orderFirstTouch: paid, orderLastTouch: direct, leadTouch });
  assert.equal(inherited.firstTouch, paid);
  assert.equal(inherited.lastTouch, leadTouch);
  assert.equal(inherited.inherited, true);
});

test('first-party and Meta-reported models are explicitly separate', () => {
  const first = labelAttributionModel('FIRST_PARTY');
  const meta = labelAttributionModel('META_REPORTED');
  assert.notEqual(first.label, meta.label);
  assert.equal(first.comparable, false);
  assert.equal(meta.comparable, false);
});

test('schema and migration persist immutable attribution and daily aggregates', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260718030000_meta_v6_phase11_attribution/migration.sql', 'utf8');
  for (const token of ['model MarketingAttribution', 'model MarketingAttributionDailyAggregate', 'enum MarketingAttributionConversionType', 'enum MarketingAttributionSourceModel', 'checkoutSnapshot', 'correctionAudit']) assert.match(schema, new RegExp(token));
  assert.match(schema, /attributionKey\s+String\s+@unique/);
  assert.match(migration, /CREATE TABLE "MarketingAttribution"/);
  assert.match(migration, /CREATE TABLE "MarketingAttributionDailyAggregate"/);
});

test('repository preserves first touch, immutable order snapshot and audited lead inheritance', () => {
  const source = fs.readFileSync('lib/attribution/repository.ts', 'utf8');
  assert.match(source, /resolveFirstTouch\(existing\?\.firstTouch/);
  assert.match(source, /ON CONFLICT \("attributionKey"\) DO NOTHING/);
  assert.match(source, /FIRST_TOUCH_CONFLICT_IGNORED/);
  assert.match(source, /LEAD_ATTRIBUTION_INHERITANCE/);
  assert.match(source, /linkLeadAttributionToOrderInTransaction/);
});

test('browser capture, order creation and lead conversion are integrated', () => {
  const browser = fs.readFileSync('lib/tracking/pixels/AttributionCookieCapture.tsx', 'utf8');
  const order = fs.readFileSync('app/api/orders/route.ts', 'utf8');
  const leads = fs.readFileSync('lib/meta/leads/repository.ts', 'utf8');
  assert.match(browser, /api\/attribution\/capture/);
  assert.match(browser, /ensureAttributionSessionId/);
  assert.match(order, /snapshotOrderAttributionInTransaction/);
  assert.match(leads, /linkLeadAttributionToOrderInTransaction/);
});

test('admin report is aggregate-only and labels provider measurement separately', () => {
  const reports = fs.readFileSync('lib/attribution/reports.ts', 'utf8');
  const route = fs.readFileSync('app/api/admin/meta/attribution/route.ts', 'utf8');
  const ui = fs.readFileSync('app/admin/meta/page.tsx', 'utf8');
  assert.match(route, /META_OPS_VIEW/);
  assert.match(reports, /First-party attribution|labelAttributionModel/);
  assert.match(reports, /Meta Insights endpoint/);
  assert.doesNotMatch(reports, /SELECT[^`]*(email|phone|customerIp|customerUa)/i);
  assert.match(ui, /First-party attribution and Meta-reported attribution are separate measurement models/);
});

test('background worker exposes all specified attribution jobs and quality metrics', () => {
  const worker = fs.readFileSync('workers/meta-attribution.worker.ts', 'utf8');
  const metrics = fs.readFileSync('lib/observability/metrics.ts', 'utf8');
  for (const token of ['ATTRIBUTION_DAILY_AGGREGATE', 'ATTRIBUTION_ORDER_BACKFILL', 'ATTRIBUTION_LEAD_CONVERSION_LINK', 'ATTRIBUTION_DATA_QUALITY']) assert.match(worker, new RegExp(token));
  for (const token of ['meta_attribution_capture_total', 'meta_attribution_order_snapshot_total', 'meta_attribution_lead_order_link_total', 'meta_attribution_first_touch_conflict_total', 'meta_attribution_order_coverage_ratio']) assert.match(metrics, new RegExp(token));
});

test('A13 gate accepts the existing typed admin approval lifecycle enum', () => {
  const audit = fs.readFileSync('scripts/meta-v6-gap-audit.mjs', 'utf8');
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  assert.match(schema, /enum MetaAdminApprovalStatus/);
  assert.match(audit, /MetaAdminApprovalStatus/);
});
