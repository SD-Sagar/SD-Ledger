'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import { getTodayKolkata, getCurrentTimeKolkata, formatINR } from '../lib/utils/formatters';
import {
  X,
  PlusCircle,
  MinusCircle,
  Calendar,
  Clock,
  Tag,
  AlignLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  initialType?: 'EXPENSE' | 'INCOME';
  onClose: () => void;
}

export function AddTransactionModal({
  isOpen,
  initialType = 'EXPENSE',
  onClose,
}: AddTransactionModalProps) {
  const { accounts, summary, addExpense, addIncome } = useLedger();

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(initialType);
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync initial type and default account when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
      setDate(getTodayKolkata());
      setTime(getCurrentTimeKolkata());
      setError(null);
      setSuccessNotice(null);

      // Set default category
      if (initialType === 'EXPENSE') {
        setCategory(EXPENSE_CATEGORIES[0].id);
      } else {
        setCategory(INCOME_SOURCES[0].id);
      }
    }
  }, [isOpen, initialType, accounts, selectedAccountId]);

  // Handle Type switch
  const handleTypeChange = (newType: 'EXPENSE' | 'INCOME') => {
    setType(newType);
    setError(null);
    if (newType === 'EXPENSE') {
      setCategory(EXPENSE_CATEGORIES[0].id);
    } else {
      setCategory(INCOME_SOURCES[0].id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    if (!category) {
      setError('Please select a category or source.');
      return;
    }

    setIsSubmitting(true);

    try {
      let res;
      if (type === 'EXPENSE') {
        res = await addExpense({
          amount: numAmount,
          fromAccountId: selectedAccountId,
          category,
          date,
          time,
          description,
        });
      } else {
        res = await addIncome({
          amount: numAmount,
          toAccountId: selectedAccountId,
          category,
          date,
          time,
          description,
        });
      }

      if (res.success) {
        setSuccessNotice(
          `${type === 'EXPENSE' ? 'Expense' : 'Income'} of ${formatINR(numAmount)} saved successfully!`
        );
        // Reset form inputs after confirmed success
        setTimeout(() => {
          setAmount('');
          setDescription('');
          setSuccessNotice(null);
          setIsSubmitting(false);
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Failed to save transaction.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network / storage error. Your inputs are preserved.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_SOURCES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {type === 'EXPENSE' ? (
              <MinusCircle className="h-5 w-5 text-rose-400" />
            ) : (
              <PlusCircle className="h-5 w-5 text-emerald-400" />
            )}
            <h2 className="text-lg font-semibold text-white">
              {type === 'EXPENSE' ? 'Record New Expense' : 'Record New Income'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 mt-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors ${
              type === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MinusCircle className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors ${
              type === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Income</span>
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-semibold text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2.5 pl-8 pr-4 text-lg font-mono font-bold text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="mt-1 text-xs text-emerald-400 font-mono">
                {formatINR(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Account Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {type === 'EXPENSE' ? 'Deduct From Account' : 'Deposit Into Account'}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {accounts.map((acc) => {
                  const accSummary = summary.accounts.find((a) => a.account.id === acc.id);
                  const bal = accSummary ? accSummary.calculatedBalance : acc.opening_balance;
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name} (Current Balance: {formatINR(bal)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {type === 'EXPENSE' ? 'Expense Category' : 'Income Source'}
            </label>
            <div className="relative mb-2">
              <Tag className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Choose below or type custom"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    category === c.id
                      ? type === 'EXPENSE'
                        ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500'
                        : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time Pickers (Asia/Kolkata defaulted) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Date (Asia/Kolkata)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-2 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Time (IST)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-2 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Description / Notes (Optional)
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Swiggy dinner with friends"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-xl transition-all disabled:opacity-50 ${
              type === 'EXPENSE'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
            }`}
          >
            {isSubmitting
              ? 'Saving Transaction...'
              : type === 'EXPENSE'
              ? 'Confirm & Save Expense'
              : 'Confirm & Save Income'}
          </button>
        </form>
      </div>
    </div>
  );
}
