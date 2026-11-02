'use client';

import { LoginModal } from '@/components/LoginModal';

export function LoginScreen() {
  return (
    <div className="min-h-screen bg-slate-900">
      <LoginModal
        isOpen
        // Full navigation so the server re-checks the new session cookie before rendering the dashboard.
        onLoginSuccess={() => window.location.replace('/')}
      />
    </div>
  );
}
