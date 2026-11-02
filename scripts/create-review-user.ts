/**
 * Create (or reset) a READ-ONLY review account (role VIEWER), e.g. for the daily dashboard review.
 *
 * Usage:
 *   npm run user:create-review -- --email puja@laserpowerinfra.com [--name "Puja (Review)"]
 *
 * Password: taken from the REVIEW_USER_PASSWORD environment variable if set (min. 8 chars),
 * otherwise a random one is generated and printed ONCE. Nothing is hardcoded or written to disk;
 * only the bcrypt hash is stored in the database.
 *
 * Safety: refuses to touch an existing ADMIN/OPERATOR account with the same email, so it can
 * never downgrade or take over a real user. Re-running for an existing VIEWER resets its password.
 *
 * Alternative without the CLI: an ADMIN can sign in, open "Add User" and create the account with
 * role "VIEWER (Read-only Review)".
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function generatePassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

async function main() {
  const email = (arg('email') || process.env.REVIEW_USER_EMAIL || '').trim().toLowerCase();
  const name = (arg('name') || process.env.REVIEW_USER_NAME || 'Dashboard Review (read-only)').trim();

  if (!email || !email.includes('@')) {
    console.error('Usage: npm run user:create-review -- --email <email> [--name "<name>"]');
    process.exit(1);
  }

  const envPassword = process.env.REVIEW_USER_PASSWORD;
  if (envPassword !== undefined && envPassword.length < 8) {
    console.error('REVIEW_USER_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  const password = envPassword || generatePassword();

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'VIEWER') {
      console.error(
        `Refusing: ${email} already exists with role ${existing.role}. Use a different email for the read-only review account.`
      );
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: hash, role: 'VIEWER', passwordResetRequestedAt: null },
      create: { name, email, password: hash, role: 'VIEWER' },
    });

    console.log('---------------------------------------------------------');
    console.log(`${existing ? 'Updated' : 'Created'} read-only review account (role VIEWER):`);
    console.log(`  Name : ${user.name}`);
    console.log(`  Email: ${user.email}`);
    if (envPassword) {
      console.log('  Password: (taken from REVIEW_USER_PASSWORD)');
    } else {
      console.log(`  Password: ${password}`);
      console.log('  This password is shown only once. Share it privately (not in the repo / Notion page body).');
    }
    console.log('---------------------------------------------------------');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
