# Meta unknown-outcome reconciliation runbook

## Trigger

Use this runbook when a provider job or workflow step is `UNKNOWN`, a workflow is `WAITING_RECONCILIATION`, or execution/compensation stopped after durable command preparation.

## Non-negotiable safety rules

- Do not manually repeat the provider write.
- Do not change the original purpose, request fingerprint, request state or before-state.
- Do not mark an expired record failed solely because time elapsed; expiry is not proof of provider failure.
- Do not reuse a terminal provider command identity for retry. A reviewed safe retry requires a new durable command identity.
- Do not alter terminal reconciliation evidence. Repair projections from it atomically.
- Never place tokens, app secrets, authorization headers, signed URLs or unredacted PII in evidence.
- Use only the active exact fencing token. Lease loss must abort the resolver.

## Procedure

1. Locate the source operation, workflow, step, provider job and reconciliation record.
2. Confirm the provider job was committed before provider execution and has the expected `purpose` (`EXECUTION` or `COMPENSATION`).
3. Confirm the provider job is unique for `(stepId, purpose, requestFingerprint)` and the reconciliation is linked to that job.
4. Confirm no other active reconciliation lease owns the record. Acquire the reconciliation lease and keep its heartbeat active.
5. Select the exact capability/operation/resolver implementation. Search the provider using stable evidence such as request fingerprint, provider job ID, expected object attributes or provider-supported idempotency metadata.
6. Record only safe canonical evidence.
7. Resolve as exactly one outcome:
   - `RESOLVED_SUCCEEDED`: provider success is proven. Atomically update reconciliation, provider job, step and workflow projection; resume the workflow.
   - `RESOLVED_FAILED`: provider failure/non-creation is proven. Atomically update all records; resume normal failure/compensation processing.
   - `PENDING`: evidence is not yet conclusive and another bounded check is safe; set `nextCheckAt` before expiry.
   - `NEEDS_REVIEW`: automation cannot safely decide; assign an operator and keep replay blocked.
   - `EXPIRED`: automated search window ended without proof; keep replay blocked and escalate for manual proof.
8. Verify workflow, step, provider job and reconciliation agree. If a terminal reconciliation receipt exists with stale projections, run the terminal invariant repair; do not reopen the terminal receipt.
9. Attach redacted evidence, resolver version, actor/worker, timestamps and correlation identifiers.

## Crash-specific handling

### Execution interrupted

A `RUNNING` step with an active execution provider job is converted atomically to:

```text
workflow      WAITING_RECONCILIATION
step          UNKNOWN
provider job  UNKNOWN
reconciliation PENDING
```

The execution callback must not run again during resume.

### Compensation interrupted

A `COMPENSATING` step with an active compensation provider job receives the same unknown-outcome treatment. The workflow must never be finalized as `COMPENSATED` until reconciliation proves compensation success.

### Local compensation interrupted before provider preparation

No provider command identity exists, so mark `COMPENSATION_FAILED_RETRYABLE`. A later retry may proceed after review/preparation. Once a terminal provider command identity exists, it cannot be silently reused.

## Replay gate

Controlled replay remains blocked until every reconciliation for the source workflow is explicitly `RESOLVED_FAILED`. `RESOLVED_SUCCEEDED`, `PENDING`, `RUNNING`, `NEEDS_REVIEW` and `EXPIRED` all block replay.

Replay then requires:

1. a new immutable request and idempotency key;
2. independent authorized approval by a different actor;
3. matching request digest and unexpired exact expiry;
4. execution that creates a new linked operation.

## Escalation package

Include operation/workflow/step/job/reconciliation IDs, capability, operation type, resolver key, purpose, request fingerprint hash, safe provider evidence, current versions/statuses, last lease owner, and proposed resolution. Exclude secrets and raw sensitive payloads.
