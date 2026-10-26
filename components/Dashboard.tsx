'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDisplayDate } from '../lib/utils/formatters';
import { Transaction } from '../lib/types';
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  Scale,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudCheck,
  CloudOff,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { TransactionHistory } from './TransactionHistory';
import { AddTransactionModal } from './AddTransactionModal';
import { TransferModal } from './TransferModal';
import { ReconciliationModal } from './ReconciliationModal';
import { EditTransactionModal } from './EditTransactionModal';
import { AddAccountModal } from './AddAccountModal';
import { UpiTeaserCard } from './UpiTeaserCard';

export function Dashboard() {
  const {
    accounts,
    summary,
    syncStatus,
    triggerSync,
    hasOfflineDataToMigrate,
    migrateDemoDataToCloud,
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
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

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

  const handleMigrateOfflineData = async () => {
    if (!user) return;
    setIsMigrating(true);
    const res = await migrateDemoDataToCloud(user.id);
    setIsMigrating(false);
    if (res.success) {
      setMigrationSuccess(`Successfully uploaded ${res.count} offline records into your cloud account!`);
      setTimeout(() => setMigrationSuccess(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-12">
      {/* SYNC & CONNECTIVITY STATUS BANNER */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 sm:p-4 backdrop-blur-md shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                syncStatus.isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
              }`}
            >
              {syncStatus.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {syncStatus.isOnline ? 'Online Engine Connected' : 'Offline Mode Active'}
                </span>
                {syncStatus.pendingCount > 0 ? (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-inset ring-amber-500/30">
                    {syncStatus.pendingCount} Changes Pending Cloud Sync
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                    All Entries Synced
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {syncStatus.lastSyncedAt
                  ? `Last verified with cloud: ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('en-IN')}`
                  : 'Operating locally in high-speed IndexedDB'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {syncStatus.errorMessage && (
              <span className="text-[11px] text-rose-400 truncate max-w-xs">
                {syncStatus.errorMessage}
              </span>
            )}
            <button
              onClick={() => triggerSync()}
              disabled={syncStatus.isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 shadow-sm transition-all hover:bg-emerald-900/60 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-emerald-400 ${
                  syncStatus.isSyncing ? 'animate-spin' : ''
                }`}
              />
              <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CLOUD SYNC CONFIRMATION TOAST */}
      {syncMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{syncMessage}</span>
          </div>
          <button
            onClick={clearSyncMessage}
            className="rounded-lg p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* OFFLINE DATA DETECTED / MIGRATION TO CLOUD BANNER */}
      {hasOfflineDataToMigrate && user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/30 p-4 text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Offline Local Entries Detected</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                You have accounts and transactions recorded while offline in Demo mode. Would you like to upload and merge them with your Supabase cloud account?
              </p>
            </div>
          </div>
          <button
            onClick={handleMigrateOfflineData}
            disabled={isMigrating}
            className="flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
            <span>{isMigrating ? 'Syncing...' : 'Sync Offline Data to Cloud'}</span>
          </button>
        </div>
      )}

      {migrationSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{migrationSuccess}</span>
        </div>
      )}

      {/* COMBINED BALANCE & ACCOUNTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Personal Accounts</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
                {summary.accounts.length} Total
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Individual balances & combined net liquidity
            </p>
          </div>

          {/* Add Account Button */}
          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* TOTAL COMBINED NET LIQUIDITY */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-6 shadow-2xl flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />

            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  Total Combined Balance
                </span>
                <span className="text-[10px] text-zinc-500">Net Liquidity</span>
              </div>

              <div className="mt-2">
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                  {formatINR(summary.totalCalculatedBalance)}
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Calculated sum across all {summary.accounts.length} accounts from opening dates
                </p>
              </div>
            </div>

            {/* Quick Month Savings Pill */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-900/70 p-3 border border-zinc-800/80 text-xs">
              <span className="text-zinc-400">Net Flow This Month:</span>
              <span
                className={`font-bold font-mono ${
                  summary.monthNetSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
              className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col justify-between transition-all hover:border-zinc-700"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: accSummary.account.bank_color || '#059669' }}
                    />
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {accSummary.account.display_name}
                    </h4>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                      Account #{idx + 1}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReconcile(accSummary.account.id)}
                    title="Reconcile with bank statement"
                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-teal-400 hover:border-teal-500/50 hover:bg-zinc-800 transition-colors"
                  >
                    <Scale className="h-3 w-3" />
                    <span>Reconcile</span>
                  </button>
                </div>

                {/* Calculated Balance */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                    Calculated Ledger Balance
                  </span>
                  <p className="text-2xl font-bold text-white font-mono mt-0.5">
                    {formatINR(accSummary.calculatedBalance)}
                  </p>
                </div>

                {/* Reconciliation Status Badge */}
                <div className="mt-3 text-xs">
                  {accSummary.latestReconciliation ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Statement Check:</span>
                        <span className="font-mono text-zinc-200">
                          {formatINR(accSummary.latestReconciliation.actual_bank_balance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span>Discrepancy:</span>
                        <span
                          className={`font-mono font-bold ${
                            accSummary.reconciledDifference === 0
                              ? 'text-emerald-400'
                              : 'text-amber-400'
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

              <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Internal UUID:</span>
                <span className="font-mono text-zinc-400 truncate max-w-[120px]">{accSummary.account.id}</span>
              </div>
            </div>
          ))}

          {/* ADD ACCOUNT TILE */}
          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 text-center transition-all hover:border-emerald-500/50 hover:bg-zinc-900/40 min-h-[220px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                Add Another Account
              </span>
              <span className="text-xs text-zinc-400">
                Bank account, cash wallet, or credit ledger
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* PROMINENT DAILY RECORDKEEPING QUICK ACTION BUTTONS */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Daily Recordkeeping</h3>
            <p className="text-xs text-zinc-400">
              Simple instant entry defaulted to today in India Standard Time
            </p>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono hidden sm:inline">
            Offline Preserved &bull; Duplicate Protected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* ADD EXPENSE BUTTON */}
          <button
            type="button"
            onClick={handleOpenAddExpense}
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-rose-900/40 bg-gradient-to-r from-rose-950/60 to-zinc-950 p-4 transition-all hover:scale-[1.02] hover:border-rose-500/60 hover:shadow-xl hover:shadow-rose-950/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-950">
                <MinusCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-white block">
                  Add Expense
                </span>
                <span className="text-xs text-rose-300/80">
                  Deduct from account
                </span>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-rose-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* ADD INCOME BUTTON */}
          <button
            type="button"
            onClick={handleOpenAddIncome}
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-r from-emerald-950/60 to-zinc-950 p-4 transition-all hover:scale-[1.02] hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-950/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-950">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-white block">
                  Add Income
                </span>
                <span className="text-xs text-emerald-300/80">
                  Deposit to account
                </span>
              </div>
            </div>
            <ArrowDownLeft className="h-5 w-5 text-emerald-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
          </button>

          {/* TRANSFER MONEY BUTTON */}
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/60 to-zinc-950 p-4 transition-all hover:scale-[1.02] hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-950/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-950">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-white block">
                  Transfer Money
                </span>
                <span className="text-xs text-indigo-300/80">
                  Atomic two-way update
                </span>
              </div>
            </div>
            <ArrowRightLeft className="h-5 w-5 text-indigo-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* MONTHLY METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Income This Month</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono">
            {formatINR(summary.monthIncome)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Expenses This Month</span>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-400 font-mono">
            {formatINR(summary.monthExpense)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Net Monthly Savings</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <p
            className={`text-xl font-bold font-mono ${
              summary.monthNetSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
