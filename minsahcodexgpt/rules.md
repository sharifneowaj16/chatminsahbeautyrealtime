# rules.md — Engineering, AI and Repository Rules

> **Document role:** Mandatory operating contract for humans and AI agents.  
> **Priority:** This file overrides informal chat instructions unless the user explicitly updates this file.  
> **Last update:** 2026-07-26.

---

## 1. Required reading order before any code change

Every developer or AI agent must read, in order:

1. `AGENTS.md`
2. `.ai/project-state.json`
3. `.ai/context-manifest.json`
4. `SECOND_BRAIN.md`
5. `AI_CONTEXT.md`
6. `CURRENT_LAYER.md`
7. `CURRENT_TASK.md`
8. `PRD.md`
9. `architecture.md`
10. `rules.md`
11. `phases.md`
12. `design.md` when UI is affected
13. `docs/roadmaps/phase31-fast-execution-policy.md`
14. the active roadmap and phase-specific evidence/spec/runbook files
15. `memory.md`
16. affected source, tests, schema and migrations

Run `npm run ai:preflight` first to prove the full repository is accessible, then run `npm run qa:second-brain` before a code change when Node is available. Do not start by guessing from filenames, an old archive name or a previous chat summary.

## 2. Mandatory change protocol

### Before changing code

1. State the active phase and objective.
2. Verify the task is in scope for that phase.
3. List affected files and dependent flows.
4. Inspect existing tests and business rules.
5. Check whether schema, secrets, provider permissions or runtime evidence are involved.
6. Define rollback and failure behavior.
7. Update `memory.md` active-work section to `IN_PROGRESS` before a long change.

### While changing code

- Keep commits and patches atomic.
- Do not mix unrelated refactors.
- Preserve existing behavior unless the phase explicitly changes it.
- Add or update tests with the implementation.
- Record decisions that alter architecture or contracts.

### After every change

This is mandatory even for a one-line code/config/schema change:

1. update `memory.md` changed-files table;
2. state what changed and why;
3. record commands run and exact result;
4. record unverified items and blockers;
5. update active phase progress;
6. update `phases.md` only when scope/status/acceptance changes;
7. never mark `COMPLETE` without evidence.

## 2.1 Phase 31 sequential execution and packaging

Phase 31 uses **sequential numbered-item gates with per-layer packaging**.

- Process items in exact roadmap order.
- Do not begin the next numbered item until the current item has implementation/audit output, focused evidence and an updated progress checkpoint.
- A capable agent may continue to the next sequential item in the same working session; this does not waive the individual item gate.
- Never skip an audit, migration, security, cutover or release-gate item.
- Do not create a ZIP after every numbered item.
- At a completed layer gate, create the full project ZIP, SHA-256, layer verification log and layer evidence report.
- At Phase 31 final release, create the Phase 31 full project ZIP only after Layer 9.8 and every release criterion truthfully passes.

The current fast-execution addendum overrides historical Phase 31 micro-packaging examples. Item progress is tracked in `.ai/layer-progress.json` and `CURRENT_LAYER.md`.

Second Brain v4 uses `.ai/phase31-execution-manifest.json` as the machine-readable item contract. Start with `npm run ai:fast-start`, inspect the exact work packet with `npm run ai:work-packet`, synchronize generated context with `npm run ai:sync-context`, and use `npm run ai:advance-item` only after required evidence exists. Advancement is fail-closed and dry-run by default.

## 3. Source-of-truth hierarchy

When sources conflict, use this order:

1. current source code and database schema;
2. passing executable tests and command artifacts from the same commit;
3. machine-readable configuration/manifests;
4. current PRD/architecture/rules/phases/design;
5. current `memory.md`;
6. historical summaries and chat transcripts.

Historical evidence must not override current source.

## 4. Allowed core technologies

Use existing stack by default:

- Next.js App Router, React and TypeScript;
- PostgreSQL and Prisma;
- Redis/ioredis and BullMQ;
- Tailwind CSS and semantic CSS variables;
- Headless UI and Lucide icons;
- Elasticsearch for search;
- MinIO for object/media storage;
- Playwright and existing Node/TSX test patterns;
- existing provider SDKs/adapters.

Adding a dependency requires:

- documented need;
- comparison with existing capability;
- security/license/bundle review;
- owner approval;
- lockfile update;
- tests and `memory.md` update.

## 5. Files that must never be manually edited

- `.next/**`
- `node_modules/**`
- generated Prisma client output
- package manager cache
- compiled JavaScript generated from TypeScript
- historical evidence logs solely to make a gate pass

Delete/regenerate derived output instead.

## 6. Next.js rules

