'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatINR, getTodayKolkata } from '../lib/utils/formatters';
import {
  X,
  Scale,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ReconciliationModalProps {
  isOpen: boolean;
  defaultAccountId?: string;
  onClose: () => void;
}

export function ReconciliationModal({
  isOpen,
  defaultAccountId,
  onClose,
}: ReconciliationModalProps) {
  const { accounts, summary, reconcileAccount } = useLedger();

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultAccountId) {
        setSelectedAccountId(defaultAccountId);
      } else if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
      setError(null);
      setSuccessNotice(null);
    }
  }, [isOpen, defaultAccountId, accounts, selectedAccountId]);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);
  const accountSummary = summary.accounts.find((a) => a.account.id === selectedAccountId);
  const calculatedBalance = accountSummary ? accountSummary.calculatedBalance : 0;

  const enteredActual = parseFloat(actualBalanceInput);
  const hasEnteredValidActual = !isNaN(enteredActual);
  const difference = hasEnteredValidActual ? Math.round((enteredActual - calculatedBalance) * 100) / 100 : 0;
  const isMatch = hasEnteredValidActual && difference === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAccountId) {
      setError('Please select an account to reconcile.');
      return;
    }

    if (isNaN(enteredActual)) {
      setError('Please enter a valid actual bank balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reconcileAccount(selectedAccountId, enteredActual, notes);
      if (res.success) {
        setSuccessNotice('Account reconciled and checkpoint saved successfully!');
        setTimeout(() => {
          setSuccessNotice(null);
          setIsSubmitting(false);
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Failed to save reconciliation.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save reconciliation.';
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Bank Balance Reconciliation</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Compare calculated ledger balance with your official bank statement
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
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
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
          {/* Account Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Select Account to Reconcile
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setActualBalanceInput('');
                }}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-white focus:border-teal-500 focus:outline-none transition-colors"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side by Side Balances Comparison Card */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 transition-colors">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                Calculated Ledger Balance
              </span>
              <p className="mt-1 text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {formatINR(calculatedBalance)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                From all recorded entries
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 mb-1">
                Actual Statement Balance
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-1.5 pl-6 pr-2 text-sm font-bold font-mono text-zinc-900 dark:text-white focus:border-teal-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                As seen on bank app today
              </p>
            </div>
          </div>

          {/* Live Discrepancy Indicator */}
          {hasEnteredValidActual && (
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isMatch
                  ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMatch ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {isMatch ? 'Perfect Match' : 'Discrepancy Detected'}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {isMatch
                        ? 'Your ledger perfectly mirrors your actual bank account!'
                        : difference > 0
                        ? `Bank has ${formatINR(difference)} more than recorded in ledger.`
                        : `Ledger has ${formatINR(Math.abs(difference))} more than bank statement.`}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-sm">
                  {difference === 0 ? '₹ 0.00' : formatINR(difference, true)}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reconciliation Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. October monthly statement check"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-teal-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || !hasEnteredValidActual}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3 text-sm font-semibold text-white shadow-xl shadow-teal-950/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Checkpoint...' : 'Save Reconciliation Checkpoint'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
