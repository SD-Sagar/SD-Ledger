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
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CloudDownload,
  Activity,
  History,
  ArrowRight,
  Check,
  Building2,
} from 'lucide-react';
import { FinancialTrendChart } from './FinancialTrendChart';
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

type DashboardTab = 'overview' | 'accounts' | 'transactions' | 'reconcile';

export function Dashboard({ onOpenAuth }: DashboardProps) {
  const {
    summary,
    accounts,
    transactions,
    syncStatus,
    uploadOfflineToCloud,
    linkedCloudAccount,
    deleteAccount,
    syncMessage,
    clearSyncMessage,
  } = useLedger();
  const { isDemoUser } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

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
    await deleteAccount(targetId);
    setIsDeletingAccount(false);
    setAccountToDelete(null);
  };

  // Recent 5 transactions for the Overview tab preview
  const recentTransactions = React.useMemo(() => {
    return transactions
      .filter((t) => !t.is_deleted)
      .slice(0, 5);
  }, [transactions]);

  // Account map for display names
  const accountMap = React.useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.display_name));
    return map;
  }, [accounts]);

  return (
    <div className="space-y-5 pb-20 sm:pb-12 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
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
                  <strong>Warning:</strong> All offline records are stored locally in this browser. Upload to your cloud account before clearing browser history or switching devices.
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
                    ? `Upload (${syncStatus.pendingCount})`
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

      {/* SEGMENTED VIEW NAVIGATION TABS (PREVENTS ENDLESS VERTICAL SCROLL) */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Overview &amp; Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'accounts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Accounts</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeTab === 'accounts'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {accounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Transactions</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeTab === 'transactions'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {transactions.filter((t) => !t.is_deleted).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reconcile')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'reconcile'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Reconcile</span>
          </button>
        </div>

        {/* Quick Quick-Action Trigger in Header */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAddExpense}
            className="flex items-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddIncome}
            className="flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Income</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & GROWW STOCK MARKET CHART */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* GROWW-STYLE INTERACTIVE FINANCIAL TREND CHART */}
          <FinancialTrendChart
            accounts={accounts}
            transactions={transactions}
          />

          {/* MONTH SUMMARY STATS TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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

          {/* PROMINENT DAILY RECORDKEEPING QUICK ACTION BUTTONS */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Daily Recordkeeping</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Instant entry defaulted to today in India Standard Time
                </p>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono hidden sm:inline">
                Offline Preserved &bull; Duplicate Protected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ADD EXPENSE BUTTON */}
              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="group relative flex items-center gap-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/60 via-white to-white dark:from-rose-950/30 dark:via-zinc-900 dark:to-zinc-950 p-3 text-left shadow-sm transition-all hover:border-rose-400 dark:hover:border-rose-700/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30 group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Add Expense</span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Deduct money from account</p>
                </div>
              </button>

              {/* ADD INCOME BUTTON */}
              <button
                type="button"
                onClick={handleOpenAddIncome}
                className="group relative flex items-center gap-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/30 dark:via-zinc-900 dark:to-zinc-950 p-3 text-left shadow-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-700/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Add Income</span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Deposit money into account</p>
                </div>
              </button>

              {/* TRANSFER MONEY BUTTON */}
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="group relative flex items-center gap-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950 p-3 text-left shadow-sm transition-all hover:border-indigo-400 dark:hover:border-indigo-700/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30 group-hover:scale-105 transition-transform">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Transfer Money</span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Atomic shift between accounts</p>
                </div>
              </button>
            </div>
          </div>

          {/* RECENT TRANSACTIONS PREVIEW CARD */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Activity</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Latest recorded operations</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
              >
                <span>View all {transactions.filter((t) => !t.is_deleted).length} entries</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => {
                  const fromName = tx.from_account_id ? accountMap.get(tx.from_account_id) || 'Account' : '';
                  const toName = tx.to_account_id ? accountMap.get(tx.to_account_id) || 'Account' : '';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            tx.type === 'EXPENSE'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : tx.type === 'INCOME'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'EXPENSE' && <ArrowUpRight className="h-4 w-4" />}
                          {tx.type === 'INCOME' && <ArrowDownLeft className="h-4 w-4" />}
                          {tx.type === 'TRANSFER' && <ArrowRightLeft className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {tx.type === 'TRANSFER' ? 'Transfer' : tx.category}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {tx.type === 'EXPENSE' && `From ${fromName}`}
                            {tx.type === 'INCOME' && `Into ${toName}`}
                            {tx.type === 'TRANSFER' && `${fromName} → ${toName}`}
                            {' • '}{formatDisplayDate(tx.transaction_date)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold font-mono ${
                            tx.type === 'EXPENSE'
                              ? 'text-rose-600 dark:text-rose-400'
                              : tx.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-indigo-600 dark:text-indigo-300'
                          }`}
                        >
                          {tx.type === 'EXPENSE' && '- '}
                          {tx.type === 'INCOME' && '+ '}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* UPI TEASER CARD */}
          <UpiTeaserCard />
        </div>
      )}

      {/* TAB 2: ACCOUNTS (COMPACT FINTECH CARDS WITHOUT RAW UUIDs) */}
      {activeTab === 'accounts' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal Bank Accounts</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Individual balances, bank statements, and net liquidity
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
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TOTAL COMBINED NET LIQUIDITY CARD */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 p-5 shadow-lg flex flex-col justify-between">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-xl" />

              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    Combined Net Balance
                  </span>
                  <span className="text-[10px] text-zinc-400">Total Net</span>
                </div>

                <div className="mt-2">
                  <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-mono">
                    {formatINR(summary.totalCalculatedBalance)}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Calculated sum across {summary.accounts.length} active personal accounts
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-900/80 p-2.5 border border-zinc-200 dark:border-zinc-800 text-xs">
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

            {/* DYNAMIC COMPACT ACCOUNT CARDS (NO RAW UUIDS, SLEEK FINTECH DESIGN) */}
            {summary.accounts.map((accSummary, idx) => (
              <div
                key={accSummary.account.id}
                className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-lg flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: accSummary.account.bank_color || '#059669' }}
                      />
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight truncate max-w-[150px]">
                        {accSummary.account.display_name}
                      </h4>
                      <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenReconcile(accSummary.account.id)}
                        title="Reconcile with bank statement"
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:border-teal-400 transition-colors"
                      >
                        <Scale className="h-3 w-3" />
                        <span>Reconcile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountToDelete(accSummary.account)}
                        title="Delete account"
                        className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1.5 text-zinc-400 hover:border-rose-300 dark:hover:border-rose-900/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Calculated Balance */}
                  <div className="mt-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                      Calculated Ledger Balance
                    </span>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono mt-0.5">
                      {formatINR(accSummary.calculatedBalance)}
                    </p>
                  </div>

                  {/* Statement Reconciliation Status Pill */}
                  <div className="mt-3 text-xs">
                    {accSummary.latestReconciliation ? (
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 text-[11px]">
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

                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-900 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Opened on {formatDisplayDate(accSummary.account.opening_date)}</span>
                  <span className="font-mono text-zinc-500">₹{accSummary.account.opening_balance.toFixed(2)}</span>
                </div>
              </div>
            ))}

            {/* ADD ACCOUNT TILE */}
            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-zinc-900/40 min-h-[190px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Add Another Account
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Bank, cash wallet, or credit ledger
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FULL TRANSACTIONS VIEW */}
      {activeTab === 'transactions' && (
        <div className="animate-in fade-in duration-200">
          <TransactionHistory onEditTransaction={(tx) => setEditingTransaction(tx)} />
        </div>
      )}

      {/* TAB 4: RECONCILIATION AUDIT VIEW */}
      {activeTab === 'reconcile' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/30">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Bank Statement Reconciliation</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Compare your physical bank passbook or netbanking statement with your calculated ledger balance to detect discrepancies and missed charges.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.accounts.map((accSummary) => (
              <div
                key={accSummary.account.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: accSummary.account.bank_color || '#059669' }}
                      />
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {accSummary.account.display_name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReconcile(accSummary.account.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      <span>Reconcile Now</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Ledger Balance</span>
                      <span className="font-bold font-mono text-zinc-900 dark:text-white text-sm">
                        {formatINR(accSummary.calculatedBalance)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block">Statement Check</span>
                      <span className="font-bold font-mono text-zinc-900 dark:text-white text-sm">
                        {accSummary.latestReconciliation
                          ? formatINR(accSummary.latestReconciliation.actual_bank_balance)
                          : 'Not checked yet'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Discrepancy Status:</span>
                    {accSummary.latestReconciliation ? (
                      <span
                        className={`font-mono font-bold flex items-center gap-1 ${
                          accSummary.reconciledDifference === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {accSummary.reconciledDifference === 0 ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Balanced (₹0.00 diff)
                          </>
                        ) : (
                          formatINR(accSummary.reconciledDifference || 0, true)
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">No reconciliation recorded</span>
                    )}
                  </div>
                </div>

                {accSummary.latestReconciliation && (
                  <p className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-400">
                    Last reconciled on {accSummary.latestReconciliation.reconciled_date}
                    {accSummary.latestReconciliation.notes && ` • "${accSummary.latestReconciliation.notes}"`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
              This will remove this account from your active ledger.
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
