# Meta Phase 29 Ads and Audiences cutover runbook

## Preconditions

- Phase 27 reconciliation/replay runtime prerequisites are green.
- Phase 28 connection health is healthy for the exact `BUSINESS_SYSTEM_USER` role.
- Required permissions are `ads_read`, `ads_management` and `business_management`.
- A paused, disposable test campaign/ad set/ad or owned audience is identified.
- An independent approver is available.

## Read cutover

1. Keep `*_READS=false`, `*_SHADOW=false`, `*_LEGACY_DISABLED=false` for baseline.
2. Enable `META_PLATFORM_ADS_SHADOW=true`; separately enable `META_PLATFORM_AUDIENCES_SHADOW=true`.
3. Observe canonical match/mismatch metadata and provider error rates. Do not enable writes while unexplained mismatch exists.
4. Enable the corresponding `*_READS=true` only after comparison evidence is accepted. A mode change must force a provider refresh; the previous-mode cache may be used only as bounded stale fallback when that refresh fails.
5. Set `*_LEGACY_DISABLED=true` only after rollback has been exercised and the platform read is stable.

## Controlled Ads write

1. Ensure the asset is paused. Keep `META_PLATFORM_ADS_WRITES=false`.
2. Set `META_PLATFORM_ADS_TEST_ASSET_ID` to the exact provider resource or ad-account ID used by the test.
3. Create an exact `META_AD_MUTATION` approval; a second administrator approves it.
4. Execute one bounded mutation. Verify the mutation execution row, payload hash, provider before/after state and no unexpected spend.
5. Set `META_PLATFORM_ADS_KILL_SWITCH=true` and prove the next write is denied. Restore it to `false` only after the drill is recorded.
6. Full writes require `META_PLATFORM_ADS_WRITES=true`; legacy disable remains a separate later step.

## Controlled Audience write

1. Keep `META_PLATFORM_AUDIENCES_WRITES=false`; optionally select an owned test audience using `META_PLATFORM_AUDIENCES_TEST_ASSET_ID`.
2. Submit the audience request with `requestApproval=true`. For direct customer files, every row must include `consent: true` or `consentStatus: "GRANTED"` and at least one email, phone or external ID. Country/name-only rows are rejected.
3. Verify the stored approval payload contains hashed rows only, no raw email/phone/name, and a `batchDigest` for the complete canonical row set.
4. A different approver approves the request. Re-submit the same request with the approved `approvalId`. The customer/segment snapshot and full batch digest must still match the exact approved payload; any changed segment membership or tail row fails closed and requires a new approval.
5. Verify provider before/after state, processed count, execution status and reconciliation state.
6. Prove `META_PLATFORM_AUDIENCES_KILL_SWITCH=true` denies writes.

## Stale insights

- Stale cache may serve an administrative read during provider outage.
- A synchronization run must fail with `META_ADS_INSIGHTS_STALE_FALLBACK_NOT_SYNCABLE`; it must never mark stale data as a fresh successful ingestion.

## Rollback

- Reads: turn off `*_READS`, keep shadow or return to logical legacy selection if legacy has not been disabled.
- Writes: turn on the domain kill switch first; then turn off `*_WRITES` and remove test-asset selection.
- Unknown provider outcome: do not retry blindly. Use the Phase 27 reconciliation workflow and before/after evidence.
- Never edit historical approvals, mutation executions or migration evidence.
- Invalidate and re-request any pending large-array/large-string approval created before the Phase 29 full-payload hashing deployment; a resulting approval mismatch is an expected safety response.
