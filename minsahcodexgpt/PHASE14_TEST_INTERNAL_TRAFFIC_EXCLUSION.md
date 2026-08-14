# Phase 14 — Test/Internal Traffic Exclusion

## Delivery status

The production tracking filter excludes configured test emails and phones, internal domains/IPs, trusted staff markers, and obvious bot traffic before Meta CAPI, GA4, product analytics, or stored-order purchase measurement runs.

## Controls

- `TRACKING_TEST_EMAILS` and `TRACKING_TEST_PHONES` mark matching orders as `isTest=true`.
- `TRACKING_INTERNAL_IPS`, `TRACKING_INTERNAL_DOMAINS`, staff cookies, and the authenticated internal header exclude operational traffic.
- Stored-order Meta CAPI and GA4 senders call the shared classifier before claim/send.
- Browser and public server tracking remain fail-closed when consent is unknown, denied, or withdrawn.

## QA

Run `npm run qa:tracking-test-exclusion`. This report documents implemented code and automated gates; live analytics-account screenshots remain deployment evidence.
