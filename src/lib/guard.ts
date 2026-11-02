import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import type { Role } from '@/types';

export interface GuardedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

type GuardResult =
  | { user: GuardedUser; response?: undefined }
  | { user?: undefined; response: NextResponse };

/**
 * Server-side authorization for API route handlers.
 *
 * The middleware already rejects unauthenticated requests, but handlers re-check here so that
 * the role is always read from the database (JWTs are long-lived, so a role stored in the token
 * could be stale) and so a handler can never be reached without a session even if the
 * middleware matcher is changed.
 *
 *  - access 'read'  : any authenticated user (ADMIN, OPERATOR, VIEWER)
 *  - access 'write' : ADMIN or OPERATOR (VIEWER / read-only accounts get 403)
 *  - access 'admin' : ADMIN only
 */
export async function requireUser(
  req: NextRequest,
  access: 'read' | 'write' | 'admin' = 'read'
): Promise<GuardResult> {
  const session = await getSessionUser(req);
  if (!session?.userId) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required. Please log in.' },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: User account no longer exists. Please log in again.' },
        { status: 401 }
      ),
    };
  }

  if (access === 'write' && user.role === 'VIEWER') {
    return {
      response: NextResponse.json(
        { success: false, error: 'Forbidden: This is a read-only account and cannot modify data.' },
        { status: 403 }
      ),
    };
  }

  if (access === 'admin' && user.role !== 'ADMIN') {
    return {
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required.' },
        { status: 403 }
      ),
    };
  }

  return { user: user as GuardedUser };
}

/** Generates a random human-typeable temporary password (no ambiguous characters). */
export function generateTempPassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}