- Use App Router conventions.
- Route segment config (`runtime`, `dynamic`, etc.) must be directly statically exported from the route file; do not re-export config fields.
- Server-only modules must use `import 'server-only'` when they handle secrets/provider clients.
- Client components must be explicitly marked with `'use client'`.
- Avoid importing server modules into client trees.
- Do not create network connections at module import time.
- Use supported Next.js cache behavior; do not override framework-owned `/_next/static` or `/_next/image` headers without a proven requirement.
- Security headers/CSP changes require browser and tracking regression tests.

## 7. TypeScript and code-quality rules

- Strict types; avoid `any`. When unavoidable, isolate and justify it.
- Validate external input at runtime even if TypeScript types exist.
- Use explicit domain enums/status transitions rather than free-form strings.
- Prefer named exports for internal modules.
- Keep functions small enough to test and reason about.
- Do not duplicate business rules in routes/components.
- No silent fallback that changes identity, token role, currency, price or provider asset.
- Comments explain why, not obvious syntax.
- Remove debug logging before production unless behind an approved safe debug flag.

## 8. Database and Prisma rules

- `prisma/schema.prisma` is canonical.
- Never use `db push` as production migration proof.
- Any change that touches `prisma/schema.prisma` **must** include a new timestamped `prisma/migrations/<timestamp>_<name>/migration.sql` in the same change-set. A schema-only commit is prohibited.
- The same migration directory must include `recovery.sql` or an explicit reviewed forward-fix-only recovery note when PostgreSQL cannot safely reverse the change.
- CI must run `npm run qa:prisma-schema-migration-pair`; Phase status cannot advance when the schema/migration pair gate fails.
- Never rewrite an already-applied historical migration to match a later schema correction; add a new forward migration.
- Every schema change needs a forward migration and recovery plan.
- Destructive changes require staged/backfilled migration.
- Use transactions for coupled business state and outbox/event creation.
- Add indexes for real query patterns; avoid speculative indexes.
- PII and secrets must not be copied into audit/event JSON without classification.
- Generated Prisma client freshness must pass before typecheck/build claims.

## 9. API rules

- Authenticate before reading sensitive input where possible.
- Authorize at resource/action level, not only “logged in”.
- Validate body, query and path parameters.
- Enforce bounded pagination and payload size.
- Use stable response/error shapes.
- Do not expose raw Prisma/provider errors.
- Mutation APIs require idempotency where duplicate requests are plausible.
- Admin APIs must be covered by the security audit and explicit RBAC.
- Long-running operations return an operation/job reference, not an open request waiting indefinitely.

## 10. Error handling

Use normalized errors with:

```ts
{
  code: string;
  category: string;
  message: string;
  retryable: boolean;
  safeDetails?: Record<string, unknown>;
  correlationId?: string;
}
```

Rules:

- Log correlation/operation IDs, not raw secrets or PII.
- Network/timeout/429/selected 5xx may be retryable.
- Validation, missing permission, invalid token, approval failure and consent denial are normally permanent until corrected.
- A provider request with unknown outcome must be verified before retry.
- User-visible errors should describe next action without revealing internals.

## 11. Logging and observability

Allowed low-cardinality labels:

- domain;
- operation type;
- status;
- error category;
- transport;
- queue name.

Forbidden labels/log fields:

- email;
- phone;
- token/secret;
- raw webhook body;
- full address;
- customer name unless an audited support screen requires it;
- high-cardinality provider IDs in metrics.

Use structured logs and redact recursively.

## 12. Security and privacy rules

- Secrets are environment/secret-store values, never source-controlled.
- Do not invent `rediss://`; use the protocol actually supported by the Redis deployment. Private-network `redis://` and TLS `rediss://` are both valid when governed correctly.
- Verify webhook signatures against raw body before business parsing.
- Use constant-time signature comparison.
- Apply SSRF protection to remote media/image downloads.
- Restrict media MIME, size and storage path.
- Hash provider-required customer fields after approved normalization.
- Consent `UNKNOWN` is not `GRANTED`.
- Withdrawal/suppression takes precedence over marketing processing.
- Critical admin writes and replay actions are immutable-audited.

## 13. Queue and worker rules

- PostgreSQL/outbox is durable; Redis is execution coordination.
- Queue delivery is at-least-once.
- Every handler must be idempotent.
- Use deterministic job IDs/idempotency keys.
- Queue payloads carry references and safe metadata, not tokens or unnecessary PII.
- Separate critical and bulk workloads.
- Use bounded attempts, deadlines and dead-letter/quarantine state.
- Respect provider retry-after/rate information.
- Circuit breakers are domain/asset scoped; one provider feature outage must not stop unrelated features.
- Worker startup validates only its required runtime dependencies.

## 14. Meta provider rules

