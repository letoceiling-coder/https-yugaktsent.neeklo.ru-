#!/usr/bin/env bash
set -euo pipefail

# Полный деплой ЮгАкцент на yugaktsent.neeklo.ru.
# Запуск: bash /var/www/yugaktsent-lg/deploy/yugaktsent/deploy-full.sh

PROJECT_DIR="${DEPLOY_ROOT:-/var/www/yugaktsent-lg}"
export DEPLOY_ROOT="$PROJECT_DIR"
LOG_DIR="/var/log/yugaktsent-lg"
NGINX_CONF="/etc/nginx/sites-available/yugaktsent.neeklo.ru.conf"
NGINX_LINK="/etc/nginx/sites-enabled/yugaktsent.neeklo.ru.conf"

echo "=== ЮгАкцент: деплой ==="
echo "Project: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy deploy/yugaktsent/env.example → .env and configure."
  exit 1
fi

mkdir -p "$LOG_DIR" /srv/yugaktsent-lg/uploads

# shellcheck disable=SC1090
source "$PROJECT_DIR/deploy/load-api-env.sh"

API_PORT="${API_PORT:-3025}"

echo "→ Installing dependencies..."
export CI=true
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "→ Generating Prisma client..."
cd packages/database
pnpm exec prisma generate
cd "$PROJECT_DIR"

echo "→ Applying DB migrations..."
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi
cd packages/database
pnpm exec prisma migrate deploy
cd "$PROJECT_DIR"

echo "→ Seeding DB (admin user, defaults)..."
cd packages/database
DATABASE_URL="${DATABASE_URL}" pnpm exec tsx prisma/seed.ts 2>/dev/null || echo "WARN: seed skipped or failed"
cd "$PROJECT_DIR"

echo "→ Building shared..."
pnpm --filter @lg/shared build

echo "→ Building API..."
pnpm --filter @lg/api build

echo "→ Building frontend..."
rm -rf apps/web/dist apps/web/node_modules/.vite
rm -rf apps/web/public/assets apps/web/public/catalog apps/web/public/complex apps/web/public/index.html
SITE_FOR_WEB="${VITE_PUBLIC_SITE_URL:-${PUBLIC_SITE_URL:-https://yugaktsent.neeklo.ru}}"
SITE_FOR_WEB="${SITE_FOR_WEB%/}"
export VITE_PUBLIC_SITE_URL="$SITE_FOR_WEB"
pnpm build:web

echo "→ Installing profitbase-sync dependencies..."
cd deploy/yugaktsent/profitbase-sync
npm install --omit=dev 2>/dev/null || npm install
cd "$PROJECT_DIR"

echo "→ Перезапуск служб (API + синхронизация Profitbase)..."
export DEPLOY_ROOT="$PROJECT_DIR"
# Окружение пересобираем из .env на каждом деплое: правки в .env должны
# доезжать до служб без ручных действий.
bash deploy/yugaktsent/scripts/install-systemd.sh

echo "→ Updating nginx..."
cp deploy/yugaktsent/nginx.conf "$NGINX_CONF"
if [ ! -L "$NGINX_LINK" ]; then
  ln -sf "$NGINX_CONF" "$NGINX_LINK"
fi
nginx -t && nginx -s reload

echo ""
echo "=== Deploy complete ==="
systemctl --no-pager --plain list-units 'yugaktsent-*' | head -5
sleep 2
echo "Health:"
curl -sf "http://127.0.0.1:${API_PORT}/api/v1/health" | head -c 300 || echo "WARN: health check failed"
echo ""
