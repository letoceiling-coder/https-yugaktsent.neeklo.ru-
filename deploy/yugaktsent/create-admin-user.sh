#!/usr/bin/env bash
# Создание пользователя админки на yugaktsent (без изменений livegrid.ru)
set -euo pipefail
ROOT="${DEPLOY_ROOT:-/var/www/yugaktsent-lg}"
EMAIL="${1:?email required}"
FULL_NAME="${2:?full name required}"
PASSWORD="${3:?password required}"
ROLE="${4:-admin}"

cd "$ROOT/packages/database"
export DATABASE_URL
# shellcheck disable=SC1090
source "$ROOT/deploy/load-api-env.sh"

pnpm exec tsx -e "
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const email = process.argv[1].trim().toLowerCase();
const fullName = process.argv[2].trim();
const password = process.argv[3];
const role = process.argv[4] as 'admin' | 'editor' | 'manager' | 'agent' | 'client';

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { fullName, passwordHash, role, isActive: true },
  create: { email, fullName, passwordHash, role, isActive: true },
});
console.log(JSON.stringify({ id: user.id, email: user.email, fullName: user.fullName, role: user.role }));
await prisma.\$disconnect();
" "$EMAIL" "$FULL_NAME" "$PASSWORD" "$ROLE"
