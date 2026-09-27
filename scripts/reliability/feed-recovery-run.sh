#!/usr/bin/env bash
# Production feed recovery sequence (iter 68).
# For full iter 70 execution use: production-recovery-execution.sh
# Run ON THE PRODUCTION SERVER with whitelisted TrendAgent IP and valid admin credentials.
#
# Usage:
#   export API_BASE=https://livegrid.ru/api/v1
#   export ADMIN_EMAIL=<почта администратора>
#   export ADMIN_PASSWORD='...'
#   export REGION=msk
#   ./scripts/reliability/feed-recovery-run.sh
#
# Phases: audit → sold plan → sold restore → full import → integrity → sitemap
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000/api/v1}"
REGION="${REGION:-msk}"
LOG="${LOG_FILE:-/var/log/lg/feed-recovery-run.log}"

mkdir -p "$(dirname "$LOG")"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  log "ERROR: Set ADMIN_EMAIL and ADMIN_PASSWORD"
  exit 1
fi

log "=== Feed recovery run started (region=$REGION) ==="

TOKEN=$(curl -sf -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

AUTH="Authorization: Bearer $TOKEN"

log "Phase 1: production state audit"
curl -sf "$API_BASE/admin/feed-import/recovery/audit?region=$REGION" -H "$AUTH" | tee -a "$LOG" | python3 -m json.tool | head -40

log "Phase 2: integrity report (heavy apartments count)"
curl -sf "$API_BASE/admin/feed-import/integrity?region=$REGION&include_apartments=1" -H "$AUTH" | tee -a "$LOG" | python3 -m json.tool | head -60

log "Phase 3: SOLD recovery dry-run"
PLAN=$(curl -sf -X POST "$API_BASE/admin/feed-import/recovery/sold-restore?region=$REGION&dry_run=1" -H "$AUTH" -H "Content-Type: application/json" -d '{}')
echo "$PLAN" | tee -a "$LOG" | python3 -m json.tool

FALSE_SOLD=$(echo "$PLAN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('falseSoldCandidates',0))")
log "falseSoldCandidates=$FALSE_SOLD"

if [[ "${EXECUTE_SOLD_RESTORE:-}" == "1" && "$FALSE_SOLD" -gt 0 ]]; then
  log "Phase 4: EXECUTE SOLD restore"
  curl -sf -X POST "$API_BASE/admin/feed-import/recovery/sold-restore?region=$REGION" -H "$AUTH" -H "Content-Type: application/json" -d '{}' | tee -a "$LOG" | python3 -m json.tool
else
  log "Phase 4: SKIP sold restore (set EXECUTE_SOLD_RESTORE=1 to execute)"
fi

if [[ "${TRIGGER_FULL_IMPORT:-}" == "1" ]]; then
  log "Phase 5: trigger full import"
  curl -sf -X POST "$API_BASE/admin/feed-import/trigger?region=$REGION" -H "$AUTH" -H "Content-Type: application/json" | tee -a "$LOG"
  log "Wait for import to complete, then re-run integrity check manually."
else
  log "Phase 5: SKIP import (set TRIGGER_FULL_IMPORT=1 to trigger)"
fi

log "Phase 6: post-recovery data quality"
curl -sf "$API_BASE/admin/feed-import/recovery/data-quality?region=$REGION" -H "$AUTH" | tee -a "$LOG" | python3 -m json.tool

if [[ "${GENERATE_SITEMAP:-1}" == "1" ]]; then
  log "Phase 7: regenerate chunked sitemaps"
  curl -sf -X POST "$API_BASE/admin/sitemap/generate" -H "$AUTH" -H "Content-Type: application/json" -d '{}' | tee -a "$LOG" | python3 -m json.tool
fi

log "=== Feed recovery run finished ==="
