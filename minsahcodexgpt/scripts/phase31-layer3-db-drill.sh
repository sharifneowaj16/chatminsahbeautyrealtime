#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/evidence/phase31-meta-social-crm/logs"
APPLY_LOG="$LOG_DIR/layer3-migration-apply.log"
RECOVERY_LOG="$LOG_DIR/layer3-migration-recovery.log"
IDEMPOTENCY_LOG="$LOG_DIR/layer3-idempotency.log"
DATABASE_URL_VALUE="${PHASE31_LAYER3_DATABASE_URL:-${DATABASE_URL:-}}"
CONFIRM_DISPOSABLE="${PHASE31_LAYER3_CONFIRM_DISPOSABLE:-}"

mkdir -p "$LOG_DIR"
: > "$APPLY_LOG"
: > "$RECOVERY_LOG"
: > "$IDEMPOTENCY_LOG"

stamp() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
append_all() {
  local message="$1"
  printf '%s\n' "$message" | tee -a "$APPLY_LOG" "$RECOVERY_LOG" "$IDEMPOTENCY_LOG" >/dev/null
}
blocked() {
  local reason="$1"
  append_all "[$(stamp)] Layer 3.8 database gate: BLOCKED"
  append_all "Reason: $reason"
  append_all "No migration apply/recovery/re-apply or PostgreSQL concurrency PASS is claimed."
  exit 2
}
run_logged() {
  local logfile="$1"; shift
  "$@" 2>&1 | tee -a "$logfile"
}
psql_logged() {
  local logfile="$1"; shift
  psql "$DATABASE_URL_VALUE" -X -v ON_ERROR_STOP=1 "$@" 2>&1 | tee -a "$logfile"
}

append_all "[$(stamp)] Phase 31 Layer 3.8 disposable PostgreSQL drill"
append_all "Project root: ${ROOT_DIR}"
append_all "Safety mode: explicit disposable database confirmation required"

