#!/usr/bin/env bash
set -euo pipefail

# Первичная установка yugaktsent.neeklo.ru на сервере 212.67.9.173
#   export DEPLOY_ROOT=/var/www/yugaktsent-lg
#   bash deploy/yugaktsent/bootstrap-server.sh

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/yugaktsent-lg}"
LG_REPO_URL="${LG_REPO_URL:-https://github.com/letoceiling-coder/livegrid.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "=== YugAktsent LiveGrid bootstrap ==="
echo "DEPLOY_ROOT=$DEPLOY_ROOT  branch=$DEPLOY_BRANCH"
echo ""

if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  parent="$(dirname "$DEPLOY_ROOT")"
  mkdir -p "$parent"
  echo "→ git clone $LG_REPO_URL → $DEPLOY_ROOT"
  git clone -b "$DEPLOY_BRANCH" "$LG_REPO_URL" "$DEPLOY_ROOT"
fi

if [ ! -f "$DEPLOY_ROOT/.env" ]; then
  echo "→ Creating .env from template..."
  bash "$DEPLOY_ROOT/deploy/yugaktsent/setup-db.sh"
  cp "$DEPLOY_ROOT/deploy/yugaktsent/env.example" "$DEPLOY_ROOT/.env"
  # Inject generated DB password and JWT secrets
  DB_PASS="$(cat /tmp/yugaktsent-lg-db-pass.txt 2>/dev/null || true)"
  if [ -n "$DB_PASS" ]; then
    sed -i "s|CHANGE_ME|$DB_PASS|g" "$DEPLOY_ROOT/.env"
  fi
  JWT_A="$(openssl rand -hex 32)"
  JWT_R="$(openssl rand -hex 32)"
  sed -i "s|change-me-yugaktsent-access-min-32-chars|$JWT_A|" "$DEPLOY_ROOT/.env"
  sed -i "s|change-me-yugaktsent-refresh-min-32-chars|$JWT_R|" "$DEPLOY_ROOT/.env"
  echo "  .env created — review deploy/yugaktsent/env.example for FEEDS_JSON"
fi

mkdir -p /var/log/yugaktsent-lg /srv/yugaktsent-lg/uploads
chmod 755 /srv/yugaktsent-lg/uploads

exec bash "$DEPLOY_ROOT/deploy/yugaktsent/deploy-full.sh"
