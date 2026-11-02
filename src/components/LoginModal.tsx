'use client';

import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, KeyRound, UserCheck } from 'lucide-react';
import { User } from '@/types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  // "Forgot password": the app has no email sending, so this flags the account for an admin,
  // who issues a temporary password from User Management (see /api/auth/forgot-password).
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Request failed');
      setInfo(data.message);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'forgot') => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all transform scale-100">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-6 text-white text-center relative">
          <div className="w-14 h-14 bg-indigo-600/30 border border-indigo-400/40 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400 shadow-lg">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-wide">Transporter & Delivery Operations</h2>
          <p className="text-xs text-slate-300 mt-1">Secure User Authentication</p>
        </div>

        {/* Forgot password form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">{info}</div>
            ) : (
              <p className="text-xs text-slate-600">
                Enter your account email. An administrator will be notified and will give you a temporary password,
                which you can change after signing in.
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@laserpowerinfra.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition text-sm disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Request Password Reset'}
            </button>
            <button type="button" onClick={() => switchMode('login')} className="w-full text-xs font-semibold text-indigo-600 hover:underline">
              Back to sign in
            </button>
          </form>
        )}

        {/* Modal Form Content */}
        {mode === 'login' && (
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@laserpowerinfra.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition duration-150 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Sign In to Dashboard
              </>
            )}
          </button>

          <button type="button" onClick={() => switchMode('forgot')} className="w-full text-xs font-semibold text-indigo-600 hover:underline">
            Forgot password?
          </button>
        </form>
        )}
      </div>
    </div>
  );
};
