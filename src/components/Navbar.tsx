'use client';

import React from 'react';
import { User } from '@/types';
import { RefreshCw, History, Shield, AlertTriangle, UserCheck, FileSpreadsheet } from 'lucide-react';

interface NavbarProps {
  users: User[];
  activeUser: User | null;
  onSelectUser: (user: User) => void;
  onOpenSync: () => void;
  onOpenAuditLogs: () => void;
  onOpenMismatches: () => void;
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
  mismatchCount,
  isSyncing,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-600 rounded-lg text-white shadow">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Delivery & Transporter Hub</h1>
          </div>
        </div>

        {/* Action Buttons & User Switcher */}
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
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet Data'}</span>
          </button>

          {/* Audit Logs Button */}
          <button
            onClick={onOpenAuditLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span>Audit History</span>
          </button>

          {/* Active User Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md px-2 py-1 space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold leading-none">Active User</span>
              <select
                value={activeUser?.id || ''}
                onChange={(e) => {
                  const target = users.find((u) => u.id === e.target.value);
                  if (target) onSelectUser(target);
                }}
                className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer pr-1"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
