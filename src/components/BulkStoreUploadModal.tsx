'use client';

import React, { useState, useRef } from 'react';
import { User } from '@/types';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface BulkStoreUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User | null;
  onUploadSuccess: () => void;
}

interface ParsedRecord {
  diNo?: string;
  invoiceNo?: string;
  storeRemarks?: string;
  storeOtherDetails?: string;
}

export const BulkStoreUploadModal: React.FC<BulkStoreUploadModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRecord[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultStats, setResultStats] = useState<{
    updatedCount: number;
    notFoundCount: number;
    skippedCount: number;
    totalProcessed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg(null);
    setResultStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processRawData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      setErrorMsg('The selected file appears to be empty.');
      setIsParsing(false);
      return;
    }

    const records: ParsedRecord[] = [];

    data.forEach((row) => {
      if (!row || typeof row !== 'object') return;

      let diNo = '';
      let invoiceNo = '';
      let storeRemarks = '';
      let storeOtherDetails = '';

      Object.entries(row).forEach(([key, val]) => {
        if (val === undefined || val === null) return;
        const cleanKey = key.trim().toUpperCase();
        const strVal = String(val).trim();
        if (!strVal || strVal === '-') return;

        if (
          cleanKey.includes('DI NO') ||
          cleanKey.includes('DI_NO') ||
          cleanKey.includes('DI.') ||
          cleanKey === 'DI' ||
          cleanKey.includes('DISPATCH INSTRUCTION') ||
          cleanKey.includes('DESPATCH INSTRUCTION')
        ) {
          diNo = strVal;
        } else if (cleanKey.includes('INVOICE') || cleanKey.includes('INV NO')) {
          invoiceNo = strVal;
        } else if (cleanKey.includes('STORE REMARK') || cleanKey.includes('STORE_REMARK')) {
          storeRemarks = strVal;
        } else if (cleanKey.includes('OTHER DETAIL') || cleanKey.includes('STORE OTHER') || cleanKey.includes('OTHER_DETAIL')) {
          storeOtherDetails = strVal;
        } else if (cleanKey === 'REMARKS' && !storeRemarks) {
          storeRemarks = strVal;
        } else if (cleanKey === 'DETAILS' && !storeOtherDetails) {
          storeOtherDetails = strVal;
        }
      });

      if (diNo || invoiceNo) {
        records.push({ diNo, invoiceNo, storeRemarks, storeOtherDetails });
      }
    });

    if (records.length === 0) {
      setErrorMsg('Could not find DI NO, INVOICE NO, STORE REMARKS, or STORE OTHER DETAILS columns in the file.');
    } else {
      setParsedRows(records);
      setErrorMsg(null);
    }
    setIsParsing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setErrorMsg(null);
    setResultStats(null);

    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          processRawData(results.data);
        },
        error: (err) => {
          setErrorMsg(`CSV parsing error: ${err.message}`);
          setIsParsing(false);
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          processRawData(data);
        } catch (err: any) {
          setErrorMsg(`Excel reading error: ${err.message}`);
          setIsParsing(false);
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      setErrorMsg('Unsupported file format. Please upload a .xlsx, .xls, or .csv file.');
      setIsParsing(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/deliveries/bulk-store-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parsedRows,
          activeUser,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResultStats({
          updatedCount: data.updatedCount || 0,
          notFoundCount: data.notFoundCount || 0,
          skippedCount: data.skippedCount || 0,
          totalProcessed: data.totalProcessed || parsedRows.length,
        });
        onUploadSuccess();
      } else {
        setErrorMsg(data.error || 'Failed to bulk upload store remarks.');
      }
    } catch (err: any) {
      setErrorMsg(`Server request error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Bulk Upload Store Remarks & Details</h2>
              <p className="text-xs text-slate-400">Import Excel/CSV file with DI No and Store Remarks</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* File Picker Area */}
          {!resultStats && (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/30 transition cursor-pointer relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="w-8 h-8 text-emerald-600" />
                <span className="font-semibold text-sm text-slate-800">
                  {file ? file.name : 'Click to select or drag & drop Excel / CSV file'}
                </span>
                <span className="text-xs text-slate-500">
                  Supports .xlsx, .xls, and .csv files with DI NO, INVOICE NO, STORE REMARKS, STORE OTHER DETAILS
                </span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="flex items-center justify-center space-x-2 py-4 text-emerald-600 font-medium text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Parsing file contents...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Statistics */}
          {resultStats && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Bulk Upload Successfully Completed!</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <span className="text-xs text-slate-500 block uppercase font-bold">Updated DB</span>
                  <span className="text-xl font-extrabold text-emerald-600">{resultStats.updatedCount}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <span className="text-xs text-slate-500 block uppercase font-bold">Unchanged / Skipped</span>
                  <span className="text-xl font-extrabold text-slate-700">{resultStats.skippedCount}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <span className="text-xs text-slate-500 block uppercase font-bold">Not Found</span>
                  <span className="text-xl font-extrabold text-amber-600">{resultStats.notFoundCount}</span>
                </div>
              </div>
              <p className="text-xs text-emerald-700 text-center pt-1">
                Your dashboard table has been updated automatically with zero full page reloads.
              </p>
            </div>
          )}

          {/* File Preview Table */}
          {parsedRows.length > 0 && !resultStats && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Previewing first {Math.min(parsedRows.length, 5)} of {parsedRows.length} total rows:</span>
                <span className="text-emerald-600 font-bold">{parsedRows.length} Valid Rows Ready</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">DI NO</th>
                      <th className="px-3 py-2">INVOICE NO</th>
                      <th className="px-3 py-2">STORE REMARKS</th>
                      <th className="px-3 py-2">STORE OTHER DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{row.diNo || '-'}</td>
                        <td className="px-3 py-2 font-medium">{row.invoiceNo || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.storeRemarks || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.storeOtherDetails || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Clear / Select Different File
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            {parsedRows.length > 0 && !resultStats && (
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Database...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Update {parsedRows.length} Rows</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
