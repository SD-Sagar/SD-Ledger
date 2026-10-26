'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import {
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudCheck,
  CloudOff,
  ShieldCheck,
  Download,
  Database,
  User,
  LogOut,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
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
  const { user, isDemoUser, isSupabaseReady, signOut } = useAuth();
  const { syncStatus, triggerSync } = useLedger();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                SD<span className="text-emerald-400">-Ledger</span>
              </span>
              <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20 sm:inline-block">
                Two-Account Bank Ledger
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Offline-First • Supabase Cloud Sync • RLS Secure
            </p>
          </div>
        </div>

        {/* Sync Status & Navigation Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Button & Status */}
          <button
            onClick={() => triggerSync()}
            disabled={syncStatus.isSyncing}
            title={
              syncStatus.lastSyncedAt
                ? `Last Synced: ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('en-IN')}`
                : 'Click to sync now'
            }
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-emerald-400 ${
                syncStatus.isSyncing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden md:inline">
              {syncStatus.isSyncing
                ? 'Syncing...'
                : syncStatus.pendingCount > 0
                ? `${syncStatus.pendingCount} Pending`
                : 'Synced'}
            </span>
            {syncStatus.pendingCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>

          {/* Online / Offline status badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border ${
              syncStatus.isOnline
                ? 'border-emerald-950/60 bg-emerald-950/30 text-emerald-400'
                : 'border-amber-950/60 bg-amber-950/30 text-amber-400'
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

          {/* Audit Trail Button */}
          <button
            onClick={onOpenAuditTrail}
            title="Audit Trail Log"
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Audit Trail</span>
          </button>

          {/* Backup / Export Button */}
          <button
            onClick={onOpenBackup}
            title="CSV Export & JSON Backup / Restore"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <Download className="h-3.5 w-3.5 text-teal-400" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Supabase Guide Button */}
          <button
            onClick={onOpenSupabaseGuide}
            title="Supabase Setup & SQL RLS Guide"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40"
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Supabase Setup</span>
          </button>

          {/* User Profile / Auth Toggle */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <span className="max-w-[100px] truncate hidden md:inline">
                  {user.fullName || user.email}
                </span>
                {isDemoUser && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20">
                    Demo
                  </span>
                )}
              </button>

              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:border-rose-900/60 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
