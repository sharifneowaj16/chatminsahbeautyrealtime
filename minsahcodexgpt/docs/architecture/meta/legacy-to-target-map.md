# Legacy-to-target Meta migration map

> Generated from the frozen Phase 19 manifest. This is a migration control document, not evidence that any provider cutover has occurred.

## Capability migration map

| Capability | Files | Representative current roots | Target | Phase | Cutover flag | Final action |
| --- | --- | --- | --- | --- | --- | --- |
| admin-observability | 46 | `app/admin/AdminLayoutWrapper.tsx`, `app/admin/meta`, `app/api/admin`, `instrumentation.ts`, `lib/auth/admin-permissions.ts`, `lib/meta-platform/admin` +8 more | lib/meta-platform/{governance,observability}/** and app/admin/meta-platform/** | 32 | META_PLATFORM_ADMIN_CONTROL | MIGRATE_TO_UNIFIED_CONTROL_PLANE |
| ads-marketing | 38 | `app/api/admin`, `lib/meta-business/audiences.ts`, `lib/meta-business/marketing.ts`, `lib/meta-platform/domains`, `lib/meta-platform/migration`, `lib/meta/ads` +3 more | lib/meta-platform/domains/{ads,insights,audiences}/** | 29 | META_PLATFORM_ADS_WRITES | MIGRATE_WITH_APPROVAL_AND_KILL_SWITCH |
| browser-measurement | 35 | `app/admin/tracking-health`, `app/api/admin`, `app/api/payments`, `app/api/telegram`, `app/checkout/payment-complete`, `components/tracking/MetaEventBridge.tsx` +20 more | lib/meta-platform/domains/measurement/browser/** | 32 | META_PLATFORM_BROWSER_MEASUREMENT | ADAPT_TO_CANONICAL_MEASUREMENT_CONTRACT |
| capi-delivery | 27 | `app/api/facebook-capi`, `app/api/tracking`, `lib/meta-platform/domains`, `lib/meta-platform/migration`, `lib/meta/capi`, `lib/queue/metaCapiOutboxQueue.ts` +5 more | lib/meta-platform/domains/capi/** | 28 | META_PLATFORM_CAPI_WRITES | MIGRATE_THEN_DISABLE_LEGACY_PRODUCER |
| catalog-commerce | 48 | `app/api/admin`, `app/api/internal`, `app/api/meta`, `lib/meta-business/catalog.ts`, `lib/meta-platform/domains`, `lib/meta-platform/migration` +9 more | lib/meta-platform/domains/catalog/** | 30 | META_PLATFORM_CATALOG_WRITES | MIGRATE_THEN_DISABLE_LEGACY_CATALOG_WRITES |
| connection-health | 27 | `app/api/admin`, `lib/meta-platform/domains`, `lib/meta-platform/migration`, `lib/meta/connection`, `prisma/migrations/20260717050000_meta_v6_phase7_connection_health`, `workers/meta-token-health.worker.ts` | lib/meta-platform/domains/connection/** | 28 | META_PLATFORM_CONNECTION_READS | MIGRATE_THEN_DISABLE_LEGACY_PATH |
| credentials-versioning | 21 | `.env.example`, `config/env.manifest.json`, `config/meta-platform-permission-matrix.json`, `lib/meta-business/config.ts`, `lib/meta-platform/capabilities`, `lib/meta-platform/credentials` +4 more | lib/meta-platform/credentials/** and lib/meta-platform/versioning/** | 22 | META_PLATFORM_CREDENTIALS | CENTRALIZE_AND_REMOVE_CROSS_ROLE_FALLBACKS |
| facebook-oauth | 1 | `lib/auth/nextauth.ts` | lib/auth/** | 32 | NONE_REQUIRED | RETAIN_OUTSIDE_PROVIDER_OPERATION_FACADE_WITH_EXPLICIT_BOUNDARY |
| graph-media-boundary | 20 | `components/catalog/CatalogProductImage.tsx`, `lib/meta-platform/transports`, `next.config.ts`, `proxy.ts` | lib/meta-platform/transports/{graph-http,media}/** | 24 | META_PLATFORM_GRAPH_TRANSPORT | MIGRATE_TO_GRAPH_AND_MEDIA_TRANSPORTS |
| instagram-crm | 50 | `app/admin/meta`, `app/api/admin`, `app/api/webhooks`, `lib/meta-platform/contracts`, `lib/meta-platform/domains`, `lib/meta-platform/errors` +6 more | lib/meta-platform/domains/instagram/** | 31 | META_PLATFORM_INSTAGRAM | MIGRATE_THEN_DISABLE_DIRECT_GRAPH_CLIENTS |
| lead-ads-crm | 50 | `app/admin/meta-business`, `app/api/admin`, `app/api/webhooks`, `lib/meta-business/leads.ts`, `lib/meta-platform/contracts`, `lib/meta-platform/domains` +5 more | lib/meta-platform/domains/leads/** | 31 | META_PLATFORM_LEADS | MIGRATE_WITH_RECEIPT_FIRST_CUTOVER |
| lead-rollback-compatibility | 1 | `lib/meta/leads` | lib/meta-platform/domains/leads/production.ts explicit rollback adapter only | 31 | META_PHASE31_LEAD_RUNTIME | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| legacy-facebook | 5 | `app/api/admin`, `lib/facebook/inboxSync.ts`, `lib/facebook/profile.ts`, `lib/facebook/utils.ts`, `types/facebook.ts` | lib/meta-platform domains or explicitly retained identity boundary | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| measurement-attribution | 14 | `app/api/admin`, `lib/attribution/aggregation.ts`, `lib/attribution/capture.ts`, `lib/attribution/reports.ts`, `lib/attribution/repository.ts`, `lib/attribution/types.ts` +7 more | lib/meta-platform/domains/measurement/** | 32 | META_PLATFORM_MEASUREMENT | MIGRATE_TO_GOVERNED_MEASUREMENT_DOMAIN |
| meta-data-model | 14 | `lib/meta-platform/context`, `lib/meta-platform/models`, `lib/meta-platform/references`, `prisma/migrations/20260629000000_add_meta_purchase_processing_at`, `prisma/migrations/20260629010000_add_meta_browser_purchase_sent`, `prisma/migrations/20260629030000_rename_meta_browser_purchase_sent_to_claimed` +3 more | lib/meta-platform/models/**, references/** and future Prisma migrations | 21 | META_PLATFORM_DATA_MODEL | MAP_TO_CANONICAL_MODELS_AND_FORWARD_MIGRATIONS |
| meta-operations | 25 | `lib/jobs/audit-repository.ts`, `lib/jobs/health.ts`, `lib/jobs/job-types.ts`, `lib/jobs/queues.ts`, `lib/jobs/retry-policy.ts`, `lib/jobs/scheduler.ts` +8 more | lib/meta-platform/{operations,jobs}/** | 25 | META_PLATFORM_OPERATIONS_LEDGER | RETAIN_AND_ADAPT_TO_OPERATION_LEDGER |
| meta-reliability | 16 | `lib/meta-platform/reliability`, `prisma/migrations/20260722233000_add_meta_reliability_governance` | lib/meta-platform/reliability/** and Phase 26 operation resilience fields | 26 | META_PLATFORM_RELIABILITY | RETAIN_AS_SHARED_RELIABILITY_CONTROL |
| meta-webhooks | 12 | `app/api/webhooks`, `lib/meta-platform/contracts`, `lib/meta-platform/transports` | lib/meta-platform/transports/webhook/** | 24 | META_PLATFORM_WEBHOOK_TRANSPORT | MIGRATE_TO_WEBHOOK_TRANSPORT |
| meta-workflows | 22 | `lib/meta-platform/concurrency`, `lib/meta-platform/projections`, `lib/meta-platform/reconciliation`, `lib/meta-platform/replay`, `lib/meta-platform/workflows`, `prisma/migrations/20260723013000_add_meta_workflow_reconciliation_replay` +1 more | lib/meta-platform/{workflows,concurrency,reconciliation,replay,projections}/** | 27 | META_PLATFORM_WORKFLOWS | RETAIN_AS_WORKFLOW_RECONCILIATION_CONTROL |
| privacy-governance | 12 | `app/(storefront)/delete-data`, `app/(storefront)/privacy-policy`, `app/api/admin`, `app/data-deletion/route.ts`, `lib/businessProfile.ts`, `lib/privacy-policy.ts` +6 more | lib/meta-platform/governance/privacy/** | 32 | META_PLATFORM_PRIVACY | RETAIN_AND_EXTEND_TO_PLATFORM_DATA |
| release-governance | 21 | `.github/workflows/ci.yml`, `.github/workflows/meta-v6-release.yml`, `config/meta-api-version-policy.json`, `config/meta-phase31-cutover-flags.json`, `config/meta-phase31-facebook-realtime-cutover.json`, `config/meta-phase31-instagram-cutover.json` +12 more | config/**, .github/workflows/** and release gates | 33 | NONE_REQUIRED | RETAIN_AND_UPDATE_FOR_UNIFIED_PLATFORM |
| sdk-transport | 27 | `app/admin/meta-business`, `lib/meta-business/logging.ts`, `lib/meta-business/preferences.ts`, `lib/meta-business/sdk.ts`, `lib/meta-business/validation.ts`, `lib/meta-platform/transports` +2 more | lib/meta-platform/transports/business-sdk/** | 23 | META_PLATFORM_SDK_TRANSPORT | REPLACE_WITH_UNIFIED_TRANSPORT |
| shared-meta-support | 11 | `lib/meta-platform/capabilities`, `lib/meta-platform/contracts`, `lib/meta-platform/core`, `lib/meta-platform/index.ts`, `lib/meta-platform/migration`, `lib/meta-platform/platform.ts` +2 more | MetaPlatform compatibility facade | 20 | META_PLATFORM_FACADE | ADAPT_TO_METAPLATFORM_FACADE |
| social-queue-jobs | 17 | `lib/jobs/dead-letter.ts`, `lib/meta-platform/queue`, `workers/meta-social.worker.ts` | lib/meta-platform/queue/** and additive lib/jobs social mappings | 31 | META_PLATFORM_SOCIAL_WEBHOOKS | ADOPT_SHARED_QUEUE_THEN_REMOVE_PARALLEL_RETRY_OWNERSHIP |
| social-realtime | 44 | `app/api/admin`, `app/api/social`, `app/api/webhook`, `app/components/admin`, `docker-compose.realtime.yml`, `hooks/useInboxSocket.ts` +12 more | shared provider contracts or authenticated MetaPlatform internal API | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| social-webhook-persistence | 19 | `lib/meta-platform/repositories`, `prisma/migrations/20260724233000_phase31_unified_webhook_receipts`, `prisma/migrations/20260725033000_phase31_provider_identity_mapping`, `prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata` | lib/meta-platform/repositories/** and Phase 31 receipt migrations | 31 | META_PLATFORM_SOCIAL_WEBHOOKS | ADOPT_CANONICAL_RECEIPTS_THEN_RETIRE_DUPLICATE_RECEIPT_WRITES |

## Legacy and parallel-runtime paths requiring observed cutover

| Path | Lifecycle | Capability | Target phase | Cutover flag | Final action |
| --- | --- | --- | --- | --- | --- |
| app/api/admin/inbox/messages/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/api/admin/inbox/reply/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/api/admin/inbox/sync/dead-letter/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/api/admin/inbox/sync/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/api/admin/social/facebook/sync/route.ts | LEGACY_ACTIVE | legacy-facebook | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| app/api/social/messages/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/api/webhook/facebook/route.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| app/components/admin/SocialMediaInboxChat.tsx | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| docker-compose.realtime.yml | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| hooks/useInboxSocket.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/facebook/inboxSync.ts | LEGACY_ACTIVE | legacy-facebook | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| lib/facebook/profile.ts | LEGACY_ACTIVE | legacy-facebook | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| lib/facebook/utils.ts | LEGACY_ACTIVE | legacy-facebook | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| lib/meta-platform/domains/facebook/admin-reply.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/domains/facebook/cutover.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/domains/facebook/feature-flags.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/domains/facebook/inbox-sync.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/domains/facebook/index.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/domains/facebook/legacy-bridge.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/realtime/bridge-auth.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/realtime/facebook-events.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/realtime/social-events.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta-platform/repositories/facebook-inbox.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| lib/meta/connection/legacy-readiness.ts | LEGACY_ACTIVE | connection-health | 28 | META_PLATFORM_CONNECTION_READS | MIGRATE_THEN_DISABLE_LEGACY_PATH |
| lib/meta/leads/legacy-service.ts | LEGACY_ACTIVE | lead-rollback-compatibility | 31 | META_PHASE31_LEAD_RUNTIME | DEPRECATE_AFTER_OBSERVED_CUTOVER |
| prisma/migrations/20260424000000_fb_inbox_profile_and_attachment_meta/migration.sql | HISTORICAL_ACTIVE_SCHEMA | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| prisma/schema.prisma | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/.env.example | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/prisma/migrations/20260424000000_fb_inbox_profile_and_attachment_meta/migration.sql | HISTORICAL_ACTIVE_SCHEMA | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/app.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/config.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/attachments.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/cutover.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/dead-letter.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/events.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/graph.client.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/inbox-processor.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/inbox-sync.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/media-retry.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/media-store.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/outbound-write-control.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/outgoing-retry.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/replay-queue.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/signature.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/token-health.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/facebook/types.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/realtime/main-app-facebook-handoff.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/realtime/pubsub.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/routes/bridge-webhook.router.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| realtime-service/src/routes/webhook.router.ts | ACTIVE | social-realtime | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT |
| types/facebook.ts | LEGACY_ACTIVE | legacy-facebook | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER |

## Cutover sequence

1. Phase 20 establishes the application-facing facade and compatibility boundary.
2. Phases 21–27 establish models, credentials, transports, durability, resilience, and controlled replay.
3. Phases 28–32 migrate capability groups behind explicit flags with shadow/canary evidence.
4. Phase 33 removes legacy paths only after observation, rollback, load, recovery, bundle, and live-provider evidence.

## Rollback rule

Before legacy deletion, rollback means disabling the new capability flag and restoring the last verified producer/reader. After deletion, rollback requires the approved release archive or a forward fix; historical migrations and evidence are never edited to simulate a passing gate.
