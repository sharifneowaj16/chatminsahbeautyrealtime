#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$ROOT_DIR/evidence/phase31-meta-social-crm/logs/phase31_layer9.3_db.log"
mkdir -p "$(dirname "$LOG_FILE")"
: > "$LOG_FILE"
stamp() { printf '%s' "${PHASE31_LAYER9_3_EVIDENCE_TIMESTAMP:-$(date -u +'%Y-%m-%dT%H:%M:%SZ')}"; }
log() { printf '%s\n' "$1" | tee -a "$LOG_FILE"; }
block() {
  log "[$(stamp)] Phase 31 Layer 9.3 PostgreSQL gate: BLOCKED"
  log "Reason: $1"
  log "No live PostgreSQL migration, DB uniqueness, concurrency, lease-reclaim or recovery PASS is claimed."
  exit 2
}

log "[$(stamp)] Phase 31 Layer 9.3 disposable PostgreSQL gate"
command -v psql >/dev/null 2>&1 || block "psql is not installed in the execution environment."
[[ -n "${PHASE31_LAYER3_DATABASE_URL:-${DATABASE_URL:-}}" ]] || block "PHASE31_LAYER3_DATABASE_URL or DATABASE_URL is missing."
[[ "${PHASE31_LAYER3_CONFIRM_DISPOSABLE:-}" == "YES" ]] || block "PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES is required."

if PHASE31_LAYER3_DATABASE_URL="${PHASE31_LAYER3_DATABASE_URL:-${DATABASE_URL:-}}" \
   PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES \
   bash "$ROOT_DIR/scripts/phase31-layer3-db-drill.sh" 2>&1 | tee -a "$LOG_FILE"; then
  log "[$(stamp)] Phase 31 Layer 9.3 PostgreSQL gate: PASS"
  log "Fresh apply, reverse recovery, re-apply, DB duplicate boundaries, concurrent claim, crash reclaim and stale-worker fencing passed."
else
  status=${PIPESTATUS[0]}
  log "[$(stamp)] Phase 31 Layer 9.3 PostgreSQL gate: BLOCKED"
  log "Underlying Layer 3 database drill exited with status ${status}."
  exit "$status"
fi