missing=()
command -v psql >/dev/null 2>&1 || missing+=("psql")
[[ -n "$DATABASE_URL_VALUE" ]] || missing+=("PHASE31_LAYER3_DATABASE_URL or DATABASE_URL")
[[ "$CONFIRM_DISPOSABLE" == "YES" ]] || missing+=("PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES")
if ((${#missing[@]} > 0)); then
  blocked "Missing required runtime prerequisite(s): ${missing[*]}"
fi

cd "$ROOT_DIR"

# Fail closed unless the target is a reachable, empty, non-template database.
psql_logged "$APPLY_LOG" -Atqc "SELECT 'server_version=' || current_setting('server_version'); SELECT 'database=' || current_database();"
TABLE_COUNT="$(psql "$DATABASE_URL_VALUE" -X -Atqc "SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname='public';")"
if [[ ! "$TABLE_COUNT" =~ ^[0-9]+$ ]] || (( TABLE_COUNT != 0 )); then
  blocked "Target database is not empty (${TABLE_COUNT:-unknown} public tables). Supply a fresh disposable database."
fi

mapfile -t ALL_MIGRATIONS < <(find prisma/migrations -mindepth 2 -maxdepth 2 -type f -name migration.sql | sort)
LAYER3_DIRS=(
  "prisma/migrations/20260724233000_phase31_unified_webhook_receipts"
  "prisma/migrations/20260725003000_phase31_webhook_receipt_transitions"
  "prisma/migrations/20260725033000_phase31_provider_identity_mapping"
  "prisma/migrations/20260725063000_phase31_lead_normalized_storage"
  "prisma/migrations/20260725093000_phase31_instagram_message_persistence"
  "prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata"
)

if ((${#ALL_MIGRATIONS[@]} == 0)); then
  blocked "No Prisma migration.sql files were found."
fi
for dir in "${LAYER3_DIRS[@]}"; do
  [[ -f "$dir/migration.sql" && -f "$dir/recovery.sql" && -f "$dir/README.md" ]] \
    || blocked "Incomplete Layer 3 migration triplet: $dir"
done

{
  echo "[$(stamp)] APPLY START"
  echo "migration_count=${#ALL_MIGRATIONS[@]}"
} | tee -a "$APPLY_LOG"
for migration in "${ALL_MIGRATIONS[@]}"; do
  echo "APPLY $migration" | tee -a "$APPLY_LOG"
  psql_logged "$APPLY_LOG" -f "$migration"
done
psql_logged "$APPLY_LOG" -Atqc "SELECT 'layer3_receipt_table=' || COALESCE(to_regclass('public.\"MetaSocialWebhookReceipt\"')::text,'missing');"
echo "[$(stamp)] APPLY PASS" | tee -a "$APPLY_LOG"

# Duplicate-data preconditions and DB uniqueness/retention assertions.
{
  echo "[$(stamp)] PRECONDITION AND IDEMPOTENCY START"
  echo "phase=initial-apply"
} | tee -a "$IDEMPOTENCY_LOG"
psql_logged "$IDEMPOTENCY_LOG" -f scripts/phase31-sql/layer3-preconditions.sql
psql_logged "$IDEMPOTENCY_LOG" -f scripts/phase31-sql/layer3-idempotency.sql

run_concurrency_drill() {
  local phase="$1"
  local receipt_id="l38-concurrency-${phase}"
  local session_a="$LOG_DIR/.layer3-${phase}-claim-a.out"
  local session_b="$LOG_DIR/.layer3-${phase}-claim-b.out"
  rm -f "$session_a" "$session_b"

  psql "$DATABASE_URL_VALUE" -X -v ON_ERROR_STOP=1 -v receipt_id="$receipt_id" <<'SQL' >>"$IDEMPOTENCY_LOG" 2>&1
INSERT INTO "MetaSocialWebhookReceipt" (
  "id", "provider", "platform", "environment", "connectionKey", "providerEventKey",
  "payloadDigest", "lastPayloadDigest", "safeMetadata", "state", "queueName", "jobReference",
  "queuedAt", "lastTransitionAt", "lastTransitionCode", "lastTransitionActor", "correlationId", "updatedAt"
) VALUES (
  :'receipt_id', 'META', 'LEAD_ADS', 'DEVELOPMENT', 'l38-concurrency', :'receipt_id',
  repeat('c',64), repeat('c',64), '{}'::jsonb, 'QUEUED', 'phase31-layer3', :'receipt_id',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'QUEUE_HANDOFF_COMPLETED', 'phase31-layer3.8', :'receipt_id', CURRENT_TIMESTAMP
);
SQL

  psql "$DATABASE_URL_VALUE" -X -At -v ON_ERROR_STOP=1 \
    -v receipt_id="$receipt_id" -v lease_token="${receipt_id}-token-a" \
    -v lease_owner="worker-a" -v hold_seconds="2" \
    -f scripts/phase31-sql/layer3-claim.sql >"$session_a" 2>&1 &
  local pid_a=$!
  sleep 0.25
  psql "$DATABASE_URL_VALUE" -X -At -v ON_ERROR_STOP=1 \
    -v receipt_id="$receipt_id" -v lease_token="${receipt_id}-token-b" \
    -v lease_owner="worker-b" -v hold_seconds="0" \
    -f scripts/phase31-sql/layer3-claim.sql >"$session_b" 2>&1 &
  local pid_b=$!
  wait "$pid_a"
  wait "$pid_b"

  cat "$session_a" "$session_b" >> "$IDEMPOTENCY_LOG"
  local winner_count
  winner_count="$(grep -hc "$receipt_id" "$session_a" "$session_b" | awk '{s+=$1} END {print s+0}')"
  [[ "$winner_count" == "1" ]] || blocked "Concurrency assertion failed during ${phase}: expected one claim winner, got ${winner_count}."

  local state_snapshot
  state_snapshot="$(psql "$DATABASE_URL_VALUE" -X -Atqc "SELECT \"state\"::text || '|' || \"attemptCount\" || '|' || \"leaseOwner\" || '|' || \"leaseToken\" FROM \"MetaSocialWebhookReceipt\" WHERE \"id\"='${receipt_id}';")"
  echo "claim_snapshot=${state_snapshot}" >> "$IDEMPOTENCY_LOG"
  [[ "$state_snapshot" == PROCESSING\|1\|worker-* ]] || blocked "Concurrency state assertion failed during ${phase}: ${state_snapshot}."
  local stale_token="${state_snapshot##*|}"

  # Simulate worker crash by expiring the winning lease, then reclaim with a new fenced token.
  psql_logged "$IDEMPOTENCY_LOG" -c "UPDATE \"MetaSocialWebhookReceipt\" SET \"leaseExpiresAt\"=CURRENT_TIMESTAMP-INTERVAL '1 second', \"updatedAt\"=CURRENT_TIMESTAMP WHERE \"id\"='${receipt_id}';"
  psql_logged "$IDEMPOTENCY_LOG" -At \
    -v receipt_id="$receipt_id" -v lease_token="${receipt_id}-reclaim-token" \
    -v lease_owner="worker-reclaim" -v hold_seconds="0" \
    -f scripts/phase31-sql/layer3-claim.sql

  local reclaimed
  reclaimed="$(psql "$DATABASE_URL_VALUE" -X -Atqc "SELECT \"attemptCount\" || '|' || \"leaseOwner\" || '|' || \"lastTransitionCode\" FROM \"MetaSocialWebhookReceipt\" WHERE \"id\"='${receipt_id}';")"
  echo "reclaim_snapshot=${reclaimed}" >> "$IDEMPOTENCY_LOG"
  [[ "$reclaimed" == "2|worker-reclaim|PROCESSING_RECLAIMED" ]] || blocked "Crash/reclaim assertion failed during ${phase}: ${reclaimed}."

  local stale_rows
  stale_rows="$(psql "$DATABASE_URL_VALUE" -X -Atqc "WITH updated AS (UPDATE \"MetaSocialWebhookReceipt\" SET \"state\"='PROCESSED', \"processedAt\"=CURRENT_TIMESTAMP, \"leaseToken\"=NULL, \"leaseOwner\"=NULL, \"leaseExpiresAt\"=NULL, \"updatedAt\"=CURRENT_TIMESTAMP WHERE \"id\"='${receipt_id}' AND \"state\"='PROCESSING' AND \"leaseToken\"='${stale_token}' RETURNING 1) SELECT COUNT(*) FROM updated;")"
  echo "stale_worker_update_rows=${stale_rows}" >> "$IDEMPOTENCY_LOG"
  [[ "$stale_rows" == "0" ]] || blocked "Stale worker fencing failed during ${phase}."

  local completion_rows
  completion_rows="$(psql "$DATABASE_URL_VALUE" -X -Atqc "WITH updated AS (UPDATE \"MetaSocialWebhookReceipt\" SET \"state\"='PROCESSED', \"processedAt\"=CURRENT_TIMESTAMP, \"leaseToken\"=NULL, \"leaseOwner\"=NULL, \"leaseExpiresAt\"=NULL, \"lastTransitionAt\"=CURRENT_TIMESTAMP, \"lastTransitionCode\"='PROCESSING_COMPLETED', \"lastTransitionActor\"='worker-reclaim', \"stateVersion\"=\"stateVersion\"+1, \"updatedAt\"=CURRENT_TIMESTAMP WHERE \"id\"='${receipt_id}' AND \"state\"='PROCESSING' AND \"leaseToken\"='${receipt_id}-reclaim-token' RETURNING 1) SELECT COUNT(*) FROM updated;")"
  echo "current_worker_completion_rows=${completion_rows}" >> "$IDEMPOTENCY_LOG"
  [[ "$completion_rows" == "1" ]] || blocked "Current worker completion failed during ${phase}."

  psql_logged "$IDEMPOTENCY_LOG" -c "DELETE FROM \"MetaSocialWebhookReceipt\" WHERE \"id\"='${receipt_id}';"
  rm -f "$session_a" "$session_b"
  echo "PASS concurrent claim, crash reclaim and stale-worker fencing (${phase})" | tee -a "$IDEMPOTENCY_LOG"
}

run_concurrency_drill "initial"

# Reverse only Layer 3 in dependency order. The disposable DB has no retained Layer 3 fixture rows.
{
  echo "[$(stamp)] RECOVERY START"
  echo "order=3.7,3.6,3.5,3.4,3.3,3.2"
} | tee -a "$RECOVERY_LOG"
for ((i=${#LAYER3_DIRS[@]}-1; i>=0; i--)); do
  recovery="${LAYER3_DIRS[$i]}/recovery.sql"
  echo "RECOVER $recovery" | tee -a "$RECOVERY_LOG"
  psql_logged "$RECOVERY_LOG" -f "$recovery"
done
psql_logged "$RECOVERY_LOG" -f scripts/phase31-sql/layer3-post-recovery.sql
echo "[$(stamp)] RECOVERY PASS" | tee -a "$RECOVERY_LOG"

# Re-apply Layer 3 forward and rerun the complete DB assertion set.
{
  echo "[$(stamp)] REAPPLY START"
  echo "order=3.2,3.3,3.4,3.5,3.6,3.7"
} | tee -a "$APPLY_LOG"
for dir in "${LAYER3_DIRS[@]}"; do
  echo "REAPPLY $dir/migration.sql" | tee -a "$APPLY_LOG"
  psql_logged "$APPLY_LOG" -f "$dir/migration.sql"
done
psql_logged "$APPLY_LOG" -Atqc "SELECT 'layer3_receipt_table=' || COALESCE(to_regclass('public.\"MetaSocialWebhookReceipt\"')::text,'missing');"
echo "[$(stamp)] REAPPLY PASS" | tee -a "$APPLY_LOG"

{
  echo "[$(stamp)] PRECONDITION AND IDEMPOTENCY RE-RUN"
  echo "phase=after-reapply"
} | tee -a "$IDEMPOTENCY_LOG"
psql_logged "$IDEMPOTENCY_LOG" -f scripts/phase31-sql/layer3-preconditions.sql
psql_logged "$IDEMPOTENCY_LOG" -f scripts/phase31-sql/layer3-idempotency.sql
run_concurrency_drill "reapply"
echo "[$(stamp)] IDEMPOTENCY/CONCURRENCY PASS" | tee -a "$IDEMPOTENCY_LOG"

append_all "[$(stamp)] Layer 3.8 database gate: PASS"
append_all "Full migration apply, Layer 3 reverse recovery, Layer 3 re-apply, duplicate preconditions, DB idempotency, concurrent claim, crash reclaim and stale-worker fencing all passed."
