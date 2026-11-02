import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LoginScreen } from './LoginScreen';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in · Delivery & Transporter Dashboard',
};

// Public login page. Renders only the sign-in form: no dashboard markup and no data requests.
export default async function LoginPage() {
  const session = await getSessionUser();
  if (session?.userId) {
    const exists = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true } });
    if (exists) redirect('/');
  }

  return <LoginScreen />;
}
