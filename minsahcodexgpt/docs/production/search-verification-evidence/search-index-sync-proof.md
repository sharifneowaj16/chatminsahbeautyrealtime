# Search Index Sync Proof

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
npm run qa:search-index
npm run qa:phase21
npm run qa:search
```

## Manual production checks

Use controlled test products and remove them after verification.

| # | Check | Action / URL | Expected Result | Actual Result | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Create product indexes to ES | Create a published active test product in admin | Product appears in search after index sync | TODO | TODO | TODO |
| 2 | Update product name reindexes | Rename test product in admin | New name appears and old name stops matching or de-prioritizes | TODO | TODO | TODO |
| 3 | Update price updates sort/facet | Change test product price | Search result price, price sort, and price facets update | TODO | TODO | TODO |
| 4 | Stock update affects availability | Set stock out / in stock | Availability and in-stock filter update | TODO | TODO | TODO |
| 5 | Soft delete removes from search | Soft-delete/archive the test product | Product disappears from search and suggestions | TODO | TODO | TODO |
| 6 | Worker retry works | Force or inspect retry path/logs for a failed index job | Failed index job retries and eventually succeeds or alerts | TODO | TODO | TODO |
| 7 | Admin panel/search consistency | Compare admin product status with search result | Search index matches admin product state | TODO | TODO | TODO |

## Result

Overall result: TODO

## Notes / defects

- TODO
