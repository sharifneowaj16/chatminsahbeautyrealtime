import fs from 'fs';

const checks = [];
function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function check(name, condition, detail = '') {
  checks.push({ name, passed: Boolean(condition), detail });
}

const helper = read('lib/tracking/tiktok-attribution.ts');
const capture = read('lib/tracking/pixels/AttributionCookieCapture.tsx');
const proxy = read('proxy.ts');
const orderAttribution = read('lib/tracking/order-attribution.ts');
const schema = read('prisma/schema.prisma');
const envExample = read('.env.example');
const envProd = read('ENVIRONMENT_VARIABLES_PRODUCTION.md');
const packageJson = JSON.parse(read('package.json'));
const migrationPath = 'prisma/migrations/20260709010000_phase31c_tiktok_attribution_capture/migration.sql';
const migration = fs.existsSync(migrationPath) ? read(migrationPath) : '';

check('TikTok attribution helper exists', helper.includes("TIKTOK_CLICK_ID_COOKIE = 'ttclid'") && helper.includes("TIKTOK_TTP_COOKIE = '_ttp'"));
check('ttclid retention is configurable and clamped', helper.includes('resolveTikTokClickIdMaxAgeSeconds') && helper.includes('DEFAULT_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 90') && helper.includes('MAX_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 365'));
check('Client capture reads ttclid and sets TikTok cookie', capture.includes('captureTikTokClickId') && capture.includes("searchParams.get('ttclid')") && capture.includes('setCookie(TIKTOK_CLICK_ID_COOKIE'));
check('Client ttclid capture uses public configurable retention', capture.includes('NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS') && capture.includes('TIKTOK_CLICK_ID_MAX_AGE_SECONDS'));
check('Client ttclid capture has consent guard', capture.includes('canLoadNonEssentialTracking(getClientTrackingConsent())'));
check('Proxy captures ttclid server-side', proxy.includes("searchParams.get('ttclid')") && proxy.includes('response.cookies.set(TIKTOK_CLICK_ID_COOKIE'));
check('Proxy ttclid retention uses server env first', proxy.includes('process.env.TIKTOK_CLICK_ID_MAX_AGE_DAYS') && proxy.includes('process.env.NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS'));
check('Proxy ttclid capture has consent guard', proxy.includes('canApplyTikTokAttributionCookies') && proxy.includes('TRACKING_CONSENT_COOKIE'));
check('Order attribution saves TikTok match keys', orderAttribution.includes('tiktokClickId') && orderAttribution.includes('tiktokTtp') && orderAttribution.includes('tiktokExternalId'));
check('Order attribution respects tracking consent for TikTok keys', orderAttribution.includes('nonEssentialTrackingAllowed') && orderAttribution.includes('cleanTikTokAttributionValue(readDecodedCookie(request, TIKTOK_CLICK_ID_COOKIE))'));
check('Prisma Order has TikTok attribution fields', schema.includes('tiktokClickId') && schema.includes('tiktokTtp') && schema.includes('tiktokExternalId'));
check('Prisma Order has future TikTok Events API idempotency fields', schema.includes('tiktokEventId') && schema.includes('tiktokPurchaseSent') && schema.includes('tiktokPurchaseProcessingAt'));
check('Prisma indexes TikTok fields', schema.includes('@@index([tiktokClickId])') && schema.includes('@@index([tiktokEventId])') && schema.includes('@@index([tiktokPurchaseSent])'));
check('Migration adds TikTok columns only', migration.includes('ADD COLUMN "tiktokClickId"') && migration.includes('ADD COLUMN "tiktokPurchaseSent"') && !migration.includes('DROP COLUMN'));
check('Env example documents configurable ttclid retention', envExample.includes('TIKTOK_CLICK_ID_MAX_AGE_DAYS=90') && envExample.includes('NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS=90'));
check('Production env doc documents ttclid retention', envProd.includes('TIKTOK_CLICK_ID_MAX_AGE_DAYS') && envProd.includes('NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS'));
check('Package script registered', packageJson.scripts?.['qa:phase31c-tiktok-attribution'] === 'node scripts/phase31c-tiktok-attribution-audit.mjs');

// Meta/GA4 safety invariants: do not remove or rename existing core attribution fields.
check('Meta attribution fields preserved', schema.includes('fbp                  String?') && schema.includes('fbc                  String?') && schema.includes('metaPurchaseSent     Boolean   @default(false)'));
check('GA4 attribution fields preserved', schema.includes('gaClientId           String?') && schema.includes('gaPurchaseSent       Boolean   @default(false)') && schema.includes('gaPurchaseProcessingAt DateTime?'));
check('Existing order creation still spreads orderAttribution', read('app/api/orders/route.ts').includes('...orderAttribution') && read('app/api/buy-now/orders/route.ts').includes('...orderAttribution'));

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nPhase 31C TikTok attribution audit: ${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length) {
  process.exit(1);
}
