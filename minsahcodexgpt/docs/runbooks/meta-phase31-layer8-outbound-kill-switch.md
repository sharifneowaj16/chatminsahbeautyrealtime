# Phase 31 Layer 8.2 — Global social outbound-write kill switch

## Scope

Layer 8.2 prevents provider writes from bypassing an emergency stop. Controls are resolved from the current process environment immediately before provider execution, including previously queued work.

Covered operations:

- Instagram standard replies
- Instagram private replies
- Facebook Page Messenger text replies
- Facebook Page Messenger attachment/media sends
- Facebook Page comment replies

## Controls

```env
META_PLATFORM_GLOBAL_KILL_SWITCH=false
META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH=false
META_PLATFORM_INSTAGRAM_KILL_SWITCH=false
META_PLATFORM_FACEBOOK_KILL_SWITCH=false
META_PLATFORM_INSTAGRAM_WRITES=false
META_PLATFORM_INSTAGRAM_PRIVATE_REPLY=false
```

Kill switches default to inactive, but an invalid configured kill-switch value fails safe as active. Instagram write-enablement flags default and fail safe to disabled.

## Precedence

1. `META_PLATFORM_GLOBAL_KILL_SWITCH`
2. `META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH`
3. Platform-specific kill switch
4. Instagram standard-write enablement
5. Instagram private-reply enablement

Only a safe reason code is returned to admin/API surfaces. Raw environment values are never included.

## Queued work

Instagram workers resolve the current control before executing the durable reply attempt. A blocked attempt is persisted with a `POLICY_BLOCKED` reason so admin views can explain why no provider call occurred.

The realtime Facebook retry worker resolves the current control before each retry. While blocked, the job is deferred with the same attempt number; the attempt counter is not increased and no Graph API call is made. A switch change between the pre-check and provider call is also caught at the provider boundary and deferred safely.

## Recovery

- Correct or disable the active kill switch.
- Confirm the admin health reason becomes `ENABLED`.
- Facebook queued retry jobs resume on a later poll without having consumed an attempt while blocked.
- A blocked Instagram request can be submitted again after enablement using the normal idempotency contract. No blind retry is allowed for unknown provider outcomes.

## Evidence boundary

This item provides deterministic source and offline tests. It does not claim a live Redis/BullMQ worker, live Facebook/Instagram provider call, or production deployment test; those remain Layer 9 evidence.
