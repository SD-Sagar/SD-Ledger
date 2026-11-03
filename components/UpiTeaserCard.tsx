'use client';

import React from 'react';
import {
  Zap,
  QrCode,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export function UpiTeaserCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-zinc-950 dark:to-violet-950/20 px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Icon & Title & Tagline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm shadow-indigo-600/20">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                UPI &amp; Bank Auto-Sync
              </h4>
              <span className="rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                Coming Soon &bull; v2.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              Zero-credential on-device UPI SMS parsing &amp; Bank PDF statements
            </p>
          </div>
        </div>

        {/* Right: Sleek mini feature badges */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <QrCode className="h-3 w-3 text-emerald-500" />
            <span>UPI SMS</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <FileText className="h-3 w-3 text-teal-500" />
            <span>Bank PDFs</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <ShieldCheck className="h-3 w-3 text-indigo-500" />
            <span>100% Local</span>
          </span>
        </div>
      </div>
    </div>
  );
}
