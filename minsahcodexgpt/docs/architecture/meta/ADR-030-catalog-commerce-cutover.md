# ADR-030 — Catalog, feed, product item, product set and commerce cutover

- **Status:** Accepted for source migration
- **Date:** 2026-07-23
- **Phase:** 30

## Context

Catalog provider behavior was split across a legacy catalog wrapper, product-set provider, diagnostics Graph client and separate workers. Canonical mapping and semantic validation already existed, but a normal sync could infer stale managed items and submit deletions without an immutable dry run or independent approval. Batch polling also treated most results globally, limiting safe recovery from partial item failures.

## Decision

1. Catalogs, product items, feeds and product sets use one MetaPlatform Business SDK adapter. Diagnostics and batch-status HTTP calls use the unified Graph transport with the same `BUSINESS_SYSTEM_USER` credential role, central Graph version and 30-second deadline.
2. Compatibility modules contain no direct SDK entity construction, token reads or legacy Graph clients. Workers import the Phase 30 orchestration boundary directly.
3. `sku` is the only accepted catalog identity source. Mapping, sale-window evaluation, stock/backorder availability, variant serialization, semantic validation and payload fingerprinting stay canonical before provider submission.
4. Normal inventory/incremental/full/reconcile sync may submit UPDATE requests only. It reports stale managed items through a separate deletion dry run; it never converts them into DELETE requests.
5. Deletion uses a durable immutable plan containing the complete sorted retailer-ID set, full-list digest, source snapshot hash, managed count, ratio, expiry and emergency-override requirement. Approval stores only the non-PII plan identity/digest metadata.
6. A deletion plan requires three explicit steps: preview, independent `CRITICAL` approval, then queue. The worker revalidates the full plan against current canonical source state under the catalog sync lock before submitting any DELETE request.
7. Count/ratio thresholds require the separate temporary `META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE` in addition to approval. The normal catalog kill switch still blocks all writes.
8. Provider item outcomes are reconciled by retailer ID or provider index. Only explicit retryable UPDATE failures are automatically retried, with bounded attempts and retry lineage. DELETE failures are never auto-retried.
9. Delete execution is restart-aware: already-persisted delete batches are resumed rather than resubmitted. If a process dies after provider acceptance but before local batch persistence, a retry may repeat idempotent DELETE requests, but cannot change the approved item set.
10. Reads support `LEGACY -> SHADOW -> PLATFORM` selection with mode-aware fresh cache and bounded stale fallback. Writes are never shadowed.

## Consequences

- Prisma adds delete-plan state, batch operation linkage, item provider index, attempt and retry lineage. The migration includes pre-consumer recovery SQL and immutable request-field enforcement.
- Feed URLs are not copied into admin audit payloads; only `urlConfigured` is recorded.
- Source completion does not prove production cutover. Disposable PostgreSQL migration/recovery, test-catalog writes, partial-failure/timeout drills, diagnostics pagination, mass-delete denial, kill-switch and rollback evidence remain release requirements.
