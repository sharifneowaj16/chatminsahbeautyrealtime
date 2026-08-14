# Phase 31 Layer 8.6 — Rollback Proof

Status: **PASS — source/offline rollback proof**

This item proves the cutover controls are reversible and fail closed at the current source/offline gate. It does not claim a live Meta provider, PostgreSQL, Redis, or process-kill drill; those runtime demonstrations remain required by Layer 9.

## Proof method

The focused test suite constructs an explicit rollback configuration, re-evaluates authority at job execution boundaries, and compares safe before/after durable-state snapshots. The snapshots contain only counts and opaque SHA-256 digests; they contain no raw environment values, provider payloads, tokens, customer names, email addresses, phone numbers, message text, or Lead fields.

## Required rollback demonstrations

| Scenario | Demonstration | Result |
|---|---|---|
| `LEAD_PLATFORM_OFF` | Lead runtime resolves to `LEGACY_ROLLBACK`; queued Lead execution invokes only the legacy processor. | PASS |
| `INSTAGRAM_READ_PLATFORM_OFF` | Instagram inbound authority resolves to legacy and platform read authority is removed. | PASS |
| `INSTAGRAM_WRITES_OFF` | Standard reply is blocked both by cutover authority and the execution-time outbound control. | PASS |
| `INSTAGRAM_PRIVATE_REPLY_OFF` | Private reply can be disabled independently while the standard-reply control remains separately configurable. | PASS |
| `REALTIME_BRIDGE_OFF` | Realtime bridge is disabled and cannot own provider ingress or retries. | PASS |
| `LEGACY_FALLBACK_ACTIVE` | Explicit realtime legacy rollback restores one provider-ingress owner and one retry owner: `REALTIME_LEGACY`. | PASS |
| `QUEUED_JOBS_HONOR_CURRENT_FLAGS` | Lead, Instagram outbound, Facebook sync, and realtime retry paths re-read current cutover controls at execution/start boundaries. | PASS |
| `NO_DATA_CORRUPTION_AFTER_TOGGLE` | Receipt, Lead, handoff, Instagram, Facebook, provider-write counts and canonical digests remain unchanged; duplicate counters remain zero. | PASS |
| `AUDIT_EVIDENCE_CAPTURED` | The audit record count increases while business/provider state remains unchanged. | PASS |

## Durable-state invariants

A control-only rollback must preserve all of the following:

- Receipt count and canonical receipt digest.
- Lead count, handoff count, and canonical Lead digest.
- Instagram conversation, message, outbound-request counts and canonical Instagram digest.
- Facebook message count and canonical Facebook digest.
- Provider-write count; rollback must not create a new provider write.
- Zero duplicate Lead handoffs, Instagram messages, provider writes, and Facebook events.
- Audit history may increase, but it may not decrease.

Any count/digest change, provider-write increase, duplicate counter, or missing audit record changes the proof verdict to `BLOCKED`.

## Queue execution boundaries

- `workers/meta-lead.worker.ts` calls `processMetaLeadReceiptProduction`, which resolves `process.env` when the queued job executes.
- `workers/meta-instagram.worker.ts` calls the production standard/private reply executors. Both re-check cutover authority and outbound kill switches immediately before provider execution.
- `workers/meta-social.worker.ts` routes Facebook sync through the platform cutover boundary.
- The realtime service starts legacy retry workers only when the current cutover status assigns retry ownership to `REALTIME_LEGACY`.

## Redaction proof

The rollback proof projection contains only:

- Modes, authorities, booleans and safe reason codes.
- Non-negative counts.
- Opaque 64-character SHA-256 digests.
- A sanitized proof identifier and ISO timestamp.

The proof builder never copies the input environment object into its output. Tests inject fake secret and PII values and verify they are absent from serialized evidence.

## Prisma status

- Prisma schema change: **NO**
- Migration: **NO**
- Existing persistence and uniqueness boundaries are reused.

## Remaining runtime evidence

Layer 9 must still execute and preserve evidence for live PostgreSQL/Redis queues, process interruption, live provider delivery/write behavior, and production rollback/kill-switch operation.
