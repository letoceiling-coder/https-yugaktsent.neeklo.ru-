import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();
const fullName = process.argv[3]?.trim();
const password = process.argv[4];
const role = process.argv[5] || 'admin';

if (!email || !fullName || !password) {
  console.error('Usage: node create-admin-user.mjs <email> <fullName> <password> [role]');
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { fullName, passwordHash, role, isActive: true },
  create: { email, fullName, passwordHash, role, isActive: true },
});
console.log(JSON.stringify({ id: user.id, email: user.email, fullName: user.fullName, role: user.role }));
await prisma.$disconnect();
