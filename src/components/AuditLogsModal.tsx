'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/types';
import { X, Search, History, Clock, User, FileText, ArrowRight } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchLogs(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-sky-600 rounded text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Application Audit Trail Logs</h2>
              <p className="text-xs text-slate-300">All updates made in application stored directly in PostgreSQL (`DeliveryDB`)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit history by Invoice No, Field, User Name, or Change details..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Field Changed</th>
                    <th className="py-2.5 px-3">Old Value</th>
                    <th className="py-2.5 px-3">New Value</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-sky-600" />
                          <span>{log.userName}</span>
                        </div>
                      </td>

                      {/* Invoice No */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {log.invoiceNo}
                      </td>

                      {/* Field Changed */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-sky-700">
                        {log.fieldName}
                      </td>

                      {/* Old Value */}
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-500 italic">
                        {log.oldValue !== null && log.oldValue !== undefined ? log.oldValue : '(null)'}
                      </td>

                      {/* New Value */}
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-900 font-semibold">
                        {log.newValue !== null && log.newValue !== undefined ? log.newValue : '(null)'}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'UI_UPDATE'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : log.action === 'SHEET_SYNC'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Total Recorded Logs: {logs.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
