# Phase 31 Layer 5 — Facebook Page Domain Evidence

## Item 5.10 — Page identity, permissions, and health

- Page identity, app/business ownership, connected Instagram identity, token verification/expiry/data-access state, and operation-specific permissions are evaluated by `lib/meta-platform/domains/pages/`.
- The production Lead subscription route uses `subscribeMetaPageLeadgenProduction` and the shared Meta Graph transport. The former SDK path is available only through the explicit `META_PHASE31_PAGE_RUNTIME=LEGACY_ROLLBACK` boundary.
- Page readiness is checked immediately before the provider write. Missing/revoked permissions, stale identity, unverified or expired tokens, and expired data access fail closed.
- The admin connection response exposes only a safe health projection; raw page/user tokens, app secrets, and provider credential material are excluded. Generic request bodies are not logged.
- The remaining direct legacy Facebook inbox Graph path was explicitly identified and reserved for Item 5.11 remediation.
- Focused evidence: `evidence/phase31-meta-social-crm/logs/layer5.10-facebook-page-domain.log` (5 tests, focused strict TypeScript PASS, 14/14 audit). Prisma schema unchanged.

## Item 5.11 — legacy Facebook inbox sync bridge

- The active admin sync route (`/api/admin/inbox/sync`), canonical Facebook sync route, and `meta-social` production worker now use the Page inbox domain bridge. The previous realtime-service proxy is no longer authoritative for this application path.
- Provider reads use the shared Meta Graph transport facade. Authoritative persistence is owned by the platform Facebook inbox repository and remains duplicate-safe through the `platform + providerMessageId` unique boundary.
- `META_PHASE31_FACEBOOK_INBOX_RUNTIME` defaults to `DOMAIN`. `LEGACY_ROLLBACK` is explicit and is the only path that can invoke `syncRecentFacebookInboxLegacy`.
- `SHADOW` fetches one provider snapshot, compares domain and legacy safe summaries, and executes exactly one authoritative persistence loop. It performs no legacy provider execution and no dual database/provider writes.
- Queue requests contain only an opaque request reference and Page scope. Safe progress/results contain bounded counts, reason codes and digests; sender names, message text, URLs, tokens and provider payloads are excluded.
- Focused evidence: `evidence/phase31-meta-social-crm/logs/layer5.11-facebook-inbox-bridge.log` (5 tests, focused strict TypeScript PASS, 17/17 audit). Prisma schema unchanged.
