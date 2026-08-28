import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  const user1 = await prisma.user.upsert({
    where: { email: 'admin@delivery.com' },
    update: { name: 'Admin' },
    create: {
      name: 'Admin',
      email: 'admin@delivery.com',
      role: 'ADMIN',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'operator@delivery.com' },
    update: {},
    create: {
      name: 'Niloy Logistics',
      email: 'operator@delivery.com',
      role: 'OPERATOR',
    },
  });

  console.log(`Created users: ${user1.name} (${user1.email}), ${user2.name} (${user2.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
