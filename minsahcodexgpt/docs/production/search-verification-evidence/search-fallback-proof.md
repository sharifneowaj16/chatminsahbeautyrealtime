# Search Fallback Proof

## Status

| Field | Value |
| --- | --- |
| Status | PENDING LIVE PRODUCTION EXECUTION |
| Production URL | TODO |
| Verification date/time | TODO |
| Tester | TODO |
| Git commit / deploy version | TODO |

## Automated command evidence

Paste command output summary here:

```bash
npm run qa:search-fallback
npm run qa:phase27
npm run qa:search
```

## Manual production checks

Coordinate this check during a maintenance window or staging environment first. Do not intentionally break production Elasticsearch without rollback approval.

| # | Check | Action / URL | Expected Result | Actual Result | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ES healthy source | GET `/api/search?q=<known-query>` while ES is healthy | Response includes `source: "elasticsearch"` | TODO | TODO | TODO |
| 2 | ES down fallback | Temporarily point app to disabled ES / simulate outage in staging | Response includes `source: "database_fallback"` and products still return | TODO | TODO | TODO |
| 3 | Fallback active products only | Search fallback mode with inactive/deleted controls | Only active, non-deleted products appear | TODO | TODO | TODO |
| 4 | Fallback filters work | In fallback mode, test category/brand/price/sort | Filters/sort/pagination still work at basic DB level | TODO | TODO | TODO |
| 5 | Health degraded state | Visit admin search health during fallback mode | Dashboard/API shows degraded state and fallback active | TODO | TODO | TODO |
| 6 | Recovery to ES | Restore Elasticsearch config | Source returns to `elasticsearch`; dashboard healthy | TODO | TODO | TODO |

## Result

Overall result: TODO

## Notes / defects

- TODO
