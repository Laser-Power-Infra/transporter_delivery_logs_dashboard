'use client';

import React from 'react';
import { Delivery, MismatchDetail } from '@/types';
import { X, AlertTriangle, Edit3 } from 'lucide-react';

interface MismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mismatchDeliveries: Delivery[];
  onResolveMismatch: (delivery: Delivery) => void;
}

export const MismatchModal: React.FC<MismatchModalProps> = ({
  isOpen,
  onClose,
  mismatchDeliveries,
  onResolveMismatch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-rose-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-rose-600 rounded text-white shadow-sm">
              <AlertTriangle className="w-5 h-5 font-bold animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold">⚠️ Google Sheet vs DB Data Mismatches</h2>
              <p className="text-xs text-rose-200">
                Found {mismatchDeliveries.length} invoice(s) where non-empty Sheet values disagree with DB values
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-rose-300 hover:text-white hover:bg-rose-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mismatchDeliveries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-semibold">
              No active data mismatches detected! All database records align 100% with Google Sheet data.
            </div>
          ) : (
            mismatchDeliveries.map((item) => {
              let details: MismatchDetail[] = [];
              try {
                if (item.mismatchDetails) {
                  details = JSON.parse(item.mismatchDetails);
                }
              } catch (e) {}

              return (
                <div key={item.id} className="border-2 border-rose-400 rounded-xl bg-rose-50/70 p-4 shadow-sm">
                  
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">{item.invoiceNo}</span>
                      <span className="ml-2 text-xs text-slate-700 font-medium">Buyer: {item.buyerName || 'N/A'}</span>
                    </div>
                    <button
                      onClick={() => onResolveMismatch(item)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Review & Edit DB Record</span>
                    </button>
                  </div>

                  {/* Field Mismatch Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-rose-900 uppercase tracking-wider block">
                      Conflicting Fields (Highlighting Red vs Green):
                    </span>
                    {details.length === 0 ? (
                      <p className="text-xs text-rose-800">Conflicting non-empty sheet values present.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {details.map((m, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-rose-300 text-xs shadow-xs space-y-1.5">
                            <span className="font-bold text-slate-900 block">{(m as any).fieldLabel || m.field}</span>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-1.5 rounded">
                                <span className="font-bold text-emerald-700 block text-[10px]">Google Sheet:</span>
                                <strong>"{m.sheetValue}"</strong>
                              </div>
                              <div className="bg-rose-100 border border-rose-400 text-rose-950 p-1.5 rounded">
                                <span className="font-bold text-rose-700 block text-[10px]">PostgreSQL DB:</span>
                                <strong>"{m.dbValue}"</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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
