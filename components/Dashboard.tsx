'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDisplayDate } from '../lib/utils/formatters';
import { Transaction, Account } from '../lib/types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Scale,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CloudDownload,
} from 'lucide-react';
import { TransactionHistory } from './TransactionHistory';
import { AddTransactionModal } from './AddTransactionModal';
import { TransferModal } from './TransferModal';
import { ReconciliationModal } from './ReconciliationModal';
import { EditTransactionModal } from './EditTransactionModal';
import { AddAccountModal } from './AddAccountModal';
import { UpiTeaserCard } from './UpiTeaserCard';

interface DashboardProps {
  onOpenAuth?: (prompt?: string) => void;
}

export function Dashboard({ onOpenAuth }: DashboardProps) {
  const {
    summary,
    syncStatus,
    uploadOfflineToCloud,
    linkedCloudAccount,
    deleteAccount,
    syncMessage,
    clearSyncMessage,
  } = useLedger();
  const { user, isDemoUser } = useAuth();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [reconcileTargetAccountId, setReconcileTargetAccountId] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Delete account confirmation modal state
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleOpenAddExpense = () => {
    setAddModalType('EXPENSE');
    setShowAddModal(true);
  };

  const handleOpenAddIncome = () => {
    setAddModalType('INCOME');
    setShowAddModal(true);
  };

  const handleOpenReconcile = (accountId?: string) => {
    setReconcileTargetAccountId(accountId);
    setShowReconcileModal(true);
  };

  const handleUploadToCloud = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to upload to cloud.');
      return;
    }

    const res = await uploadOfflineToCloud();
    if (res && res.requiresAuth && onOpenAuth) {
      onOpenAuth(res.message || 'Please sign in with your linked cloud account to upload offline changes.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsDeletingAccount(true);
    const targetId = accountToDelete.id;
    const targetName = accountToDelete.display_name;
    const res = await deleteAccount(targetId);
    setIsDeletingAccount(false);
    setAccountToDelete(null);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-12 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* OFFLINE MODE ONLY STATUS & WARNING BANNER */}
      {isDemoUser && (
        <div className="overflow-hidden rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 p-4 backdrop-blur-md shadow-md transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Offline Mode
                  </span>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/30">
                    Linked Cloud: {linkedCloudAccount ? linkedCloudAccount : 'None'}
                  </span>
                  {syncStatus.pendingCount > 0 ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30">
                      {syncStatus.pendingCount} Changes Pending Upload
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      Up to date with Cloud
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-1 leading-snug">
                  <strong>Warning:</strong> All offline records are stored locally in this browser. Upload to your cloud account before clearing browser history or switching devices. If you forget to upload, pending changes will be lost.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={handleUploadToCloud}
                disabled={syncStatus.isSyncing}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {syncStatus.isSyncing
                    ? 'Uploading...'
                    : syncStatus.pendingCount > 0
                    ? `Upload to Cloud (${syncStatus.pendingCount})`
                    : 'Upload to Cloud'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD SYNC CONFIRMATION TOAST */}
      {syncMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{syncMessage}</span>
          </div>
          <button
            onClick={clearSyncMessage}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}



      {/* COMBINED BALANCE & ACCOUNTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Personal Accounts</span>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {summary.accounts.length} Total
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Individual balances & combined net liquidity
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isDemoUser && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenAuth) {
                    onOpenAuth('Sign in with your Supabase account to import your cloud bank accounts into offline mode:');
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-300 dark:border-cyan-900/60 bg-cyan-50 dark:bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors shadow-sm"
              >
                <CloudDownload className="h-3.5 w-3.5" />
                <span>Import Cloud</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* TOTAL COMBINED NET LIQUIDITY */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 p-6 shadow-xl dark:shadow-2xl flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />

            <div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  Total Combined Balance
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Net Liquidity</span>
              </div>

              <div className="mt-2">
                <h3 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-mono">
                  {formatINR(summary.totalCalculatedBalance)}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Calculated sum across all {summary.accounts.length} accounts from opening dates
                </p>
              </div>
            </div>

            {/* Quick Month Savings Pill */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-100 dark:bg-zinc-900/70 p-3 border border-zinc-200 dark:border-zinc-800/80 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Net Flow This Month:</span>
              <span
                className={`font-bold font-mono ${
                  summary.monthNetSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatINR(summary.monthNetSavings, true)}
              </span>
            </div>
          </div>

          {/* DYNAMIC ACCOUNT CARDS (ALL ACCOUNTS) */}
          {summary.accounts.map((accSummary, idx) => (
            <div
              key={accSummary.account.id}
              className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-xl dark:shadow-2xl flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: accSummary.account.bank_color || '#059669' }}
                    />
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight truncate max-w-[140px]">
                      {accSummary.account.display_name}
                    </h4>
                    <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenReconcile(accSummary.account.id)}
                      title="Reconcile with bank statement"
                      className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:border-teal-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Scale className="h-3 w-3" />
                      <span>Reconcile</span>
                    </button>

                    {/* Delete Account button */}
                    <button
                      type="button"
                      onClick={() => setAccountToDelete(accSummary.account)}
                      title="Delete account"
                      className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1.5 text-zinc-400 hover:border-rose-300 dark:hover:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calculated Balance */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                    Calculated Ledger Balance
                  </span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono mt-0.5">
                    {formatINR(accSummary.calculatedBalance)}
                  </p>
                </div>

                {/* Reconciliation Status Badge */}
                <div className="mt-3 text-xs">
                  {accSummary.latestReconciliation ? (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span>Statement Check:</span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200">
                          {formatINR(accSummary.latestReconciliation.actual_bank_balance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span>Discrepancy:</span>
                        <span
                          className={`font-mono font-bold ${
                            accSummary.reconciledDifference === 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {accSummary.reconciledDifference === 0
                            ? 'Zero Difference (Balanced)'
                            : formatINR(accSummary.reconciledDifference || 0, true)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Opening Balance: {formatINR(accSummary.account.opening_balance)} (on {formatDisplayDate(accSummary.account.opening_date)})
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Internal UUID:</span>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{accSummary.account.id}</span>
              </div>
            </div>
          ))}

          {/* ADD ACCOUNT TILE */}
          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-zinc-900/40 min-h-[220px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                Add Another Account
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Bank account, cash wallet, or credit ledger
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* PROMINENT DAILY RECORDKEEPING QUICK ACTION BUTTONS */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 shadow-xl dark:shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Daily Recordkeeping</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Simple instant entry defaulted to today in India Standard Time
            </p>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono hidden sm:inline">
            Offline Preserved &bull; Duplicate Protected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* ADD EXPENSE BUTTON */}
          <button
            type="button"
            onClick={handleOpenAddExpense}
            className="group relative flex items-center gap-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/40 dark:via-zinc-900 dark:to-zinc-950 p-4 text-left shadow-md transition-all hover:border-rose-400 dark:hover:border-rose-700/80 hover:shadow-rose-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Add Expense</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Deduct money from account
              </p>
            </div>
          </button>

          {/* ADD INCOME BUTTON */}
          <button
            type="button"
            onClick={handleOpenAddIncome}
            className="group relative flex items-center gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-950 p-4 text-left shadow-md transition-all hover:border-emerald-400 dark:hover:border-emerald-700/80 hover:shadow-emerald-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Add Income</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Deposit money into account
              </p>
            </div>
          </button>

          {/* TRANSFER MONEY BUTTON */}
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="group relative flex items-center gap-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-950 p-4 text-left shadow-md transition-all hover:border-indigo-400 dark:hover:border-indigo-700/80 hover:shadow-indigo-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 group-hover:scale-105 transition-transform">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Transfer Money</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Atomic shift between accounts
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* MONTH SUMMARY STATS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-md dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span>Income This Month</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(summary.monthIncome)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-md dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span>Expenses This Month</span>
            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatINR(summary.monthExpense)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-md dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span>Net Monthly Savings</span>
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p
            className={`text-xl font-bold font-mono ${
              summary.monthNetSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatINR(summary.monthNetSavings, true)}
          </p>
        </div>
      </div>

      {/* SEARCHABLE, DATE-FILTERABLE TRANSACTION HISTORY */}
      <TransactionHistory onEditTransaction={(tx) => setEditingTransaction(tx)} />

      {/* UPI / BANK AUTO SYNC FUTURE UPDATE PREVIEW TEASER */}
      <UpiTeaserCard />

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Delete Personal Account</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Permanent account removal</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2">
              Are you sure you want to delete <strong className="font-semibold text-zinc-900 dark:text-white">"{accountToDelete.display_name}"</strong>?
              This will remove this account from your active ledger and queue a permanent deletion on Supabase cloud.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingAccount ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AddTransactionModal
        isOpen={showAddModal}
        initialType={addModalType}
        onClose={() => setShowAddModal(false)}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      <ReconciliationModal
        isOpen={showReconcileModal}
        defaultAccountId={reconcileTargetAccountId}
        onClose={() => setShowReconcileModal(false)}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
      />
    </div>
  );
}
