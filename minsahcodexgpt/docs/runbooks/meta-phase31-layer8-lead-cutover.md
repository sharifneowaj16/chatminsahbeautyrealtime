# Phase 31 Layer 8.3 — Lead Ads cutover

## Purpose

Move Lead Ads processing from the preserved legacy implementation to the Phase 31 platform implementation without running two CRM handoffs, losing durable receipt state, or making rollback ambiguous.

## Authority modes

| Runtime value | Full processing authority | Platform parity work | Intended use |
| --- | --- | --- | --- |
| `LEGACY` or omitted safe defaults | Legacy | None | Pre-cutover baseline |
| `SHADOW` | Legacy | Side-effect-free normalization comparison only | Measure parity |
| `PLATFORM` or `DOMAIN` alias | Platform, only when both canonical prerequisites are enabled | None | Controlled platform authority |
| `LEGACY_ROLLBACK` | Legacy | None | Explicit rollback |

Platform authority requires both:

```env
META_PLATFORM_LEADS=true
META_PLATFORM_SOCIAL_WEBHOOKS=true
META_PHASE31_LEAD_RUNTIME=PLATFORM
```

A missing prerequisite preserves legacy authority. An invalid canonical flag or invalid runtime selector fails safe to `LEGACY_ROLLBACK` semantics.

## Duplicate prevention boundary

Exactly **one full authority processor** runs for a queued Lead receipt:

- Legacy, shadow and rollback modes call the legacy processor once.
- Platform mode calls the platform processor once.
- Shadow mode never calls the full platform processor. It observes the provider payload already fetched by the legacy authority and runs only a pure, non-persistent comparison.
- Both implementations continue using the existing DB-backed receipt, provider Lead ID and CRM-handoff idempotency boundaries.

## Shadow comparison

The comparison records only safe parity dimensions:

- provider Lead ID and form ID equality;
- test-Lead marker;
- presence, not values, of name, phone, email and location fields;
- product-interest presence;
- provider field count.

Raw email, phone, name, access token and provider payload values are not emitted by the comparison contract.

## Stability and legacy-disable criteria

Legacy disable is blocked until all machine-readable criteria pass:

- at least 100 shadow samples;
- mismatch rate no greater than 100 basis points (1%);
- zero duplicate CRM handoffs;
- zero unresolved permanent failures;
- at least 1,440 minutes of observation;
- successful rollback drill.

Meeting these criteria makes disable *eligible*; it does not automatically delete legacy code. Physical removal remains outside Item 8.3 and must wait for final observation/release gates.

## Rollback

Set:

```env
META_PHASE31_LEAD_RUNTIME=LEGACY_ROLLBACK
```

Queued jobs evaluate the current mode when the worker executes. Durable receipt, normalized Lead, handoff and audit records remain intact. Already completed CRM handoffs remain idempotent and must not execute again.

## Operational sequence

1. Run `LEGACY` and establish baseline health.
2. Set `SHADOW`; collect safe match/mismatch metrics.
3. Evaluate the stability criteria.
4. Enable both canonical prerequisites and set `PLATFORM`.
5. Observe queue, permanent failures, duplicate handoffs and CRM handoff state.
6. Perform an explicit `LEGACY_ROLLBACK` drill.
7. Keep legacy available until Layer 8.6 and the final release gate pass.
