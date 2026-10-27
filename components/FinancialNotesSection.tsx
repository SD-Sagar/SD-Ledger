'use client';

import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote, NoteType } from '../lib/types';
import { formatINR, getTodayKolkata } from '../lib/utils/formatters';
import { AddEditNoteModal } from './AddEditNoteModal';
import { SettleNoteModal } from './SettleNoteModal';
import {
  Pin,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  RotateCcw,
  StickyNote,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';

type FilterTab = 'active' | 'THEY_OWE_ME' | 'I_OWE_THEM' | 'REMINDER' | 'resolved';

const COLOR_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    accent: string;
    tape: string;
    text: string;
  }
> = {
  yellow: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-400/40 dark:border-amber-500/30',
    accent: 'text-amber-600 dark:text-amber-400',
    tape: 'bg-amber-400/30',
    text: 'text-amber-950 dark:text-amber-100',
  },
  mint: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-400/40 dark:border-emerald-500/30',
    accent: 'text-emerald-600 dark:text-emerald-400',
    tape: 'bg-emerald-400/30',
    text: 'text-emerald-950 dark:text-emerald-100',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-400/40 dark:border-rose-500/30',
    accent: 'text-rose-600 dark:text-rose-400',
    tape: 'bg-rose-400/30',
    text: 'text-rose-950 dark:text-rose-100',
  },
  sky: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    border: 'border-sky-400/40 dark:border-sky-500/30',
    accent: 'text-sky-600 dark:text-sky-400',
    tape: 'bg-sky-400/30',
    text: 'text-sky-950 dark:text-sky-100',
  },
  lavender: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    border: 'border-purple-400/40 dark:border-purple-500/30',
    accent: 'text-purple-600 dark:text-purple-400',
    tape: 'bg-purple-400/30',
    text: 'text-purple-950 dark:text-purple-100',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    border: 'border-slate-400/40 dark:border-slate-500/30',
    accent: 'text-slate-600 dark:text-slate-400',
    tape: 'bg-slate-400/30',
    text: 'text-slate-900 dark:text-slate-100',
  },
};

