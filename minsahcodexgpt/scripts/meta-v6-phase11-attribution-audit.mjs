#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const has = (file, ...tokens) => { const source = read(file); return Boolean(source) && tokens.every((token) => source.includes(token)); };
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260718030000_meta_v6_phase11_attribution/migration.sql');
const repo = read('lib/attribution/repository.ts');
const reports = read('lib/attribution/reports.ts');
const ui = read('app/admin/meta/page.tsx');
const checks = [
  ['P11-01','Attribution conversion enum',schema.includes('enum MarketingAttributionConversionType') && schema.includes('SESSION') && schema.includes('LEAD') && schema.includes('ORDER')],
  ['P11-02','Separate source model enum',has('prisma/schema.prisma','enum MarketingAttributionSourceModel','FIRST_PARTY','META_REPORTED')],
  ['P11-03','Attribution persistence model',has('prisma/schema.prisma','model MarketingAttribution','attributionKey','firstTouch','lastTouch','checkoutSnapshot')],
  ['P11-04','Immutable correction evidence',has('prisma/schema.prisma','correctionAudit','dataQuality','captureCount')],
  ['P11-05','Daily aggregate model',has('prisma/schema.prisma','model MarketingAttributionDailyAggregate','sessions','leads','orders','revenue')],
  ['P11-06','Forward migration',migration.includes('CREATE TABLE "MarketingAttribution"') && migration.includes('CREATE TABLE "MarketingAttributionDailyAggregate"')],
  ['P11-07','Order and lead indexes',migration.includes('MarketingAttribution_orderId_idx') && migration.includes('MarketingAttribution_leadId_idx')],
  ['P11-08','Capture contract',has('lib/attribution/types.ts','AttributionCaptureInput','sessionId','visitorId','fbclid','fbc','fbp')],
  ['P11-09','Session identity validation',has('lib/attribution/session.ts','SAFE_SESSION_ID','buildAttributionKey')],
  ['P11-10','UTM normalization',has('lib/attribution/capture.ts','normalizeDimension','utmSource','utmMedium','utmCampaign')],
  ['P11-11','Landing URL sanitation',has('lib/attribution/capture.ts','sanitizeTrackingUrl','landingPage')],
  ['P11-12','Capture time policy',has('lib/attribution/capture.ts','MAX_CAPTURE_AGE_MS','MAX_FUTURE_SKEW_MS','ATTRIBUTION_CAPTURE_TOO_OLD')],
  ['P11-13','Identifier format bounds',has('lib/attribution/capture.ts','SAFE_CLICK_ID','SAFE_META_COOKIE')],
  ['P11-14','First touch immutability',has('lib/attribution/first-touch.ts','return existing ?? incoming','firstTouchConflict')],
  ['P11-15','Direct traffic policy',has('lib/attribution/last-touch.ts','Direct traffic does not overwrite','incoming.direct && !existing.direct')],
  ['P11-16','Atomic capture transaction',repo.includes('FOR UPDATE') && repo.includes('captureInTransaction') && repo.includes('db.$transaction')],
  ['P11-17','No silent first-touch overwrite',repo.includes('resolveFirstTouch(existing?.firstTouch') && repo.includes('FIRST_TOUCH_CONFLICT_IGNORED')],
  ['P11-18','Duplicate session upsert',repo.includes('"captureCount"="captureCount"+1') && repo.includes('attributionKey')],
  ['P11-19','Immutable order snapshot',repo.includes('snapshotOrderAttributionInTransaction') && repo.includes('ON CONFLICT ("attributionKey") DO NOTHING')],
  ['P11-20','Lead attribution inheritance',repo.includes('linkLeadAttributionToOrderInTransaction') && repo.includes('LEAD_ATTRIBUTION_INHERITANCE')],
  ['P11-21','Consent-aware capture API',has('app/api/attribution/capture/route.ts','resolveTrackingDecision','allowCapiEvent','captureMarketingAttribution')],
  ['P11-22','Traffic exclusion',has('app/api/attribution/capture/route.ts','shouldSkipServerTrackingRequest','skipped')],
  ['P11-23','Browser session capture',has('lib/tracking/pixels/AttributionCookieCapture.tsx','ensureAttributionSessionId','/api/attribution/capture','keepalive: true')],
  ['P11-24','Consent cleanup includes session',has('lib/tracking/tracking-consent.ts',"'mb_sid'",'NON_ESSENTIAL_TRACKING_COOKIES')],
  ['P11-25','Transactional order linkage',has('app/api/orders/route.ts','snapshotOrderAttributionInTransaction','tx as unknown as AttributionDb')],
  ['P11-26','Lead conversion linkage',has('lib/meta/leads/repository.ts','linkLeadAttributionToOrderInTransaction','nextStatus === \'CONVERTED\'')],
  ['P11-27','Coverage calculation',has('lib/attribution/aggregation.ts','calculateAttributionCoverage','unattributedOrders')],
  ['P11-28','Separate measurement labels',has('lib/attribution/aggregation.ts','First-party attribution','Meta-reported attribution','comparable: false')],
  ['P11-29','Campaign growth report',has('lib/attribution/reports.ts','getFirstPartyCampaignReport','sessions','leads','orders','revenue')],
  ['P11-30','Data quality report',has('lib/attribution/reports.ts','getAttributionDataQuality','missingClickId','missingFirstTouch')],
  ['P11-31','Aggregate-only protected API',has('app/api/admin/meta/attribution/route.ts','META_OPS_VIEW','getAttributionReport')],
  ['P11-32','No customer PII report columns',!/SELECT[^`]*(email|phone|customerIp|customerUa)/i.test(reports)],
  ['P11-33','Operations Center report UI',ui.includes('Campaign → sessions, leads, orders and revenue') && ui.includes('Attribution data quality')],
  ['P11-34','Explicit model separation UI',ui.includes('First-party attribution and Meta-reported attribution are separate measurement models')],
  ['P11-35','Daily aggregation worker',has('workers/meta-attribution.worker.ts','ATTRIBUTION_DAILY_AGGREGATE','refreshAttributionDailyAggregates')],
  ['P11-36','Order backfill guard',has('workers/meta-attribution.worker.ts','ATTRIBUTION_ORDER_BACKFILL','REQUIRES_ORDER_REQUEST_CONTEXT_OR_EXPLICIT_CORRECTION_AUDIT')],
  ['P11-37','Lead conversion worker',has('workers/meta-attribution.worker.ts','ATTRIBUTION_LEAD_CONVERSION_LINK')],
  ['P11-38','Data quality worker',has('workers/meta-attribution.worker.ts','ATTRIBUTION_DATA_QUALITY')],
  ['P11-39','Attribution metrics',has('lib/observability/metrics.ts','meta_attribution_capture_total','meta_attribution_order_coverage_ratio','meta_attribution_first_touch_conflict_total')],
  ['P11-40','A13 typed approval audit corrected',has('scripts/meta-v6-gap-audit.mjs','enum MetaApprovalStatus','enum MetaAdminApprovalStatus')],
  ['P11-41','Semantic suite',has('tests/meta-v6/phase11-attribution-analytics.test.ts','first touch is immutable','Meta-reported models are explicitly separate','lead conversion are integrated')],
];
const failures = checks.filter(([, , ok]) => !ok);
for (const [id,label,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${id} ${label}`);
console.log(`\nPhase 11 static audit: ${checks.length-failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);
