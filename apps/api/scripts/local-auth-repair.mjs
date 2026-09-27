#!/usr/bin/env node
/**
 * Local-only auth repair — upserts dev admin users without touching production.
 * Usage: pnpm db:auth-repair
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run local-auth-repair in production.');
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Учётки задаются в окружении — зашитых паролей в репозитории нет:
 *   DEV_ADMIN_EMAIL=... DEV_ADMIN_PASSWORD=... pnpm db:auth-repair
 */
const devEmail = process.env.DEV_ADMIN_EMAIL?.trim();
const devPassword = process.env.DEV_ADMIN_PASSWORD;

if (!devEmail || !devPassword) {
  console.error(
    'Укажите DEV_ADMIN_EMAIL и DEV_ADMIN_PASSWORD в окружении — зашитых учёток здесь нет.',
  );
  process.exit(1);
}
if (devPassword.length < 12) {
  console.error('DEV_ADMIN_PASSWORD короче 12 символов.');
  process.exit(1);
}

const LOCAL_USERS = [
  {
    email: devEmail,
    password: devPassword,
    fullName: process.env.DEV_ADMIN_NAME?.trim() || 'Администратор',
    role: 'admin',
  },
];

async function main() {
  console.log('Local auth repair — table: users');
  for (const u of LOCAL_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
      select: { id: true, email: true, role: true, isActive: true },
    });
    const verify = await bcrypt.compare(u.password, passwordHash);
    console.log(`  ✓ ${row.email} (${row.role}) verify=${verify} id=${row.id}`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
