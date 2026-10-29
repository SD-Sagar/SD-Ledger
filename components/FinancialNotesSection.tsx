'use client';

import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote } from '../lib/types';
import { formatINR, getTodayKolkata } from '../lib/utils/formatters';
import { RESOLVED_NOTES_RETENTION_DAYS } from '../lib/constants';
import { AddEditNoteModal } from './AddEditNoteModal';
import { SettleNoteModal } from './SettleNoteModal';
import {
  Pin,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
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
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-700/50',
    accent: 'text-amber-700 dark:text-amber-400',
    tape: 'bg-amber-300/40 dark:bg-amber-600/30',
    text: 'text-amber-950 dark:text-amber-100',
  },
  mint: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-300 dark:border-emerald-700/50',
    accent: 'text-emerald-700 dark:text-emerald-400',
    tape: 'bg-emerald-300/40 dark:bg-emerald-600/30',
    text: 'text-emerald-950 dark:text-emerald-100',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-300 dark:border-rose-700/50',
    accent: 'text-rose-700 dark:text-rose-400',
    tape: 'bg-rose-300/40 dark:bg-rose-600/30',
    text: 'text-rose-950 dark:text-rose-100',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-300 dark:border-sky-700/50',
    accent: 'text-sky-700 dark:text-sky-400',
    tape: 'bg-sky-300/40 dark:bg-sky-600/30',
    text: 'text-sky-950 dark:text-sky-100',
  },
  lavender: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-300 dark:border-purple-700/50',
    accent: 'text-purple-700 dark:text-purple-400',
    tape: 'bg-purple-300/40 dark:bg-purple-600/30',
    text: 'text-purple-950 dark:text-purple-100',
  },
  slate: {
    bg: 'bg-zinc-50 dark:bg-zinc-900/40',
    border: 'border-zinc-300 dark:border-zinc-700/60',
    accent: 'text-zinc-700 dark:text-zinc-300',
    tape: 'bg-zinc-300/40 dark:bg-zinc-600/30',
    text: 'text-zinc-900 dark:text-zinc-100',
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
  const fiveDaysAgoMs = useMemo(() => Date.now() - RESOLVED_NOTES_RETENTION_DAYS * 24 * 60 * 60 * 1000, []);

  // Summary Metrics (excludes resolved notes that have expired past 5 days)
  const summary = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    let activeCount = 0;
    let resolvedCount = 0;

    notes.forEach((n) => {
      if (n.is_resolved) {
        const resolvedTime = new Date(n.resolved_at || n.updated_at || n.created_at || 0).getTime();
        if (resolvedTime >= fiveDaysAgoMs) {
          resolvedCount++;
        }
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
  }, [notes, fiveDaysAgoMs]);

  const getRemainingDays = (resolvedAt?: string | null, updatedAt?: string | null) => {
    const time = new Date(resolvedAt || updatedAt || Date.now()).getTime();
    const ageMs = Date.now() - time;
    const remainingMs = RESOLVED_NOTES_RETENTION_DAYS * 24 * 60 * 60 * 1000 - ageMs;
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return Math.max(1, days);
  };

  // Filtered & Sorted Notes (5-day timeline for resolved; unresolved stay forever)
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // 5-Day hard filter for resolved notes
        if (n.is_resolved) {
          const resolvedTime = new Date(n.resolved_at || n.updated_at || n.created_at || 0).getTime();
          if (resolvedTime < fiveDaysAgoMs) return false;
        }

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
  }, [notes, activeTab, searchQuery, fiveDaysAgoMs]);

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Receivable */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              They Owe You (Receivable)
            </span>
            <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(summary.receivable)}
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
              Active friend dues to collect
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Payable */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              You Owe Them (Payable)
            </span>
            <div className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatINR(summary.payable)}
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
              Pending debts to return
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Dues Position */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Net Due Position
            </span>
            <div
              className={`text-xl font-extrabold font-mono mt-1 ${
                summary.net >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.net >= 0 ? `+${formatINR(summary.net)}` : formatINR(summary.net)}
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
              {summary.net >= 0 ? 'Net surplus to receive' : 'Net balance to pay'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-zinc-950 border border-emerald-500/20 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-white">
              Financial Sticky Notes
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
              Track friend dues, khata &amp; settle into accounts
            </p>
          </div>
          <button
            onClick={() => {
              setNoteToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Note / Due</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto scrollbar-none shadow-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Active ({summary.activeCount})
          </button>
          <button
            onClick={() => setActiveTab('THEY_OWE_ME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'THEY_OWE_ME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            They Owe Me
          </button>
          <button
            onClick={() => setActiveTab('I_OWE_THEM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'I_OWE_THEM'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            I Owe Them
          </button>
          <button
            onClick={() => setActiveTab('REMINDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'REMINDER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Reminders
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'resolved'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Settled ({summary.resolvedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or friends..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* 5-Day Retention Policy Notice for Resolved Tab */}
      {activeTab === 'resolved' && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>5-Day Retention Policy:</strong> Settled notes are automatically removed after 5 days to optimize cloud storage. Active dues and reminders stay indefinitely.
          </span>
        </div>
      )}

      {/* Sticky Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {searchQuery
              ? 'No matching notes found'
              : activeTab === 'resolved'
              ? 'No settled matters yet'
              : 'Your sticky board is clear!'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
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
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
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
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        note.type === 'THEY_OWE_ME'
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : note.type === 'I_OWE_THEM'
                          ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300'
                          : 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
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
                          : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Title */}
                  <h4
                    className={`text-base font-bold text-zinc-900 dark:text-white ${
                      note.is_resolved ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                    }`}
                  >
                    {note.title}
                  </h4>

                  {/* Amount if any */}
                  {note.amount != null && (
                    <div
                      className={`text-xl font-extrabold font-mono mt-1 ${
                        note.is_resolved
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : note.type === 'THEY_OWE_ME'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : note.type === 'I_OWE_THEM'
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {formatINR(note.amount)}
                    </div>
                  )}

                  {/* Description */}
                  {note.description && (
                    <p
                      className={`text-xs text-zinc-600 dark:text-zinc-400 mt-2 whitespace-pre-line leading-relaxed ${
                        note.is_resolved ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                      }`}
                    >
                      {note.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Due date pill, Status, Actions */}
                <div className="pt-4 mt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    {/* Due Date Indicator */}
                    {note.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                          isOverdue
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold'
                            : isDueToday
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                            : 'bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800/60'
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

                    {/* Resolved status timestamp & 5-day expiration badge */}
                    {note.is_resolved && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settled</span>
                        <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400 font-mono">
                          (clears in {getRemainingDays(note.resolved_at, note.updated_at)}d)
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {note.is_resolved ? (
                      <button
                        type="button"
                        onClick={(e) => handleReopen(note.id, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs transition-colors"
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
                        <span>Settle &amp; Resolve</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteToEdit(note);
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900/60 rounded-lg transition-colors"
                        title="Edit note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(note.id, note.title, e)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
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
