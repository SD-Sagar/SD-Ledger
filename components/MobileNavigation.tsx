'use client';

import React, { useState } from 'react';
import {
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  Calculator,
  CloudUpload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';

interface MobileNavigationProps {
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  onOpenCalculator: () => void;
}

export function MobileNavigation({
  onOpenExpense,
  onOpenIncome,
  onOpenTransfer,
  onOpenCalculator,
}: MobileNavigationProps) {
  const { isDemoUser } = useAuth();
  const { pushLocalDataToCloud, uploadOfflineToCloud, syncStatus } = useLedger();
  const [isPushing, setIsPushing] = useState(false);

  const handlePushCloud = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to push to cloud.');
      return;
    }
    setIsPushing(true);
    try {
      if (isDemoUser) {
        await uploadOfflineToCloud();
      } else {
        await pushLocalDataToCloud();
      }
    } finally {
      setIsPushing(false);
    }
  };

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

        {/* Action 4: Quick Calculator */}
        <button
          type="button"
          onClick={onOpenCalculator}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group text-emerald-600 dark:text-emerald-400"
          title="Quick Calculator"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
            <Calculator className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Calculator
          </span>
        </button>

        {/* Action 5: Push to Cloud */}
        <button
          type="button"
          onClick={handlePushCloud}
          disabled={isPushing || syncStatus.isSyncing}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all cursor-pointer group text-cyan-600 dark:text-cyan-400 disabled:opacity-50"
          title={isDemoUser ? 'Upload changes to linked cloud' : 'Push localhost data to Supabase Cloud'}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 shadow-2xs group-hover:scale-105 transition-transform relative">
            <CloudUpload className={`h-4.5 w-4.5 ${isPushing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            {syncStatus.pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[9px] font-bold text-white shadow-xs">
                {syncStatus.pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate max-w-[62px]">
            {isPushing || syncStatus.isSyncing ? 'Pushing...' : 'Push Cloud'}
          </span>
        </button>
      </div>
    </nav>
  );
}
