# Search QA Automation

Phase 29 keeps search hardening from silently regressing after future changes. It wires dedicated static audits, a master regression command, and CI/predeploy gates around the search stack.

## Required commands

Run these before every production deploy that changes product, search, analytics, tracking, or admin product code:

```bash
npm run qa:search
npm run qa:search-security
npm run qa:search-index
npm run qa:phase17
npm run audit:security
npm run typecheck
npm run build
```

## Dedicated search audits

| Command | Purpose |
| --- | --- |
| `npm run qa:search-filter` | Verifies Phase 19/20 filter correctness, direct keyword fields, facets, active-only filters, and suggestion exclusion. |
| `npm run qa:search-index` | Verifies Phase 21 create/update/delete queue wiring, worker sync, active-only indexing, and reindex behavior. |
| `npm run qa:search-security` | Verifies Phase 22 security plus search highlight/XSS regressions. |
| `npm run qa:search-click-integrity` | Verifies Phase 23 click abuse protection, rate limits, dedupe, and conversion attribution boundaries. |
| `npm run qa:search-click-position` | Verifies Phase 24 click position/result-count tracking. |
| `npm run qa:search-trending` | Verifies Phase 25 persistent trending and suggestions behavior. |
| `npm run qa:search-highlight` | Verifies Phase 26 highlight encoding and frontend safe rendering. |
| `npm run qa:search-fallback` | Verifies Phase 27 Elasticsearch failure DB fallback. |
| `npm run qa:search-ui-contract` | Verifies Phase 28 server-side filter/sort/pagination UI contract. |
| `npm run qa:search` | Runs the full master search regression suite. |

## CI/predeploy contract

`.github/workflows/ci.yml` includes a `Search QA` job that runs:

```bash
npm run qa:search
npm run qa:phase17
npm run audit:security
```

The build job depends on `search-qa`, so a search regression blocks CI before build artifacts are produced. `qa:predeploy` also includes `npm run qa:search` between admin API security and Telegram security gates.

## Manual evidence handoff

Phase 29 only proves automated/static contracts. Phase 30 must still produce real production manual proof under:

```text
docs/production/search-verification-evidence/
```

The required Phase 30 evidence files are:

```text
search-filter-proof.md
search-index-sync-proof.md
search-security-proof.md
search-click-integrity-proof.md
search-fallback-proof.md
search-suggestion-proof.md
search-ui-proof.md
```

Do not mark search 10/10 production verified until the automated commands pass and the Phase 30 evidence folder is filled with live production checks.

## Phase 30 manual production verification

Phase 30 is not a static-code-only gate. It requires live production evidence under:

```text
docs/production/search-verification-evidence/
```

Validate that the Phase 30 evidence pack and required proof files exist:

```bash
npm run qa:phase30
# or
npm run qa:search-production-verification
```

Optional read-only production smoke command:

```bash
SEARCH_PRODUCTION_BASE_URL="https://your-production-domain.com" \
SEARCH_VERIFY_QUERY="serum" \
npm run search:production-smoke
```

The smoke command checks read-only search, suggestions, public health, and public analytics/admin protection. It does not write click analytics by default. Only set `SEARCH_VERIFY_WRITE_CLICKS=true` when using analytics-excluded test traffic and controlled test products.

Do not mark Search 10/10 production verified until all seven evidence files inside `docs/production/search-verification-evidence/` are completed with live screenshots/logs/results and the final commands pass:

```bash
npm run qa:search
npm run qa:phase17
npm run audit:security
npm run typecheck
npm run build
```
