# Search Filter Proof

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
npm run qa:search-filter
npm run qa:search-ui-contract
npm run qa:search
```

## Manual production checks

| # | Check | Action / URL | Expected Result | Actual Result | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Search by product name | Search for a known active product name | Matching active product appears | TODO | TODO | TODO |
| 2 | Search by Bangla/English synonym | Search synonym pair, e.g. Bangla term and English equivalent | Relevant products appear for both | TODO | TODO | TODO |
| 3 | Typo/fuzzy search | Search a controlled typo of product name | Relevant product still appears | TODO | TODO | TODO |
| 4 | Category filter | Apply one category filter from UI and URL | All visible products match category | TODO | TODO | TODO |
| 5 | Subcategory filter | Apply one subcategory filter | All visible products match subcategory | TODO | TODO | TODO |
| 6 | Tags filter | Apply a known tag | Returned products contain matching tag | TODO | TODO | TODO |
| 7 | Brand filter | Apply one brand | All visible products match brand | TODO | TODO | TODO |
| 8 | Price filter | Apply min/max price | Prices stay inside range | TODO | TODO | TODO |
| 9 | Sort by price | Sort low/high and high/low | Product order follows selected price sort | TODO | TODO | TODO |
| 10 | Sort by popularity | Sort popularity | API/UI uses popularity order without local-only filtering | TODO | TODO | TODO |
| 11 | Sort by newest | Sort newest | Newer products are prioritized | TODO | TODO | TODO |
| 12 | Facet count validity | Compare facets after filter applied | Facets match filtered result set, not current page only | TODO | TODO | TODO |

## Result

Overall result: TODO

## Notes / defects

- TODO
