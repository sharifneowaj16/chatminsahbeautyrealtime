# Phase 11 — Master Tracking Deploy Gate Hardening

This gate is the production deploy-time protection for Meta Pixel, Meta CAPI, GA4 Measurement Protocol, BullMQ/Redis, tracking worker, and tracking health cron configuration.

Run it before a live deploy:

```bash
npm run qa:tracking-deploy-gate
```

Expected success output includes:

```txt
Production tracking deploy gate passed
No placeholder credentials
No production test event code
Redis/queue config present
Meta/GA4 env present
```

## What it blocks

The gate fails the deploy when any blocker is detected:

- Missing `NEXT_PUBLIC_META_PIXEL_ID` / `META_PIXEL_ID` / `META_DATASET_ID`
- Missing `META_CAPI_ACCESS_TOKEN` or legacy `FACEBOOK_CONVERSION_API_TOKEN`
- Missing `NEXT_PUBLIC_GA4_MEASUREMENT_ID` / `GA4_MEASUREMENT_ID`
- Missing `GA4_API_SECRET` / `GOOGLE_ANALYTICS_API_SECRET`
- Missing `REDIS_URL`
- Invalid Redis URL shape; must be `redis://` or `rediss://`
- Missing `TRACKING_HEALTH_CRON_SECRET` / `CRON_SECRET`
- Placeholder/demo/local credentials such as `replace-with-*`, `your-*`, `localhost`, `example.com`, dummy/test secrets, or `xxxxxxxx`
- `META_TEST_EVENT_CODE` accidentally set while running the production gate
- Suspicious `NEXT_PUBLIC_*SECRET*` / `NEXT_PUBLIC_*TOKEN*` values
- Missing Meta/GA4 queue, worker, or cron files/scripts
- Missing production cron secret guard

## Commands

Environment-only audit:

```bash
npm run qa:tracking-env
```

Runtime/static queue-worker-cron audit:

```bash
npm run qa:tracking-runtime-health
```

Master deploy gate:

```bash
npm run qa:tracking-deploy-gate
```

Optional live Redis network ping from the production network:

```bash
TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate
```

The default gate validates `REDIS_URL` shape and static queue/worker wiring. Both `redis://` and `rediss://` are valid when they match the deployment: use `redis://` only on a protected private service network, and use `rediss://` for a TLS-enabled endpoint. The live ping is optional because CI machines often cannot access the production Redis network. For final production deploy, run the live ping inside the same network/container that will process BullMQ jobs.

## Required production variables

Minimum required tracking/deploy variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
NEXTAUTH_URL=https://your-production-domain.example
NEXTAUTH_SECRET=replace-with-random-32-plus-character-secret
JWT_SECRET=replace-with-different-random-32-plus-character-secret
JWT_REFRESH_SECRET=replace-with-another-random-32-plus-character-secret
DATABASE_URL=postgresql://user:password@host:5432/db
# Protected private service network:
REDIS_URL=redis://redis:6379
# Or, when the Redis endpoint actually provides TLS:
# REDIS_URL=rediss://user:password@redis.example.invalid:6380
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
META_PIXEL_ID=123456789012345
META_DATASET_ID=123456789012345
META_CAPI_ACCESS_TOKEN=replace-with-real-server-only-meta-system-user-token
META_GRAPH_API_VERSION=v24.0
META_TEST_EVENT_CODE=
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=replace-with-real-ga4-measurement-protocol-secret
TRACKING_HEALTH_CRON_SECRET=replace-with-random-32-plus-character-cron-secret
TRACKING_TEST_EMAILS=test@example.com,staff@example.com
TRACKING_TEST_PHONES=01700000000,01800000000
TRACKING_INTERNAL_IPS=
TRACKING_INTERNAL_DOMAINS=
```

Recommended alert/worker flags:

```env
TRACKING_HEALTH_ALERT_WEBHOOK_URL=https://hooks.example.invalid/private-tracking-alert
DISABLE_EMBEDDED_WORKERS=false
META_CAPI_WORKER_PROCESS_VERIFIED=false
TRACKING_DEPLOY_GATE_LIVE_REDIS=false
```

Use `META_CAPI_WORKER_PROCESS_VERIFIED=true` only when `DISABLE_EMBEDDED_WORKERS=true` and a separate process is actually running `npm run worker:meta-capi` or `npm run worker:all`.

## Production cron auth

The tracking health cron route accepts:

```txt
Authorization: Bearer <TRACKING_HEALTH_CRON_SECRET>
x-cron-secret: <TRACKING_HEALTH_CRON_SECRET>
```

In production, query-string secrets are intentionally rejected. Do not schedule production cron as `?secret=...`.

## Release rule

Do not deploy while `npm run qa:tracking-deploy-gate` returns blockers.

Warnings are allowed only when the release owner documents why they are acceptable. A common warning is skipped live Redis ping; remove it by running the gate with `TRACKING_DEPLOY_GATE_LIVE_REDIS=true` in the production network.
