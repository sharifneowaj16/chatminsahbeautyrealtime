# Phase 13 — Attribution Enrichment

This retained compatibility report documents the existing attribution enrichment baseline that preceded Meta v6 Phase 11.

The baseline captures UTM term, offer version, A/B variant, attribution coupon, free-delivery threshold, landing offer and sanitized campaign source URL on confirmed orders. Those fields are forwarded to schema-versioned Meta Purchase and GA4 server events and are exposed to administrators only as safe presence/quality indicators.

Meta v6 Phase 11 extends this baseline with immutable first-touch records, eligible last-touch updates, consent-aware session capture, transactional order snapshots, lead-to-order inheritance, aggregate campaign reporting and separate labels for first-party and Meta-reported attribution.

Validation command: `npm run qa:tracking-attribution`.
