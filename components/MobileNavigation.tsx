'use client';

import React from 'react';
import {
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface MobileNavigationProps {
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  onOpenBackup: () => void;
  onOpenCalculator?: () => void;
  onOpenAudit: () => void;
}

export function MobileNavigation({
  onOpenExpense,
  onOpenIncome,
  onOpenTransfer,
  onOpenBackup,
  onOpenAudit,
}: MobileNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/92 dark:bg-zinc-950/92 px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.45)] transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Quick Add Expense */}
        <button
          type="button"
          onClick={onOpenExpense}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group"
          title="Add Expense"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-2xs group-hover:scale-105 transition-transform">
            <MinusCircle className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
            Expense
          </span>
        </button>

        {/* Quick Add Income */}
        <button
          type="button"
          onClick={onOpenIncome}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group"
          title="Add Income"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
            <PlusCircle className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Income
          </span>
        </button>

        {/* Quick Transfer (Sassy Center Elevated Button) */}
        <button
          type="button"
          onClick={onOpenTransfer}
          className="flex flex-col items-center gap-1 -mt-3.5 active:scale-95 transition-all cursor-pointer group"
          title="Transfer Money Between Accounts"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-600/35 ring-3 ring-white dark:ring-zinc-950 group-hover:scale-105 transition-transform">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            Transfer
          </span>
        </button>

        {/* Audit Trail */}
        <button
          type="button"
          onClick={onOpenAudit}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group"
          title="Audit Trail Log"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shadow-2xs group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            Audit
          </span>
        </button>

        {/* Backup / Export */}
        <button
          type="button"
          onClick={onOpenBackup}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group"
          title="Backup & Export"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/25 text-teal-600 dark:text-teal-400 shadow-2xs group-hover:scale-105 transition-transform">
            <Download className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-teal-600 dark:group-hover:text-teal-400">
            Backup
          </span>
        </button>
      </div>
    </nav>
  );
}
