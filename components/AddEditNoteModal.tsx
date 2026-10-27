'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote, NoteType, NoteColor } from '../lib/types';
import {
  X,
  Pin,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  StickyNote,
} from 'lucide-react';

interface AddEditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: FinancialNote | null;
}

const COLOR_OPTIONS: { id: NoteColor; label: string; bg: string; border: string; dot: string }[] = [
  { id: 'yellow', label: 'Canary Yellow', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-400/50', dot: 'bg-amber-400' },
  { id: 'mint', label: 'Emerald Mint', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-400/50', dot: 'bg-emerald-400' },
  { id: 'rose', label: 'Coral Rose', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-400/50', dot: 'bg-rose-400' },
  { id: 'sky', label: 'Sky Azure', bg: 'bg-sky-500/10 dark:bg-sky-500/20', border: 'border-sky-400/50', dot: 'bg-sky-400' },
  { id: 'lavender', label: 'Soft Lavender', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-400/50', dot: 'bg-purple-400' },
  { id: 'slate', label: 'Charcoal Slate', bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', border: 'border-zinc-400/50', dot: 'bg-zinc-400' },
];

export function AddEditNoteModal({ isOpen, onClose, noteToEdit }: AddEditNoteModalProps) {
  const { addNote, updateNote } = useLedger();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NoteType>('THEY_OWE_ME');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cardColor, setCardColor] = useState<NoteColor>('yellow');
  const [isPinned, setIsPinned] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (noteToEdit) {
        setTitle(noteToEdit.title);
        setDescription(noteToEdit.description || '');
        setType(noteToEdit.type);
        setAmount(noteToEdit.amount != null ? String(noteToEdit.amount) : '');
        setDueDate(noteToEdit.due_date || '');
        setCardColor(noteToEdit.card_color || 'yellow');
        setIsPinned(!!noteToEdit.is_pinned);
      } else {
        setTitle('');
        setDescription('');
        setType('THEY_OWE_ME');
        setAmount('');
        setDueDate('');
        setCardColor('yellow');
        setIsPinned(false);
      }
      setError(null);
    }
  }, [isOpen, noteToEdit]);

  if (!isOpen) return null;

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
      if (noteToEdit) {
        const res = await updateNote({
          ...noteToEdit,
          title: title.trim(),
          description: description.trim(),
          type,
          amount: parsedAmount ?? null,
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
          due_date: dueDate || undefined,
          card_color: cardColor,
          is_pinned: isPinned,
        });
        if (!res.success) {
          setError(res.error || 'Failed to create note.');
          setIsSubmitting(false);
          return;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {noteToEdit ? 'Edit Financial Note' : 'New Note / Friend Due (Khata)'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cloud synced across all devices &amp; accessible offline
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                onClick={() => setType('THEY_OWE_ME')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  type === 'THEY_OWE_ME'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>They Owe Me</span>
              </button>
              <button
                type="button"
                onClick={() => setType('I_OWE_THEM')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  type === 'I_OWE_THEM'
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
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  type === 'REMINDER'
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500 font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 py-2.5 pl-8 pr-3.5 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  required={type !== 'REMINDER'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Due Date / Target Date (Optional)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  style={{ colorScheme: 'light dark' }}
                />
              </div>
            </div>
          </div>

          {/* Description / Extra Details */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, UPI transaction reference, phone number, or notes..."
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
                  title={c.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    cardColor === c.id
                      ? `${c.bg} ${c.border} ring-2 ring-emerald-500 text-zinc-900 dark:text-white shadow-sm`
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                  <span>{c.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pin to top */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                Pin to top of sticky board
              </span>
            </label>
          </div>

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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : noteToEdit ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