- Application code uses `MetaPlatform`, not raw SDK classes.
- Business SDK imports exist only in the SDK transport.
- Graph URL calls exist only in the Graph HTTP transport.
- Credential roles are explicit: APP, BUSINESS/SYSTEM_USER, CAPI, PAGE, INSTAGRAM.
- No cross-role token fallback.
- SDK and Graph transport are not automatic duplicate-write fallbacks.
- Critical writes require approval/preconditions, before state, after state and verification.
- Replay creates a new linked operation.
- Catalog/Pixel/CAPI content identity uses the canonical SKU policy.
- All capabilities declare permissions, transport, circuit, rate, idempotency and replay policy.

## 15. Payment, inventory and order rules

- Order and payment state transitions are explicit and idempotent.
- Never trust client price, discount, delivery charge or stock state.
- Inventory reservation/release must be transactionally consistent with order state.
- Payment callback success is not accepted without matching order/provider state.
- Courier/provider side effects must not silently change paid/order state.
- Manual admin correction requires audit history.

## 16. UI and design rules

- Use semantic tokens from `app/globals.css` / `lib/design-tokens.ts`.
- Do not introduce arbitrary hex colors in components without adding an approved semantic token.
- Use system font stack currently defined; do not ship or expose proprietary font files.
- Minimum readable body size is 16px; microcopy should not be below the tokenized 12px minimum.
- Use Lucide icons consistently.
- Preserve keyboard navigation and visible focus.
- Do not use color alone to convey status.
- Avoid unbounded animation and respect reduced motion.
- Mobile-first and safe-area behavior must be preserved.

## 17. Testing rules

Match test type to risk:

- pure business rule → unit test;
- adapter mapping → contract/snapshot test;
- database transaction → integration test;
- route authorization → API security test;
- browser interaction/accessibility → Playwright;
- provider runtime contract → actual package import/sandbox evidence;
- migration → disposable PostgreSQL apply and recovery drill;
- outage behavior → Redis/provider failure simulation.

Do not weaken a test to make implementation pass.

Minimum completion commands, when applicable:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Run phase-specific and security gates as listed in `phases.md`.

## 18. AI scope and limitations

AI may:

- inspect code and documents;
- propose architecture and implementation;
- edit code, tests and docs within the active phase;
- generate migration drafts and audit scripts;
- summarize errors and produce reviewable operator suggestions.

AI must not:

- claim a command passed without executing it or receiving its artifact;
- mark a phase complete without evidence;
- invent secrets, provider IDs, permissions, live results or production status;
- send customer/social replies or execute critical ad/catalog/payment actions unless the user explicitly authorizes an available tool/action;
- weaken security, consent, approval or release gates for convenience;
- edit generated/dependency files;
- perform blind repository-wide replacement without scoped review;
- expose private chain-of-thought as a substitute for evidence;
- assume a post-snapshot working-copy change exists unless verified.

AI-generated customer-facing or marketing text must be reviewed by a human when it creates legal, health, pricing or policy commitments.

## 19. Memory update contract

`memory.md` is the second brain and must remain concise, factual and current.

After every change, update:

- timestamp and actor;
- active phase/task;
- files changed;
- behavior changed;
- tests/commands and results;
- migration/runtime evidence;
- blockers and risks;
- next exact action.

Whenever a numbered item or layer checkpoint changes, update these files atomically:

```text
.ai/project-state.json
.ai/layer-progress.json
AI_CONTEXT.md
CURRENT_LAYER.md
CURRENT_TASK.md
phases.md
memory.md
```

Then run:

```bash
npm run ai:refresh-context
npm run qa:second-brain
```

Keep root `memory.md` concise; move historical detail to `docs/memory/archive/`.

Use these verification states:

```text
VERIFIED_SOURCE
VERIFIED_COMMAND
VERIFIED_RUNTIME
UNVERIFIED_WORKING_COPY
PLANNED
BLOCKED
```

Archive old detailed entries under `docs/memory/archive/YYYY-MM.md` when `memory.md` becomes too large; retain current decisions, blockers and last 20 changes in the root file.

## 20. Phase status rules

Allowed statuses:

```text
NOT_STARTED
IN_PROGRESS
CODE_COMPLETE
READY_FOR_GENERATION
READY_FOR_RUNTIME_QA
BLOCKED
COMPLETE
DEPRECATED
```

`COMPLETE` requires all acceptance criteria and evidence. `CODE_COMPLETE` does not mean deployable. Status changes must be recorded in both `phases.md` and `memory.md`.

## 21. Exception process

A rule exception requires:

1. exact rule being overridden;
2. reason and alternatives considered;
3. scope and expiry date;
4. risk/rollback;
5. approver;
6. ADR or `memory.md` decision entry;
7. test/evidence proving the exception is safe.
