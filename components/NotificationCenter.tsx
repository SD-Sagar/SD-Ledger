'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { FinancialNote } from '../lib/types';
import { formatINR, formatDisplayDate, getTodayKolkata } from '../lib/utils/formatters';
import {
  Bell,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Check,
  X,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';

interface ActiveNotification {
  id: string; // note.id
  note: FinancialNote;
  diffDays: number; // -2, -1, 0, 1, 2
  status: 'overdue_missed' | 'due_today' | 'due_soon';
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor: string;
  type: 'I_OWE_THEM' | 'THEY_OWE_ME' | 'REMINDER';
}

const DISMISSED_STORAGE_KEY = 'sd_ledger_dismissed_notifications_v1';
const LAST_SEEN_STORAGE_KEY = 'sd_ledger_notifications_last_seen_v1';

export function NotificationCenter() {
  const { notes } = useLedger();
  const todayStr = useMemo(() => getTodayKolkata(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [lastSeenTime, setLastSeenTime] = useState<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load dismissed notifications & last seen timestamp from localStorage
  useEffect(() => {
    try {
      const storedDismissed = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (storedDismissed) {
        setDismissedIds(JSON.parse(storedDismissed));
      }
      const storedSeen = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
      if (storedSeen) {
        setLastSeenTime(Number(storedSeen) || 0);
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Compute 48-Hour active notifications
  // Window: -2 <= diffDays <= 2 (Past 48 hours to next 48 hours)
  const activeNotifications = useMemo(() => {
    const list: ActiveNotification[] = [];

    // Parse today's midnight timestamp in local/Kolkata date
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const todayMidnight = new Date(tY, tM - 1, tD).getTime();

    notes.forEach((note) => {
      // Only unresolved notes with a specified due_date
      if (note.is_resolved || !note.due_date) return;

      // Skip manually dismissed notes
      if (dismissedIds.includes(note.id)) return;

      const [nY, nM, nD] = note.due_date.split('-').map(Number);
      if (!nY || !nM || !nD) return;
      const noteMidnight = new Date(nY, nM - 1, nD).getTime();

      // Difference in whole calendar days
      const diffDays = Math.round((noteMidnight - todayMidnight) / (24 * 60 * 60 * 1000));

      // Strictly enforce the 48-hour lifespan: -2 <= diffDays <= 2
      if (diffDays < -2 || diffDays > 2) return;

      let status: 'overdue_missed' | 'due_today' | 'due_soon';
      let subtitle = '';
      let badgeLabel = '';
      let badgeColor = '';

      if (diffDays === 0) {
        status = 'due_today';
        subtitle = 'Scheduled for today';
        badgeLabel = 'Due Today';
        badgeColor = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20';
      } else if (diffDays === 1) {
        status = 'due_soon';
        subtitle = 'Due tomorrow (in 24 hours)';
        badgeLabel = 'Tomorrow';
        badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20';
      } else if (diffDays === 2) {
        status = 'due_soon';
        subtitle = 'Due in 2 days (in 48 hours)';
        badgeLabel = 'In 2 Days';
        badgeColor = 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      } else if (diffDays === -1) {
        status = 'overdue_missed';
        subtitle = 'Missed scheduled date (yesterday)';
        badgeLabel = 'Overdue 1d';
        badgeColor = 'bg-rose-600 text-white border-rose-600';
      } else {
        // diffDays === -2
        status = 'overdue_missed';
        subtitle = 'Missed scheduled date (2 days ago)';
        badgeLabel = 'Overdue 2d';
        badgeColor = 'bg-rose-600 text-white border-rose-600';
      }

      // Title prefix based on note type
      let typeTitle = note.title;
      if (note.type === 'I_OWE_THEM') {
        typeTitle = `Payable Due: ${note.title}`;
      } else if (note.type === 'THEY_OWE_ME') {
        typeTitle = `Receivable Inflow: ${note.title}`;
      } else {
        typeTitle = `Reminder: ${note.title}`;
      }

      list.push({
        id: note.id,
        note,
        diffDays,
        status,
        title: typeTitle,
        subtitle,
        badgeLabel,
        badgeColor,
        type: note.type,
      });
    });

    // Sort: overdue first, then due today, then upcoming
    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [notes, todayStr, dismissedIds]);

  // Determine if there are unread / unacknowledged notifications
  // Indicator badge stays visible until bell is tapped/opened, or a new note appears
  const unreadCount = useMemo(() => {
    if (activeNotifications.length === 0) return 0;
    // Check if any active notification note was updated/created after lastSeenTime
    const hasNew = activeNotifications.some((item) => {
      const noteTime = new Date(item.note.updated_at || item.note.created_at || 0).getTime();
      return noteTime > lastSeenTime;
    });

    // If lastSeenTime is 0 (never opened), show full count (capped at 9+)
    if (lastSeenTime === 0 || hasNew) {
      return activeNotifications.length;
    }
    return 0;
  }, [activeNotifications, lastSeenTime]);

  // Handle bell icon click: toggle popover & clear unread indicator badge
  const handleToggleBell = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      // Mark as seen so red indicator badge disappears
      const now = Date.now();
      setLastSeenTime(now);
      try {
        localStorage.setItem(LAST_SEEN_STORAGE_KEY, String(now));
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Dismiss a single notification manually via cross icon
  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Clear / Dismiss all active notifications
  const handleClearAll = () => {
    const allIds = activeNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Tapping a notification: dismiss it, close menu, and navigate to Notes tab
  const handleTapNotification = (item: ActiveNotification) => {
    // 1. Dismiss this notification
    const updated = [...dismissedIds, item.id];
    setDismissedIds(updated);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }

    // 2. Close popover
    setIsOpen(false);

    // 3. Dispatch navigation to Notes & Dues route
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sd-navigate-tab', { detail: 'notes' })
      );
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={handleToggleBell}
        title={
          unreadCount > 0
            ? `${unreadCount} upcoming financial note${unreadCount > 1 ? 's' : ''} in the next 48 hours`
            : 'Financial Notifications'
        }
        className={`relative flex items-center justify-center rounded-xl p-2 transition-all ${
          isOpen
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
        }`}
      >
        <Bell className="h-4 w-4" />

        {/* Unread Indicator Badge (1 or 2, clears on bell open) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Responsive Dropdown Popover */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 z-50 sm:w-96 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden text-zinc-900 dark:text-zinc-100">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>Financial Alerts</span>
                  <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.2">
                    48h Window
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Dues, expected income &amp; reminders
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  title="Clear all alerts"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {activeNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCheck className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  All caught up!
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  No pending dues or reminders in the next 48 hours.
                </p>
              </div>
            ) : (
              activeNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleTapNotification(item)}
                  className="group relative flex items-start justify-between gap-3 p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer"
                >
                  {/* Left Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.status === 'overdue_missed' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    ) : item.type === 'I_OWE_THEM' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    ) : item.type === 'THEY_OWE_ME' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <ArrowDownLeft className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Clock className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${item.badgeColor}`}>
                        {item.badgeLabel}
                      </span>
                      {item.note.amount && (
                        <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                          {formatINR(item.note.amount)}
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white mt-1 truncate">
                      {item.title}
                    </h5>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                      {item.note.description || item.subtitle}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono">
                      <span>{formatDisplayDate(item.note.due_date!)}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-0.5">
                        <span>View in Notes</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>

                  {/* Manual Dismiss Cross Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDismissNotification(item.id, e)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="Dismiss alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400">
              Tap any alert to open its note &bull; Dismisses automatically after 48h
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

