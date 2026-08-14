# Phase 24 evidence — Graph HTTP, webhook, pagination, batch and media transports

**Status:** `READY_FOR_RUNTIME_QA`

## Implemented source boundary

- Authorized fixed-origin Graph HTTP client with relative-path validation, bearer auth, optional `appsecret_proof`, timeout/cancellation, bounded responses, safe logging and normalized errors.
- Cursor-only pagination with page/item limits and loop detection.
- Graph batch serialization with 1–50 operation validation, dependency validation and item-level partial results.
- Webhook SHA-256 signature verification, constant-time challenge verification, bounded raw-body parser, stable event normalization, deterministic ordering and put-if-absent receipt store contract.
- HTTPS Meta-host media policy with DNS/private-address rejection, redirect revalidation, cross-origin auth stripping, MIME/size/magic-byte checks and malware-gated private storage.
- Compatibility migrations for the shared Graph client, token debug, Facebook profile/inbox, catalog batch status/diagnostics, Instagram replies, Lead/Instagram webhook verification and Instagram attachment download.

## Verified commands

```text
tsc -p /tmp/tsconfig.phase24-core.json --pretty false
PASS

tsc -p /tmp/tsconfig.phase24-test.json --pretty false
PASS

tsc -p /tmp/tsconfig.phase24-server.json --pretty false
PASS — lazy server-entry Graph pagination/batch type contracts

CJS dependency-independent runtime harness
6/6 PASS

node scripts/meta-platform-source-inventory.mjs --write-docs
45/45 PASS — 376 governed active paths

node scripts/meta-platform-phase24-audit.mjs
74/74 PASS

node scripts/meta-platform-phase23-audit.mjs
75/75 PASS

node scripts/meta-platform-phase22-audit.mjs
56/56 PASS

node scripts/meta-platform-phase21-audit.mjs
47/47 PASS

node scripts/meta-v6-phase7-connection-audit.mjs
52/52 PASS

node scripts/meta-graph-version-policy-audit.mjs
18/18 PASS

node scripts/tracking-phase12-capi-schema-audit.mjs
52/52 PASS

node scripts/meta-v6-migration-governance-audit.mjs
372/372 PASS
```

The runtime harness verified fixed Graph host/auth/proof behavior, absolute-path rejection, cursor-only bounded pagination, item-level batch partial failures, webhook HMAC negative cases, ordering and receipt deduplication, SSRF/private-address blocking, MIME checks and malware-gated storage.

## Runtime gates still required

- Clean locked dependency install and exact `test:meta-v6-phase24` execution through `tsx`. Final retry was blocked by HTTP 503 for `zod-validation-error-4.0.2.tgz`; exact test then failed only because `tsx` was unavailable.
- Standard repository typecheck and production build after fresh Prisma generation.
- Controlled Graph smoke tests with approved test assets and each required credential role.
- Live webhook delivery/retry/duplicate/ordering observations with durable database receipts.
- Production DNS behavior, redirect cases, malware scanner and private object-storage integration.
- Separate realtime-service migration remains Phase 31; no completion claim is made for that parallel runtime.
