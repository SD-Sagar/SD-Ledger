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
  CloudDownload,
  RefreshCw,
} from 'lucide-react';

import { getSupabase } from '../lib/supabase/client';

interface SetupWizardProps {
  onOpenAuth?: (prompt?: string) => void;
}

export function SetupWizard({ onOpenAuth }: SetupWizardProps) {
  const { setupTwoAccounts, importAccountsFromCloud, setLinkedCloudAccount } = useLedger();
  const { user, isDemoUser } = useAuth();

  // Cloud Import State for Offline Mode
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

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

  const handleImportFromCloud = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setImportError(null);
    setIsImporting(true);

    try {
      if (!cloudEmail.trim() || !cloudPassword) {
        setImportError('Please enter both email and password.');
        setIsImporting(false);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        setImportError('Supabase is not configured yet. Please configure Supabase in settings.');
        setIsImporting(false);
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cloudEmail.trim(),
        password: cloudPassword,
      });

      if (authErr) {
        setImportError(authErr.message);
        setIsImporting(false);
        return;
      }

      const cloudUid = authData.user.id;
      const res = await importAccountsFromCloud(cloudUid);
      setIsImporting(false);

      if (res.success) {
        setLinkedCloudAccount(cloudEmail.trim(), cloudUid);
        setImportSuccess(`Successfully imported ${res.count} account(s)! Your offline workspace is ready.`);
      } else {
        setImportError(res.error || 'No accounts found in this cloud account. Create an online account first.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportError(msg);
      setIsImporting(false);
    }
  };

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

  // OFFLINE MODE SETUP: Manual creation forbidden; must import from cloud
  if (isDemoUser) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-2xl transition-colors">
          {/* Glow Effects */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />

          <div className="relative text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-0.5 shadow-xl shadow-cyan-600/20">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-zinc-950">
                <CloudDownload className="h-7 w-7 text-cyan-500 dark:text-cyan-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Link Online Account for Offline Mode
            </h1>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Offline account creation from scratch is disabled. To work offline, please link and import your bank accounts from an online Supabase account.
            </p>

            <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-left">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-normal">
                  <strong>Workflow:</strong> Enter your online Supabase account credentials below. Your personal bank accounts will be imported directly into this browser. You can then record expenses, income, transfers, and reconcile offline. When you are ready, tap <em>Upload to Cloud</em> to update your cloud ledger.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleImportFromCloud} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Online Supabase Email
              </label>
              <input
                type="email"
                required
                value={cloudEmail}
                onChange={(e) => setCloudEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={cloudPassword}
                onChange={(e) => setCloudPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {importError && (
              <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                {importError}
              </div>
            )}

            {importSuccess && (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                {importSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-xs font-semibold text-white shadow-lg shadow-cyan-900/20 hover:bg-cyan-500 disabled:opacity-50 transition-colors"
            >
              {isImporting && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{isImporting ? 'Connecting & Importing Accounts...' : 'Link & Import Cloud Accounts'}</span>
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800/80 pt-4 text-center space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Don&apos;t have an online Supabase account with bank accounts yet?
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenAuth) {
                  onOpenAuth('Create an online account first, set up your personal bank accounts, then link and import them into offline mode:');
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>Create Online Account First</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ONLINE MODE SETUP: Standard initial 2-account creation
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-2xl transition-colors">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />

        {/* Wizard Header */}
        <div className="relative text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-600/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-zinc-950">
              <Sparkles className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome to SD-Ledger
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Let&apos;s set up your ledger. SD-Ledger isolates your personal bank accounts with rock-solid atomicity.
          </p>

          {/* Privacy & Security Reassurance Banner */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-1 text-xs text-emerald-800 dark:text-emerald-300">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Zero Credentials Needed — No real bank account numbers or logins are ever required.</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Wizard Form for Manual Setup */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ACCOUNT 1 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 sm:p-5 relative transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Building2 className="h-4 w-4" />
                  Account 1 (Primary)
                </span>
                <div
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-emerald-500/30 dark:ring-zinc-800"
                  style={{ backgroundColor: acc1Color }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={acc1Name}
                    onChange={(e) => setAcc1Name(e.target.value)}
                    placeholder="e.g. HDFC Salary Account"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={acc1Balance}
                    onChange={(e) => setAcc1Balance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-zinc-900 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Preview: {formatINR(parseFloat(acc1Balance) || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {ACCOUNT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setAcc1Color(c.from)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          acc1Color === c.from ? 'scale-125 ring-2 ring-emerald-500 dark:ring-white' : 'opacity-70 hover:opacity-100'
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
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 sm:p-5 relative transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Building2 className="h-4 w-4" />
                  Account 2 (Secondary)
                </span>
                <div
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-indigo-500/30 dark:ring-zinc-800"
                  style={{ backgroundColor: acc2Color }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={acc2Name}
                    onChange={(e) => setAcc2Name(e.target.value)}
                    placeholder="e.g. SBI Savings / Cash"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={acc2Balance}
                    onChange={(e) => setAcc2Balance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-zinc-900 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Preview: {formatINR(parseFloat(acc2Balance) || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {ACCOUNT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setAcc2Color(c.from)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          acc2Color === c.from ? 'scale-125 ring-2 ring-indigo-500 dark:ring-white' : 'opacity-70 hover:opacity-100'
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
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Starting Date for Tracking
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Defaulted to today in India Standard Time (Asia/Kolkata). All future transactions will calculate from this starting point.
                </p>
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 py-3.5 px-6 text-sm font-semibold text-white shadow-xl shadow-emerald-950/20 transition-all hover:scale-[1.01] hover:brightness-110 disabled:opacity-50"
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
