# Phase 8 — Full QA Matrix + Regression Locks

## Goal

Phase 8 is the final production-readiness layer. It does not add another tracking feature; it makes sure every previous production rule stays enforced before and after deploy.

The release is not considered production-ready unless:

1. Static regression locks pass.
2. Required manual QA evidence is verified.
3. Production QA deploy gate has zero blockers.
4. Backend, Meta, and GA4 reconciliation is reviewed.

## What this phase protects

- Legacy payment routes/pages coming back.
- Raw card collection coming back.
- Unsupported payment methods bypassing the canonical contract.
- Purchase firing from frontend success pages or unverified callbacks.
- COD Purchase firing before Phone Confirmed.
- Variant/shade products using variant IDs as `content_ids` instead of parent product IDs.
- Browser Pixel and Server CAPI using different `external_id` hashes.
- Product view counters inflating on refresh.
- Consent-denied, staff/internal, bot, or social-preview traffic polluting analytics.
- GA4 page_view duplicate/missing events in App Router.
- Payment gateway referrals overwriting original GA4 attribution.
- Sensitive payment tokens leaking into GA4 page_location.

## New files

- `lib/tracking/full-production-qa-matrix.ts`
- `scripts/phase8-static-contract-check.mjs`
- `docs/production/phase-8-full-qa-regression-locks.md`
- `PRODUCTION_QA.md`

## Updated files

- `lib/tracking/production-qa.ts`
- `app/admin/production-qa/page.tsx`
- `scripts/security-audit.mjs`
- `package.json`

## Required predeploy command

```bash
npm run qa:predeploy
```

This runs:

```bash
npm run audit:security
npm run qa:phase8-static
npm run typecheck
npm run build
npm run qa:production
```

`qa:production` requires live/staging infrastructure and QA evidence flags. It is expected to block until the required `QA_*_VERIFIED=true` flags are set after real tests.

## Evidence rule

Do not set any `QA_*_VERIFIED=true` flag until the real manual test is completed.

Recommended evidence storage:

- screenshot URL
- QA ticket URL
- release note URL
- private admin note URL
- CI run URL

Each QA step supports an optional evidence URL env variable. Example:

```env
QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED=true
QA_COD_PHONE_CONFIRMED_PURCHASE_EVIDENCE_URL=https://your-private-evidence-link
```

## Deploy gate status meaning

- `BLOCKED`: do not deploy. Fix blockers or complete required QA.
- `WARN`: deploy only after reviewing warnings; usually recommended QA is incomplete.
- `READY`: required evidence and runtime gates are ready.

## Senior developer rule

Never bypass this phase by changing code to make the gate pass. Make the real production/staging evidence true, then set the matching env flag.
