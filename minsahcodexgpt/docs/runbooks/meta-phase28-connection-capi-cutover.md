# Meta Phase 28 connection and CAPI cutover runbook

## Preconditions

- Phase 27 migrations are generated/applied and multi-process fencing/reconciliation drills pass.
- Meta role-specific APP, BUSINESS_SYSTEM_USER and CAPI credentials are configured.
- Graph version policy and required permissions are approved.
- CAPI outbox dispatcher/sender workers and monitoring are healthy.

## Connection health rollout

1. Keep `META_PLATFORM_CONNECTION_READS=false` and enable `META_PLATFORM_CONNECTION_SHADOW=true`.
2. Run scheduled/admin connection checks and review `META_CONNECTION_SHADOW_MATCH` or mismatch warnings.
3. Resolve status, token, permission and asset differences.
4. Enable `META_PLATFORM_CONNECTION_READS=true`; keep legacy available for rollback.
5. After observation and rollback proof, set `META_PLATFORM_CONNECTION_LEGACY_DISABLED=true`.

## CAPI rollout

1. Enable `META_PLATFORM_CAPI_TEST_EVENTS=true` with a Meta test-event code. Verify event ID parity, response metadata and no duplicate delivery.
2. Set `META_PLATFORM_CAPI_CANARY_PERCENT` to a small reviewed percentage. Selection is stable by `event_id`.
3. Compare acceptance/failure/retry rates by `cutover_mode`, `transport`, Graph version and credential version.
4. Increase the percentage in controlled steps or set `META_PLATFORM_CAPI_WRITES=true` for full unified delivery.
5. Only after observation, duplicate/old-event tests, Redis outage recovery, token rotation and circuit recovery, set `META_PLATFORM_CAPI_LEGACY_DISABLED=true`.

## Emergency rollback

- Before legacy disable: set `META_PLATFORM_CAPI_WRITES=false`, `META_PLATFORM_CAPI_TEST_EVENTS=false`, and `META_PLATFORM_CAPI_CANARY_PERCENT=0`.
- Connection: set `META_PLATFORM_CONNECTION_READS=false`; shadow may remain enabled for comparison.
- Do not replay unknown provider outcomes blindly. Use Phase 27 reconciliation/replay controls.

## Evidence to capture

- exact commit and deployment ID;
- flag values and change approvals;
- shared browser/server event ID;
- provider test-event screenshot/receipt and normalized response;
- duplicate Purchase and old-event outcomes;
- outbox survival through Redis outage;
- credential version before/after rotation;
- circuit open/half-open/recovery evidence;
- rollback result and legacy-disable approval.
