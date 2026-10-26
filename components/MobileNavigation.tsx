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
    <nav className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden border-t border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center justify-around">
        {/* Quick Add Expense */}
        <button
          onClick={onOpenExpense}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-rose-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950/60 border border-rose-900/60 text-rose-400">
            <MinusCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Expense</span>
        </button>

        {/* Quick Add Income */}
        <button
          onClick={onOpenIncome}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/60 border border-emerald-900/60 text-emerald-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Income</span>
        </button>

        {/* Quick Transfer */}
        <button
          onClick={onOpenTransfer}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-950/60 border border-indigo-900/60 text-indigo-400">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Transfer</span>
        </button>

        {/* Audit Trail */}
        <button
          onClick={onOpenAudit}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Audit</span>
        </button>

        {/* Backup / Export */}
        <button
          onClick={onOpenBackup}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-teal-400">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Backup</span>
        </button>
      </div>
    </nav>
  );
}
