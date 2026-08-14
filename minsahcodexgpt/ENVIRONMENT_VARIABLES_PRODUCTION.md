# Production Environment Variables — Tracking & Privacy

Non-essential tracking is explicit opt-in and fail-closed. `NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT=true` remains documented for compatibility, but runtime policy does not permit implicit consent.

```bash
NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT=true
ANALYTICS_INTERNAL_IPS=
INTERNAL_TRAFFIC_IPS=
STAFF_IPS=
INTERNAL_TRAFFIC_HEADER_SECRET=
TRACKING_TEST_EMAILS=
TRACKING_TEST_PHONES=
TRACKING_INTERNAL_DOMAINS=
TRACKING_CLEANUP_CRON_SECRET=
PRIVACY_WORKER_CONCURRENCY=2
PRIVACY_SCHEDULER_INTERVAL_MS=60000
```

Production requires a governed Redis connection for durable privacy jobs and the Phase 6 Prisma migration before workers start. Use `redis://` only on a protected private service network; use `rediss://` when the deployed Redis endpoint provides TLS. The configured protocol must match the actual deployment.

## Meta Lead Ads CRM (Phase 8)

- `META_LEAD_DATA_KEY` — required production encryption key for raw webhook and lead payloads (32-byte base64 or 64-character hex recommended).
- `META_LEAD_ALLOWED_FORM_IDS` — optional comma-separated ownership allowlist.
- `META_LEAD_RESPONSE_SLA_MINUTES` — new-lead response target; default 15.
- `META_LEAD_RAW_RETENTION_DAYS` / `META_LEAD_RETENTION_DAYS` — encrypted raw and normalized CRM retention windows.
- `META_LEAD_NOTIFICATION_WEBHOOK_URL` — optional internal endpoint; only masked contact values are sent.

## Master tracking deploy gate

Run `npm run qa:tracking-deploy-gate` before production deployment. On the production network, require a real Redis connectivity check:

```bash
TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate
```

When embedded workers are disabled, verify the external process before setting:

```bash
DISABLE_EMBEDDED_WORKERS=true
META_CAPI_WORKER_PROCESS_VERIFIED=true
```

## TikTok browser and Events API gates

```bash
NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED=false
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
TIKTOK_EVENTS_API_ENABLED=false
TIKTOK_PURCHASE_LIVE_VERIFIED=false
```

Browser `Purchase` remains blocked. `TIKTOK_PURCHASE_LIVE_VERIFIED` may only be enabled after server-side Events API evidence is attached.


## MetaPlatform Phase 30 — catalog and commerce

| Variable | Production guidance |
|---|---|
| `META_PLATFORM_CATALOG_SHADOW` | Enable only during bounded read comparison. |
| `META_PLATFORM_CATALOG_READS` | Enables unified platform read authority after shadow evidence. |
| `META_PLATFORM_CATALOG_WRITES` | Enables unified platform writes; use test catalog first. |
| `META_PLATFORM_CATALOG_LEGACY_DISABLED` | Fail closed after legacy removal. |
| `META_PLATFORM_CATALOG_KILL_SWITCH` | Emergency block for all catalog writes. |
| `META_PLATFORM_CATALOG_TEST_CATALOG_ID` | Dedicated non-production catalog for write canaries. |
| `META_PLATFORM_CATALOG_READ_CACHE_FRESH_MS` | Fresh read cache TTL; default `60000`. |
| `META_PLATFORM_CATALOG_READ_CACHE_STALE_MS` | Maximum stale fallback TTL; default `21600000`. |
| `META_PLATFORM_CATALOG_ITEM_RETRY_MAX_ATTEMPTS` | Bounded retry ceiling for known retryable UPDATE failures; default `3`. |
| `META_PLATFORM_CATALOG_DELETE_MAX_COUNT` | Count threshold requiring emergency override; default `100`. |
| `META_PLATFORM_CATALOG_DELETE_MAX_RATIO` | Managed-item ratio threshold requiring emergency override; default `0.25`. |
| `META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE` | Temporary explicit override after independent approval; normally `false`. |
