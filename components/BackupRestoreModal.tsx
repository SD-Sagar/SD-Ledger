'use client';

import React, { useState, useRef } from 'react';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupRestoreModal({ isOpen, onClose }: BackupRestoreModalProps) {
  const { transactions, accounts, exportCSV, exportJSON, restoreJSON } = useLedger();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    appName: string;
    exportedAt: string;
    accountCount: number;
    transactionCount: number;
  } | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions)) {
          setError('Invalid SD-Ledger backup file structure.');
          setSelectedFileContent(null);
          setPreviewInfo(null);
          return;
        }

        setSelectedFileContent(text);
        setPreviewInfo({
          appName: parsed.appName || 'SD-Ledger',
          exportedAt: parsed.exportedAt || 'Unknown',
          accountCount: parsed.accounts.length,
          transactionCount: parsed.transactions.length,
        });
      } catch (err: unknown) {
        setError('Failed to parse JSON file.');
        setSelectedFileContent(null);
        setPreviewInfo(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!selectedFileContent) return;
    setIsRestoring(true);
    setError(null);

    const res = await restoreJSON(selectedFileContent);
    setIsRestoring(false);

    if (res.success) {
      setSuccess('Ledger data successfully restored! Recalculating balances...');
      setTimeout(() => {
        setSelectedFileContent(null);
        setPreviewInfo(null);
        setSuccess(null);
        onClose();
      }, 1200);
    } else {
      setError(res.error || 'Restore failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Data Backup & Export</h2>
              <p className="text-[11px] text-zinc-400">
                Full offline ownership of your financial records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Section 1: Exports */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Export Data
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* CSV Export */}
              <button
                type="button"
                onClick={exportCSV}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center transition-all hover:border-emerald-500/50 hover:bg-zinc-800/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Export to CSV
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    For Excel & Sheets ({transactions.length} rows)
                  </span>
                </div>
              </button>

              {/* JSON Backup */}
              <button
                type="button"
                onClick={exportJSON}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center transition-all hover:border-teal-500/50 hover:bg-zinc-800/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Full JSON Backup
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Accounts, History & Audit Logs
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: JSON Restore */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Restore from Backup
            </h3>
            <p className="text-[11px] text-zinc-400">
              Select a previously exported SD-Ledger JSON backup file to restore.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!previewInfo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 py-4 text-xs font-medium text-zinc-300 hover:border-teal-500 hover:text-white transition-colors"
              >
                <Upload className="h-4 w-4 text-teal-400" />
                <span>Choose .json Backup File</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-teal-900/60 bg-teal-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-teal-300 font-semibold mb-1">
                    <span>Valid Backup Verified</span>
                    <span className="text-[10px]">{previewInfo.appName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-300 text-[11px]">
                    <div>Accounts: <span className="text-white font-bold">{previewInfo.accountCount}</span></div>
                    <div>Transactions: <span className="text-white font-bold">{previewInfo.transactionCount}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleExecuteRestore}
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-teal-500 transition-colors disabled:opacity-50"
                  >
                    {isRestoring ? 'Restoring Ledger...' : 'Confirm & Restore Ledger'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileContent(null);
                      setPreviewInfo(null);
                    }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
