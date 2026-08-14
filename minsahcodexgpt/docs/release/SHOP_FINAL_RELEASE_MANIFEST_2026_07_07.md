# Shop Final Release Manifest — 2026-07-07

## Artifact

Expected final artifact naming convention:

```txt
minsah_shop_phase13_final_production_readiness_evidence_pack_full_project.zip
minsah_shop_phase13_final_production_readiness_evidence_pack_full_project.zip.sha256
```

## Included phase reports

The project contains evidence reports for the completed shop release stream:

- `PHASE2_SEARCH_FILTER_EXACTNESS_FIX_REPORT.md`
- `PHASE3_TRUST_PAYLOAD_PARITY_FIX_REPORT.md`
- `PHASE4_MASTER_REGRESSION_RELEASE_LOCK_REPORT.md`
- `PHASE5_SERVER_SIDE_FACETS_FIX_REPORT.md`
- `PHASE6_SORT_PARITY_FIX_REPORT.md`
- `PHASE7A_MOBILE_FILTER_SORT_ACCESSIBILITY_REPORT.md`
- `PHASE7B_MOBILE_DISCOVERY_RUNTIME_A11Y_REPORT.md`
- `PHASE8_SHOP_CRO_ANALYTICS_SERVER_RELIABILITY_REPORT.md`
- `PHASE9_SEO_CRAWL_STRUCTURED_DATA_REPORT.md`
- `PHASE10_PERFORMANCE_PAYLOAD_RUNTIME_QA_REPORT.md`
- `PHASE11_REAL_MERCHANDISING_PERSONALIZATION_REPORT.md`
- `PHASE12_VISUAL_POLISH_EMPTY_STATES_REPORT.md`
- `PHASE13_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK_REPORT.md`

## Release gate command

```bash
npm run audit:shop-release
```

## Runtime-only command

```bash
PLAYWRIGHT_BASE_URL=<staging-or-production-url> npm run qa:shop-a11y-runtime
```

## Manual evidence files

- `docs/release/SHOP_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK.md`
- `docs/qa/PHASE13_FINAL_PRODUCTION_MANUAL_CHECKLIST.md`
- `docs/production/SHOP_PRODUCTION_DEPLOY_RUNBOOK.md`
- `docs/release/SHOP_FINAL_RELEASE_MANIFEST_2026_07_07.md`

## Release decision rule

Ship only when:

1. Automated release gate passes.
2. Runtime Playwright/axe check passes against a running app.
3. Manual checklist is completed.
4. Rollback runbook is reviewed.
5. No P0/P1 blocker remains open.
