'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { getTodayKolkata, getCurrentTimeKolkata, formatINR } from '../lib/utils/formatters';
import {
  X,
  ArrowRightLeft,
  Calendar,
  Clock,
  AlignLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { accounts, summary, addTransfer } = useLedger();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize accounts when modal opens
  useEffect(() => {
    if (isOpen && accounts.length >= 2) {
      setFromAccountId(accounts[0].id);
      setToAccountId(accounts[1].id);
      setDate(getTodayKolkata());
      setTime(getCurrentTimeKolkata());
      setError(null);
      setSuccessNotice(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSwapAccounts = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!fromAccountId || !toAccountId) {
      setError('Both source and destination accounts are required.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('Source and Destination accounts must be different.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await addTransfer({
        amount: numAmount,
        fromAccountId,
        toAccountId,
        date,
        time,
        description,
      });

      if (res.success) {
        const fromAcc = accounts.find((a) => a.id === fromAccountId);
        const toAcc = accounts.find((a) => a.id === toAccountId);
        setSuccessNotice(
          `Successfully transferred ${formatINR(numAmount)} from ${fromAcc?.display_name} to ${toAcc?.display_name}!`
        );

        setTimeout(() => {
          setAmount('');
          setDescription('');
          setSuccessNotice(null);
          setIsSubmitting(false);
          onClose();
        }, 900);
      } else {
        setError(res.error || 'Failed to execute transfer.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing transfer. Input preserved.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Transfer Money</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Atomic two-way transfer between your accounts
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

        {/* Notices */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Transfer Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-semibold text-zinc-400 dark:text-zinc-500">
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
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 py-2.5 pl-8 pr-4 text-lg font-mono font-bold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                {formatINR(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Account Selectors with Swap Button */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-4 space-y-3 relative transition-colors">
            {/* From Account */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                Source Account (Deduct From)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2.5 px-3 text-sm text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {accounts.map((acc) => {
                  const accSummary = summary.accounts.find((a) => a.account.id === acc.id);
                  const bal = accSummary ? accSummary.calculatedBalance : acc.opening_balance;
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name} (Balance: {formatINR(bal)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwapAccounts}
                className="flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm"
              >
                <ArrowRightLeft className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>Swap Accounts</span>
              </button>
            </div>

            {/* To Account */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                Destination Account (Deposit Into)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2.5 px-3 text-sm text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {accounts.map((acc) => {
                  const accSummary = summary.accounts.find((a) => a.account.id === acc.id);
                  const bal = accSummary ? accSummary.calculatedBalance : acc.opening_balance;
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name} (Balance: {formatINR(bal)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Date and Time (Asia/Kolkata) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date (Asia/Kolkata)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-2 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Time (IST)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-2 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description / Transfer Note (Optional)
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly savings transfer"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-950/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? (
              'Processing Transfer...'
            ) : (
              <>
                <span>Execute Atomic Transfer</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
