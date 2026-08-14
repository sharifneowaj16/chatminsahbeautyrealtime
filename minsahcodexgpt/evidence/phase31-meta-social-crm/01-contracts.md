# Phase 31 Meta Social CRM — Layer 1 contract evidence

## Layer 1.9 — Shared attachment/media policy

**Status:** PASS for dependency-independent source and contract scope.

Implemented:

- Versioned attachment policy lifecycle: `METADATA` → `DOWNLOADED` → `SCANNED` → `STORED`.
- Explicit outcomes: `ALLOWED`, `QUARANTINED`, `BLOCKED`.
- Shared HTTPS/Meta-host URL policy and MIME allowlist reuse.
- 25 MiB maximum declared and actual media size.
- Attachment type/MIME consistency checks.
- Path-like filename rejection.
- Required actual MIME, actual size and SHA-256 digest after download.
- Malware scan state and verified-storage requirements.
- Infected media blocking and scan/storage failure quarantine.
- Deterministic, non-secret decision identity and fail-closed runtime guard.

Verification:

```text
Phase 31 contract runtime tests: 35/35 PASS
Phase 31 Layer 1 static audit: 72/72 PASS
Changed-file syntax: 5/5 PASS
Phase 24 Graph/webhook/media audit: 74/74 PASS
Meta source inventory: 47/47 PASS (482 active paths)
Phase 19 source inventory tests: 4/4 PASS
Migration governance: 397/397 PASS
Prisma schema/migration pair audit: PASS
Legacy Phase 14 Instagram audit: 79/81 baseline
```

The two Phase 14 failures are inherited location checks for legacy local HMAC implementation. The centralized Phase 24 webhook/media security audit passes 74/74.

## Database impact

No Prisma schema or migration file changed.

```text
schema SHA-256: 0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0
migration tree digest: 51443f8a596178ffd3cc153df0f5803ac205129d0c9037c4e6d1857dbd49200f
```

These values match the Layer 1.8 input archive.

## Deferred work

This unit does not cut over routes, download/storage jobs, persistence, provider calls, realtime handlers or admin UI. Layer 2 webhook transport unification is next.
