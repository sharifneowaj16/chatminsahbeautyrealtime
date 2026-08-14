# ADR-027 — Workflows, concurrency, reconciliation and controlled replay

- **Status:** Accepted / source implemented
- **Date:** 2026-07-23
- **Phase:** 27

## Context

Phase 25 made provider commands durable and Phase 26 governed retry, rate, deadline and backpressure behavior. Multi-step provider mutations still require a durable state machine because a process can stop before or after an external write, a successful provider response can be lost, and a stale worker can continue after lease takeover. Blind retry is unsafe for non-idempotent writes.

## Decision

1. Each multi-step command is represented by one versioned `MetaWorkflow` linked to an immutable `MetaOperation`.
2. Ordered `MetaWorkflowStep` records use exact expected-version mutation. Every mutable store method requires either an active exact fenced guard or an explicit audited administrative guard.
3. Workflow and reconciliation execution use independent leased lock scopes. A heartbeat renews each lease; loss aborts/fails closed.
4. Fencing counters are scope-monotonic. PostgreSQL lock release expires the row rather than deleting it, and acquisition/validation use database `NOW()` to avoid application-clock ownership decisions.
5. A provider-mutating step must prepare a `MetaProviderJob` and its `MetaReconciliation` in one database transaction before invoking the external provider callback. If either record cannot commit, the provider callback is not called.
6. Provider command identity is unique by `(stepId, purpose, requestFingerprint)`, where purpose is `EXECUTION` or `COMPENSATION`. A terminal identity cannot be reused as a new attempt; a safe retry requires a new durable command identity.
7. The workflow, step, provider job and reconciliation terminal state are committed together in one transaction. Partial finalization is repaired from terminal reconciliation evidence, never by repeating the provider mutation.
8. A lost, interrupted or ambiguous execution/compensation response moves the step to `UNKNOWN`, the provider job to `UNKNOWN`, and the workflow to `WAITING_RECONCILIATION`. Resume does not invoke that provider command again.
9. Unknown-outcome resolvers are keyed by capability, operation type and resolver key. They may prove success, prove failure, schedule another bounded check, expire or require review. Terminal reconciliation atomically projects the result and then resumes normal workflow/compensation processing.
10. Compensation processes completed compensatable steps in reverse order. Provider compensation follows the same durable preparation and unknown-outcome rules. Retryable compensation failure is explicit as `COMPENSATION_FAILED_RETRYABLE`.
11. Replay never mutates or requeues the source operation. It creates a new linked `MetaOperation` with a new idempotency key.
12. Replay is a three-stage flow: immutable request, independent authorized approval, then execution. The request digest binds source operation, new idempotency key, requester, reason and exact expiry. Digest, expiry, RBAC and two-person separation are revalidated before execution.
13. Projections are derived from durable workflow, step, provider-job and reconciliation records. Redis is not authoritative.
14. `meta-workflows` is a registered capability with fail-closed permission governance. Phase 27 does not cut over Phase 28–31 producers.
15. Any `prisma/schema.prisma` change requires a new timestamped forward migration SQL and recovery/forward-fix evidence in the same change-set; historical migrations are immutable.

## Consequences

- Provider work is auditable before it can leave the process.
- Unknown success is reconciled instead of duplicated.
- Stale owners are fenced even after release/reacquisition of the same scope.
- Execution, compensation and replay have distinct durable identities and evidence.
- Recovery may pause for operator review rather than choosing an unsafe retry.
- Source is `CODE_COMPLETE`; Prisma generation, PostgreSQL apply/recovery, multi-process crash/fencing drills and live provider evidence remain required before `COMPLETE`.
