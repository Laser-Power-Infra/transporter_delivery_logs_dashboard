import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Dashboard } from '@/components/Dashboard';
import type { User } from '@/types';

export const dynamic = 'force-dynamic';

// Server-side auth gate: the dashboard shell (and therefore any data fetch) is only sent to the
// browser for a valid, existing user. Unauthenticated visitors are redirected to /login by the
// middleware; this check also covers revoked/deleted accounts with a still-valid token.
export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session?.userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
  if (!user) redirect('/login');

  const initialUser: User = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  return <Dashboard initialUser={initialUser} />;
}
