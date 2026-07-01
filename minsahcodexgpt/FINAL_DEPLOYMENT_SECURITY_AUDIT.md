# Final Deployment Security Audit — Phase 8

## Verdict

**Deploy readiness: WARN / BLOCKED until staging verification passes.**

Phase 8 removed several immediate secret-exposure risks and added deployment hygiene, but the older `Security Fix.md` still lists broader pre-existing application risks that should be fixed before high-traffic production launch.

## Phase 8 hardening completed

- Removed hardcoded Pathao webhook integration secret from server helper, admin UI, and `.env.example`.
- Pathao webhook integration test now requires `PATHAO_WEBHOOK_INTEGRATION_SECRET`; missing production config returns a clear error instead of using a default.
- Tracking health cron no longer accepts query-string `?secret=` tokens in production, reducing URL/access-log secret leakage risk.
- WebSocket token signing no longer falls back to any public env secret; it now uses server-only `WS_AUTH_SECRET`.
- `.env.example` placeholders were sanitized for MinIO, Pathao, initial admin password, realtime secrets, and tracking cron secret.
- Duplicate manual QA key in `lib/tracking/production-qa.ts` was fixed.
- Added `.deployignore` for clean deployment packaging.
- Added `ENVIRONMENT_VARIABLES_PRODUCTION.md` documenting required/optional/gated env values.
- Added `scripts/security-audit.ts` and `npm run audit:security` for local secret/package hygiene checks.

## Still requires review before full live launch

The project already contained broad security risks in `Security Fix.md`. Phase 8 did not attempt a large rewrite of all public/admin APIs because that can break business flows without staging QA. The highest priority remaining items are:

1. Lock down unauthenticated write/admin APIs.
2. Fix public media upload/delete/list endpoints.
3. Enforce server-side order totals, shipping, coupon, and quantity validation everywhere.
4. Bind payment session creation to server-created orders and verified amounts.
5. Enforce route-level admin permissions consistently, not just “any admin token.”
6. Repair password reset/OTP flow: DB-backed tokens, crypto-safe OTP, no OTP logs, rate limits.
7. Review public product APIs for internal cost leakage.
8. Review public health endpoints for internal config disclosure.
9. Run dependency audit and upgrade vulnerable packages in staging.

## Production smoke test required

Before live deploy, run:

```bash
npm ci
npm run lint
npm run typecheck
npm run audit:security
npm run qa:production -- --hours=24
```

Then test:

- `/admin/production-qa` as SUPER_ADMIN.
- `/admin/tracking-health` as SUPER_ADMIN.
- Non-super-admin access returns 403 for production QA, tracking health, GA4 QA, and privacy/catalog QA APIs.
- Cron endpoint works with `Authorization: Bearer $TRACKING_HEALTH_CRON_SECRET` and rejects production query-string secrets.
- Pathao webhook integration test fails clearly when `PATHAO_WEBHOOK_INTEGRATION_SECRET` is missing and passes only when env is set.
- Realtime inbox token creation works only with server-side `WS_AUTH_SECRET`.
