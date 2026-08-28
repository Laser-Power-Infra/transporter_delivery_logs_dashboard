'use client';

import React, { useState, useRef } from 'react';
import { User, SyncStats } from '@/types';
import { X, RefreshCw, FileSpreadsheet, ShieldCheck, AlertCircle, CheckCircle2, Upload, FileCheck, Sliders, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User | null;
  onSyncComplete: () => void;
}

const DB_FIELDS: { key: string; label: string; col: string }[] = [
  { key: 'invoiceNo', label: 'INVOICE NO', col: 'Col B' },
  { key: 'date', label: 'Date', col: 'Col C' },
  { key: 'buyerName', label: 'Buyer Name', col: 'Col D' },
  { key: 'transporterName', label: 'Transporter Name', col: 'Col E' },
  { key: 'truckNumber', label: 'TRUCK NUMBER', col: 'Col F' },
  { key: 'driverContactNo', label: 'Driver Contact No', col: 'Col G' },
  { key: 'lrNo', label: 'LR. NO', col: 'Col H' },
  { key: 'freightOrder', label: 'FREIGHT ORDER', col: 'Col I' },
  { key: 'toPlaceName', label: 'To Place Name', col: 'Col J' },
  { key: 'address', label: 'Address', col: 'Col K' },
  { key: 'itemName', label: 'Item Name', col: 'Col L' },
  { key: 'drumQty', label: 'Drum Qty', col: 'Col M' },
  { key: 'deliveryStatus', label: 'DELIVERY STATUS', col: 'Col N' },
  { key: 'remarks', label: 'Remarks', col: 'Col O' },
  { key: 'deliveryRemarks', label: 'DELIVERY REMARKS', col: 'Col P' },
  { key: 'vehicleReachedDate', label: 'VEHICLE REACHED DATE', col: 'Col Q' },
  { key: 'deliveryDate', label: 'DELIVERY DATE', col: 'Col R' },
];

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  onSyncComplete,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [mode, setMode] = useState<'AUTO' | 'FILE' | 'CSV'>('AUTO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvInput, setCsvInput] = useState('');
  const [clearCorruptedData, setClearCorruptedData] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Column remapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseCsvPreview = (text: string) => {
    try {
      let cleanText = text;
      const lines = text.split(/\r?\n/);
      const headerIdx = lines.findIndex(l => l.toUpperCase().includes('INVOICE NO') || l.toUpperCase().includes('BUYER NAME'));
      if (headerIdx > 0) {
        cleanText = lines.slice(headerIdx).join('\n');
      }

      const parsed = Papa.parse(cleanText, { header: true, preview: 5, skipEmptyLines: 'greedy' });
      if (parsed.meta && parsed.meta.fields) {
        const headers = parsed.meta.fields;
        setCsvHeaders(headers);
        setSampleRows(parsed.data || []);
      }
    } catch (e) {
      console.warn('Error parsing preview:', e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage('');
      const text = await file.text();
      parseCsvPreview(text);
    }
  };

  const handleRunSync = async () => {
    if (!activeUser) {
      setErrorMessage('Active user session required');
      return;
    }

    setIsSyncing(true);
    setErrorMessage('');
    setSyncStats(null);

    try {
      let payloadCsv = '';

      if (mode === 'FILE') {
        if (!selectedFile) {
          setErrorMessage('Please select a CSV file to upload.');
          setIsSyncing(false);
          return;
        }
        payloadCsv = await selectedFile.text();
      } else if (mode === 'CSV') {
        if (!csvInput.trim()) {
          setErrorMessage('Please paste CSV text before syncing.');
          setIsSyncing(false);
          return;
        }
        payloadCsv = csvInput;
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeUser,
          csvContent: payloadCsv || undefined,
          customMapping: Object.keys(customMapping).length > 0 ? customMapping : undefined,
          clearOldCorruptedData: clearCorruptedData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSyncStats(data.stats);
        onSyncComplete();
      } else {
        setErrorMessage(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync error occurred');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-sky-600 rounded text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Google Sheet Sync Center (16,825 Records Support)</h2>
              <p className="text-xs text-slate-300">Auto-Detects Header Row & Strips Summary Lines • Null Protection Enabled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protection Banner */}
        <div className="p-3.5 bg-sky-50 border-b border-sky-200 text-xs text-sky-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>
              <strong>Null Protection:</strong> Sheet <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-900">NULL</code> or <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-900">""</code> values will <strong>NOT</strong> override DB values.
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => setMode('AUTO')}
              className={`flex-1 py-2 rounded-md transition ${
                mode === 'AUTO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Direct Sheet Fetch
            </button>
            <button
              onClick={() => setMode('FILE')}
              className={`flex-1 py-2 rounded-md transition flex items-center justify-center space-x-1 ${
                mode === 'FILE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📁 Upload CSV File</span>
            </button>
            <button
              onClick={() => setMode('CSV')}
              className={`flex-1 py-2 rounded-md transition ${
                mode === 'CSV' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Paste CSV Text
            </button>
          </div>

          {/* Mode 1: Direct Fetch */}
          {mode === 'AUTO' && (
            <div className="p-4 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Target Google Sheet URL:</p>
              <code className="block bg-slate-100 p-2 rounded text-slate-800 font-mono text-[11px] break-all">
                https://docs.google.com/spreadsheets/d/1d6WFfLG-DPIrsa5KtJWgt7BLk7VmjyRMs3NuTC6gSVo/edit?gid=0#gid=0
              </code>
              <p className="text-[11px] text-slate-500">
                Clicking <strong>Clean Reset & Sync Now</strong> will fetch all 16,825 rows directly from Google Sheet, strip summary headers, and populate PostgreSQL <code className="font-bold text-sky-700">DeliveryDB</code> accurately!
              </p>
            </div>
          )}

          {/* Mode 2: File Upload */}
          {mode === 'FILE' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-400 rounded-xl p-6 text-center cursor-pointer transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-sky-600 mx-auto mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-sky-900 flex items-center justify-center gap-1">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      {selectedFile.name}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Size: {(selectedFile.size / 1024).toFixed(1)} KB • Detected {csvHeaders.length} columns
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Click to choose CSV file containing your delivery records
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      (Exported from Google Sheet via File &rarr; Download &rarr; Comma Separated Values .csv)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 3: Paste CSV */}
          {mode === 'CSV' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Paste CSV Data:
              </label>
              <textarea
                rows={4}
                placeholder={`"LP22Y-00273","09-May-22","EAST CENTRAL RAILWAY","S.N.P LOGISTIC","JH10AZ6097"`}
                value={csvInput}
                onChange={(e) => {
                  setCsvInput(e.target.value);
                  parseCsvPreview(e.target.value);
                }}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Purge Old Corrupted Records Checkbox */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-900 font-bold">
                Reset Database & Purge old corrupted data before re-syncing (Recommended)
              </span>
            </div>
            <input
              type="checkbox"
              checked={clearCorruptedData}
              onChange={(e) => setClearCorruptedData(e.target.checked)}
              className="rounded border-amber-400 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sync Stats Result Card */}
          {syncStats && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sync & Database Clean Realignment Completed!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>Total Sheet Rows Processed: <strong>{syncStats.totalSheetRows.toLocaleString()}</strong></div>
                <div>New Records Inserted: <strong className="text-emerald-700">{syncStats.newInserted.toLocaleString()}</strong></div>
                <div>Updated DB Fields: <strong>{syncStats.updatedCount.toLocaleString()}</strong></div>
                <div>Sheet Null/Empty Ignored: <strong className="text-sky-700">{syncStats.nullIgnoredCount.toLocaleString()}</strong></div>
                <div>Mismatches Detected: <strong className="text-amber-700">{syncStats.mismatchesCount.toLocaleString()}</strong></div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
          >
            Close
          </button>
          <button
            onClick={handleRunSync}
            disabled={isSyncing}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Cleaning DB & Syncing 16,825 Records...' : 'Clean Reset & Sync Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
