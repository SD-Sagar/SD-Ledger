'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote } from '../lib/types';
import { getTodayKolkata, formatINR } from '../lib/utils/formatters';
import {
  X,
  CheckCircle2,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface SettleNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FinancialNote | null;
}

export function SettleNoteModal({ isOpen, onClose, note }: SettleNoteModalProps) {
  const { accounts, resolveNote } = useLedger();

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Settle & Resolve Matter
              </h2>
              <p className="text-xs text-text-muted">
                Cross-check resolved dues & sync to ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSettle} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Note summary banner */}
          <div className="p-3.5 bg-surface-muted/40 border border-surface-border rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary">
                {note.title}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  note.type === 'THEY_OWE_ME'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : note.type === 'I_OWE_THEM'
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-indigo-500/10 text-indigo-500'
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
              <div className="text-xl font-bold font-mono text-text-primary">
                {formatINR(note.amount!)}
              </div>
            )}
            {note.description && (
              <p className="text-xs text-text-muted line-clamp-2">
                {note.description}
              </p>
            )}
          </div>

          {/* Auto convert to ledger transaction toggle (only if amount > 0 and khata) */}
          {hasAmount && isKhata && accounts.length > 0 ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={convertToTransaction}
                    onChange={(e) => setConvertToTransaction(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-surface-border text-brand-primary focus:ring-brand-primary/30"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      Record automatically in Personal Bank Account
                    </span>
                    <p className="text-text-muted text-[11px] mt-0.5">
                      {note.type === 'THEY_OWE_ME'
                        ? 'Will record as an Income credit in your selected account balance.'
                        : 'Will record as an Expense debit from your selected account balance.'}
                    </p>
                  </div>
                </label>
              </div>

              {convertToTransaction && (
                <div className="space-y-3 pl-1">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-text-muted" />
                      {note.type === 'THEY_OWE_ME'
                        ? 'Deposit into Personal Account *'
                        : 'Deduct from Personal Account *'}
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      Settlement Date
                    </label>
                    <input
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              This note will be marked as resolved and moved to the settled tab. You can reopen it at any time.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary bg-surface-muted/50 hover:bg-surface-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Settling...' : 'Confirm & Resolve'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
