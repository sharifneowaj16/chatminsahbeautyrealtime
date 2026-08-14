# Phase 31 Layer 8.4 — Instagram cutover and rollback

## Authority model

| Runtime value | Durable read authority | Shadow behavior | Provider writes |
|---|---|---|---|
| `LEGACY` | Legacy adapter | None | Explicit write flags and kill switches still apply |
| `SHADOW` | Legacy adapter | Side-effect-free normalized parity only | No second processor and no shadow write |
| `PLATFORM` / `DOMAIN` | Platform domain adapter | None | Controlled independently |
| `LEGACY_ROLLBACK` | Legacy adapter | None | Rollback path; durable records are preserved |

The inbound platform path requires both `META_PLATFORM_INSTAGRAM=true` and `META_PLATFORM_SOCIAL_WEBHOOKS=true`. Missing prerequisites retain legacy authority. Invalid selector or canonical flag values fail safe to rollback semantics.

## Required selectors

```env
META_PHASE31_INSTAGRAM_INBOUND_RUNTIME=LEGACY
META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME=LEGACY
META_PHASE31_INSTAGRAM_MEDIA_RUNTIME=LEGACY
```

Accepted values are `LEGACY`, `SHADOW`, `PLATFORM`, `DOMAIN`, and `LEGACY_ROLLBACK`.

## Safe rollout order

1. Keep inbound authority on `LEGACY` and confirm durable receipt, conversation, message, provider-ID, reply-policy and attachment state visibility.
2. Set inbound runtime to `SHADOW`. The legacy processor remains the only full processor; the platform normalizer receives an observer projection only.
3. Review mismatch codes. Shadow evidence contains hashes, booleans, counts and type names—never raw message text, participant identifiers, tokens or media URLs.
4. Enable `META_PLATFORM_INSTAGRAM=true` and `META_PLATFORM_SOCIAL_WEBHOOKS=true`, then set inbound runtime to `PLATFORM`.
5. Enable standard writes separately with `META_PLATFORM_INSTAGRAM_WRITES=true`. Worker execution re-reads cutover authority and the Layer 8.2 emergency controls.
6. Enable private replies separately with `META_PLATFORM_INSTAGRAM_PRIVATE_REPLY=true` after standard reply observation.
7. Enable provider media downloads separately with `META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS=true`. When disabled, attachment metadata remains durable but validation/download jobs are not scheduled.
8. Perform an explicit `LEGACY_ROLLBACK` drill before legacy disable eligibility can pass.

## Duplicate and provider-write boundary

Exactly one full inbound processor owns each durable receipt. Shadow mode does not call the platform processor, so it cannot create a second conversation/message, realtime event or attachment job. Outbound provider calls remain idempotency-backed and must pass both cutover authority and the global/social/Instagram execution-time write controls.

## Rollback behavior

Rollback changes authority; it does not delete receipts, conversations, messages, reply attempts, provider message IDs, attachment metadata, reconciliation state or audit history. Queued writes re-check current controls at worker execution time. A possible-success write still requires reconciliation before any retry.

## Legacy-disable criteria

Legacy disable remains ineligible until all configured criteria pass:

- minimum shadow samples and observation window;
- bounded mismatch rate;
- zero duplicate messages and duplicate provider writes;
- zero provider message ID mismatches;
- zero attachment-state mismatches;
- successful rollback drill.

No Prisma schema change is required for Item 8.4.
