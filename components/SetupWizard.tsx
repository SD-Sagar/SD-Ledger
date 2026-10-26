'use client';

import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { getTodayKolkata, formatINR } from '../lib/utils/formatters';
import { ACCOUNT_COLORS } from '../lib/constants';
import {
  Building2,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Wallet,
} from 'lucide-react';

export function SetupWizard() {
  const { setupTwoAccounts } = useLedger();
  const { user } = useAuth();

  // Account 1
  const [acc1Name, setAcc1Name] = useState('HDFC Bank');
  const [acc1Balance, setAcc1Balance] = useState('50000');
  const [acc1Color, setAcc1Color] = useState(ACCOUNT_COLORS[0].from);

  // Account 2
  const [acc2Name, setAcc2Name] = useState('SBI / Cash');
  const [acc2Balance, setAcc2Balance] = useState('15000');
  const [acc2Color, setAcc2Color] = useState(ACCOUNT_COLORS[1].from);

  // Starting Date
  const [startDate, setStartDate] = useState('');

  React.useEffect(() => {
    setStartDate(getTodayKolkata());
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acc1Name.trim()) {
      setError('Please provide a name for Account 1.');
      return;
    }
    if (!acc2Name.trim()) {
      setError('Please provide a name for Account 2.');
      return;
    }

    const bal1 = parseFloat(acc1Balance);
    const bal2 = parseFloat(acc2Balance);

    if (isNaN(bal1) || isNaN(bal2)) {
      setError('Opening balances must be valid numbers.');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupTwoAccounts(
        { name: acc1Name, balance: bal1, color: acc1Color },
        { name: acc2Name, balance: bal2, color: acc2Color },
        startDate
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Setup failed';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />

        {/* Wizard Header */}
        <div className="relative text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-600/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Sparkles className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome to SD-Ledger
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-md mx-auto">
            Let&apos;s set up your ledger. SD-Ledger tracks exactly two personal bank accounts with rock-solid atomicity and offline sync.
          </p>

          {/* Privacy & Security Reassurance Banner */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3.5 py-1 text-xs text-emerald-300">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Zero Credentials Needed — No real bank account numbers or logins are ever required.</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ACCOUNT 1 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 relative transition-all hover:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Building2 className="h-4 w-4" />
                  Account 1 (Primary)
                </span>
                <div
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-zinc-800"
                  style={{ backgroundColor: acc1Color }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={acc1Name}
                    onChange={(e) => setAcc1Name(e.target.value)}
                    placeholder="e.g. HDFC Salary Account"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={acc1Balance}
                    onChange={(e) => setAcc1Balance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Preview: {formatINR(parseFloat(acc1Balance) || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {ACCOUNT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setAcc1Color(c.from)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          acc1Color === c.from ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.from }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACCOUNT 2 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 relative transition-all hover:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  <Building2 className="h-4 w-4" />
                  Account 2 (Secondary)
                </span>
                <div
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-zinc-800"
                  style={{ backgroundColor: acc2Color }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={acc2Name}
                    onChange={(e) => setAcc2Name(e.target.value)}
                    placeholder="e.g. SBI Savings / Cash"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={acc2Balance}
                    onChange={(e) => setAcc2Balance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Preview: {formatINR(parseFloat(acc2Balance) || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {ACCOUNT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setAcc2Color(c.from)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          acc2Color === c.from ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.from }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STARTING DATE PICKER */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  Starting Date for Tracking
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Defaulted to today in India Standard Time (Asia/Kolkata). All future transactions will calculate from this starting point.
                </p>
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 py-3.5 px-6 text-sm font-semibold text-white shadow-xl shadow-emerald-950 transition-all hover:scale-[1.01] hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? (
              'Creating Your Two Bank Accounts...'
            ) : (
              <>
                <span>Complete Setup & Open Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
