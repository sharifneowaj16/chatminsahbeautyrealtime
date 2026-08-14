# Phase 11 — Master Tracking Deploy Gate Hardening

The production gate validates tracking credentials without printing them, blocks placeholder secrets and production test-event codes, verifies Redis URL shape, supports an optional live Redis ping, and checks the isolated Meta, GA4, and TikTok worker start paths.

## Command

`TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate`

External workers require `DISABLE_EMBEDDED_WORKERS=true` and an independently verified worker process before `META_CAPI_WORKER_PROCESS_VERIFIED=true` is set.
