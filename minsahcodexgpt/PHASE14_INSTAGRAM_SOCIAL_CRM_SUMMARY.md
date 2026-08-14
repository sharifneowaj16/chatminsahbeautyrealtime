# MinsahBeauty Meta v6 — Phase 14 Instagram Social CRM Update

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Phase: **Instagram Messaging & Social CRM Expansion**

## Delivered

- Raw-body HMAC SHA-256 Instagram webhook verification before JSON parsing.
- A bounded 1 MiB webhook route with stable event/message dedupe and durable receipt-first processing.
- Typed conversation, message, attachment, verified CRM-link and immutable reply-attempt persistence.
- Receipt-only Instagram queue jobs; raw webhook payloads and PII are excluded from job payloads.
- Atomic receipt claiming, idempotent message upsert, account ownership checks and profile enrichment.
- HTTPS-only attachment handling with credential, MIME and 25 MiB size controls plus private object paths.
- Policy-aware standard replies, one-shot comment private replies, permission checks and archived/spam blocking.
- Redacted provider failure incidents, low-cardinality metrics and daily retention cleanup.
- Explicit verified links from conversations to users, leads, products and orders; no fuzzy identity matching.
- Permission-separated admin inbox for assignment, tags/status, CRM links, health and replies.
- Instagram CRM entry in the unified `/admin/meta` Operations Center.
- Documented server-only access-token, messaging-permission and bounded-retention environment contract.

## Validation

```text
Phase 14 semantic tests                    22/22 passed
Phase 14 static audit                      81/81 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 97 routes passed
Meta Business platform audit               22/22 passed
Phase 13 regression                  15/15 + 56/56 passed
Phase 12 regression                  14/14 + 51/51 passed
Phase 11 regression                  13/13 + 41/41 passed
Phase 10 regression                  12/12 + 40/40 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Repository npm test                         16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

## Release holds

1. Prisma Client generation and schema validation are blocked by `binaries.prisma.sh` DNS resolution (`EAI_AGAIN`).
2. The forward migration still needs disposable PostgreSQL apply/rollback evidence.
3. Meta App Review and an owned Instagram Professional account must prove live permission/account health.
4. Live signed webhook, standard reply, one-shot private reply and provider message-ID evidence are still required.
5. Production Redis worker, private MinIO media, malware scanning and retention cleanup need repeated runtime evidence.
6. The repository-wide master tracking gate retains eight inherited historical documentation/runtime-proof failures outside Phase 14.

Do not enable production Instagram replies until generation, migration, App Review/permission health and live policy-window evidence are complete.
