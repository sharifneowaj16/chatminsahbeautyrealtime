# Meta capability manifest

> Human-readable view of `config/meta-capability-manifest.json`, frozen at `2026-08-01T23:21:58.669Z`. The JSON manifest is authoritative.

## Contract

Each capability declares an accountable owner, explicit credential role, transport boundary, provider asset class, target migration phase, cutover flag, final action, and target architecture path. `NONE_REQUIRED` is used only where a runtime cutover flag would be misleading; no field may be `UNKNOWN`, `TBD`, or unmapped.

| Capability | Owner | Token role(s) | Transport(s) | Asset(s) | Target phase | Cutover flag | Final action | Target path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| admin-observability | Platform Operations | INHERITED, NONE | ADMIN_UI, POSTGRESQL, BULLMQ, LOGGING, METRICS | MULTIPLE | 32 | META_PLATFORM_ADMIN_CONTROL | MIGRATE_TO_UNIFIED_CONTROL_PLANE | lib/meta-platform/{governance,observability}/** and app/admin/meta-platform/** |
| ads-marketing | Marketing Operations | BUSINESS_SYSTEM_USER | BUSINESS_SDK, GRAPH_HTTP, POSTGRESQL, BULLMQ, ADMIN_UI | BUSINESS, AD_ACCOUNT, AUDIENCE | 29 | META_PLATFORM_ADS_WRITES | MIGRATE_WITH_APPROVAL_AND_KILL_SWITCH | lib/meta-platform/domains/{ads,insights,audiences}/** |
| browser-measurement | Growth Analytics | NONE | BROWSER_PIXEL, POSTGRESQL, CLIENT_UI | PIXEL, CATALOG | 32 | META_PLATFORM_BROWSER_MEASUREMENT | ADAPT_TO_CANONICAL_MEASUREMENT_CONTRACT | lib/meta-platform/domains/measurement/browser/** |
| capi-delivery | Commerce Tracking | CAPI | BUSINESS_SDK, GRAPH_HTTP, POSTGRESQL, BULLMQ | PIXEL, DATASET | 28 | META_PLATFORM_CAPI_WRITES | MIGRATE_THEN_DISABLE_LEGACY_PRODUCER | lib/meta-platform/domains/capi/** |
| catalog-commerce | Catalog Operations | BUSINESS_SYSTEM_USER | BUSINESS_SDK, GRAPH_HTTP, POSTGRESQL, BULLMQ, HTTP_FEED, ADMIN_UI | CATALOG, PRODUCT_ITEM, PRODUCT_SET | 30 | META_PLATFORM_CATALOG_WRITES | MIGRATE_THEN_DISABLE_LEGACY_CATALOG_WRITES | lib/meta-platform/domains/catalog/** |
| connection-health | Growth Platform | APP, BUSINESS_SYSTEM_USER | GRAPH_HTTP, BUSINESS_SDK, POSTGRESQL, BULLMQ | APP, BUSINESS, AD_ACCOUNT, CATALOG, PIXEL, PAGE, INSTAGRAM_ACCOUNT | 28 | META_PLATFORM_CONNECTION_READS | MIGRATE_THEN_DISABLE_LEGACY_PATH | lib/meta-platform/domains/connection/** |
| credentials-versioning | Platform Security | APP, BUSINESS_SYSTEM_USER, CAPI, PAGE, INSTAGRAM | INTERNAL_CONFIG | APP, BUSINESS, AD_ACCOUNT, CATALOG, PIXEL, DATASET, PAGE, INSTAGRAM_ACCOUNT | 22 | META_PLATFORM_CREDENTIALS | CENTRALIZE_AND_REMOVE_CROSS_ROLE_FALLBACKS | lib/meta-platform/credentials/** and lib/meta-platform/versioning/** |
| facebook-oauth | Identity Platform | APP | OAUTH | APP | 32 | NONE_REQUIRED | RETAIN_OUTSIDE_PROVIDER_OPERATION_FACADE_WITH_EXPLICIT_BOUNDARY | lib/auth/** |
| graph-media-boundary | Growth Platform | BUSINESS_SYSTEM_USER, PAGE, INSTAGRAM | GRAPH_HTTP, MEDIA | CATALOG, PAGE, INSTAGRAM_ACCOUNT | 24 | META_PLATFORM_GRAPH_TRANSPORT | MIGRATE_TO_GRAPH_AND_MEDIA_TRANSPORTS | lib/meta-platform/transports/{graph-http,media}/** |
| instagram-crm | Social CRM | INSTAGRAM, PAGE, APP | GRAPH_HTTP, WEBHOOK, MEDIA, POSTGRESQL, BULLMQ, ADMIN_UI | INSTAGRAM_ACCOUNT, PAGE | 31 | META_PLATFORM_INSTAGRAM | MIGRATE_THEN_DISABLE_DIRECT_GRAPH_CLIENTS | lib/meta-platform/domains/instagram/** |
| lead-ads-crm | Social CRM | PAGE, APP | GRAPH_HTTP, WEBHOOK, POSTGRESQL, BULLMQ, ADMIN_UI | PAGE, LEAD_FORM | 31 | META_PLATFORM_LEADS | MIGRATE_WITH_RECEIPT_FIRST_CUTOVER | lib/meta-platform/domains/leads/** |
| lead-rollback-compatibility | Social CRM | PAGE, APP | GRAPH_HTTP, WEBHOOK, POSTGRESQL, BULLMQ | PAGE, LEAD_FORM | 31 | META_PHASE31_LEAD_RUNTIME | DEPRECATE_AFTER_OBSERVED_CUTOVER | lib/meta-platform/domains/leads/production.ts explicit rollback adapter only |
| legacy-facebook | Social CRM | PAGE, APP, NONE | GRAPH_HTTP, BROWSER_PIXEL, POSTGRESQL | PAGE, PIXEL | 31 | META_PLATFORM_LEGACY_FACEBOOK | DEPRECATE_AFTER_OBSERVED_CUTOVER | lib/meta-platform domains or explicitly retained identity boundary |
| measurement-attribution | Growth Analytics | BUSINESS_SYSTEM_USER, CAPI, NONE | BUSINESS_SDK, GRAPH_HTTP, POSTGRESQL, BULLMQ, ADMIN_UI | PIXEL, DATASET, AD_ACCOUNT | 32 | META_PLATFORM_MEASUREMENT | MIGRATE_TO_GOVERNED_MEASUREMENT_DOMAIN | lib/meta-platform/domains/measurement/** |
| meta-data-model | Data Platform | INHERITED | PRISMA_SCHEMA, POSTGRESQL | MULTIPLE | 21 | META_PLATFORM_DATA_MODEL | MAP_TO_CANONICAL_MODELS_AND_FORWARD_MIGRATIONS | lib/meta-platform/models/**, references/** and future Prisma migrations |
| meta-operations | Platform Reliability | INHERITED | POSTGRESQL, BULLMQ, REDIS | MULTIPLE | 25 | META_PLATFORM_OPERATIONS_LEDGER | RETAIN_AND_ADAPT_TO_OPERATION_LEDGER | lib/meta-platform/{operations,jobs}/** |
| meta-reliability | Platform Reliability | INHERITED | REDIS, POSTGRESQL, BULLMQ, INTERNAL_SERVICE | MULTIPLE | 26 | META_PLATFORM_RELIABILITY | RETAIN_AS_SHARED_RELIABILITY_CONTROL | lib/meta-platform/reliability/** and Phase 26 operation resilience fields |
| meta-webhooks | Platform Security | APP | WEBHOOK | APP, PAGE, INSTAGRAM_ACCOUNT | 24 | META_PLATFORM_WEBHOOK_TRANSPORT | MIGRATE_TO_WEBHOOK_TRANSPORT | lib/meta-platform/transports/webhook/** |
| meta-workflows | Platform Reliability | INHERITED | POSTGRESQL, INTERNAL_SERVICE | MULTIPLE | 27 | META_PLATFORM_WORKFLOWS | RETAIN_AS_WORKFLOW_RECONCILIATION_CONTROL | lib/meta-platform/{workflows,concurrency,reconciliation,replay,projections}/** |
| privacy-governance | Privacy and Security | APP, NONE | WEBHOOK, POSTGRESQL, ADMIN_UI | APP, CUSTOMER_DATA | 32 | META_PLATFORM_PRIVACY | RETAIN_AND_EXTEND_TO_PLATFORM_DATA | lib/meta-platform/governance/privacy/** |
| release-governance | Release Engineering | NONE | CONFIG, CI | MULTIPLE | 33 | NONE_REQUIRED | RETAIN_AND_UPDATE_FOR_UNIFIED_PLATFORM | config/**, .github/workflows/** and release gates |
| sdk-transport | Growth Platform | BUSINESS_SYSTEM_USER, CAPI, PAGE, INSTAGRAM | BUSINESS_SDK | BUSINESS, AD_ACCOUNT, CATALOG, PIXEL, PAGE, INSTAGRAM_ACCOUNT | 23 | META_PLATFORM_SDK_TRANSPORT | REPLACE_WITH_UNIFIED_TRANSPORT | lib/meta-platform/transports/business-sdk/** |
| shared-meta-support | Growth Platform | INHERITED | INTERNAL_SERVICE | MULTIPLE | 20 | META_PLATFORM_FACADE | ADAPT_TO_METAPLATFORM_FACADE | MetaPlatform compatibility facade |
| social-queue-jobs | Social CRM | APP, PAGE, INSTAGRAM | BULLMQ, REDIS, POSTGRESQL, WEBHOOK, INTERNAL_SERVICE | APP, PAGE, INSTAGRAM_ACCOUNT, LEAD_FORM | 31 | META_PLATFORM_SOCIAL_WEBHOOKS | ADOPT_SHARED_QUEUE_THEN_REMOVE_PARALLEL_RETRY_OWNERSHIP | lib/meta-platform/queue/** and additive lib/jobs social mappings |
| social-realtime | Social CRM | PAGE, APP | GRAPH_HTTP, WEBHOOK, MEDIA, POSTGRESQL, REDIS, WEBSOCKET | PAGE | 31 | META_PLATFORM_SOCIAL_REALTIME | MIGRATE_OR_BRIDGE_THEN_REMOVE_PARALLEL_CLIENT | shared provider contracts or authenticated MetaPlatform internal API |
| social-webhook-persistence | Social CRM | APP, PAGE, INSTAGRAM | WEBHOOK, POSTGRESQL | APP, PAGE, INSTAGRAM_ACCOUNT, LEAD_FORM | 31 | META_PLATFORM_SOCIAL_WEBHOOKS | ADOPT_CANONICAL_RECEIPTS_THEN_RETIRE_DUPLICATE_RECEIPT_WRITES | lib/meta-platform/repositories/** and Phase 31 receipt migrations |

## Governance rules

- Business SDK imports ultimately belong only under `lib/meta-platform/transports/business-sdk/**`.
- Direct Graph calls ultimately belong only under `lib/meta-platform/transports/graph-http/**`.
- Meta credential reads ultimately belong only under `lib/meta-platform/credentials/**`.
- Webhook HMAC verification ultimately belongs only under `lib/meta-platform/transports/webhook/**`.
- Legacy deletion is forbidden until the capability has observed cutover evidence and rollback proof.
- The separate realtime service remains in scope and must be bridged or migrated during Phase 31.
