'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import {
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
  Download,
  Database,
  User,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import { DEMO_USER_ID } from '../lib/constants';

interface NavbarProps {
  onOpenAuth: (prompt?: string) => void;
  onOpenBackup: () => void;
  onOpenSupabaseGuide: () => void;
  onOpenAuditTrail: () => void;
}

export function Navbar({
  onOpenAuth,
  onOpenBackup,
  onOpenSupabaseGuide,
  onOpenAuditTrail,
}: NavbarProps) {
  const { user, isDemoUser, signOut } = useAuth();
  const { syncStatus, uploadOfflineToCloud, linkedCloudAccount, clearLocalData } = useLedger();
  const { theme, toggleTheme } = useTheme();

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [clearDataOnSwitch, setClearDataOnSwitch] = useState(false);

  const handleUploadClick = async () => {
    if (!navigator.onLine) {
      alert('Device is currently offline. Connect to the internet to upload changes to the cloud.');
      return;
    }

    const res = await uploadOfflineToCloud();
    if (res && res.requiresAuth) {
      onOpenAuth(res.message || 'Please sign in with your linked cloud account to upload offline changes.');
    }
  };

  const handleConfirmSwitch = async () => {
    if (clearDataOnSwitch) {
      await clearLocalData(DEMO_USER_ID);
    }
    setShowSwitchModal(false);
    onOpenAuth('Sign in with the new cloud account you wish to link and import into offline mode:');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white dark:bg-zinc-950 transition-colors">
                <Wallet className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  SD<span className="text-emerald-500 dark:text-emerald-400">-Ledger</span>
                </span>
                <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20 sm:inline-block">
                  Personal Bank Ledger
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Offline-First • Smart Merge • Supabase Cloud Sync • Dark/Light
              </p>
            </div>
          </div>

          {/* Sync Status & Navigation Action Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* OFFLINE MODE ONLY: Linked Cloud Badge & Upload to Cloud Button */}
            {isDemoUser && (
              <>
                {/* Linked Cloud Account Badge */}
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/80 dark:bg-cyan-950/40 px-2.5 py-1.5 text-xs font-medium text-cyan-800 dark:text-cyan-300"
                  title={linkedCloudAccount ? `Linked Cloud: ${linkedCloudAccount}` : 'No cloud account linked yet'}
                >
                  <Database className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="max-w-[120px] sm:max-w-[160px] truncate">
                    {linkedCloudAccount ? linkedCloudAccount : 'No Cloud Linked'}
                  </span>
                </div>

                {/* Upload to Cloud Button */}
                <button
                  onClick={handleUploadClick}
                  disabled={syncStatus.isSyncing}
                  title={
                    syncStatus.pendingCount > 0
                      ? `${syncStatus.pendingCount} pending offline changes`
                      : 'Upload offline changes to linked cloud account'
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${
                      syncStatus.isSyncing ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {syncStatus.isSyncing
                      ? 'Uploading...'
                      : syncStatus.pendingCount > 0
                      ? `Upload (${syncStatus.pendingCount})`
                      : 'Upload to Cloud'}
                  </span>
                </button>
              </>
            )}

            {/* Online / Offline status badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border ${
                syncStatus.isOnline
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950/60 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-950/60 dark:bg-amber-950/30 dark:text-amber-400'
              }`}
            >
              {syncStatus.isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 p-2 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Audit Trail Button */}
            <button
              onClick={onOpenAuditTrail}
              title="Audit Trail Log"
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Audit Trail</span>
            </button>

            {/* Backup / Export Button */}
            <button
              onClick={onOpenBackup}
              title="CSV Export & JSON Backup / Restore"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Supabase Guide Button */}
            <button
              onClick={onOpenSupabaseGuide}
              title="Supabase Setup & SQL RLS Guide"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs font-medium dark:text-emerald-300 transition-colors dark:hover:bg-emerald-900/40"
            >
              <Database className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden sm:inline">Supabase Setup</span>
            </button>

            {/* User Profile & Account Switching Tools */}
            {user ? (
              <div className="flex items-center gap-1.5">
                {/* Switch Account Button - ONLY shown in offline mode */}
                {isDemoUser && (
                  <button
                    type="button"
                    onClick={() => setShowSwitchModal(true)}
                    title="Switch or Connect Account"
                    className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeftRight className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                    <span className="hidden xl:inline">Switch</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenAuth()}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[100px] truncate hidden md:inline">
                    {user.fullName || user.email}
                  </span>
                  {isDemoUser && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      Offline
                    </span>
                  )}
                </button>

                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 p-2 text-zinc-500 dark:text-zinc-400 hover:border-rose-300 dark:hover:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20"
              >
                <User className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SWITCH / CHANGE ACCOUNT CONFIRMATION MODAL */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Switch Cloud Account</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Change linked user account</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2">
              You are currently active as <strong className="font-semibold text-zinc-900 dark:text-white">{user?.email || 'Offline Demo User'}</strong>.
              Switching will sign you out so you can log in with a different existing account.
            </p>

            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearDataOnSwitch}
                  onChange={(e) => setClearDataOnSwitch(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Remove local cached ledger for this account
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    If checked, clears this user's local offline IndexedDB cache to keep the new account completely clean.
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
              >
                Proceed & Switch Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
