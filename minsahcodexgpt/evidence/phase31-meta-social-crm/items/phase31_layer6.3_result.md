# Phase 31 Layer 6.3 Result — Realtime Graph client replacement or isolation

**Status:** PASS

Realtime defaults to signed bridge mode. External Facebook webhook traffic is handed to the main app using body-bound HMAC authentication; the main app verifies the provider signature, applies shared Page health and shared Graph client policy, and enqueues deterministic sync work. Direct realtime Graph/token code remains only behind explicit legacy rollback mode.

Evidence: `logs/phase31_layer6.3_qa.log` — 3/3 tests and 10/10 static audit checks PASS.

Prisma schema unchanged; no migration. Next item: **6.4 — Realtime retry/dead-letter alignment**.