export function FinancialNotesSection() {
  const { notes, updateNote, deleteNote, reopenNote } = useLedger();

  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<FinancialNote | null>(null);
  const [noteToSettle, setNoteToSettle] = useState<FinancialNote | null>(null);

  const today = getTodayKolkata();

  // Summary Metrics
  const summary = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    let activeCount = 0;
    let resolvedCount = 0;

    notes.forEach((n) => {
      if (n.is_resolved) {
        resolvedCount++;
      } else {
        activeCount++;
        if (n.amount) {
          if (n.type === 'THEY_OWE_ME') receivable += n.amount;
          if (n.type === 'I_OWE_THEM') payable += n.amount;
        }
      }
    });

    const net = receivable - payable;
    return { receivable, payable, net, activeCount, resolvedCount };
  }, [notes]);

  // Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Tab Filter
        if (activeTab === 'active' && n.is_resolved) return false;
        if (activeTab === 'resolved' && !n.is_resolved) return false;
        if (
          (activeTab === 'THEY_OWE_ME' || activeTab === 'I_OWE_THEM' || activeTab === 'REMINDER') &&
          (n.type !== activeTab || n.is_resolved)
        ) {
          return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchDesc = n.description?.toLowerCase().includes(q);
          return matchTitle || matchDesc;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned notes always come first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // Then newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [notes, activeTab, searchQuery]);

  const handleTogglePin = async (note: FinancialNote, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateNote({
      ...note,
      is_pinned: !note.is_pinned,
    });
  };

  const handleDelete = async (noteId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete note "${title}"?`)) {
      await deleteNote(noteId);
    }
  };

  const handleReopen = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await reopenNote(noteId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Receivable */}
        <div className="p-4 bg-surface-card border border-surface-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
              They Owe You (Receivable)
            </span>
            <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
              {formatINR(summary.receivable)}
            </div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              Active friend dues to collect
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Payable */}
        <div className="p-4 bg-surface-card border border-surface-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              You Owe Them (Payable)
            </span>
            <div className="text-xl font-bold font-mono text-rose-500 mt-1">
              {formatINR(summary.payable)}
            </div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              Pending debts to return
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Dues Position */}
        <div className="p-4 bg-surface-card border border-surface-border rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
              Net Due Position
            </span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                summary.net >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {summary.net >= 0 ? `+${formatINR(summary.net)}` : formatINR(summary.net)}
            </div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              {summary.net >= 0 ? 'Net surplus to receive' : 'Net balance to pay'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 bg-gradient-to-br from-brand-primary/10 to-indigo-500/10 border border-brand-primary/20 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-text-primary">
              Financial Sticky Notes
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">
              Track friend dues, khata & settle into bank accounts
            </p>
          </div>
          <button
            onClick={() => {
              setNoteToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Note / Due</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'active'
                ? 'bg-brand-primary text-white shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/50'
            }`}
          >
            Active ({summary.activeCount})
          </button>
          <button
            onClick={() => setActiveTab('THEY_OWE_ME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'THEY_OWE_ME'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/50'
            }`}
          >
            They Owe Me
          </button>
          <button
            onClick={() => setActiveTab('I_OWE_THEM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'I_OWE_THEM'
                ? 'bg-rose-600 text-white shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/50'
            }`}
          >
            I Owe Them
          </button>
          <button
            onClick={() => setActiveTab('REMINDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'REMINDER'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/50'
            }`}
          >
            Reminders
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'resolved'
                ? 'bg-surface-muted text-text-primary shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/50'
            }`}
          >
            Settled ({summary.resolvedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or friends..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-surface-card border border-surface-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Sticky Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface-card border border-surface-border rounded-2xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            {searchQuery
              ? 'No matching notes found'
              : activeTab === 'resolved'
              ? 'No settled matters yet'
              : 'Your sticky board is clear!'}
          </h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different name or keyword.'
              : 'Keep notes for friend dues (khata/udhar), future payments, and reminders. Settle them directly into your personal accounts with 1 click.'}
          </p>
          {!searchQuery && activeTab !== 'resolved' && (
            <button
              onClick={() => {
                setNoteToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Note</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const styles = COLOR_STYLES[note.card_color || 'yellow'] || COLOR_STYLES.yellow;
            const isOverdue =
              note.due_date && !note.is_resolved && note.due_date < today;
            const isDueToday =
              note.due_date && !note.is_resolved && note.due_date === today;

            return (
              <div
                key={note.id}
                className={`relative group rounded-2xl border ${styles.bg} ${styles.border} p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 ${
                  note.is_resolved ? 'opacity-70 grayscale-[20%]' : ''
                }`}
              >
                {/* Top Tape Ornament */}
                <div
                  className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 rounded-xs ${styles.tape} backdrop-blur-xs shadow-xs pointer-events-none`}
                />

                {/* Card Top: Type badge, Pin, Title */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        note.type === 'THEY_OWE_ME'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : note.type === 'I_OWE_THEM'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {note.type === 'THEY_OWE_ME' ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>They Owe You</span>
                        </>
                      ) : note.type === 'I_OWE_THEM' ? (
                        <>
                          <ArrowUpRight className="w-3 h-3" />
                          <span>You Owe Them</span>
                        </>
                      ) : (
                        <>
                          <StickyNote className="w-3 h-3" />
                          <span>Reminder</span>
                        </>
                      )}
                    </span>

                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(note, e)}
                      title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                      className={`p-1 rounded-lg transition-colors ${
                        note.is_pinned
                          ? 'text-amber-500 bg-amber-500/20'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-muted/60'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Title */}
                  <h4
                    className={`text-base font-bold text-text-primary ${
                      note.is_resolved ? 'line-through text-text-muted' : ''
                    }`}
                  >
                    {note.title}
                  </h4>

                  {/* Amount if any */}
                  {note.amount != null && (
                    <div
                      className={`text-xl font-extrabold font-mono mt-1 ${
                        note.is_resolved
                          ? 'line-through text-text-muted'
                          : note.type === 'THEY_OWE_ME'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : note.type === 'I_OWE_THEM'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-text-primary'
                      }`}
                    >
                      {formatINR(note.amount)}
                    </div>
                  )}

                  {/* Description */}
                  {note.description && (
                    <p
                      className={`text-xs text-text-muted mt-2 whitespace-pre-line leading-relaxed ${
                        note.is_resolved ? 'line-through' : ''
                      }`}
                    >
                      {note.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Due date pill, Status, Actions */}
                <div className="pt-4 mt-3 border-t border-surface-border/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    {/* Due Date Indicator */}
                    {note.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                          isOverdue
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                            : isDueToday
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                            : 'bg-surface-card/60 text-text-muted'
                        }`}
                      >
                        {isOverdue ? (
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                        ) : (
                          <Calendar className="w-3 h-3" />
                        )}
                        <span>
                          {isOverdue
                            ? `Overdue (${note.due_date})`
                            : isDueToday
                            ? 'Due Today'
                            : `Due ${note.due_date}`}
                        </span>
                      </span>
                    )}

                    {/* Resolved status timestamp */}
                    {note.is_resolved && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settled</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {note.is_resolved ? (
                      <button
                        type="button"
                        onClick={(e) => handleReopen(note.id, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-text-primary bg-surface-card hover:bg-surface-muted rounded-lg border border-surface-border shadow-xs transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNoteToSettle(note)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settle & Resolve</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteToEdit(note);
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
                        title="Edit note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(note.id, note.title, e)}
                        className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <AddEditNoteModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNoteToEdit(null);
        }}
        noteToEdit={noteToEdit}
      />

      {/* Settle Note Modal */}
      <SettleNoteModal
        isOpen={!!noteToSettle}
        onClose={() => setNoteToSettle(null)}
        note={noteToSettle}
      />
    </div>
  );
}
