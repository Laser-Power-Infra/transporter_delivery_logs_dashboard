import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { generateTempPassword, requireUser } from '@/lib/guard';

export const dynamic = 'force-dynamic';

// POST /api/users/:id/reset-password - Admin sets a new temporary password for a user.
// The plaintext temporary password is returned ONCE in the response so the admin can hand it
// over; it is stored only as a bcrypt hash. The user should change it via "Change password".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req, 'admin');
  if (auth.response) return auth.response;

  try {
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id: target.id },
      data: { password: await hashPassword(tempPassword), passwordResetRequestedAt: null },
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      message: `Temporary password generated for ${target.email}. Share it securely; it is shown only once.`,
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
