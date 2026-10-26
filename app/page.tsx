'use client';

import React, { useState } from 'react';
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
import { Wallet, ShieldCheck, Database, Sparkles, RefreshCw } from 'lucide-react';

function MainAppContent() {
  const { isLoading: authLoading, isDemoUser, user } = useAuth();
  const { isInitialized, needsSetupWizard } = useLedger();

  // Top level modal controls
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Mobile quick action modals
  const [showMobileExpenseModal, setShowMobileExpenseModal] = useState(false);
  const [showMobileIncomeModal, setShowMobileIncomeModal] = useState(false);
  const [showMobileTransferModal, setShowMobileTransferModal] = useState(false);

  if (authLoading || !isInitialized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/20 animate-pulse">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Wallet className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">
              SD<span className="text-emerald-400">-Ledger</span>
            </h2>
            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 mt-1">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
              <span>Initializing secure offline storage...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Navbar */}
      <Navbar
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenSupabaseGuide={() => setShowGuideModal(true)}
        onOpenAuditTrail={() => setShowAuditModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {needsSetupWizard ? (
          <SetupWizard />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {!needsSetupWizard && (
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
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/60 py-6 text-center text-xs text-zinc-500 hidden sm:block">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">SD-Ledger</span>
            <span>&bull;</span>
            <span>Two-Account Personal Bank Ledger</span>
            <span>&bull;</span>
            <span className="text-emerald-400/80">Timezone: Asia/Kolkata (IST)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <button
              onClick={() => setShowGuideModal(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Supabase & Vercel Guide
            </button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Backup / Export
            </button>
            <button
              onClick={() => setShowAuditModal(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Audit Trail
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
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
    <AuthProvider>
      <LedgerProvider>
        <MainAppContent />
      </LedgerProvider>
    </AuthProvider>
  );
}
