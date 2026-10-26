'use client';

import React from 'react';
import {
  Wallet,
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  Settings,
  Database,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface MobileNavigationProps {
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  onOpenBackup: () => void;
  onOpenGuide: () => void;
  onOpenAudit: () => void;
}

export function MobileNavigation({
  onOpenExpense,
  onOpenIncome,
  onOpenTransfer,
  onOpenBackup,
  onOpenGuide,
  onOpenAudit,
}: MobileNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 px-3 py-2 backdrop-blur-xl transition-colors">
      <div className="flex items-center justify-around">
        {/* Quick Add Expense */}
        <button
          onClick={onOpenExpense}
          className="flex flex-col items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400">
            <MinusCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Expense</span>
        </button>

        {/* Quick Add Income */}
        <button
          onClick={onOpenIncome}
          className="flex flex-col items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Income</span>
        </button>

        {/* Quick Transfer */}
        <button
          onClick={onOpenTransfer}
          className="flex flex-col items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Transfer</span>
        </button>

        {/* Audit Trail */}
        <button
          onClick={onOpenAudit}
          className="flex flex-col items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Audit</span>
        </button>

        {/* Backup / Export */}
        <button
          onClick={onOpenBackup}
          className="flex flex-col items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-teal-600 dark:text-teal-400">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Backup</span>
        </button>
      </div>
    </nav>
  );
}
