'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote, NoteType, NoteColor } from '../lib/types';
import { getTodayKolkata } from '../lib/utils/formatters';
import {
  X,
  Pin,
  Calendar,
  AlertCircle,
  CheckCircle2,
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
  { id: 'yellow', label: 'Canary Yellow', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-400/40', dot: 'bg-amber-400' },
  { id: 'mint', label: 'Emerald Mint', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-400/40', dot: 'bg-emerald-400' },
  { id: 'rose', label: 'Coral Rose', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-400/40', dot: 'bg-rose-400' },
  { id: 'sky', label: 'Sky Azure', bg: 'bg-sky-500/10 dark:bg-sky-500/20', border: 'border-sky-400/40', dot: 'bg-sky-400' },
  { id: 'lavender', label: 'Soft Lavender', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-400/40', dot: 'bg-purple-400' },
  { id: 'slate', label: 'Charcoal Slate', bg: 'bg-slate-500/10 dark:bg-slate-500/20', border: 'border-slate-400/40', dot: 'bg-slate-400' },
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {noteToEdit ? 'Edit Financial Note' : 'New Note / Friend Due (Khata)'}
              </h2>
              <p className="text-xs text-text-muted">
                Cloud synced across devices & accessible offline
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Entry Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-surface-muted/50 rounded-xl border border-surface-border">
              <button
                type="button"
                onClick={() => setType('THEY_OWE_ME')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  type === 'THEY_OWE_ME'
                    ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>They Owe Me</span>
              </button>
              <button
                type="button"
                onClick={() => setType('I_OWE_THEM')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  type === 'I_OWE_THEM'
                    ? 'bg-rose-500 text-white shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>I Owe Them</span>
              </button>
              <button
                type="button"
                onClick={() => setType('REMINDER')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  type === 'REMINDER'
                    ? 'bg-indigo-500 text-white shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>Reminder</span>
              </button>
            </div>
          </div>

          {/* Title / Friend Name */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              {type === 'REMINDER' ? 'Note Title / Purpose' : 'Friend Name / Reason *'}
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
              className="w-full px-3.5 py-2.5 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              required
            />
          </div>

          {/* Amount & Due Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Amount (₹) {type === 'REMINDER' ? '(Optional)' : '*'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  required={type !== 'REMINDER'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Due Date / Target Date (Optional)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Description / Extra Details */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, UPI transaction reference, phone number, or notes..."
              className="w-full px-3.5 py-2 text-sm bg-surface-muted/40 border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Card Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardColor(c.id)}
                  title={c.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    cardColor === c.id
                      ? `${c.bg} ${c.border} ring-2 ring-brand-primary text-text-primary font-semibold shadow-sm`
                      : 'border-surface-border bg-surface-muted/30 text-text-muted hover:text-text-primary'
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
                className="w-4 h-4 rounded border-surface-border text-brand-primary focus:ring-brand-primary/30"
              />
              <span className="text-xs font-medium text-text-primary flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                Pin to top of sticky board
              </span>
            </label>
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : noteToEdit ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
