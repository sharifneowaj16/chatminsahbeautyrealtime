# Phase 31 Layer 3.7 — Sanitized Payload Digest, Retention and Replay Metadata

**Prepared:** 2026-07-25  
**Input checkpoint:** `minsahbeauty_phase31_layer3.6_complete.zip`  
**Layer verdict:** **PASS (source/static/focused regression gate)**  
**Exact next item:** **Layer 3.8 — Layer 3 migration drill, regression and evidence gate**

## What changed

- Kept the verified raw webhook body SHA-256 as the canonical payload digest authority.
- Hardened safe metadata handling with explicit sensitive-key recognition, bounded allowlisted receipt projections and digest-prefix-only admin output.
- Added persisted retention classification, metadata-retention deadline, longer dedupe-tombstone deadline and metadata-pruning timestamp.
- Added persisted replay eligibility and durable source metadata for legacy receipts, normalized Leads, Instagram messages and durable jobs.
- Reused the existing `MetaAdminApproval` control plane instead of creating a parallel approval system.
- Required an approved, unexpired, two-person approval record before a dead-letter receipt can create a controlled replay child.
- Added immutable replay approval, source, reason, result and original/child relationship metadata.
- Kept the replay child receipt state as the result authority; terminal trace fields are projections of that state rather than a second state machine.
- Preserved the canonical receipt digest on changed duplicate delivery, while recording the latest digest, mismatch count, timestamp and safe mismatch code.
- Linked normalized Lead and Instagram message persistence to replay-source availability and expiry metadata.
- Added an additive Prisma migration, paired recovery SQL and safety README.
- Added focused runtime tests, static audit coverage and aggregate persistence scripts for Layer 3.7.

## What did not change

- No raw webhook request body, access token, app secret, Authorization header, email, phone, message text, comment text or signed attachment URL was added to the canonical receipt model.
- The existing scoped database receipt-dedupe boundary was not weakened or replaced.
- Existing Lead, Instagram conversation/message, outbound idempotency and private-reply one-shot constraints were not removed.
- No new parallel replay approval service or independent replay state machine was introduced.
- No queue worker, purge worker, admin action endpoint, cutover flag or provider write path was implemented; those belong to later numbered items.
- Layer 3.8 real PostgreSQL apply/recovery/re-apply and concurrency drills were not performed in this item.

## Prisma status

Schema change: **YES — additive only**

Migration pair:

- `prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata/migration.sql`
- `prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata/recovery.sql`
- `prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata/README.md`

Forward migration SHA-256:

```text
86dc1c49841a16eac1c6cd208edc69e63d3443fba572ab0907ce21097ea6d727
```

Migration characteristics:

- deterministic and resumable backfill;
- precondition queries before constraints;
- canonical DB dedupe constraint preserved;
- replay unknown-outcome block persisted;
- approval tuple consistency enforced;
- referenced approval deletion restricted so audit metadata cannot become partially null;
- recovery removes only Layer 3.7 fields, indexes, constraints and enums;
- recovery preserves canonical receipt and business tables.

## Verification status

| Gate | Result |
|---|---:|
| Layer 1 contract runtime tests | 35/35 PASS |
| Layer 1 contract static audit | 72/72 PASS |
| Layer 2 webhook runtime tests | 26/26 PASS |
| Layer 2 webhook static audit | 37/37 PASS |
| Existing Layer 3 receipt runtime tests | 17/17 PASS |
| Existing Layer 3 persistence audit | 37/37 PASS |
| Receipt lifecycle audit | 43/43 PASS |
| Provider identity runtime tests | 11/11 PASS |
| Provider identity audit | 58/58 PASS |
| Lead storage runtime tests | 13/13 PASS |
| Lead storage audit | 65/65 PASS |
| Instagram storage runtime tests | 16/16 PASS |
| Instagram storage audit | 75/75 PASS |
| Layer 3.7 focused runtime tests | 9/9 PASS |
| Layer 3.7 static audit | 41/41 PASS |
| Prisma schema/migration pair governance | PASS |
| Meta migration governance | 427/427 PASS |
| Frozen Meta source inventory | 48/48 PASS; 521 mapped paths |

Layer 3.7 focused runtime plus retained persistence runtime coverage: **26/26 PASS**.

## Security and replay assertions verified

- Same exact raw body produces the same digest; changed bytes produce a different digest.
- Safe projections are allowlisted and secret/PII key forms are recognized case-insensitively.
- Safe metadata and dedupe tombstone retention have separate deadlines.
- Active or non-terminal receipts cannot be metadata-pruned.
- Missing, expired or unknown-outcome replay sources are blocked.
- Requester and approver must be different actors.
- The same replay request key is idempotent and cannot be rebound to different approval metadata.
- Replay children remain linked to the original receipt and cannot change the original provider event identity.
- Admin projection exposes safe metadata and digest prefixes, not raw payload content.
- Processed, blocked and dead-lettered replay children retain terminal result trace metadata.

## Known blocker

This execution environment does not provide `psql`, Docker, installed `node_modules`, Prisma CLI or `tsx`. Therefore this item does not claim:

- disposable PostgreSQL migration apply;
- recovery and re-apply drill;
- real database concurrent insert/claim testing;
- Prisma client generation or Prisma schema validation through the installed CLI;
- full application typecheck, lint or production build.

Those database drills are mandatory in **Layer 3.8**. Full application runtime gates remain subject to the existing dependency-install blocker and the final Phase 31 release gate.

## Exact next item

```text
Layer 3.8 — Layer 3 migration drill, regression and evidence gate
```
