# MinsahBeauty Meta v6 — Phase 13 Ads Automation Update

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Phase: **Ads Insights & Approval-Based Automation**

## Delivered

- Typed, normalized Ads Insights sync-run and snapshot persistence.
- Idempotent account/campaign/ad-set/ad insight snapshots with spend, CTR, CPC, CPM, purchases, purchase value, ROAS and frequency.
- A six-hour durable read-only ingestion queue and dedicated rate-limited worker.
- A write gate requiring three consecutive successful, fresh read-only insight runs.
- Human-review-only recommendations for pause, budget reduction/scale and creative-fatigue review.
- Exact canonical approval payload hashing for campaign, ad set, creative and ad mutations.
- Two-person critical approval enforcement through the Phase 9 immutable admin action service.
- Server-side absolute daily/lifetime budget and bid caps plus a per-approval percentage-increase cap.
- New campaign, ad set and ad entities forced to `PAUSED` before provider submission.
- Provider field allowlists that fail closed on unsupported mutation fields.
- Immutable mutation execution reservations and before/provider/after evidence.
- Safe `RECONCILIATION_REQUIRED` state when the provider mutation succeeds but state re-read cannot be proven.
- `/admin/meta` Ads Insights dashboard with stability state, safety caps, recommendations, snapshots, approvals and execution ledger.

Recommendations are never applied automatically.

## Validation

```text
Phase 13 semantic tests                    15/15 passed
Phase 13 static audit                      56/56 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 92 routes passed
Meta Business platform audit               22/22 passed
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
3. Three consecutive live read-only Ads Insights runs must prove the stability gate before production writes are enabled.
4. A live separate-requester/separate-approver mutation must prove exact approval matching, provider before/after state and audit persistence.
5. Absolute/relative budget caps and `RECONCILIATION_REQUIRED` handling need production-like runtime evidence.
6. The six-hour Redis/worker schedule needs repeated-run evidence.
7. The repository-wide master tracking gate retains eight inherited historical documentation/runtime-proof failures outside Phase 13.

Do not enable production Meta ad writes until generation, migration, three-run read-only stability and live two-person approval evidence are complete.
