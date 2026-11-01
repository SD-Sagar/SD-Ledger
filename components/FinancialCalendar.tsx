'use client';

import React, { useState, useMemo } from 'react';
import { FinancialNote } from '../lib/types';
import { formatINR, formatDisplayDate, getTodayKolkata } from '../lib/utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Landmark,
  CreditCard,
  Edit2,
  Trash2,
  Sparkles,
  Filter,
  X,
} from 'lucide-react';

interface FinancialCalendarProps {
  notes: FinancialNote[];
  onOpenAddNote: (defaultDueDate?: string) => void;
  onEditNote: (note: FinancialNote) => void;
  onSettleNote: (note: FinancialNote) => void;
  onDeleteNote: (id: string) => void;
}

type CalendarFilter = 'ALL' | 'DUE' | 'INCOME' | 'REMINDER';

export function FinancialCalendar({
  notes,
  onOpenAddNote,
  onEditNote,
  onSettleNote,
  onDeleteNote,
}: FinancialCalendarProps) {
  const todayStr = useMemo(() => getTodayKolkata(), []);

  // Parse YYYY-MM-DD
  const parseYMD = (ymd: string) => {
    const parts = ymd.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1);
  };

  const todayDate = useMemo(() => parseYMD(todayStr), [todayStr]);

  // Current viewed month and year
  const [currentYear, setCurrentYear] = useState<number>(() => todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => todayDate.getMonth()); // 0-indexed

  // Selected date in calendar (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filter type
  const [filterType, setFilterType] = useState<CalendarFilter>('ALL');

  // Jump to Month & Year shortcut popover state
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const jumpPopoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jumpPopoverRef.current && !jumpPopoverRef.current.contains(e.target as Node)) {
        setIsJumpOpen(false);
      }
    };
    if (isJumpOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isJumpOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
    setSelectedDate(todayStr);
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Helper to format date string
  const formatYMD = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Filtered notes map: date (YYYY-MM-DD) -> FinancialNote[]
  const notesByDate = useMemo(() => {
    const map = new Map<string, FinancialNote[]>();

    notes.forEach((note) => {
      if (!note.due_date) return;

      // Filter by type
      if (filterType === 'DUE' && note.type !== 'I_OWE_THEM') return;
      if (filterType === 'INCOME' && note.type !== 'THEY_OWE_ME') return;
      if (filterType === 'REMINDER' && note.type !== 'REMINDER') return;

      const existing = map.get(note.due_date) || [];
      existing.push(note);
      map.set(note.due_date, existing);
    });

    return map;
  }, [notes, filterType]);

  // Calendar Grid Days calculation
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    // Monday as day 0 (0 = Mon, 6 = Sun)
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = formatYMD(prevY, prevM, dayNum);
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        notes: notesByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = formatYMD(currentYear, currentMonth, i);
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
        notes: notesByDate.get(dateStr) || [],
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = formatYMD(nextY, nextM, i);
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        notes: notesByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, notesByDate]);

  // Notes for selected day
  const selectedDayNotes = useMemo(() => {
    return notesByDate.get(selectedDate) || [];
  }, [notesByDate, selectedDate]);

  // Total month stats
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    let totalDues = 0;
    let expectedIncome = 0;
    let dueCount = 0;
    let reminderCount = 0;

    notes.forEach((n) => {
      if (!n.due_date || !n.due_date.startsWith(prefix)) return;
      if (n.is_resolved) return;

      if (n.type === 'I_OWE_THEM' && n.amount) {
        totalDues += n.amount;
        dueCount++;
      } else if (n.type === 'THEY_OWE_ME' && n.amount) {
        expectedIncome += n.amount;
      } else if (n.type === 'REMINDER') {
        reminderCount++;
      }
    });

    return { totalDues, expectedIncome, dueCount, reminderCount };
  }, [notes, currentYear, currentMonth]);

  // Other upcoming notes in this month (if selected date has none)
  const upcomingInMonth = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return notes
      .filter((n) => n.due_date && n.due_date.startsWith(prefix) && !n.is_resolved)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [notes, currentYear, currentMonth]);

  // Icon selector based on note content/type
  const getNoteIcon = (note: FinancialNote) => {
    const title = (note.title + ' ' + (note.description || '')).toLowerCase();
    if (title.includes('loan') || title.includes('emi') || title.includes('bank') || title.includes('debt')) {
      return <Landmark className="h-4 w-4 text-rose-500" />;
    }
    if (title.includes('card') || title.includes('bill') || title.includes('netflix') || title.includes('sub')) {
      return <CreditCard className="h-4 w-4 text-indigo-500" />;
    }
    if (note.type === 'THEY_OWE_ME') {
      return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
    }
    if (note.type === 'I_OWE_THEM') {
      return <ArrowUpRight className="h-4 w-4 text-rose-500" />;
    }
    return <Bell className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      {/* CALENDAR CONTROLS & MONTH STATS STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md">
        {/* Month Title & Nav */}
        <div className="flex items-center gap-3">
          {/* Calendar Icon Button with Shortcut Popover */}
          <div className="relative" ref={jumpPopoverRef}>
            <button
              type="button"
              onClick={() => setIsJumpOpen(!isJumpOpen)}
              title="Click to jump to any Month & Year"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all cursor-pointer ${
                isJumpOpen
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-xs'
              }`}
            >
              <CalendarIcon className="h-5 w-5" />
            </button>

            {/* Jump to Month & Year Popover */}
            {isJumpOpen && (
              <div className="absolute top-12 left-0 z-40 w-72 sm:w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-2xl animate-in zoom-in-95 duration-150">
                {/* Popover Header with Close Cross Button */}
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Jump to Month &amp; Year</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsJumpOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Year Stepper Bar */}
                <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCurrentYear((y) => y - 1)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    title="Previous Year"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                    {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentYear((y) => y + 1)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    title="Next Year"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-3 gap-1.5 pt-3">
                  {monthNames.map((mName, mIdx) => {
                    const isSelectedMonth = currentMonth === mIdx;
                    const isActualCurrentMonth = todayDate.getFullYear() === currentYear && todayDate.getMonth() === mIdx;

                    return (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() => {
                          setCurrentMonth(mIdx);
                          setIsJumpOpen(false);
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all text-center ${
                          isSelectedMonth
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : isActualCurrentMonth
                            ? 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {mName.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Shortcut Footer */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      handleGoToday();
                      setIsJumpOpen(false);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    Jump to Today
                  </button>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {monthNames[currentMonth].substring(0, 3)} {currentYear}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            {/* Stable Nav: Arrows stay anchored, Month name centered in fixed-width box */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <h3 className="w-36 sm:w-44 text-center text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-none truncate select-none">
                {monthNames[currentMonth]} {currentYear}
              </h3>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleGoToday}
                className="rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-800 ml-1"
              >
                Today
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Scheduled Dues, Loans, Expected Income &amp; Reminders
            </p>
          </div>
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DUE')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                filterType === 'DUE'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Dues / Loans</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('INCOME')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                filterType === 'INCOME'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('REMINDER')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                filterType === 'REMINDER'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Reminders</span>
            </button>
          </div>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => onOpenAddNote(selectedDate)}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* MONTH SUMMARY METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-xs">
          <span className="text-[11px] text-zinc-500 block">Total Dues This Month</span>
          <p className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {formatINR(monthStats.totalDues)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-xs">
          <span className="text-[11px] text-zinc-500 block">Expected Inflow</span>
          <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatINR(monthStats.expectedIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-xs">
          <span className="text-[11px] text-zinc-500 block">Pending Dues &amp; EMI</span>
          <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
            {monthStats.dueCount} Events
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-xs">
          <span className="text-[11px] text-zinc-500 block">Reminders Active</span>
          <p className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {monthStats.reminderCount} Reminders
          </p>
        </div>
      </div>

      {/* CALENDAR & AGENDA TWO-COLUMN / STACKED VIEW (IMAGE 2 STYLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: THE MONTH CALENDAR GRID (7 Cols on desktop) */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-lg">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
              <div key={i} className="py-1">
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {calendarGrid.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;
              const activeNotes = cell.notes.filter((n) => !n.is_resolved);
              const hasDue = activeNotes.some((n) => n.type === 'I_OWE_THEM');
              const hasIncome = activeNotes.some((n) => n.type === 'THEY_OWE_ME');
              const hasReminder = activeNotes.some((n) => n.type === 'REMINDER');
              const allResolved = cell.notes.length > 0 && activeNotes.length === 0;

              // Helper for note dot color
              const getNoteDotClass = (n: FinancialNote) => {
                if (n.type === 'I_OWE_THEM') return 'bg-rose-500 shadow-rose-500/50';
                if (n.type === 'THEY_OWE_ME') return 'bg-emerald-500 shadow-emerald-500/50';
                if (n.card_color === 'sky') return 'bg-sky-400 shadow-sky-400/50';
                if (n.card_color === 'lavender') return 'bg-purple-400 shadow-purple-400/50';
                if (n.card_color === 'rose') return 'bg-rose-400 shadow-rose-400/50';
                if (n.card_color === 'mint') return 'bg-emerald-400 shadow-emerald-400/50';
                return 'bg-amber-400 shadow-amber-400/50';
              };

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`group relative flex flex-col items-center justify-between rounded-2xl p-1.5 sm:p-2 min-h-[54px] sm:min-h-[66px] transition-all text-center border ${
                    !cell.isCurrentMonth
                      ? 'text-zinc-300 dark:text-zinc-700 opacity-40 hover:opacity-80 border-transparent'
                      : isSelected
                      ? 'ring-2 ring-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 font-bold shadow-xs border-emerald-500/30'
                      : hasDue
                      ? 'border-rose-300/50 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/15 text-zinc-800 dark:text-zinc-200 hover:bg-rose-50/40 dark:hover:bg-rose-950/30'
                      : hasIncome
                      ? 'border-emerald-300/40 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/15 text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50/40'
                      : hasReminder
                      ? 'border-amber-300/40 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/15 text-zinc-800 dark:text-zinc-200 hover:bg-amber-50/40'
                      : 'border-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Top: Day Number and Multi-Item Count Badge */}
                  <div className="flex items-center justify-between w-full px-0.5">
                    <span
                      className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        isToday
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : isSelected
                          ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                          : ''
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Badge if multiple items on same day */}
                    {cell.notes.length > 1 && (
                      <span
                        className="text-[9px] font-mono font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-200/80 dark:bg-zinc-800 px-1 py-0.2 rounded-full leading-none shadow-2xs"
                        title={`${cell.notes.length} scheduled financial items`}
                      >
                        {cell.notes.length}
                      </span>
                    )}
                  </div>

                  {/* Bottom: Eye-Catching Multi-Colored Dots Cluster */}
                  <div className="flex items-center justify-center gap-1 mt-1 min-h-[10px] w-full flex-wrap">
                    {activeNotes.slice(0, 4).map((n, i) => (
                      <span
                        key={n.id || i}
                        className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ring-1.5 ring-white dark:ring-zinc-950 shadow-xs transition-transform group-hover:scale-125 ${getNoteDotClass(n)}`}
                        title={`${n.title}: ${
                          n.type === 'I_OWE_THEM'
                            ? 'Due / Loan Payable'
                            : n.type === 'THEY_OWE_ME'
                            ? 'Expected Inflow'
                            : 'Reminder'
                        }`}
                      />
                    ))}
                    {activeNotes.length > 4 && (
                      <span className="text-[9px] font-bold font-mono text-zinc-400 dark:text-zinc-500 leading-none">
                        +{activeNotes.length - 4}
                      </span>
                    )}
                    {allResolved && (
                      <span
                        className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600 ring-1.5 ring-white dark:ring-zinc-950"
                        title="All items on this date resolved"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50 ring-1 ring-white dark:ring-zinc-950" />
                <span>Upcoming Due / Loan</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 ring-1 ring-white dark:ring-zinc-950" />
                <span>Expected Inflow</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50 ring-1 ring-white dark:ring-zinc-950" />
                <span>Reminder</span>
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic hidden sm:inline">
              Multi-dot cluster represents multiple distinct notes per date
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED DAY TIMELINE & UPCOMING AGENDA (IMAGE 2 STYLE) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-lg">
          {/* Header for Selected Date */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                {selectedDate === todayStr ? 'Today' : 'Selected Date'}
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                {formatDisplayDate(selectedDate)}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onOpenAddNote(selectedDate)}
              className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Events List for Selected Day */}
          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
            {selectedDayNotes.length > 0 ? (
              selectedDayNotes.map((note) => {
                const isOverdue = !note.is_resolved && note.due_date && note.due_date < todayStr;
                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl border p-3 transition-all ${
                      note.is_resolved
                        ? 'border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-70'
                        : isOverdue
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                          {getNoteIcon(note)}
                        </div>
                        <div className="min-w-0">
                          <h5
                            className={`text-xs font-bold truncate ${
                              note.is_resolved
                                ? 'line-through text-zinc-500'
                                : 'text-zinc-900 dark:text-white'
                            }`}
                          >
                            {note.title}
                          </h5>
                          {note.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                              {note.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                note.type === 'THEY_OWE_ME'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : note.type === 'I_OWE_THEM'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {note.type === 'THEY_OWE_ME'
                                ? 'Expected Income'
                                : note.type === 'I_OWE_THEM'
                                ? 'Due / Loan'
                                : 'Reminder'}
                            </span>

                            {note.is_resolved ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Resolved</span>
                              </span>
                            ) : isOverdue ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" />
                                <span>Overdue</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      {note.amount && (
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold font-mono ${
                              note.type === 'THEY_OWE_ME'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {note.type === 'THEY_OWE_ME' ? '+' : '-'}
                            {formatINR(note.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-2 text-xs">
                      {!note.is_resolved && (
                        <button
                          type="button"
                          onClick={() => onSettleNote(note)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-400 px-2 py-1 text-[11px] font-semibold transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Settle Entry</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        className="rounded-lg p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-zinc-400">
                <Clock className="h-7 w-7 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  No events scheduled for this day
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddNote(selectedDate)}
                  className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  + Add due or reminder for {selectedDate}
                </button>

                {/* Upcoming Elsewhere in This Month */}
                {upcomingInMonth.length > 0 && (
                  <div className="mt-5 text-left border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-2">
                      Upcoming in {monthNames[currentMonth]}
                    </span>
                    <div className="space-y-1.5">
                      {upcomingInMonth.slice(0, 3).map((un) => (
                        <div
                          key={un.id}
                          onClick={() => setSelectedDate(un.due_date || selectedDate)}
                          className="flex items-center justify-between p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs cursor-pointer hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-zinc-400">
                              {un.due_date?.substring(5)}
                            </span>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {un.title}
                            </span>
                          </div>
                          {un.amount && (
                            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                              {formatINR(un.amount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

