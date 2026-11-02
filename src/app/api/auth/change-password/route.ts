import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';
import { requireUser } from '@/lib/guard';

export const dynamic = 'force-dynamic';

// POST /api/auth/change-password { currentPassword, newPassword }
// Any signed-in user (including read-only accounts) may change their OWN password.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'read');
  if (auth.response) return auth.response;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current and new password are required' },
        { status: 400 }
      );
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user || !(await comparePassword(String(currentPassword), user.password || ''))) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(String(newPassword)), passwordResetRequestedAt: null },
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}
