'use client';

import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDisplayDate, getTodayKolkata } from '../lib/utils/formatters';
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
  StickyNote,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { FinancialTrendChart } from './FinancialTrendChart';
import { TransactionHistory } from './TransactionHistory';
import { FinancialNotesSection } from './FinancialNotesSection';
import { AddTransactionModal } from './AddTransactionModal';
import { TransferModal } from './TransferModal';
import { ReconciliationModal } from './ReconciliationModal';
import { EditTransactionModal } from './EditTransactionModal';
import { AddAccountModal } from './AddAccountModal';
import { MonthlyReportModal } from './MonthlyReportModal';
import { UpiTeaserCard } from './UpiTeaserCard';

interface DashboardProps {
  onOpenAuth?: (prompt?: string) => void;
  activeTab?: DashboardTab;
  onSelectTab?: (tab: DashboardTab) => void;
}

type DashboardTab = 'overview' | 'accounts' | 'transactions' | 'notes' | 'reconcile';

export function Dashboard({ onOpenAuth, activeTab: propActiveTab, onSelectTab }: DashboardProps) {
  const {
    summary,
    accounts,
    transactions,
    notes,
    syncStatus,
    uploadOfflineToCloud,
    linkedCloudAccount,
    deleteAccount,
    addAccount,
    syncMessage,
    clearSyncMessage,
  } = useLedger();
  const { isDemoUser } = useAuth();

  // Boilerplate single account card state (for first-time/0-account users)
  // CRITICAL: Inputs start empty with placeholders only; never auto-saved until user submits!
  const [bpName, setBpName] = useState('');
  const [bpBalance, setBpBalance] = useState('');
  const [bpColor, setBpColor] = useState('#059669');
  const [bpDate, setBpDate] = useState(() => getTodayKolkata());
  const [bpSubmitting, setBpSubmitting] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);

  const handleCreateBoilerplateAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bpName.trim()) {
      setBpError('Please enter an account name (e.g. HDFC Bank, SBI, Salary)');
      return;
    }
    const balanceNum = bpBalance.trim() === '' ? 0 : parseFloat(bpBalance);
    if (isNaN(balanceNum)) {
      setBpError('Please enter a valid balance (e.g. 5000 or 0)');
      return;
    }

    setBpSubmitting(true);
    setBpError(null);
    try {
      const res = await addAccount({
        name: bpName.trim(),
        balance: balanceNum,
        color: bpColor,
        startDate: bpDate,
      });
      if (res && !res.success) {
        setBpError(res.error || 'Failed to create account');
      } else {
        setBpName('');
        setBpBalance('');
      }
    } catch (err: unknown) {
      setBpError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setBpSubmitting(false);
    }
  };

  // Active view tab (controlled from props if provided, otherwise internal)
  const [internalActiveTab, setInternalActiveTab] = useState<DashboardTab>('overview');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: DashboardTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  // Listen for external tab navigation requests (e.g. from 48-Hour Notification Center or shortcuts)
  React.useEffect(() => {
    const handleTabNav = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardTab>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('sd-navigate-tab', handleTabNav);
    window.addEventListener('sd-switch-tab', handleTabNav);
    return () => {
      window.removeEventListener('sd-navigate-tab', handleTabNav);
      window.removeEventListener('sd-switch-tab', handleTabNav);
    };
  }, []);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalMonth, setReportModalMonth] = useState<string | undefined>();
  const [dismissedReportBanner, setDismissedReportBanner] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('sd_dismissed_report_banner');
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleDismissReportBanner = (monthStr: string) => {
    setDismissedReportBanner(monthStr);
    try {
      localStorage.setItem('sd_dismissed_report_banner', monthStr);
    } catch {
      // ignore
    }
  };
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

  // Smart Start-of-Month detection for monthly report suggestion
  // Strictly loads only for 3 days from the last month: dates 1, 2, and 3
  const todayStr = useMemo(() => getTodayKolkata(), []);
  const smartReportSuggestion = useMemo(() => {
    const parts = todayStr.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;

    // Strictly trigger on dates 1, 2, and 3 of the month
    if (day >= 1 && day <= 3) {
      const prevDate = new Date(year, month - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      if (dismissedReportBanner === prevMonthStr) return null;
      const prevMonthLabel = prevDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return {
        type: 'start_of_month' as const,
        monthStr: prevMonthStr,
        label: prevMonthLabel,
        title: `${prevMonthLabel} Financial Report is Ready`,
        description: `Your monthly statement for ${prevMonthLabel} is ready to inspect. View category breakdown, savings rate, and export PDF/CSV.`,
      };
    }

    return null;
  }, [todayStr, dismissedReportBanner]);

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

      {/* SEGMENTED VIEW NAVIGATION TABS (FULL ACCESS ON ANY SCREEN WITHOUT SIDE SCROLLING) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 gap-2">
        <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
          {/* Tab 1: Overview & Trends */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-3.5 py-2 text-xs font-bold transition-all text-center ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Activity className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs">
              <span className="sm:hidden">Trends</span>
              <span className="hidden sm:inline">Overview &amp; Trends</span>
            </span>
          </button>

          {/* Tab 2: Accounts */}
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-3.5 py-2 text-xs font-bold transition-all text-center ${
              activeTab === 'accounts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs">Accounts</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono hidden md:inline-block ${
                  activeTab === 'accounts'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {accounts.length}
              </span>
            </div>
          </button>

          {/* Tab 3: Transactions */}
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-3.5 py-2 text-xs font-bold transition-all text-center ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs">
                <span className="sm:hidden">History</span>
                <span className="hidden sm:inline">Transactions</span>
              </span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono hidden md:inline-block ${
                  activeTab === 'transactions'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {transactions.filter((t) => !t.is_deleted).length}
              </span>
            </div>
          </button>

          {/* Tab 4: Notes */}
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-3.5 py-2 text-xs font-bold transition-all text-center ${
              activeTab === 'notes'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <StickyNote className="h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs">
                <span className="sm:hidden">Notes</span>
                <span className="hidden sm:inline">Notes &amp; Dues</span>
              </span>
              {notes.filter((n) => !n.is_resolved).length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono ${
                    activeTab === 'notes'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold'
                  }`}
                >
                  {notes.filter((n) => !n.is_resolved).length}
                </span>
              )}
            </div>
          </button>

          {/* Tab 5: Reconcile */}
          <button
            type="button"
            onClick={() => setActiveTab('reconcile')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-3.5 py-2 text-xs font-bold transition-all text-center ${
              activeTab === 'reconcile'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Scale className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs">Reconcile</span>
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
          {/* WELCOME / SETUP PROMPT FOR 0 ACCOUNTS */}
          {accounts.length === 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Welcome to SD-Ledger! Configure Your First Account
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-xl">
                    Get started by setting up your first bank account. No dummy accounts are ever auto-saved until you provide details and confirm.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Configure Account</span>
              </button>
            </div>
          )}

          {/* SMART END-OF-MONTH FINANCIAL REPORT PROMPT */}
          {smartReportSuggestion && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {smartReportSuggestion.title}
                    </h4>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      Smart Assistant
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {smartReportSuggestion.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReportModalMonth(smartReportSuggestion.monthStr);
                    setShowReportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissReportBanner(smartReportSuggestion.monthStr)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  title="Dismiss suggestion"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* GROWW-STYLE INTERACTIVE FINANCIAL TREND CHART */}
          <FinancialTrendChart
            accounts={accounts}
            transactions={transactions}
          />

          {/* MONTH SUMMARY STATS TILES & STATEMENT TRIGGER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Month Summary
              </span>
              <button
                type="button"
                onClick={() => {
                  setReportModalMonth(undefined);
                  setShowReportModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors py-1 px-2.5 rounded-xl border border-emerald-500/25 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Monthly Report &amp; Statements</span>
              </button>
            </div>

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
          </div>

          {/* ACTIVE DUES & STICKY NOTES GLANCE BANNER */}
          {notes.filter((n) => !n.is_resolved).length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-surface-card border border-amber-500/30 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">
                    {notes.filter((n) => !n.is_resolved).length} Pending Dues &amp; Financial Notes
                  </h4>
                  <div className="flex items-center gap-2.5 text-xs text-text-muted mt-0.5">
                    <span>
                      Receivable:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatINR(
                          notes
                            .filter((n) => !n.is_resolved && n.type === 'THEY_OWE_ME' && n.amount)
                            .reduce((s, n) => s + (n.amount || 0), 0)
                        )}
                      </strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Payable:{' '}
                      <strong className="text-rose-600 dark:text-rose-400 font-mono">
                        {formatINR(
                          notes
                            .filter((n) => !n.is_resolved && n.type === 'I_OWE_THEM' && n.amount)
                            .reduce((s, n) => s + (n.amount || 0), 0)
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all self-end sm:self-center"
              >
                <span>View &amp; Settle Dues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* PROMINENT DAILY RECORDKEEPING QUICK ACTION BUTTONS (Hidden on mobile as it's in bottom dock) */}
          <div className="hidden sm:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-lg dark:shadow-xl">
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

          {/* ACCOUNTS DISPLAY (Mobile: Apple Wallet-style Horizontal Swipe Carousel; Desktop: Multi-column Grid) */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 -mx-4 px-4 no-scrollbar md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {/* TOTAL COMBINED NET LIQUIDITY CARD */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 p-5 shadow-lg flex flex-col justify-between w-[84vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink">
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

            {/* SINGLE ACCOUNT BOILERPLATE CARD WITH PLUS ICON (ONLY PLACEHOLDERS, NEVER AUTO-SAVED) */}
            {accounts.length === 0 && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-emerald-400/80 dark:border-emerald-600/80 bg-white/95 dark:bg-zinc-950/95 p-5 shadow-xl transition-all md:col-span-2 flex flex-col justify-between w-[84vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink">
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full shrink-0 shadow-sm transition-colors ring-2 ring-emerald-500/30"
                        style={{ backgroundColor: bpColor }}
                      />
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
                        Account Boilerplate
                      </h4>
                      <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                        Setup Boilerplate
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Inputs are placeholders only • Never saved until you click +
                    </span>
                  </div>

                  <form onSubmit={handleCreateBoilerplateAccount} className="space-y-3.5 mt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                        Bank / Account Name
                      </label>
                      <input
                        type="text"
                        value={bpName}
                        onChange={(e) => {
                          setBpName(e.target.value);
                          if (bpError) setBpError(null);
                        }}
                        placeholder="e.g. HDFC Bank, SBI, Salary, Cash..."
                        className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                          Opening Balance
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                          <input
                            type="number"
                            step="any"
                            value={bpBalance}
                            onChange={(e) => {
                              setBpBalance(e.target.value);
                              if (bpError) setBpError(null);
                            }}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-8 pr-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                          Account Color Theme
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          {['#059669', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#db2777'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBpColor(c)}
                              className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                                bpColor === c ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110 opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {bpError && (
                      <p className="text-[11px] text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                        {bpError}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-zinc-400">
                        Safe: Zero boilerplate data saved to cloud until manually added
                      </span>
                      <button
                        type="submit"
                        disabled={bpSubmitting}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{bpSubmitting ? 'Saving...' : 'Add Account'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* DYNAMIC COMPACT ACCOUNT CARDS (NO RAW UUIDS, SLEEK FINTECH DESIGN) */}
            {summary.accounts.map((accSummary, idx) => (
              <div
                key={accSummary.account.id}
                className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-lg flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700 w-[84vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink"
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
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-zinc-900/40 min-h-[190px] w-[65vw] max-w-[240px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink"
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

          {/* Mobile Swipe Hint */}
          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-400 md:hidden w-full">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Swipe cards horizontally &bull; {summary.accounts.length} accounts</span>
          </div>
        </div>
      )}

      {/* TAB 3: FULL TRANSACTIONS VIEW */}
      {activeTab === 'transactions' && (
        <div className="animate-in fade-in duration-200">
          <TransactionHistory
            onEditTransaction={(tx) => setEditingTransaction(tx)}
            onOpenMonthlyReport={() => {
              setReportModalMonth(undefined);
              setShowReportModal(true);
            }}
          />
        </div>
      )}

      {/* TAB 4: FINANCIAL STICKY NOTES & FRIEND DUES VIEW */}
      {activeTab === 'notes' && (
        <div className="animate-in fade-in duration-200">
          <FinancialNotesSection />
        </div>
      )}

      {/* TAB 5: RECONCILIATION AUDIT VIEW */}
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

      <MonthlyReportModal
        isOpen={showReportModal}
        initialMonth={reportModalMonth}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
