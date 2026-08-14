# Meta Phase 30 catalog and commerce cutover runbook

## Preconditions

- Phase 27 workflow/reconciliation runtime prerequisites are green.
- Phase 28 connection health is healthy for `BUSINESS_SYSTEM_USER` with owned business/catalog access.
- `META_CATALOG_ID_SOURCE=sku` and `NEXT_PUBLIC_META_CATALOG_ID_SOURCE=sku` agree.
- A disposable owned test catalog is configured in `META_PLATFORM_CATALOG_TEST_CATALOG_ID`.
- Prisma migration `20260723163000_meta_v6_phase30_catalog_commerce` has been applied and its recovery drill recorded on disposable PostgreSQL.
- An independent approver is available for deletion testing.

## Read cutover

1. Start with catalog reads, shadow and legacy-disable flags false.
2. Enable `META_PLATFORM_CATALOG_SHADOW=true`; compare catalogs, items, product sets and diagnostics while legacy-shaped output remains authoritative.
3. Investigate every shadow mismatch. A mode change must force a provider refresh; previous-mode data may appear only as bounded stale fallback after provider failure.
4. Enable `META_PLATFORM_CATALOG_READS=true` after accepted evidence.
5. Set `META_PLATFORM_CATALOG_LEGACY_DISABLED=true` only after rollback has been exercised.

## Controlled writes

1. Keep global catalog writes false and set the exact test catalog ID.
2. Run one canonical sync. Confirm invalid items are reported, unchanged hashes are skipped and `submittedDeletes` is zero.
3. Poll batch status. Inject or observe a partial failure: only explicitly retryable UPDATE items may receive another bounded attempt.
4. Verify sale start/end, stock zero, backorder availability, parent/variant IDs, price/currency and image/link parity in provider state.
5. Exercise feed create/upload/schedule and product-set create/update against the test catalog. Confirm audits do not contain signed/tokenized feed URLs.
6. Set `META_PLATFORM_CATALOG_KILL_SWITCH=true` and prove all catalog writes are denied.

## Deletion drill

1. Create a dry-run plan with `action=preview`. Review item count, ratio, full digest, snapshot hash, expiry and sampled operator-visible rows.
2. Request approval with `action=request_approval`. A different authorized administrator approves the exact `META_CATALOG_DELETE` payload.
3. If count or ratio exceeds policy, enable `META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE=true` only for the recorded window.
4. Queue with `action=execute` and the approved ID. The job payload must contain only catalog/plan identity.
5. The worker must recompute the live source snapshot and digest under the catalog lock. Any SKU/source change produces `META_CATALOG_DELETE_PLAN_STALE`; create a new plan rather than editing the old one.
6. Poll delete batches. A failed DELETE remains failed and must not auto-retry. Investigate provider state and create a new independently approved plan if another attempt is justified.
7. Disable the mass-delete override immediately after the drill.

## Timeout and recovery

- Graph diagnostics and batch-status requests have a 30-second deadline.
- A non-terminal provider batch remains `SUBMITTED`; polling is idempotent.
- Existing delete batches are resumed after worker restart. Unknown provider outcome without a persisted batch must be reconciled before repeated operator action.
- Do not edit plan retailer IDs, digest, snapshot, threshold evidence or approval binding.

## Rollback

1. Turn on `META_PLATFORM_CATALOG_KILL_SWITCH` first.
2. Turn off platform writes and remove the test-catalog selection.
3. For reads, turn off platform authority and retain shadow only if legacy has not been disabled.
4. Before durable Phase 30 data dependency, use the reviewed migration `recovery.sql`; afterwards preserve history and ship a forward-fix.
5. Never use normal sync as a deletion rollback mechanism.
