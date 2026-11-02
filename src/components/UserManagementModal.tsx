import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, ShieldCheck, UserCheck, KeyRound, Mail, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Role, User } from '@/types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User | null;
  onUserCreated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  onUserCreated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [resetInfo, setResetInfo] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setError(null);
      setSuccessMsg(null);
      setResetInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = activeUser?.role === 'ADMIN';

  // Admin-mediated password reset (see /api/auth/forgot-password for why there is no email link).
  const handleResetPassword = async (u: User) => {
    if (!window.confirm(`Generate a new temporary password for ${u.email}? Their current password will stop working.`)) return;
    setError(null);
    setSuccessMsg(null);
    setResetInfo(null);
    setResettingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to reset password');
      setResetInfo({ email: u.email, tempPassword: data.tempPassword });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(data.message || 'User created successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setRole('OPERATOR');
      loadUsers();
      if (onUserCreated) onUserCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">User Account Management</h3>
              <p className="text-xs text-slate-400">Add & Manage Admin / Operator Accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {!isAdmin ? (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>Only Admin accounts can add new users or admins. You are currently logged in as an <strong>{activeUser?.role}</strong>.</span>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Add New User or Admin
              </h4>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@laserpowerinfra.com"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="OPERATOR">OPERATOR (Normal User)</option>
                    <option value="VIEWER">VIEWER (Read-only Review)</option>
                    <option value="ADMIN">ADMIN (Full Admin Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {resetInfo && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg space-y-1">
              <div className="font-bold">Temporary password for {resetInfo.email} (shown only once):</div>
              <code className="block font-mono text-sm bg-white border border-amber-200 rounded px-2 py-1 select-all">{resetInfo.tempPassword}</code>
              <div>Share it privately and ask the user to change it via &quot;Change Password&quot; after signing in.</div>
            </div>
          )}

          {isAdmin && error && !loading && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">{error}</div>
          )}

          {/* List of Existing Accounts */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Existing System Users ({users.length})
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {users.map((u) => (
                <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3">
                    {u.role === 'ADMIN' ? (
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight">{u.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {u.passwordResetRequestedAt && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200" title={`Requested ${new Date(u.passwordResetRequestedAt).toLocaleString()}`}>
                        Reset requested
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleResetPassword(u)}
                        disabled={resettingId === u.id}
                        className="px-2 py-0.5 text-[10px] font-bold rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        {resettingId === u.id ? 'Resetting...' : 'Reset Password'}
                      </button>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase tracking-wider ${
                        u.role === 'ADMIN'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : u.role === 'VIEWER'
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {u.role === 'VIEWER' ? 'VIEWER (read-only)' : u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
