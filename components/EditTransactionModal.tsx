'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Transaction } from '../lib/types';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import { formatINR } from '../lib/utils/formatters';
import {
  X,
  Edit3,
  Calendar,
  Clock,
  Tag,
  AlignLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
} from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
}: EditTransactionModalProps) {
  const { accounts, summary, updateTransaction } = useLedger();

  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction && isOpen) {
      setAmount(transaction.amount.toString());
      setFromAccountId(transaction.from_account_id || '');
      setToAccountId(transaction.to_account_id || '');
      setCategory(transaction.category || '');
      setDate(transaction.transaction_date || '');
      setTime(transaction.transaction_time || '12:00');
      setDescription(transaction.description || '');
      setError(null);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    if (transaction.type === 'EXPENSE' && !fromAccountId) {
      setError('Please select a deducting account.');
      return;
    }
    if (transaction.type === 'INCOME' && !toAccountId) {
      setError('Please select a receiving account.');
      return;
    }
    if (transaction.type === 'TRANSFER') {
      if (!fromAccountId || !toAccountId) {
        setError('Both source and destination accounts are required.');
        return;
      }
      if (fromAccountId === toAccountId) {
        setError('Source and Destination accounts must be different.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated: Transaction = {
        ...transaction,
        amount: numAmount,
        from_account_id: transaction.type === 'INCOME' ? null : fromAccountId,
        to_account_id: transaction.type === 'EXPENSE' ? null : toAccountId,
        category,
        transaction_date: date,
        transaction_time: time,
        description,
      };

      const res = await updateTransaction(updated);
      if (res.success) {
        setIsSubmitting(false);
        onClose();
      } else {
        setError(res.error || 'Failed to update transaction.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating transaction.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const categories = transaction.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_SOURCES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Edit {transaction.type.toLowerCase()} Entry
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Updating updates all calculated balances atomically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-semibold text-zinc-400 dark:text-zinc-500">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 py-2.5 pl-8 pr-4 text-lg font-mono font-bold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                {formatINR(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Account selector(s) */}
          {transaction.type === 'EXPENSE' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Deduct From Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-sm text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {transaction.type === 'INCOME' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Deposit Into Account
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-sm text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {transaction.type === 'TRANSFER' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                  Source Account
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  Destination Account
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Category */}
          {transaction.type !== 'TRANSFER' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category / Source
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date (Asia/Kolkata)
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Time (IST)
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Note about transaction"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-950/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Changes...' : 'Update & Recalculate Balances'}
          </button>
        </form>
      </div>
    </div>
  );
}
