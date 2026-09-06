#!/usr/bin/env bash
set -euo pipefail

# Создаёт PostgreSQL БД, PostGIS и пользователя для yugaktsent LiveGrid.
DB_NAME="${YUGAKTSENT_DB_NAME:-yugaktsent_lg}"
DB_USER="${YUGAKTSENT_DB_USER:-yugaktsent_lg}"
DB_PASS="${YUGAKTSENT_DB_PASS:-$(openssl rand -hex 16)}"

echo "=== YugAktsent DB setup: $DB_NAME ==="

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "→ user $DB_USER already exists"
else
  echo "→ creating user $DB_USER"
  sudo -u postgres psql -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo "→ database $DB_NAME already exists"
else
  echo "→ creating database $DB_NAME"
  sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null || true

echo "→ enabling PostGIS extension (requires superuser)"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true

echo "$DB_PASS" > /tmp/yugaktsent-lg-db-pass.txt
chmod 600 /tmp/yugaktsent-lg-db-pass.txt
echo "→ password saved to /tmp/yugaktsent-lg-db-pass.txt"
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME"
