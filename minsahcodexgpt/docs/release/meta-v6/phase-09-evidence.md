# Meta v6 Phase 9 Evidence — Admin Meta Operations Center

Date: 18 July 2026  
State: `PARTIAL`  
Branch label: `artifact/meta-v6-phase-09`

## Scope delivered

Phase 09 now has a secure operations-control-plane foundation:

```text
/admin/meta
→ redacted cross-domain health summary
→ connection / catalog / events / leads / jobs / attribution views
→ exact action payload hash
→ two-person high-risk approval
→ optimistic single-consumption claim
→ provider action
→ immutable success / failure / denied audit row
```

## Main implementation

- Added `/admin/meta` with Overview, Connection, Catalog, Events, Leads, Jobs, Approvals, Attribution and Audit Logs sections.
- Added permission separation for Meta view, operate, approve and audit capabilities.
- Preserved existing SUPER_ADMIN protection for sensitive event, queue, connection and lead mutation routes.
- Added typed `MetaAdminActionRisk`, `MetaAdminApprovalStatus` and `MetaAdminAuditOutcome` enums.
- Added `MetaAdminApproval` with payload hash, expiry, reviewer, version and execution state.
- Added immutable `MetaAdminAudit` with actor, action, resource, before/after data, request metadata and outcome.
- Added exact-payload approval binding and atomic `APPROVED → EXECUTING` claim to prevent concurrent/replayed use.
- Blocked self-approval for HIGH and CRITICAL actions.
- Approval-gated Meta event replay and durable job replay/cancel.
- Audited connection recheck, catalog sync and lead lifecycle changes.
- Added recursive redaction for token, secret, raw payload, phone, email, IP and user-agent fields.
- Added human-readable provider failure hints and explicit pending/final state labels.
- Added operations summary, approvals and audit-log APIs.
- Preserved legacy `/admin/meta-business` tools as an advanced compatibility surface.

## Schema and migration

Migration:

```text
prisma/migrations/20260718010000_meta_v6_phase9_admin_operations/migration.sql
```

New typed persistence:

- `MetaAdminActionRisk`
- `MetaAdminApprovalStatus`
- `MetaAdminAuditOutcome`
- `MetaAdminApproval`
- `MetaAdminAudit`

`MetaAdminAudit` intentionally has no `updatedAt` field. Mutations create new rows rather than modifying historical records.

## Main changed files

```text
app/admin/meta/page.tsx
app/admin/AdminLayoutWrapper.tsx
app/api/admin/meta/operations/summary/route.ts
app/api/admin/meta/approvals/route.ts
app/api/admin/meta/approvals/[approvalId]/route.ts
app/api/admin/meta/audit-logs/route.ts
app/api/admin/meta/events/route.ts
app/api/admin/meta/jobs/route.ts
app/api/admin/meta/catalogs/sync/route.ts
app/api/admin/meta/connection/route.ts
app/api/admin/meta/leads/[leadId]/route.ts
lib/auth/admin-permissions.ts
lib/meta/admin/*
prisma/schema.prisma
prisma/migrations/20260718010000_meta_v6_phase9_admin_operations/migration.sql
tests/meta-v6/phase9-admin-operations.test.ts
scripts/meta-v6-phase9-admin-audit.mjs
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Automated evidence

```text
Phase 09 semantic tests                    11/11 passed
Phase 09 static audit                      30/30 passed
Admin API security scan              79 routes passed
Meta Business platform audit               22/22 passed
Phase 1 regression                     4/4 + 9/9 passed
Phase 2 regression                    8/8 + 20/20 passed
Phase 3 regression                    9/9 + 20/20 passed
Phase 4 regression                  11/11 + 27/27 passed
Phase 5 regression                  11/11 + 43/43 passed
Phase 6 regression                  12/12 + 45/45 passed
Phase 7 regression                  11/11 + 50/50 passed
Graph version policy                        16/16 passed
Phase 8 regression                  14/14 + 68/68 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
Global v6 blocker audit                    12/14 passed
```

Global A13 and A14 remain open. Phase 09 adds typed approval/audit lifecycles, but A13 still covers other remaining raw lifecycle fields across the complete project contract. A14 remains Phase 10 Catalog Diagnostics scope.

## Security evidence

- High-risk replay/cancel cannot execute without an approved, unexpired request for the exact action, resource and payload hash.
- HIGH/CRITICAL requests require a different reviewer.
- Approval consumption is optimistic and atomic; concurrent requests cannot reuse one approval.
- Denied, failed and successful attempts create separate immutable audit records.
- Admin data is recursively redacted before approval storage, audit storage and API rendering.
- Operations summaries expose shaped failure hints rather than raw provider error objects, and administrator identity objects omit email addresses.
- If a provider action succeeds but audit persistence or approval finalization fails, the API returns an explicit do-not-retry/verify-state error instead of misclassifying the provider action as safely failed.
- Direct email, phone, access token, app secret, authorization, raw payload, IP and user-agent values are not returned.
- Existing Phase 4–8 SUPER_ADMIN route contracts remain intact.
- Submission states are labeled pending and are not represented as final provider success.

## Build, generation and migration hold

The TypeScript compiler passes against local compatibility typings, but the generated Prisma client intentionally remains stale. Prisma generation could not download the required schema engine because the host was not resolvable:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The repository freshness guard remains active and was not bypassed. Runtime deployment requires:

```bash
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run typecheck
npm run build
```

## Remaining Phase 09 work

1. Generate and commit the Prisma client from the Phase 09 schema.
2. Apply the migration to a disposable PostgreSQL database and capture table, enum, FK and index evidence.
3. Capture two-person approval runtime evidence using two separate SUPER_ADMIN accounts.
4. Prove approval mismatch, expiry and concurrent-consumption rejection against the database.
5. Migrate remaining Meta Business write routes—catalog create/update, campaigns, ad sets, ads, creatives, audiences, offline events and settings—to `executeMetaAdminAction`.
6. Capture redaction scans from real failure/audit payloads.
7. Run the production build after generated-client refresh.
8. Continue Phase 10 with Catalog Diagnostics persistence and detailed issue UI.

## Acceptance criteria status

- [x] Unified operations-control-plane route exists.
- [x] Non-technical failure hints are displayed.
- [x] Dangerous event/job replay actions require exact approvals.
- [x] Two-person review is enforced for HIGH/CRITICAL actions.
- [x] Core Phase 09 mutations return immutable audit IDs.
- [x] Secrets and raw PII are recursively redacted.
- [x] Submitted states are shown as pending, not final success.
- [x] Phase 1–9 semantic/static regression gates pass.
- [ ] Prisma client is generated and migration applied.
- [ ] Runtime approval/concurrency evidence is attached.
- [ ] Every remaining Meta Business mutation route uses the shared audit wrapper.
- [ ] Production build passes after generation.
