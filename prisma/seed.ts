import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial secure users with hashed JWT passwords...');

  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const operatorPasswordHash = await bcrypt.hash('Operator@123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'dev@laserpowerinfra.com' },
    update: {
      name: 'Laser Infra Admin',
      password: adminPasswordHash,
      role: 'ADMIN',
    },
    create: {
      name: 'Laser Infra Admin',
      email: 'dev@laserpowerinfra.com',
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'operator@laserpowerinfra.com' },
    update: {
      name: 'Operations Operator',
      password: operatorPasswordHash,
      role: 'OPERATOR',
    },
    create: {
      name: 'Operations Operator',
      email: 'operator@laserpowerinfra.com',
      password: operatorPasswordHash,
      role: 'OPERATOR',
    },
  });

  console.log('---------------------------------------------------------');
  console.log('Successfully seeded secure user accounts:');
  console.log(`1. Admin Account: ${user1.name} (${user1.email}) - Password: Admin@123 [Role: ADMIN]`);
  console.log(`2. Operator Account: ${user2.name} (${user2.email}) - Password: Operator@123 [Role: OPERATOR]`);
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
