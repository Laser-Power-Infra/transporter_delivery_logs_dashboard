'use client';

import React from 'react';
import { User } from '@/types';
import { RefreshCw, History, AlertTriangle, UserCheck, FileSpreadsheet, LogOut, ShieldCheck, UserPlus } from 'lucide-react';

interface NavbarProps {
  users: User[];
  activeUser: User | null;
  onSelectUser: (user: User) => void;
  onOpenSync: () => void;
  onOpenAuditLogs: () => void;
  onOpenMismatches: () => void;
  onOpenUserManagement?: () => void;
  onLogout?: () => void;
  mismatchCount: number;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  users,
  activeUser,
  onSelectUser,
  onOpenSync,
  onOpenAuditLogs,
  onOpenMismatches,
  onOpenUserManagement,
  onLogout,
  mismatchCount,
  isSyncing,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Delivery & Transporter Hub</h1>
          </div>
        </div>

        {/* Action Buttons & User Info */}
        <div className="flex items-center space-x-3">
          
          {/* Mismatch Alert Button */}
          {mismatchCount > 0 && (
            <button
              onClick={onOpenMismatches}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium transition"
              title="View detected Sheet vs DB mismatches"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{mismatchCount} Mismatch{mismatchCount > 1 ? 'es' : ''}</span>
            </button>
          )}

          {/* Sync Button */}
          <button
            onClick={onOpenSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet Data'}</span>
          </button>

          {/* Audit Logs Button */}
          <button
            onClick={onOpenAuditLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audit History</span>
          </button>

          {/* Admin User Management Button */}
          {activeUser?.role === 'ADMIN' && onOpenUserManagement && (
            <button
              onClick={onOpenUserManagement}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 text-xs font-semibold transition"
              title="Add & Manage Users or Admins"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add User</span>
            </button>
          )}

          {/* Active Logged-in User Badge */}
          {activeUser && (
            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-md px-3 py-1.5 space-x-2.5">
              {activeUser.role === 'ADMIN' ? (
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              )}
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white leading-none">{activeUser.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                      activeUser.role === 'ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {activeUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{activeUser.email}</span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
