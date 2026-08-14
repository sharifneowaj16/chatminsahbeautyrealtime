# Phase 31 Layer 3.4 — Provider identity and object mapping persistence

**Status:** PASS for numbered source scope and dependency-independent verification  
**Implementation date:** 2026-07-25  
**Input checkpoint:** Phase 31 Layer 3.3 COMPLETE  
**Exact next item:** Layer 3.5 — Lead receipt and normalized Lead storage

## Executive conclusion

Layer 3.4 reuses `MetaExternalReference` as the canonical provider-identity registry instead of creating a parallel mapping table. It adds typed identity lifecycle and permission-health fields, a scoped typed relationship table, and a nullable canonical receipt-to-primary-identity foreign key. App, Business, Ad Account, Page, Instagram Account and Lead Form identities are isolated by environment and connection key. Duplicate identity and relationship edges are database-backed, while asset-pair and cross-scope relationship rules are enforced by the repository boundary.

Lead Ads accepted receipts now register Page and optional Lead Form identities, persist the Page→Lead Form edge and attach the primary identity to the canonical receipt before legacy encrypted receipt persistence continues. Instagram receipts register the configured Instagram/Page identity scope, persist the Page→Instagram edge and attach the Instagram identity. A configured account/Page mismatch leaves the canonical receipt durable and moves it to `BLOCKED`; the event is not queued.

No existing `MetaConnection`, Lead, Instagram, legacy receipt, conversation, message or queue model was removed or renamed. No environment was guessed and no provider access token, secret, raw webhook payload, email, phone, message text or signed URL is copied into identity or relationship metadata.

## What changed

### Prisma identity lifecycle

Added enums:

```text
MetaProviderIdentityStatus
  UNVERIFIED
  ACTIVE
  INACTIVE
  REVOKED

MetaProviderPermissionHealth
  UNKNOWN
  HEALTHY
  DEGRADED
  MISSING_PERMISSION
  BLOCKED

MetaProviderIdentityRelationshipType
  APP_ASSOCIATED_WITH_BUSINESS
  BUSINESS_OWNS_PAGE
  BUSINESS_OWNS_AD_ACCOUNT
  PAGE_LINKED_INSTAGRAM_ACCOUNT
  PAGE_CONTAINS_LEAD_FORM

MetaProviderIdentityRelationshipStatus
  UNVERIFIED
  ACTIVE
  INACTIVE
  REVOKED
```

Extended `MetaExternalReference` with:

```text
identityStatus
permissionHealth
permissionMetadata
lastSeenAt
lastVerifiedAt (existing field retained)
disabledAt
revokedAt
statusReason
```

Existing generic references default to `UNVERIFIED` and `UNKNOWN`. The migration does not promote historical rows to active or healthy because ownership and permissions cannot be inferred safely.

### Canonical typed relationships

Added `MetaProviderIdentityRelationship` with:

```text
environment
connectionKey
relationshipType
parentReferenceId
childReferenceId
status
source
metadata
lastVerifiedAt
disabledAt
revokedAt
statusReason
createdAt
updatedAt
```

The database unique edge is:

```text
environment
+ connectionKey
+ relationshipType
+ parentReferenceId
+ childReferenceId
```

Repository validation permits only:

| Relationship | Parent asset | Child asset |
|---|---|---|
| `APP_ASSOCIATED_WITH_BUSINESS` | `APP` | `BUSINESS` |
| `BUSINESS_OWNS_PAGE` | `BUSINESS` | `PAGE` |
| `BUSINESS_OWNS_AD_ACCOUNT` | `BUSINESS` | `AD_ACCOUNT` |
| `PAGE_LINKED_INSTAGRAM_ACCOUNT` | `PAGE` | `INSTAGRAM_ACCOUNT` |
| `PAGE_CONTAINS_LEAD_FORM` | `PAGE` | `LEAD_FORM` |

Parent and child must use the same `environment` and `connectionKey`. Self-reference, reversed/invalid asset pairs and relationships involving a revoked identity fail closed.

### Receipt traceability

Added nullable `MetaSocialWebhookReceipt.primaryIdentityReferenceId` with `ON DELETE SET NULL` relation to `MetaExternalReference` and a lookup index.

Primary identity policy:

```text
Lead Ads with form ID → LEAD_FORM
Lead Ads without form ID → PAGE
Instagram → INSTAGRAM_ACCOUNT
Facebook Page compatibility → PAGE
```

Attachment is idempotent when the same identity is already linked. A conflicting second identity, wrong platform asset type, wrong environment or wrong connection is rejected.

