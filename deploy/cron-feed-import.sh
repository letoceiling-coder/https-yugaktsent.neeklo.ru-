#!/usr/bin/env bash
# Еженедельный emergency fallback (понедельник). Основной cron — BullMQ FEED_IMPORT_CRON.
set -euo pipefail

LOG_FILE="/var/log/lg/cron-feed-import.log"
API="http://localhost:3000/api/v1"

echo "$(date '+%Y-%m-%d %H:%M:%S') === Cron feed import started ===" >> "$LOG_FILE"

# Login
# Учётка берётся из окружения: паролю по умолчанию в репозитории не место
: "${LG_ADMIN_EMAIL:?укажите LG_ADMIN_EMAIL в окружении}"
: "${LG_ADMIN_PASSWORD:?укажите LG_ADMIN_PASSWORD в окружении}"

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$LG_ADMIN_EMAIL\",\"password\":\"$LG_ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Failed to get token" >> "$LOG_FILE"
  exit 1
fi

# Reset only stuck imports (>3h), not healthy RUNNING batches
sudo -u postgres psql -d lg_production -c \
  "UPDATE import_batches SET status='FAILED', finished_at=NOW(), error_message='Cron auto-reset (stuck >3h)' WHERE status IN ('RUNNING','PENDING') AND started_at < NOW() - INTERVAL '3 hours';" \
  >> "$LOG_FILE" 2>&1 || true

# Trigger import
RESULT=$(curl -sf -X POST "$API/admin/feed-import/trigger?region=msk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$(date '+%Y-%m-%d %H:%M:%S') Import triggered: $RESULT" >> "$LOG_FILE"
