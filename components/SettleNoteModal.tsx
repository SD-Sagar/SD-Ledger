'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote } from '../lib/types';
import { getTodayKolkata, formatINR, formatDisplayDate } from '../lib/utils/formatters';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import {
  X,
  CheckCircle2,
  Building2,
  Calendar,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Receipt,
  Layers,
  History,
} from 'lucide-react';

interface SettleNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FinancialNote | null;
}

export function SettleNoteModal({ isOpen, onClose, note }: SettleNoteModalProps) {
  const { accounts, summary, transactions, resolveNote } = useLedger();

  const [settleMode, setSettleMode] = useState<'full' | 'partial'>('full');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [convertToTransaction, setConvertToTransaction] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.length > 0 ? accounts[0].id : ''
  );
  const [settleCategory, setSettleCategory] = useState<string>('Debt Recovery / Khata');
  const [settleDate, setSettleDate] = useState(getTodayKolkata());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && note) {
      setSettleMode('full');
      setSettleAmount(note.amount != null ? String(note.amount) : '');
      setPaymentNotes('');
      setSettleCategory(note.type === 'THEY_OWE_ME' ? 'Debt Recovery / Khata' : 'Lending & Dues');
      setSettleDate(getTodayKolkata());
      setError(null);

      // Smart default: Select the original account used when money was lent or borrowed
      let initialAccountId = accounts.length > 0 ? accounts[0].id : '';
      if (note.linked_transaction_id) {
        const linkedTx = transactions.find((t) => t.id === note.linked_transaction_id);
        if (linkedTx) {
          const targetId = note.type === 'THEY_OWE_ME' ? linkedTx.from_account_id : linkedTx.to_account_id;
          if (targetId && accounts.some((a) => a.id === targetId)) {
            initialAccountId = targetId;
          }
        }
      }
      setSelectedAccountId(initialAccountId);
    }
  }, [isOpen, note, accounts, transactions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !note) return null;

  const currentDue = note.amount != null && note.amount > 0 ? note.amount : 0;
  const hasAmount = currentDue > 0;
  const isKhata = note.type === 'THEY_OWE_ME' || note.type === 'I_OWE_THEM';

  const numericSettle = parseFloat(settleAmount) || 0;
  const remainingAfterPayment = Math.max(0, Math.round((currentDue - numericSettle) * 100) / 100);
  const willBeFullySettled = settleMode === 'full' || numericSettle >= currentDue;

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountToSettle = settleMode === 'full' ? currentDue : numericSettle;

    if (hasAmount && amountToSettle <= 0) {
      setError('Please specify a settlement amount greater than 0.');
      return;
    }

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
        settleAmount: hasAmount ? amountToSettle : undefined,
        paymentNotes: paymentNotes.trim() || undefined,
        category: settleCategory,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] max-h-[92dvh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
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
                Settle &amp; Record Payment
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Support full settlement or partial repayment installments
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
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${note.type === 'THEY_OWE_ME'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : note.type === 'I_OWE_THEM'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
                  }`}
              >
                {note.type === 'THEY_OWE_ME'
                  ? 'They Owe You'
                  : note.type === 'I_OWE_THEM'
                    ? 'You Owe Them'
                    : 'Reminder'}
              </span>
            </div>

            {hasAmount && (
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                    Current Outstanding Due
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">
                    {formatINR(currentDue)}
                  </div>
                </div>
                {note.original_amount != null && note.original_amount > currentDue && (
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Original Commitment</span>
                    <span className="text-xs font-mono line-through text-zinc-400">
                      {formatINR(note.original_amount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {note.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed pt-1">
                {note.description}
              </p>
            )}
          </div>

          {/* Past Payments History Accordion */}
          {note.payment_history && note.payment_history.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  Past Partial Payments ({note.payment_history.length})
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(
                    note.payment_history.reduce((sum, p) => sum + p.amount, 0)
                  )}{' '}
                  already paid
                </span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {note.payment_history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatINR(record.amount)}
                      </span>
                      {record.account_name && (
                        <span className="text-zinc-400 text-[11px] ml-1.5">
                          via {record.account_name}
                        </span>
                      )}
                      {record.notes && (
                        <p className="text-[10px] text-zinc-500 italic mt-0.5">
                          &ldquo;{record.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {formatDisplayDate(record.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement Mode Selection: Full vs Partial */}
          {hasAmount && isKhata && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Settlement Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSettleMode('full');
                      setSettleAmount(String(currentDue));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${settleMode === 'full'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Full Settlement ({formatINR(currentDue)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettleMode('partial');
                      if (!settleAmount || Number(settleAmount) === currentDue) {
                        setSettleAmount(String(Math.round((currentDue / 2) * 100) / 100));
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${settleMode === 'partial'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Partial Repayment</span>
                  </button>
                </div>
              </div>

              {/* Partial Payment Amount Input & Quick Helpers */}
              {settleMode === 'partial' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-zinc-900 dark:text-white">
                    Amount Paid Now (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500 font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={currentDue}
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-8 pr-3.5 text-base font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Quick percentage pills */}
                  <div className="flex items-center gap-1.5">
                    {[0.25, 0.5, 0.75].map((pct) => {
                      const quickVal = Math.round(currentDue * pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setSettleAmount(String(quickVal))}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {pct * 100}% (₹{quickVal})
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSettleAmount(String(currentDue))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      100%
                    </button>
                  </div>

                  {/* Impact preview */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-200/50 dark:border-indigo-900/40">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Remaining After Payment:
                    </span>
                    <span className="font-bold font-mono text-zinc-900 dark:text-white">
                      {formatINR(remainingAfterPayment)}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium">
                    {willBeFullySettled ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        This payment settles the balance in full and moves the note to Settled.
                      </span>
                    ) : (
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        This note will stay <strong>ACTIVE</strong> with ₹
                        {remainingAfterPayment} remaining balance.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Remark Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Payment Remark / Note (Optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid in cash, GPay installment 1, Google Pay UTR..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

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
                      Record transaction in Personal Bank Ledger
                    </span>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                      {note.type === 'THEY_OWE_ME'
                        ? `Creates an Income credit of ${formatINR(settleMode === 'full' ? currentDue : numericSettle)} into chosen account.`
                        : `Creates an Expense debit of ${formatINR(settleMode === 'full' ? currentDue : numericSettle)} from chosen account.`}
                    </p>
                  </div>
                </label>
              </div>

              {convertToTransaction && (
                <div className="space-y-3">
                  {/* Account Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>
                        {note.type === 'THEY_OWE_ME'
                          ? 'Deposit Into Account *'
                          : 'Deduct From Account *'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        Defaulted to original account &bull; Can choose any
                      </span>
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

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                      <span>{note.type === 'THEY_OWE_ME' ? 'Income Category' : 'Expense Category'}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Reports tag</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      {(note.type === 'THEY_OWE_ME' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSettleCategory(cat.id)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${settleCategory === cat.id
                              ? note.type === 'THEY_OWE_ME'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.label}</span>
                        </button>
                      ))}
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
              disabled={isSubmitting || (hasAmount && settleMode === 'partial' && numericSettle <= 0)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : willBeFullySettled
                    ? 'Confirm & Settle Full'
                    : `Record Partial Payment (${formatINR(numericSettle)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