### Repository boundary

Added:

```text
lib/meta-platform/repositories/provider-identities.ts
lib/meta-platform/repositories/provider-identity-relationships.ts
lib/meta-platform/repositories/provider-identity-backfill.ts
lib/meta-platform/repositories/page-identities.ts
lib/meta-platform/repositories/instagram-identities.ts
lib/meta-platform/repositories/lead-form-identities.ts
lib/meta-platform/repositories/prisma-provider-identities.ts
lib/meta-platform/repositories/webhook-provider-identities.ts
```

The pure identity repository provides:

- environment/connection-scoped idempotent registration;
- deterministic local and canonical keys;
- active/inactive/revoked lifecycle with revoked terminal behavior;
- identity-specific permission health;
- safe metadata and permission allowlists;
- read resolution and strict writable selection;
- receipt-platform compatibility validation;
- in-memory identity and relationship stores for dependency-independent tests.

The server-only Prisma adapter provides:

- database-backed identity register/resolve/update/disable/revoke;
- database-backed typed relationship link/find/list;
- receipt primary-identity attachment;
- explicit connection snapshot backfill execution.

### Safe metadata policy

Identity metadata is allowlist-based. Accepted identity keys are limited to bounded diagnostics such as:

```text
connectionName
displayName
providerObjectType
sourceField
username
```

Permission metadata accepts only bounded string arrays for:

```text
required
granted
missing
```

Secret/PII-bearing keys including token, secret, authorization, cookie, password, signed URL, email, phone, message and raw payload patterns are rejected from the safe projection.

### Lead Ads identity flow

For an accepted Lead notification:

```text
canonical receipt create-or-get
→ register scoped Page identity
→ register optional scoped Lead Form identity
→ create/update PAGE_CONTAINS_LEAD_FORM relation
→ attach Lead Form or Page as receipt primary identity
→ persist existing encrypted MetaWebhookReceipt
→ continue existing queue/lifecycle behavior
```

A Page is marked `ACTIVE` only when it matches the configured Page. A form is marked `ACTIVE` only when it is in the configured allowlist. Otherwise the observed mapping remains `UNVERIFIED`; Layer 3.4 does not guess provider verification.

### Instagram identity flow

For an Instagram receipt:

```text
canonical receipt create-or-get
→ validate event account against configured Instagram/Page IDs
→ register scoped Instagram identity
→ register configured Page identity when present
→ create/update PAGE_LINKED_INSTAGRAM_ACCOUNT relation
→ attach Instagram account as receipt primary identity
→ continue existing legacy receipt and queue flow
```

If configured account scope exists and the event account matches neither configured Instagram account nor configured Page, the canonical receipt is preserved and guarded to `BLOCKED` with a safe identity-scope code. The event is returned as rejected and is not queued.

### Deterministic connection backfill

`buildMetaProviderIdentityBackfillPlan` requires an explicit environment and a connection key equal to the supplied `MetaConnection` snapshot name. It registers only IDs actually present in the snapshot:

```text
appId
businessId
adAccountId
pageId
instagramAccountId
```

Known relations are planned only when both endpoints exist. Missing Business IDs do not produce invented Business ownership. Backfilled identities and relationships remain `UNVERIFIED`/`UNKNOWN` until provider verification occurs. Lead forms are intentionally runtime/discovery registrations because the existing connection snapshot has no durable form list.

## DB uniqueness and scope decisions

Existing `MetaExternalReference` constraints remain the identity dedupe authority:

```text
environment + connectionKey + assetType + assetId + objectType + localId
environment + connectionKey + assetType + assetId + objectType + providerId
```

Provider identities use:

```text
objectType = PROVIDER_IDENTITY
assetId = providerId
localId = meta-identity:<assetType>:<providerId>
canonicalKey = META:<assetType>:<providerId>
```

Therefore:

- same provider identity in the same environment/connection is idempotent;
- the same provider ID in a different environment does not collide;
- the same provider ID in a different connection does not collide;
- conflicting local/provider aliases are rejected rather than silently remapped;
- duplicate relationship edges are blocked by the new database unique index.

## Migration and recovery

Created:

```text
prisma/migrations/20260725033000_phase31_provider_identity_mapping/migration.sql
prisma/migrations/20260725033000_phase31_provider_identity_mapping/recovery.sql
prisma/migrations/20260725033000_phase31_provider_identity_mapping/README.md
```

Migration properties:

