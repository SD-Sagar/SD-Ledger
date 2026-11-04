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
  CloudUpload,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupRestoreModal({ isOpen, onClose }: BackupRestoreModalProps) {
  const {
    transactions,
    accounts,
    notes,
    exportCSV,
    exportNotesCSV,
    exportJSON,
    restoreJSON,
    pushLocalDataToCloud,
  } = useLedger();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    appName: string;
    exportedAt: string;
    accountCount: number;
    transactionCount: number;
    notesCount?: number;
    contactsCount?: number;
    hasUpi?: boolean;
  } | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleForcePush = async () => {
    setIsPushing(true);
    setError(null);
    setSuccess(null);
    const res = await pushLocalDataToCloud();
    setIsPushing(false);
    if (res.success) {
      setSuccess(`Successfully pushed everything (accounts, transactions, notes, friend contacts, and UPI profile) to Supabase Cloud! Your mobile device & Vercel will now reflect all records.`);
    } else {
      setError(res.error || 'Failed to upload local data to cloud.');
    }
  };

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
          notesCount: Array.isArray(parsed.notes) ? parsed.notes.length : 0,
          contactsCount: Array.isArray(parsed.contacts) ? parsed.contacts.length : 0,
          hasUpi: Boolean(parsed.upiSettings?.upiId),
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
      setSuccess('Full ledger data, contacts, and UPI profile successfully restored!');
      setTimeout(() => {
        setSelectedFileContent(null);
        setPreviewInfo(null);
        setSuccess(null);
        onClose();
      }, 1500);
    } else {
      setError(res.error || 'Restore failed.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed & Sticky at top with shrink-0 */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/30 shrink-0">
              <Database className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                Data Backup &amp; Export
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Full offline ownership of your financial records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Section 1: Exports */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 space-y-3 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Export Data
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Transactions CSV Export */}
              <button
                type="button"
                onClick={exportCSV}
                className="flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-left sm:text-center transition-all hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Transactions CSV
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {transactions.length} records
                  </span>
                </div>
              </button>

              {/* Notes & Dues CSV Export */}
              <button
                type="button"
                onClick={exportNotesCSV}
                className="flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-left sm:text-center transition-all hover:border-amber-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Notes &amp; Dues CSV
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {notes.length} notes &amp; dues
                  </span>
                </div>
              </button>

              {/* JSON Backup */}
              <button
                type="button"
                onClick={exportJSON}
                className="flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-left sm:text-center transition-all hover:border-teal-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                  <FileJson className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Complete Backup (JSON)
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    All accounts, dues, contacts &amp; UPI
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: JSON Restore */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 space-y-3 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Restore from Backup
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Select a previously exported SD-Ledger JSON backup file to restore. All accounts, transactions, friend dues, contacts, and UPI details will be completely restored without leaving anything behind.
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
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 py-4 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-teal-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Choose .json Backup File</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-teal-300 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-teal-700 dark:text-teal-300 font-semibold mb-2">
                    <span>Complete Backup Verified</span>
                    <span className="text-[10px] font-mono">{previewInfo.appName}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-zinc-700 dark:text-zinc-300 text-[11px]">
                    <div>Accounts: <span className="text-zinc-900 dark:text-white font-bold">{previewInfo.accountCount}</span></div>
                    <div>Transactions: <span className="text-zinc-900 dark:text-white font-bold">{previewInfo.transactionCount}</span></div>
                    <div>Notes / Dues: <span className="text-zinc-900 dark:text-white font-bold">{previewInfo.notesCount ?? 0}</span></div>
                    <div>Saved Contacts: <span className="text-zinc-900 dark:text-white font-bold">{previewInfo.contactsCount ?? 0}</span></div>
                    <div>UPI Profile: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{previewInfo.hasUpi ? 'Included' : 'None'}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleExecuteRestore}
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-teal-500 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isRestoring ? 'Restoring All Sections...' : 'Confirm & Restore Everything'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileContent(null);
                      setPreviewInfo(null);
                    }}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Push Local Ledger to Cloud */}
          <div className="rounded-2xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/70 dark:bg-cyan-950/30 p-4 space-y-2.5 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
                Push Local Ledger to Supabase Cloud
              </h3>
              <span className="text-[10px] bg-cyan-200/80 dark:bg-cyan-900/80 text-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full font-semibold">
                Direct Cloud Sync
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Upload all local expenses, accounts, and transfers currently stored in this browser directly to your Supabase cloud database so they appear on Vercel and any other device.
            </p>
            <button
              type="button"
              disabled={isPushing}
              onClick={handleForcePush}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 px-4 text-xs font-semibold text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload className={`h-4 w-4 shrink-0 ${isPushing ? 'animate-spin' : ''}`} />
              <span className="truncate">{isPushing ? 'Uploading to Supabase...' : 'Push Localhost Ledger to Supabase Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/90 dark:bg-zinc-900/60 backdrop-blur-xs">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
