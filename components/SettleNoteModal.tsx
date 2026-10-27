'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote } from '../lib/types';
import { getTodayKolkata, formatINR } from '../lib/utils/formatters';
import {
  X,
  CheckCircle2,
  Building2,
  Calendar,
  AlertCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface SettleNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FinancialNote | null;
}

export function SettleNoteModal({ isOpen, onClose, note }: SettleNoteModalProps) {
  const { accounts, summary, resolveNote } = useLedger();

  const [convertToTransaction, setConvertToTransaction] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.length > 0 ? accounts[0].id : ''
  );
  const [settleDate, setSettleDate] = useState(getTodayKolkata());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !note) return null;

  const hasAmount = note.amount != null && note.amount > 0;
  const isKhata = note.type === 'THEY_OWE_ME' || note.type === 'I_OWE_THEM';

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (convertToTransaction && hasAmount && isKhata && !selectedAccountId) {
      setError('Please select an account for recording the settlement transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resolveNote(note.id, {
        convertToTransaction: convertToTransaction && hasAmount && isKhata,
        accountId: selectedAccountId || undefined,
        transactionDate: settleDate,
      });

      if (!res.success) {
        setError(res.error || 'Failed to resolve note.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Settle &amp; Resolve Matter
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cross-check resolved dues &amp; sync to bank ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSettle} className="space-y-4 pt-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Note summary banner */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                {note.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  note.type === 'THEY_OWE_ME'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : note.type === 'I_OWE_THEM'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                    : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
                }`}
              >
                {note.type === 'THEY_OWE_ME'
                  ? 'They Owed You'
                  : note.type === 'I_OWE_THEM'
                  ? 'You Owed Them'
                  : 'Reminder'}
              </span>
            </div>
            {hasAmount && (
              <div className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {formatINR(note.amount!)}
              </div>
            )}
            {note.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {note.description}
              </p>
            )}
          </div>

          {/* Auto convert to ledger transaction toggle */}
          {hasAmount && isKhata && accounts.length > 0 ? (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={convertToTransaction}
                    onChange={(e) => setConvertToTransaction(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Record automatically in Personal Bank Account
                    </span>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                      {note.type === 'THEY_OWE_ME'
                        ? 'Creates an Income credit in your selected bank balance.'
                        : 'Creates an Expense debit from your selected bank balance.'}
                    </p>
                  </div>
                </label>
              </div>

              {convertToTransaction && (
                <div className="space-y-3">
                  {/* Account Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      {note.type === 'THEY_OWE_ME'
                        ? 'Deposit Into Account *'
                        : 'Deduct From Account *'}
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 py-2.5 pl-10 pr-10 text-sm font-medium text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                        style={{ colorScheme: 'light dark' }}
                        required
                      >
                        {accounts.map((acc) => {
                          const accSummary = summary.accounts.find((a) => a.account.id === acc.id);
                          const bal = accSummary ? accSummary.calculatedBalance : acc.opening_balance;
                          return (
                            <option
                              key={acc.id}
                              value={acc.id}
                              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white py-1"
                            >
                              {acc.display_name} (Current: {formatINR(bal)})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      Settlement Date
                    </label>
                    <input
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                      style={{ colorScheme: 'light dark' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              This note will be marked as resolved and moved to the settled tab. You can reopen it at any time.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Settling...' : 'Confirm & Settle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
