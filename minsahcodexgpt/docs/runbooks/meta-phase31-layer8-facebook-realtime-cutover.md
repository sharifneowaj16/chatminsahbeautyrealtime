# Phase 31 Layer 8.5 — Legacy Facebook and realtime cutover

## Singular authority model

| Runtime | Provider ingress and durable authority | Platform behavior | Retry owner |
|---|---|---|---|
| `LEGACY` | Realtime legacy service | Disabled | Realtime legacy workers |
| `SHADOW` | Realtime legacy service | Signed webhook mirror and side-effect-free snapshot parity | Realtime legacy workers |
| `PLATFORM` / `DOMAIN` | Main-app MetaPlatform, optionally reached through the realtime proxy | Platform sync persists and emits normalized events | Main-app BullMQ |
| `LEGACY_ROLLBACK` | Realtime legacy service | Disabled | Realtime legacy workers |
| `BLOCKED` | None | None | None |

A configuration that does not completely satisfy one authority mode is safe-disabled as `BLOCKED`; it never activates both paths.

## Explicit legacy direct-client activation

Legacy Graph modules and legacy retry workers are dynamically loaded only when all controls agree:

```env
META_PLATFORM_LEGACY_FACEBOOK=true
META_PHASE31_FACEBOOK_INBOX_RUNTIME=LEGACY
REALTIME_FACEBOOK_MODE=legacy
REALTIME_RUNTIME_FLAVOR=legacy
REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED=true
```

Use `SHADOW` or `LEGACY_ROLLBACK` in the runtime selector for those modes. Credentials required by the old service are validated only while legacy authority is active.

## Shadow sequence

1. Keep realtime legacy as the only full processor.
2. Enable `META_PLATFORM_SOCIAL_WEBHOOKS=true` and select `SHADOW`.
3. After the fast provider acknowledgement, the legacy webhook route forwards the same raw body and provider signature to the main app using the internal bridge signature.
4. The main app deduplicates with `SHA-256(raw body) + Page ID` and queues the platform snapshot evaluator.
5. The platform worker fetches and normalizes the snapshot, compares safe counts/digests, and performs no persistence, realtime publication, attachment job or provider write.

## Platform sequence

```env
META_PLATFORM_LEGACY_FACEBOOK=false
META_PLATFORM_SOCIAL_REALTIME=true
META_PLATFORM_SOCIAL_WEBHOOKS=true
META_PHASE31_FACEBOOK_INBOX_RUNTIME=PLATFORM
REALTIME_FACEBOOK_MODE=bridge
REALTIME_RUNTIME_FLAVOR=bridge
REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED=false
```

In this mode the realtime service exposes only the signed webhook proxy and normalized WebSocket subscription. Legacy reply, sync, dead-letter and Graph worker routes return disabled responses. Main-app MetaPlatform owns provider transport, durable persistence, retry and dead-letter state.

## Duplicate and retry boundaries

- Webhook-triggered sync requests use a deterministic raw-body digest plus Page ID dedupe key.
- Provider message persistence remains protected by the existing Facebook external-message unique key.
- Normalized realtime delivery keeps the Layer 6 event-window dedupe boundary.
- Legacy retry workers start only when `retryOwner=REALTIME_LEGACY`.
- Platform mode assigns retry ownership only to `MAIN_APP_BULLMQ`.

## Rollback

Rollback is an authority change, not data deletion. Set the runtime to `LEGACY_ROLLBACK`, enable the legacy flag and start the explicit legacy runtime. Platform queued jobs re-read authority at execution and fail closed instead of continuing after rollback. Existing platform messages, provider IDs, job audits and normalized event history remain intact.

## Legacy-disable criteria

Legacy disable is eligible only after the configured shadow sample and observation minimums, bounded mismatch rate, zero duplicate events, zero parallel retry owners, zero legacy direct-client calls in platform mode, and a successful rollback drill.

No Prisma schema or migration change is required for Item 8.5.
