#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const has = (file, ...tokens) => exists(file) && tokens.every((token) => read(file).includes(token));

check('official Business SDK dependency retained', has('package.json', 'facebook-nodejs-business-sdk'));
check('Meta SDK compatibility wrapper delegates lazy FacebookAdsApi initialization to unified transport',
  has('lib/meta-business/sdk.ts', 'createLegacyMetaApi', 'runMetaRequest')
  && has('lib/meta-platform/transports/business-sdk/compatibility.ts', 'new metaSdk.FacebookAdsApi', 'getMetaBusinessSdkRuntime')
);
check('ad account + campaign management', has('lib/meta-business/marketing.ts', 'getAdAccount', 'createCampaign', 'updateCampaign'));
check('ad set + budget/bid management', has('lib/meta-business/marketing.ts', 'createAdSet', 'updateAdSet', 'bid_amount', 'daily_budget'));
check('creative + ad management', has('lib/meta-business/marketing.ts', 'createCreative', 'updateCreative', 'createAd', 'updateAd'));
check('insights and calculated ROAS', has('lib/meta-business/marketing.ts', 'getInsights', 'calculated_roas', 'action_values'));
check('hashed customer audience sync', has('lib/meta-business/audiences.ts', 'sha256', 'createUsersReplace', 'syncDatabaseSegment'));
check('lookalike audience', has('lib/meta-business/audiences.ts', 'createLookalikeAudience', "subtype: 'LOOKALIKE'"));
check('website retargeting audience', has('lib/meta-business/audiences.ts', 'createWebsiteRetargetingAudience', "subtype: 'WEBSITE'"));
check('catalog Items Batch sync', has('lib/meta-business/catalog.ts', 'createItemsBatch', 'syncCatalogProducts'));
check('catalog feed upload and schedule', has('lib/meta-business/catalog.ts', 'createUpload', 'createUploadSchedule'));
check('commerce inventory-only sync', has('lib/meta-business/catalog.ts', 'inventoryOnly'));
check('Lead Ads retrieval and Page subscription', has('lib/meta-business/leads.ts', 'LeadgenForm', 'subscribed_apps'));
check('Lead webhook HMAC signature verification',
  has('app/api/webhooks/meta/route.ts', 'x-hub-signature-256', 'verifyMetaWebhookSignature')
  && has('lib/meta/leads/signature.ts', '@/lib/meta-platform/transports/webhook')
  && has('lib/meta-platform/transports/webhook/signature.ts', 'createHmac', 'timingSafeEqual')
);
check('offline conversion uses Phase 28 dataset-aware cutover facade',
  has('lib/meta-business/offline.ts', 'sendMetaCapiWithPhase28Cutover', 'pixelId: config.datasetId')
  && !has('lib/meta-business/offline.ts', 'sendMetaCapiWithBusinessSdk')
  && !has('lib/meta-business/offline.ts', 'requireMetaConfig')
);
check('catalog feed is token-protected', has('app/api/meta/catalog/feed/route.ts', 'timingSafeEqual', 'catalogFeedToken'));
check('all Meta writes are privileged and ad writes require explicit approval',
  [
    'app/api/admin/meta/campaigns/route.ts',
    'app/api/admin/meta/adsets/route.ts',
    'app/api/admin/meta/creatives/route.ts',
    'app/api/admin/meta/ads/route.ts',
  ].every((file) => has(file, 'requireAdminPermission', 'META_OPS_OPERATE', 'executeApprovedMetaAdsMutation'))
  && [
    'app/api/admin/meta/audiences/route.ts',
    'app/api/admin/meta/catalogs/route.ts',
    'app/api/admin/meta/offline-events/route.ts',
  ].every((file) => has(file, 'requireSuperAdmin'))
  && has('lib/meta/admin/policy.ts', "META_AD_MUTATION: { risk: 'CRITICAL', requiresApproval: true }")
);
check('access tokens are not persisted by settings route', !has('app/api/admin/meta/settings/route.ts', 'conversionApiToken') && !has('app/api/admin/meta/settings/route.ts', 'accessToken:'));
check('Meta lead and sync log migration exists', has('prisma/migrations/20260716000100_add_meta_business_platform/migration.sql', 'MetaLead', 'MetaBusinessSyncLog'));
check('admin Meta Business console exists', has('app/admin/meta-business/page.tsx', 'Meta Business Manager', 'Full Catalog Sync'));
check('environment contract documented', has('.env.example', 'META_BUSINESS_ACCESS_TOKEN', 'META_WEBHOOK_VERIFY_TOKEN', 'META_CATALOG_FEED_TOKEN'));
check('implementation documentation exists', exists('docs/implementation/meta-business-platform.md'));

const failed = checks.filter((item) => !item.ok);
const result = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, issues: failed.map((item) => item.name) };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
