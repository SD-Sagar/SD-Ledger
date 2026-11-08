'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote, NoteType, NoteColor, SavedContact } from '../lib/types';
import { getTodayKolkata, formatDisplayDate, formatINR } from '../lib/utils/formatters';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import { getSavedContacts, saveOrUpdateContact } from '../lib/utils/contacts';
import {
  X,
  Pin,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  StickyNote,
  Lock,
  Calendar,
  Phone,
  BookUser,
  Building2,
} from 'lucide-react';

interface AddEditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: FinancialNote | null;
  defaultDueDate?: string;
  prefilledContact?: SavedContact | null;
}

const COLOR_OPTIONS: { id: NoteColor; label: string; bg: string; border: string; dot: string }[] = [
  { id: 'yellow', label: 'Canary Yellow', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-400/50', dot: 'bg-amber-400' },
  { id: 'mint', label: 'Emerald Mint', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-400/50', dot: 'bg-emerald-400' },
  { id: 'rose', label: 'Coral Rose', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-400/50', dot: 'bg-rose-400' },
  { id: 'sky', label: 'Sky Azure', bg: 'bg-sky-500/10 dark:bg-sky-500/20', border: 'border-sky-400/50', dot: 'bg-sky-400' },
  { id: 'lavender', label: 'Soft Lavender', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-400/50', dot: 'bg-purple-400' },
  { id: 'slate', label: 'Charcoal Slate', bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', border: 'border-zinc-400/50', dot: 'bg-zinc-400' },
];

export function AddEditNoteModal({
  isOpen,
  onClose,
  noteToEdit,
  defaultDueDate,
  prefilledContact,
}: AddEditNoteModalProps) {
  const { addNote, updateNote, accounts, summary } = useLedger();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoteType>('THEY_OWE_ME');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cardColor, setCardColor] = useState<NoteColor>('yellow');
  const [isPinned, setIsPinned] = useState(false);

  // Direct Bank Account Ledger Link (Lend/Borrow from account now)
  const [deductFromAccount, setDeductFromAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('Lending & Dues');
  const [deductionDate, setDeductionDate] = useState(getTodayKolkata());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDateLocked, setIsDateLocked] = useState(false);

  // Saved contacts and native contact picker support
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [hasContactPicker, setHasContactPicker] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSavedContacts(getSavedContacts());
      const onUpdate = () => setSavedContacts(getSavedContacts());
      window.addEventListener('sd-contacts-updated', onUpdate);

      if (navigator && 'contacts' in navigator && 'ContactsManager' in window) {
        setHasContactPicker(true);
      }
      return () => window.removeEventListener('sd-contacts-updated', onUpdate);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDeductFromAccount(false);
      setTransactionCategory('Lending & Dues');
      setDeductionDate(getTodayKolkata());
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }

      if (noteToEdit) {
        setTitle(noteToEdit.title);
        setDescription(noteToEdit.description || '');
        setType(noteToEdit.type);
        setAmount(noteToEdit.amount != null ? String(noteToEdit.amount) : '');
        setPhoneNumber(noteToEdit.phone_number || '');
        setDueDate(noteToEdit.due_date || '');
        setCardColor(noteToEdit.card_color || 'yellow');
        setIsPinned(!!noteToEdit.is_pinned);
        setIsDateLocked(false);
      } else {
        setTitle(prefilledContact?.name || '');
        setDescription('');
        setType('THEY_OWE_ME');
        setAmount('');
        setPhoneNumber(prefilledContact?.phone || '');
        const initialDate = defaultDueDate || '';
        setDueDate(initialDate);
        setCardColor('yellow');
        setIsPinned(false);
        setIsDateLocked(Boolean(defaultDueDate));
      }
      setError(null);
    }
  }, [isOpen, noteToEdit, defaultDueDate, prefilledContact, accounts]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectSavedContact = (contactId: string) => {
    if (!contactId) return;
    const found = savedContacts.find((c) => c.id === contactId);
    if (found) {
      setPhoneNumber(found.phone);
      if (!title.trim()) {
        setTitle(found.name);
      }
    }
  };

  const handlePickFromNativeContacts = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      if (contacts && contacts[0]) {
        if (contacts[0].tel && contacts[0].tel.length > 0) {
          const rawTel = contacts[0].tel[0].replace(/\D/g, '');
          setPhoneNumber(rawTel);
        }
        if (contacts[0].name && contacts[0].name.length > 0 && !title.trim()) {
          setTitle(contacts[0].name[0]);
        }
      }
    } catch (err) {
      console.warn('Native contact picker cancelled:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title or person name.');
      return;
    }

    let parsedAmount: number | undefined = undefined;
    if (amount.trim()) {
      const parsed = parseFloat(amount.trim());
      if (isNaN(parsed) || parsed < 0) {
        setError('Please enter a valid positive amount.');
        return;
      }
      parsedAmount = parsed;
    } else if (type !== 'REMINDER') {
      setError('Please specify an amount for dues/khata entries.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedPhone = phoneNumber.trim();

      if (noteToEdit) {
        const res = await updateNote({
          ...noteToEdit,
          title: title.trim(),
          description: description.trim(),
          type,
          amount: parsedAmount ?? null,
          phone_number: trimmedPhone || null,
          due_date: dueDate || null,
          card_color: cardColor,
          is_pinned: isPinned,
        });
        if (!res.success) {
          setError(res.error || 'Failed to update note.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await addNote({
          title: title.trim(),
          description: description.trim(),
          type,
          amount: parsedAmount,
          phone_number: trimmedPhone || undefined,
          due_date: dueDate || undefined,
          card_color: cardColor,
          is_pinned: isPinned,
          deductFromAccountId: !noteToEdit && deductFromAccount && type === 'THEY_OWE_ME' ? selectedAccountId : undefined,
          depositToAccountId: !noteToEdit && deductFromAccount && type === 'I_OWE_THEM' ? selectedAccountId : undefined,
          transactionCategory: !noteToEdit && deductFromAccount ? transactionCategory : undefined,
          transactionDate: !noteToEdit && deductFromAccount ? (deductionDate || getTodayKolkata()) : undefined,
        });
        if (!res.success) {
          setError(res.error || 'Failed to create note.');
          setIsSubmitting(false);
          return;
        }
      }

      // Auto-save friend's contact into the directory
      if (trimmedPhone) {
        const friendCandidate = title.split(/[-–—:(]/)[0].trim();
        if (friendCandidate) {
          saveOrUpdateContact(friendCandidate, trimmedPhone);
        }
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
        className="relative w-full max-w-lg max-h-[92vh] max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed at top */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shrink-0">
              <StickyNote className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                {noteToEdit ? 'Edit Financial Note' : 'New Financial Note / Due'}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Khata entry, friend dues, loan tracker, or recurring reminder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container with scrollable fields & pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Locked Calendar Date Pill if opened from calendar */}
            {isDateLocked && dueDate && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs">
                <span className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Adding for selected date: <strong>{formatDisplayDate(dueDate)}</strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsDateLocked(false)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="Click to unlock and select a different date"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked &bull; Change</span>
                </button>
              </div>
            )}

            {/* Type Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Entry Type
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setType('THEY_OWE_ME');
                    setTransactionCategory('Lending & Dues');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${type === 'THEY_OWE_ME'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>They Owe Me</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('I_OWE_THEM');
                    setTransactionCategory('Debt Recovery / Khata');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${type === 'I_OWE_THEM'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>I Owe Them</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('REMINDER')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${type === 'REMINDER'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Reminder</span>
                </button>
              </div>
            </div>

            {/* Title / Friend Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {type === 'REMINDER' ? 'Note Title / Purpose *' : 'Friend Name / Reason *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'THEY_OWE_ME'
                    ? 'e.g. Rahul (Dinner share)'
                    : type === 'I_OWE_THEM'
                      ? 'e.g. Priya (Electricity bill split)'
                      : 'e.g. Pay annual car insurance next week'
                }
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Amount & Due Date in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Amount (₹) {type === 'REMINDER' ? '(Optional)' : '*'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-8 pr-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required={type !== 'REMINDER'}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Target / Due Date (Optional)
                  </label>
                  {isDateLocked && (
                    <button
                      type="button"
                      onClick={() => setIsDateLocked(false)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Locked (Click to change)</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isDateLocked}
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-sm transition-colors ${isDateLocked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-semibold cursor-not-allowed opacity-90'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                      }`}
                    style={{ colorScheme: 'light dark' }}
                  />
                </div>
                {isDateLocked && dueDate && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Captured from calendar selection ({formatDisplayDate(dueDate)})</span>
                  </p>
                )}
              </div>
            </div>

            {/* Friend WhatsApp Number: Input is half-size on PC/desktop, with Pick Existing & Import in the empty space */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Friend&apos;s WhatsApp Number (Optional)</span>
                </label>
                <span className="text-[10px] text-zinc-400">For 1-tap WhatsApp reminders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Left Column (Half size on PC): Phone Number Input */}
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 7319332362"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                {/* Right Column (Half size on PC): Pick Existing Contact & Mobile Import */}
                <div className="flex items-center gap-1.5">
                  {/* Pick Existing Contact Dropdown */}
                  <div className="relative flex-1">
                    <select
                      value=""
                      onChange={(e) => handleSelectSavedContact(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer truncate"
                    >
                      <option value="">
                        {savedContacts.length > 0 ? '👤 Pick Saved Friend...' : 'No Saved Contacts'}
                      </option>
                      {savedContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Import from Native Contacts (Mobile / Smaller screens) */}
                  {hasContactPicker && (
                    <button
                      type="button"
                      onClick={handlePickFromNativeContacts}
                      className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold shadow-xs shrink-0 transition-colors cursor-pointer"
                      title="Pick contact from your phone"
                    >
                      <BookUser className="w-3.5 h-3.5" />
                      <span className="sm:hidden">Import</span>
                      <span className="hidden sm:inline">Phone</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Direct Bank Account Ledger Link (Lend/Borrow from account now) */}
            {!noteToEdit && (type === 'THEY_OWE_ME' || type === 'I_OWE_THEM') && accounts.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromAccount}
                    onChange={(e) => setDeductFromAccount(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {type === 'THEY_OWE_ME'
                          ? 'Deduct from bank account now? (I am lending money right now)'
                          : 'Add to bank account now? (I received borrowed money into an account)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {type === 'THEY_OWE_ME'
                        ? 'Logs an immediate Expense in your ledger so your bank balance decreases right now.'
                        : 'Logs an immediate Income into your ledger so your bank balance increases right now.'}
                      {' '}Leave unchecked for a pure note / reminder without touching bank balance.
                    </p>
                  </div>
                </label>

                {deductFromAccount && (
                  <div className="pl-6 pt-1 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        {type === 'THEY_OWE_ME' ? 'Deduct From Bank Account *' : 'Deposit Into Bank Account *'}
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required={deductFromAccount}
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

                    {/* Deduction / Deposit Date (When bank balance actually changed) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center justify-between">
                        <span>{type === 'THEY_OWE_ME' ? 'Deduction Date (When lent)' : 'Deposit Date (When received)'}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Default: Today</span>
                      </label>
                      <input
                        type="date"
                        value={deductionDate}
                        onChange={(e) => setDeductionDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Preconfigured Category Selection */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center justify-between">
                        <span>{type === 'THEY_OWE_ME' ? 'Expense Category' : 'Income Category'}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Reports tag</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        {(type === 'THEY_OWE_ME' ? EXPENSE_CATEGORIES : INCOME_SOURCES).map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setTransactionCategory(cat.id);
                              if (!title.trim()) {
                                setTitle(cat.label);
                              }
                            }}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${transactionCategory === cat.id
                                ? type === 'THEY_OWE_ME'
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500'
                                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
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
                  </div>
                )}
              </div>
            )}

            {/* Description / Extra Details */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, reason (e.g. Dinner share), or reference notes..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Card Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCardColor(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${c.bg
                      } border ${c.border} ${cardColor === c.id
                        ? 'ring-2 ring-emerald-500 shadow-sm scale-105'
                        : 'opacity-70 hover:opacity-100'
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className="text-zinc-900 dark:text-white">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pin toggle */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                />
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>Pin to top of list</span>
              </label>
            </div>

          </div>

          {/* Action buttons - Fixed at bottom */}
          <div className="flex items-center justify-end gap-2.5 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/90 dark:bg-zinc-900/60 backdrop-blur-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : noteToEdit ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
