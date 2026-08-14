# Phase 26 Meta reliability outage and recovery runbook

## Trigger conditions

Use this runbook when Meta returns sustained 429/5xx responses, requests exceed their deadline, Redis coordination is degraded, queue admission rejects work, or a circuit remains open beyond the expected provider recovery window.

## Immediate checks

1. Identify environment, connection, capability, operation kind and asset scope.
2. Inspect circuit state, open reason, retry time and half-open lease owner.
3. Inspect provider `Retry-After` and Meta usage headers retained in safe error details.
4. Compare queue depth by P0–P4 and confirm reserved P0/P1 capacity remains available.
5. Confirm PostgreSQL outbox rows remain durable and BullMQ attempts are still one.
6. Do not manually replay non-idempotent unknown-outcome writes; route them to reconciliation.

## Safe response

- Leave the circuit open during a confirmed provider outage; do not delete distributed keys to force traffic.
- Reduce or pause P3/P4 producers before changing critical queue capacity.
- Allow the token-fenced half-open probe to test recovery. Only one distributed probe should reach Meta.
- Honor provider retry-after/cooldown. A manual retry must not be scheduled earlier than the governed next-attempt time.
- For Redis loss, stop publishers/workers that cannot coordinate safely. Pending work remains in PostgreSQL and can be reclaimed after recovery.
- For expired work, preserve the dead-letter and append-only event history. Create a new controlled operation only after business review.

## Recovery validation

1. Confirm the half-open probe succeeds and closes the circuit.
2. Confirm rate-limit cooldown expires before normal traffic resumes.
3. Resume priorities gradually: P0, P1, P2, then P3/P4.
4. Verify no duplicate provider effect and no blind retry of unknown outcomes.
5. Reconcile deferred/dead-lettered operations and document any new replay operation IDs.
6. Capture metrics, logs and timestamps as runtime evidence before declaring recovery complete.

## Prohibited actions

- Do not mutate historical operation payloads, priority or expiry.
- Do not clear outbox/ledger rows to reduce queue depth.
- Do not increase retry attempts in BullMQ; PostgreSQL owns durable retry.
- Do not bypass app/capability/asset rate limits or the circuit for bulk work.
- Do not mark Phase 26 complete without PostgreSQL, Redis, provider-throttle and load evidence.
