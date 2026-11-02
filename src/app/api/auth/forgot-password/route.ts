import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Admin-mediated reset: this app has no email-sending infrastructure, so instead of mailing a
 * reset link we flag the account (passwordResetRequestedAt). Admins see the flag in
 * "User Management" and generate a temporary password, which the user then changes via
 * "Change password". The response is identical whether or not the email exists, so the
 * endpoint cannot be used to discover accounts.
 */
export async function POST(req: NextRequest) {
  const genericResponse = NextResponse.json({
    success: true,
    message:
      'If an account exists for this email, an administrator has been notified and will share a temporary password with you.',
  });

  try {
    const { email } = await req.json().catch(() => ({ email: '' }));
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    await prisma.user.updateMany({
      where: { email: cleanEmail },
      data: { passwordResetRequestedAt: new Date() },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
  }

  return genericResponse;
}
