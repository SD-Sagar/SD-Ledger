'use client';

import React from 'react';
import {
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  StickyNote,
  Activity,
} from 'lucide-react';

interface MobileNavigationProps {
  activeTab: 'overview' | 'accounts' | 'transactions' | 'notes' | 'reconcile';
  onSelectTab: (tab: 'overview' | 'accounts' | 'transactions' | 'notes' | 'reconcile') => void;
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  unresolvedNotesCount?: number;
}

export function MobileNavigation({
  activeTab,
  onSelectTab,
  onOpenExpense,
  onOpenIncome,
  onOpenTransfer,
  unresolvedNotesCount = 0,
}: MobileNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/92 dark:bg-zinc-950/92 px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.45)] transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Action 1: Add Expense */}
        <button
          type="button"
          onClick={onOpenExpense}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group text-rose-600 dark:text-rose-400"
          title="Add Expense"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-2xs group-hover:scale-105 transition-transform">
            <MinusCircle className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
            Expense
          </span>
        </button>

        {/* Action 2: Add Income */}
        <button
          type="button"
          onClick={onOpenIncome}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group text-emerald-600 dark:text-emerald-400"
          title="Add Income"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
            <PlusCircle className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Income
          </span>
        </button>

        {/* Action 3: Transfer (Evenly aligned on same baseline) */}
        <button
          type="button"
          onClick={onOpenTransfer}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group text-indigo-600 dark:text-indigo-400"
          title="Transfer Money Between Accounts"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shadow-2xs group-hover:scale-105 transition-transform">
            <ArrowRightLeft className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-extrabold tracking-tight">Transfer</span>
        </button>

        {/* Tab 4: Notes & Dues */}
        <button
          type="button"
          onClick={() => onSelectTab('notes')}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group relative ${
            activeTab === 'notes'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Notes & Dues"
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl relative transition-all ${
              activeTab === 'notes'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-500/30'
                : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <StickyNote className="h-4.5 w-4.5" />
            {unresolvedNotesCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                {unresolvedNotesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Notes</span>
        </button>

        {/* Tab 5: Overview & Trends */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group ${
            activeTab === 'overview'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Overview & Trends"
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Activity className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight">Trends</span>
        </button>
      </div>
    </nav>
  );
}
