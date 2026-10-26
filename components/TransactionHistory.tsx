'use client';

import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Transaction } from '../lib/types';
import { formatINR, formatDisplayDate, formatDisplayDateTime, getTodayKolkata } from '../lib/utils/formatters';
import {
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Building2,
  CloudCheck,
  CloudOff,
  CheckCircle2,
  Clock,
  Tag,
  DollarSign,
  Download,
} from 'lucide-react';

interface TransactionHistoryProps {
  onEditTransaction: (tx: Transaction) => void;
}

type DateFilterPreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
type TypeFilter = 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER';

export function TransactionHistory({ onEditTransaction }: TransactionHistoryProps) {
  const { transactions, accounts, deleteTransaction, exportCSV } = useLedger();

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  // Modal states
  const [inspectTx, setInspectTx] = useState<Transaction | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map of account id -> display name
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.display_name));
    return map;
  }, [accounts]);

  const [todayStr, setTodayStr] = useState('');

  React.useEffect(() => {
    setTodayStr(getTodayKolkata());
  }, []);

  // Compute date ranges
  const dateRangeBounds = useMemo(() => {
    if (!todayStr) return { start: '', end: '' };
    const today = todayStr; // YYYY-MM-DD
    const todayDate = new Date();

    if (datePreset === 'today') {
      return { start: today, end: today };
    }
    if (datePreset === 'yesterday') {
      const y = new Date(todayDate);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (datePreset === 'this_week') {
      const d = new Date(todayDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { start: monday.toISOString().split('T')[0], end: today };
    }
    if (datePreset === 'this_month') {
      const monthPrefix = today.substring(0, 7);
      return { start: `${monthPrefix}-01`, end: today };
    }
    if (datePreset === 'last_month') {
      const prev = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
      const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
      return {
        start: prev.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0],
      };
    }
    if (datePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '', end: '' }; // 'all'
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.is_deleted) return false;

      // Type filter
      if (typeFilter !== 'ALL' && t.type !== typeFilter) {
        return false;
      }

      // Account filter
      if (accountFilter !== 'ALL') {
        const matchesFrom = t.from_account_id === accountFilter;
        const matchesTo = t.to_account_id === accountFilter;
        if (!matchesFrom && !matchesTo) return false;
      }

      // Date range filter
      if (dateRangeBounds.start && t.transaction_date < dateRangeBounds.start) {
        return false;
      }
      if (dateRangeBounds.end && t.transaction_date > dateRangeBounds.end) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fromName = t.from_account_id ? accountMap.get(t.from_account_id)?.toLowerCase() || '' : '';
        const toName = t.to_account_id ? accountMap.get(t.to_account_id)?.toLowerCase() || '' : '';
        const desc = (t.description || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const amtStr = t.amount.toString();

        if (
          !fromName.includes(query) &&
          !toName.includes(query) &&
          !desc.includes(query) &&
          !cat.includes(query) &&
          !amtStr.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, accountFilter, dateRangeBounds, searchTerm, accountMap]);

  // Calculations for filtered range
  const filteredStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfers = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'INCOME') income += t.amount;
      if (t.type === 'EXPENSE') expense += t.amount;
      if (t.type === 'TRANSFER') transfers += t.amount;
    }

    return { income, expense, transfers, count: filteredTransactions.length };
  }, [filteredTransactions]);

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetTx) return;
    setIsDeleting(true);
    await deleteTransaction(deleteTargetTx.id);
    setIsDeleting(false);
    setDeleteTargetTx(null);
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Transaction Ledger & History</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
              {filteredStats.count} entries
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Complete searchable history with atomic updates across calculated balances
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-1.5 self-start sm:self-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-emerald-500/50 hover:bg-zinc-800 hover:text-white transition-all shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-emerald-400" />
          <span>Export Filtered to CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-4 space-y-3">
        {/* Row 1: Search Bar & Account Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by note, category, account, or amount..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Type Filter Chips & Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type filters */}
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs font-medium">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                typeFilter === 'EXPENSE'
                  ? 'bg-rose-600/30 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-3 w-3 text-rose-400" />
              Expenses
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                typeFilter === 'INCOME'
                  ? 'bg-emerald-600/30 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
              Income
            </button>
            <button
              onClick={() => setTypeFilter('TRANSFER')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                typeFilter === 'TRANSFER'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="h-3 w-3 text-indigo-400" />
              Transfers
            </button>
          </div>

          {/* Date presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500 hidden md:inline">Date:</span>
            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === p.id
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Row */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* Filter Summary Stats Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 text-[11px] block">Period Expenses</span>
              <span className="text-rose-400 font-bold font-mono">
                {formatINR(filteredStats.expense)}
              </span>
            </div>
            <div className="border-l border-zinc-800 pl-4">
              <span className="text-zinc-500 text-[11px] block">Period Income</span>
              <span className="text-emerald-400 font-bold font-mono">
                {formatINR(filteredStats.income)}
              </span>
            </div>
            <div className="border-l border-zinc-800 pl-4">
              <span className="text-zinc-500 text-[11px] block">Transfers</span>
              <span className="text-indigo-400 font-bold font-mono">
                {formatINR(filteredStats.transfers)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-zinc-500 text-[11px] block">Net Period Flow</span>
            <span
              className={`font-bold font-mono ${
                filteredStats.income - filteredStats.expense >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {formatINR(filteredStats.income - filteredStats.expense, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="mt-5 space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 mb-3">
              <Filter className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">
              No transactions found
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              No records match your selected filters or search query. Try expanding your date range or clearing search.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const fromName = tx.from_account_id ? accountMap.get(tx.from_account_id) || 'Account' : '';
            const toName = tx.to_account_id ? accountMap.get(tx.to_account_id) || 'Account' : '';

            return (
              <div
                key={tx.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-850 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900"
              >
                {/* Left: Icon, Details, and Accounts */}
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Type Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 ${
                      tx.type === 'EXPENSE'
                        ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                        : tx.type === 'INCOME'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
                    }`}
                  >
                    {tx.type === 'EXPENSE' && <ArrowUpRight className="h-5 w-5" />}
                    {tx.type === 'INCOME' && <ArrowDownLeft className="h-5 w-5" />}
                    {tx.type === 'TRANSFER' && <ArrowRightLeft className="h-5 w-5" />}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {tx.type === 'TRANSFER' ? 'Account Transfer' : tx.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          tx.type === 'EXPENSE'
                            ? 'bg-rose-500/10 text-rose-400'
                            : tx.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>

                    {/* Account relationship */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                      <Building2 className="h-3 w-3 text-zinc-500" />
                      {tx.type === 'EXPENSE' && <span>Deducted from <strong className="text-zinc-200">{fromName}</strong></span>}
                      {tx.type === 'INCOME' && <span>Deposited into <strong className="text-zinc-200">{toName}</strong></span>}
                      {tx.type === 'TRANSFER' && (
                        <span>
                          <strong className="text-zinc-200">{fromName}</strong> &rarr;{' '}
                          <strong className="text-zinc-200">{toName}</strong>
                        </span>
                      )}
                    </div>

                    {/* Description & Date */}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                      <span>{formatDisplayDate(tx.transaction_date)} {tx.transaction_time || ''}</span>
                      {tx.description && (
                        <span className="truncate max-w-[200px] sm:max-w-xs text-zinc-400 italic">
                          &ldquo;{tx.description}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                  <div className="text-left sm:text-right">
                    <span
                      className={`text-base font-bold font-mono ${
                        tx.type === 'EXPENSE'
                          ? 'text-rose-400'
                          : tx.type === 'INCOME'
                          ? 'text-emerald-400'
                          : 'text-indigo-300'
                      }`}
                    >
                      {tx.type === 'EXPENSE' && '- '}
                      {tx.type === 'INCOME' && '+ '}
                      {formatINR(tx.amount)}
                    </span>
                    <div className="flex items-center gap-1 justify-start sm:justify-end text-[10px] text-zinc-500">
                      {tx.sync_status === 'pending' ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <CloudOff className="h-3 w-3" /> Offline Cached
                        </span>
                      ) : (
                        <span className="text-emerald-500/80 flex items-center gap-1">
                          <CloudCheck className="h-3 w-3" /> Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (Inspect, Edit, Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectTx(tx)}
                      title="Inspect Entry"
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditTransaction(tx)}
                      title="Edit Entry"
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-indigo-400 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetTx(tx)}
                      title="Delete Entry"
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INSPECT DETAILS MODAL */}
      {inspectTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                Transaction Inspection
              </h3>
              <button
                onClick={() => setInspectTx(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Transaction ID (UUID):</span>
                <span className="font-mono text-zinc-300 text-[11px]">{inspectTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Type:</span>
                <span className="font-bold text-white">{inspectTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Amount:</span>
                <span className="font-mono font-bold text-emerald-400">{formatINR(inspectTx.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Category / Source:</span>
                <span className="text-white">{inspectTx.category}</span>
              </div>
              {inspectTx.from_account_id && (
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Deducted From:</span>
                  <span className="text-white font-medium">{accountMap.get(inspectTx.from_account_id)}</span>
                </div>
              )}
              {inspectTx.to_account_id && (
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Deposited To:</span>
                  <span className="text-white font-medium">{accountMap.get(inspectTx.to_account_id)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Transaction Date:</span>
                <span className="text-white">{formatDisplayDate(inspectTx.transaction_date)} at {inspectTx.transaction_time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Entry Created At:</span>
                <span className="text-white">{formatDisplayDateTime(inspectTx.created_at)}</span>
              </div>
              {inspectTx.description && (
                <div className="py-1">
                  <span className="text-zinc-500 block mb-1">Description:</span>
                  <p className="rounded-lg bg-zinc-900 p-2.5 text-zinc-300 italic">
                    &ldquo;{inspectTx.description}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectTx(null)}
              className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-rose-900/60 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/60 border border-rose-900/80">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Transaction?</h3>
                <p className="text-xs text-rose-300/80">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete this {deleteTargetTx.type.toLowerCase()} of{' '}
              <strong className="text-white font-mono">{formatINR(deleteTargetTx.amount)}</strong>?
              Calculated balances for affected accounts will be atomically updated.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetTx(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
