# Search UI Proof

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
npm run qa:search-ui-contract
npm run qa:phase28
npm run qa:search
```

## Manual production checks

| # | Check | Action / URL | Expected Result | Actual Result | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Filter updates URL | Apply category/brand/price/in-stock filter in UI | URL query params update | TODO | TODO | TODO |
| 2 | API receives filter | Inspect network request after applying filter | `/api/search` includes selected filters | TODO | TODO | TODO |
| 3 | Product grid reflects API response | Compare grid with API response | Grid equals server response; no current-page-only local filtering | TODO | TODO | TODO |
| 4 | Facet count matches filtered result | Apply filter and inspect facets | Facets match server-filtered result set | TODO | TODO | TODO |
| 5 | Pagination keeps filter | Navigate to page 2 after filters | URL/API keep same filters and page changes | TODO | TODO | TODO |
| 6 | Sort applies to full result set | Sort by price/newest/popularity on large result set | Full result set order changes, not only current page | TODO | TODO | TODO |
| 7 | Shareable URL restores state | Open copied filtered URL in new browser/session | Same filters/sort/page restored | TODO | TODO | TODO |
| 8 | Click tracking uses displayed position | Click 1st and 5th filtered search result | Position/resultCount/filter context match current server response | TODO | TODO | TODO |

## Result

Overall result: TODO

## Notes / defects

- TODO
