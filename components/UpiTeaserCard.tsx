'use client';

import React from 'react';
import {
  Zap,
  QrCode,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export function UpiTeaserCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/40 dark:via-zinc-950 dark:to-zinc-950 p-6 shadow-xl dark:shadow-2xl transition-colors duration-200">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  UPI & Bank Transaction Auto-Sync
                </h3>
                <span className="rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Next-generation zero-credential transaction ingestion for India
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center rounded-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Feature Pipeline v2.0</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">UPI SMS Parsing</h4>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Auto-detect debit & credit SMS from Google Pay, PhonePe, Paytm, and BHIM instantly on device.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Bank PDF Importer</h4>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Drag & drop bank statement PDFs (HDFC, SBI, ICICI, Axis) with automatic balance alignment.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">100% Local Privacy</h4>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              No net-banking passwords or account numbers needed. Transactions parse completely in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Built directly into your SD-Ledger offline sync engine</span>
          </div>
          <span className="font-mono text-zinc-500 dark:text-zinc-400">Available in next release</span>
        </div>
      </div>
    </div>
  );
}
