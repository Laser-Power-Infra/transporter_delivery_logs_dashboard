import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      const u1 = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@delivery.com',
          role: 'ADMIN',
        },
      });
      const u2 = await prisma.user.create({
        data: {
          name: 'Niloy Logistics',
          email: 'operator@delivery.com',
          role: 'OPERATOR',
        },
      });
      users = [u1, u2];
    } else {
      // Ensure name is updated to "Admin" if it was "Asmita Admin" or "Asmita"
      for (const u of users) {
        if (u.name.toLowerCase().includes('asmita')) {
          await prisma.user.update({
            where: { id: u.id },
            data: { name: 'Admin' },
          });
          u.name = 'Admin';
        }
      }
    }

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