- additive enums, columns, indexes, relation table and receipt FK only;
- no existing provider identity is promoted automatically;
- no legacy table or column is removed or renamed;
- relationship table begins empty;
- duplicate-edge precondition query is documented before unique index creation;
- parent/child identity FKs use `ON DELETE RESTRICT`;
- receipt identity FK uses `ON DELETE SET NULL` to preserve receipt history;
- migration is registered and hashed in the migration governance manifest.

Recovery properties:

- explicit warning to export/verify active relations and receipt links first;
- removes only Layer 3.4 receipt FK/index/column, relationship table/indexes, identity fields/indexes and enums;
- does not drop `MetaExternalReference`, `MetaSocialWebhookReceipt`, Layer 3.2 dedupe fields, Layer 3.3 lifecycle fields or legacy Lead/Instagram data.

## Verification

Dependency-independent commands completed:

```text
Layer 3.2/3.3 lifecycle runtime: 17/17 PASS
Layer 3.2 persistence audit:      37/37 PASS
Layer 3.3 lifecycle audit:        43/43 PASS
Layer 3.4 identity runtime:       11/11 PASS
Layer 3.4 identity audit:         58/58 PASS
Layer 1 contracts runtime:        35/35 PASS
Layer 1 contracts audit:          72/72 PASS
Layer 2 webhook runtime:          26/26 PASS
Layer 2 webhook audit:            37/37 PASS
Phase 24 static transport audit:  74/74 PASS
Phase 14 Instagram static audit:  81/81 PASS
Phase 21 context/reference audit: 47/47 PASS
Migration governance:           412/412 PASS
Source inventory:                 48/48 PASS
Active governed paths:               504
Prisma schema/migration pair:          PASS
Changed TypeScript syntax:         15/15 PASS
```

Focused Layer 3.4 scenarios cover:

- secret-free metadata and permission allowlists;
- same-scope identity idempotency;
- environment and connection isolation;
- context mismatch rejection;
- valid Page→Instagram and Page→Lead Form edges;
- cross-scope and invalid asset-pair rejection;
- revoked terminal status and write ineligibility;
- specialized Page/Instagram/Lead Form resolution;
- receipt identity compatibility and conflict safety;
- deterministic, resumable backfill without invented ownership.

## What did not change

- `MetaConnection` remains the connection configuration/readiness snapshot.
- Existing generic `MetaExternalReference` rows remain intact.
- Existing Lead, Instagram, Facebook, conversation, message, outbound and job models were not redesigned.
- Lead normalized storage and CRM handoff were not implemented.
- Instagram conversation/message and outbound idempotency were not implemented.
- Queue provider, retry/backoff policy, realtime bridge, admin APIs and feature cutover were not changed.
- No live Graph identity discovery or production data backfill was executed.
- No raw token, secret, webhook body or PII was persisted in the new identity boundary.

## Prisma/runtime status

```text
Schema change: YES — additive only
Migration pair: PRESENT
Migration governance: PASS 412/412
Prisma generated client: NOT GENERATED in this environment
Disposable PostgreSQL apply/recovery/re-apply: NOT RUN
Full dependency-backed typecheck/lint/build: NOT RUN
```

`node_modules` and the `tsx` package are absent, and Prisma CLI, `psql` and Docker are unavailable. A Phase 24 dependency-backed test attempt failed only because `tsx` could not be resolved; the Phase 24 static audit still passed 74/74. No dependency-backed runtime/build success is claimed.

## Known blockers

- Generate Prisma Client after dependencies are available.
- Apply, recover and reapply all Layer 3 migrations on disposable PostgreSQL.
- Run real PostgreSQL uniqueness, relationship and concurrent attachment tests.
- Run full typecheck, lint and production build after a successful locked dependency install.
- Collect live Meta identity/permission evidence in the later provider evidence gate.

## Completion decision

Layer 3.4 is complete for its numbered source scope: canonical scoped provider identities, typed relationships, soft lifecycle/permission health, receipt traceability, deterministic backfill planning, Lead/Instagram webhook adoption, additive migration/recovery, tests, static governance and evidence are present. Database application and live provider verification remain explicitly unclaimed.

## Exact next item

```text
Layer 3.5 — Lead receipt and normalized Lead storage
```

Layer 3.5 must connect canonical receipt identity to deterministic normalized Lead persistence, DB-idempotent provider Lead IDs, Page/Form/ad attribution, safe PII projections and replay-safe CRM handoff metadata. It must not redesign Instagram persistence or start Layer 4 queue work.
