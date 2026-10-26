'use client';

import React, { useState } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LedgerProvider, useLedger } from '../context/LedgerContext';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { SetupWizard } from '../components/SetupWizard';
import { AuthModal } from '../components/AuthModal';
import { BackupRestoreModal } from '../components/BackupRestoreModal';
import { SupabaseGuideModal } from '../components/SupabaseGuideModal';
import { AuditTrailModal } from '../components/AuditTrailModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { TransferModal } from '../components/TransferModal';
import { MobileNavigation } from '../components/MobileNavigation';
import { Wallet, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

function MainAppContent() {
  const { isLoading: authLoading, user, continueAsDemo } = useAuth();
  const { isInitialized, needsSetupWizard } = useLedger();

  // Top level modal controls
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Mobile quick action modals
  const [showMobileExpenseModal, setShowMobileExpenseModal] = useState(false);
  const [showMobileIncomeModal, setShowMobileIncomeModal] = useState(false);
  const [showMobileTransferModal, setShowMobileTransferModal] = useState(false);

  const handleOpenAuth = (prompt?: string) => {
    setAuthPromptMessage(prompt || null);
    setShowAuthModal(true);
  };

  const handleCloseAuth = () => {
    setShowAuthModal(false);
    setAuthPromptMessage(null);
  };

  if (authLoading || !isInitialized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/20 animate-pulse">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-zinc-950">
              <Wallet className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              SD<span className="text-emerald-500 dark:text-emerald-400">-Ledger</span>
            </h2>
            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 mt-1">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-500 dark:text-emerald-400" />
              <span>Initializing secure offline storage...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenSupabaseGuide={() => setShowGuideModal(true)}
        onOpenAuditTrail={() => setShowAuditModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {!user ? (
          <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-2xl text-center">
              <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />

              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-600/20">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-zinc-950">
                    <Wallet className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Welcome to SD-Ledger
                </h1>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Offline-first personal bank ledger with Supabase cloud sync, atomic transfers, and bank statement reconciliation.
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleOpenAuth()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 hover:bg-emerald-500 transition-colors"
                  >
                    <span>Sign In or Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => continueAsDemo()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span>Continue in Local Offline Mode</span>
                  </button>

                  <button
                    onClick={() => setShowGuideModal(true)}
                    className="w-full text-center text-xs text-zinc-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors pt-1"
                  >
                    Need to set up Supabase? Open Guide &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : needsSetupWizard ? (
          <SetupWizard onOpenAuth={handleOpenAuth} />
        ) : (
          <Dashboard onOpenAuth={handleOpenAuth} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {user && !needsSetupWizard && (
        <MobileNavigation
          onOpenExpense={() => setShowMobileExpenseModal(true)}
          onOpenIncome={() => setShowMobileIncomeModal(true)}
          onOpenTransfer={() => setShowMobileTransferModal(true)}
          onOpenBackup={() => setShowBackupModal(true)}
          onOpenGuide={() => setShowGuideModal(true)}
          onOpenAudit={() => setShowAuditModal(true)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/60 py-6 text-center text-xs text-zinc-500 hidden sm:block">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-400">SD-Ledger</span>
            <span>&bull;</span>
            <span>Personal Bank Ledger</span>
            <span>&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400/80">Timezone: Asia/Kolkata (IST)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => setShowGuideModal(true)}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Supabase & Vercel Guide
            </button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Backup / Export
            </button>
            <button
              onClick={() => setShowAuditModal(true)}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Audit Trail
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        promptMessage={authPromptMessage}
        onClose={handleCloseAuth}
      />

      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />

      <SupabaseGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      <AuditTrailModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      {/* Mobile Action Modals */}
      <AddTransactionModal
        isOpen={showMobileExpenseModal}
        initialType="EXPENSE"
        onClose={() => setShowMobileExpenseModal(false)}
      />

      <AddTransactionModal
        isOpen={showMobileIncomeModal}
        initialType="INCOME"
        onClose={() => setShowMobileIncomeModal(false)}
      />

      <TransferModal
        isOpen={showMobileTransferModal}
        onClose={() => setShowMobileTransferModal(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LedgerProvider>
          <MainAppContent />
        </LedgerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
