'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Account,
  Transaction,
  Reconciliation,
  AuditLog,
  SyncStatus,
  LedgerSummary,
  SyncQueueItem,
} from '../lib/types';
import {
  idbGetAccounts,
  idbSaveAccount,
  idbSaveAccounts,
  idbGetTransactions,
  idbSaveTransaction,
  idbSaveTransactions,
  idbDeleteTransaction,
  idbGetReconciliations,
  idbSaveReconciliation,
  idbGetAuditLogs,
  idbSaveAuditLog,
  idbAddToSyncQueue,
  idbGetSyncQueue,
  idbGetMeta,
  idbExportDatabase,
  idbRestoreDatabase,
} from '../lib/db/indexedDB';
import { processSync } from '../lib/db/syncEngine';
import { computeLedgerSummary } from '../lib/ledger/balanceEngine';
import {
  generateUUID,
  getTodayKolkata,
  getCurrentTimeKolkata,
  exportTransactionsToCSV,
  downloadFile,
} from '../lib/utils/formatters';
import { DEMO_USER_ID } from '../lib/constants';

interface LedgerContextType {
  accounts: Account[];
  transactions: Transaction[];
  reconciliations: Reconciliation[];
  auditLogs: AuditLog[];
  syncStatus: SyncStatus;
  summary: LedgerSummary;
  isInitialized: boolean;
  needsSetupWizard: boolean;

  hasOfflineDataToMigrate: boolean;
  syncMessage: string | null;
  clearSyncMessage: () => void;

  // Actions
  setupTwoAccounts: (
    acc1: { name: string; balance: number; color?: string },
    acc2: { name: string; balance: number; color?: string },
    startDate: string
  ) => Promise<boolean>;

  addAccount: (data: {
    name: string;
    balance: number;
    color?: string;
    startDate?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  migrateDemoDataToCloud: (
    targetUserId: string
  ) => Promise<{ success: boolean; count: number; error?: string }>;

  addExpense: (data: {
    amount: number;
    fromAccountId: string;
    category: string;
    date: string;
    time?: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  addIncome: (data: {
    amount: number;
    toAccountId: string;
    category: string;
    date: string;
    time?: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  addTransfer: (data: {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    date: string;
    time?: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  updateTransaction: (
    updated: Transaction
  ) => Promise<{ success: boolean; error?: string }>;

  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;

  reconcileAccount: (
    accountId: string,
    actualBankBalance: number,
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;

  triggerSync: () => Promise<void>;
  exportCSV: () => void;
  exportJSON: () => Promise<void>;
  restoreJSON: (jsonStr: string) => Promise<{ success: boolean; error?: string }>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [hasOfflineDataToMigrate, setHasOfflineDataToMigrate] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const clearSyncMessage = useCallback(() => {
    setSyncMessage(null);
  }, []);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    errorMessage: null,
  });

  // Load all user data from local IndexedDB
  const refreshData = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const [accs, txs, recs, logs, lastSync, queue] = await Promise.all([
        idbGetAccounts(uid),
        idbGetTransactions(uid),
        idbGetReconciliations(uid),
        idbGetAuditLogs(uid),
        idbGetMeta<string>('last_synced_at'),
        idbGetSyncQueue(),
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setReconciliations(recs);
      setAuditLogs(logs);
      setSyncStatus((prev) => ({
        ...prev,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
      }));
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to load local ledger data:', err);
      setIsInitialized(true);
    }
  }, []);

  // Sync with Supabase (Flushes local queue to cloud and pulls latest remote data)
  const triggerSync = useCallback(async () => {
    if (!userId) return;
    const ok = await processSync(userId, (newStatus) => {
      setSyncStatus(newStatus);
    });
    // Refresh local cache after sync merge
    await refreshData(userId);
    if (ok) {
      setSyncMessage('Cloud Sync Complete: Local and cloud records are fully up to date.');
      setTimeout(() => setSyncMessage(null), 4000);
    }
  }, [userId, refreshData]);

  // Initial load when user changes
  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      setTransactions([]);
      setReconciliations([]);
      setAuditLogs([]);
      setIsInitialized(false);
      setHasOfflineDataToMigrate(false);
      return;
    }

    refreshData(userId).then(() => {
      // Auto-trigger sync once data is loaded
      triggerSync();

      // Check if user has offline demo data that can be migrated to this cloud account
      if (userId !== DEMO_USER_ID) {
        Promise.all([
          idbGetAccounts(DEMO_USER_ID),
          idbGetTransactions(DEMO_USER_ID),
        ]).then(([dAccs, dTxs]) => {
          if (dAccs.length > 0 || dTxs.length > 0) {
            setHasOfflineDataToMigrate(true);
          } else {
            setHasOfflineDataToMigrate(false);
          }
        });
      } else {
        setHasOfflineDataToMigrate(false);
      }
    });
  }, [userId, refreshData, triggerSync]);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
      if (userId) {
        triggerSync();
      }
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({
        ...prev,
        isOnline: false,
        errorMessage: 'Device is offline. Entries are securely cached in IndexedDB.',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId, triggerSync]);

  // Needs Setup Wizard if fewer than 2 active accounts exist
  const needsSetupWizard = isInitialized && accounts.length < 2;

  // Compute ledger summary
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    setCurrentMonth(getTodayKolkata().substring(0, 7));
  }, []);

  const summary = useMemo(() => {
    return computeLedgerSummary(accounts, transactions, reconciliations, currentMonth);
  }, [accounts, transactions, reconciliations, currentMonth]);

  // Setup Exactly Two Accounts
  const setupTwoAccounts = async (
    acc1: { name: string; balance: number; color?: string },
    acc2: { name: string; balance: number; color?: string },
    startDate: string
  ): Promise<boolean> => {
    if (!userId) return false;
    const nowIso = new Date().toISOString();

    const account1: Account = {
      id: generateUUID(),
      user_id: userId,
      display_name: acc1.name.trim() || 'Primary Account',
      opening_balance: Number(acc1.balance) || 0,
      opening_date: startDate || getTodayKolkata(),
      is_active: true,
      account_index: 1,
      bank_color: acc1.color || '#059669',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const account2: Account = {
      id: generateUUID(),
      user_id: userId,
      display_name: acc2.name.trim() || 'Secondary Account',
      opening_balance: Number(acc2.balance) || 0,
      opening_date: startDate || getTodayKolkata(),
      is_active: true,
      account_index: 2,
      bank_color: acc2.color || '#4f46e5',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await idbSaveAccounts([account1, account2]);

    // Queue for sync
    const syncItem1: SyncQueueItem = {
      id: generateUUID(),
      table: 'accounts',
      action: 'UPSERT',
      payload: account1 as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    };
    const syncItem2: SyncQueueItem = {
      id: generateUUID(),
      table: 'accounts',
      action: 'UPSERT',
      payload: account2 as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    };
    await idbAddToSyncQueue(syncItem1);
    await idbAddToSyncQueue(syncItem2);

    // Audit Log
    const audit: AuditLog = {
      id: generateUUID(),
      user_id: userId,
      action: 'SETUP',
      entity_type: 'ACCOUNT',
      entity_id: account1.id,
      summary: `Setup two accounts: "${account1.display_name}" and "${account2.display_name}"`,
      details: { account1, account2 },
      created_at: nowIso,
    };
    await idbSaveAuditLog(audit);

    await refreshData(userId);
    triggerSync();
    return true;
  };

  // Add Additional Account (3rd, 4th, 5th, etc.)
  const addAccount = async (data: {
    name: string;
    balance: number;
    color?: string;
    startDate?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!data.name.trim()) return { success: false, error: 'Please enter an account name.' };

    const nowIso = new Date().toISOString();
    const newAccount: Account = {
      id: generateUUID(),
      user_id: userId,
      display_name: data.name.trim(),
      opening_balance: Number(data.balance) || 0,
      opening_date: data.startDate || getTodayKolkata(),
      is_active: true,
      account_index: accounts.length + 1,
      bank_color: data.color || '#059669',
      created_at: nowIso,
      updated_at: nowIso,
    };

    await idbSaveAccount(newAccount);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'accounts',
      action: 'UPSERT',
      payload: newAccount as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'ACCOUNT',
      entity_id: newAccount.id,
      summary: `Created account "${newAccount.display_name}" (Opening balance: ₹${newAccount.opening_balance.toFixed(2)})`,
      details: { account: newAccount },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Migrate offline demo data to cloud account
  const migrateDemoDataToCloud = async (
    targetUserId: string
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!targetUserId) return { success: false, count: 0, error: 'No target user ID' };
    const nowIso = new Date().toISOString();

    const [demoAccs, demoTxs, demoRecs] = await Promise.all([
      idbGetAccounts(DEMO_USER_ID),
      idbGetTransactions(DEMO_USER_ID),
      idbGetReconciliations(DEMO_USER_ID),
    ]);

    if (demoAccs.length === 0 && demoTxs.length === 0) {
      setHasOfflineDataToMigrate(false);
      return { success: true, count: 0 };
    }

    const updatedAccs: Account[] = demoAccs.map((a, idx) => ({
      ...a,
      user_id: targetUserId,
      account_index: accounts.length + idx + 1,
      updated_at: nowIso,
    }));

    const updatedTxs: Transaction[] = demoTxs.map((t) => ({
      ...t,
      user_id: targetUserId,
      updated_at: nowIso,
    }));

    const updatedRecs: Reconciliation[] = demoRecs.map((r) => ({
      ...r,
      user_id: targetUserId,
    }));

    await idbSaveAccounts(updatedAccs);
    await idbSaveTransactions(updatedTxs);
    for (const r of updatedRecs) {
      await idbSaveReconciliation(r);
    }

    // Queue for sync to Supabase cloud
    for (const acc of updatedAccs) {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'accounts',
        action: 'UPSERT',
        payload: acc as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
    }

    for (const tx of updatedTxs) {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'UPSERT',
        payload: tx as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
    }

    for (const rec of updatedRecs) {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'reconciliations',
        action: 'UPSERT',
        payload: rec as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
    }

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: targetUserId,
      action: 'SETUP',
      entity_type: 'SYSTEM',
      entity_id: targetUserId,
      summary: `Synced ${updatedAccs.length} accounts and ${updatedTxs.length} transactions from offline demo to Cloud account`,
      details: { accountCount: updatedAccs.length, txCount: updatedTxs.length },
      created_at: nowIso,
    });

    setHasOfflineDataToMigrate(false);
    await refreshData(targetUserId);
    await triggerSync();
    return { success: true, count: updatedAccs.length + updatedTxs.length };
  };

  // Add Expense
  const addExpense = async (data: {
    amount: number;
    fromAccountId: string;
    category: string;
    date: string;
    time?: string;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (!data.fromAccountId) {
      return { success: false, error: 'Please select an account.' };
    }

    const nowIso = new Date().toISOString();
    const txId = generateUUID();

    const tx: Transaction = {
      id: txId,
      user_id: userId,
      type: 'EXPENSE',
      amount: Math.round(Number(data.amount) * 100) / 100,
      transaction_date: data.date || getTodayKolkata(),
      transaction_time: data.time || getCurrentTimeKolkata(),
      from_account_id: data.fromAccountId,
      to_account_id: null,
      category: data.category || 'General',
      description: data.description?.trim() || '',
      created_at: nowIso,
      updated_at: nowIso,
      sync_status: 'pending',
    };

    await idbSaveTransaction(tx);

    // Add to sync queue
    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'transactions',
      action: 'UPSERT',
      payload: tx as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    // Audit log
    const acc = accounts.find((a) => a.id === data.fromAccountId);
    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'TRANSACTION',
      entity_id: txId,
      summary: `Added Expense ₹${tx.amount.toFixed(2)} from ${acc?.display_name || 'Account'} (${tx.category})`,
      details: { transaction: tx },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Add Income
  const addIncome = async (data: {
    amount: number;
    toAccountId: string;
    category: string;
    date: string;
    time?: string;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (!data.toAccountId) {
      return { success: false, error: 'Please select a receiving account.' };
    }

    const nowIso = new Date().toISOString();
    const txId = generateUUID();

    const tx: Transaction = {
      id: txId,
      user_id: userId,
      type: 'INCOME',
      amount: Math.round(Number(data.amount) * 100) / 100,
      transaction_date: data.date || getTodayKolkata(),
      transaction_time: data.time || getCurrentTimeKolkata(),
      from_account_id: null,
      to_account_id: data.toAccountId,
      category: data.category || 'Salary',
      description: data.description?.trim() || '',
      created_at: nowIso,
      updated_at: nowIso,
      sync_status: 'pending',
    };

    await idbSaveTransaction(tx);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'transactions',
      action: 'UPSERT',
      payload: tx as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    const acc = accounts.find((a) => a.id === data.toAccountId);
    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'TRANSACTION',
      entity_id: txId,
      summary: `Added Income ₹${tx.amount.toFixed(2)} into ${acc?.display_name || 'Account'} (${tx.category})`,
      details: { transaction: tx },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Add Transfer (Atomic logical transfer between the two accounts)
  const addTransfer = async (data: {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    date: string;
    time?: string;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (!data.fromAccountId || !data.toAccountId) {
      return { success: false, error: 'Both source and destination accounts are required.' };
    }
    if (data.fromAccountId === data.toAccountId) {
      return { success: false, error: 'Source and destination accounts must be different.' };
    }

    const nowIso = new Date().toISOString();
    const txId = generateUUID();

    const tx: Transaction = {
      id: txId,
      user_id: userId,
      type: 'TRANSFER',
      amount: Math.round(Number(data.amount) * 100) / 100,
      transaction_date: data.date || getTodayKolkata(),
      transaction_time: data.time || getCurrentTimeKolkata(),
      from_account_id: data.fromAccountId,
      to_account_id: data.toAccountId,
      category: 'Account Transfer',
      description: data.description?.trim() || '',
      created_at: nowIso,
      updated_at: nowIso,
      sync_status: 'pending',
    };

    // Single atomic record update updates both balances consistently!
    await idbSaveTransaction(tx);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'transactions',
      action: 'UPSERT',
      payload: tx as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
    const toAcc = accounts.find((a) => a.id === data.toAccountId);

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'TRANSACTION',
      entity_id: txId,
      summary: `Transferred ₹${tx.amount.toFixed(2)} from ${fromAcc?.display_name} to ${toAcc?.display_name}`,
      details: { transaction: tx },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Update Transaction
  const updateTransaction = async (
    updated: Transaction
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!updated.amount || updated.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }

    const previous = transactions.find((t) => t.id === updated.id);
    const nowIso = new Date().toISOString();

    const cleanUpdated: Transaction = {
      ...updated,
      user_id: userId,
      amount: Math.round(Number(updated.amount) * 100) / 100,
      updated_at: nowIso,
      sync_status: 'pending',
    };

    await idbSaveTransaction(cleanUpdated);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'transactions',
      action: 'UPSERT',
      payload: cleanUpdated as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'TRANSACTION',
      entity_id: updated.id,
      summary: `Updated ${updated.type} entry (${formatINR(updated.amount)})`,
      details: { previous, updated: cleanUpdated },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Delete Transaction (Soft delete for sync propagation & audit trail)
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = transactions.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Transaction not found.' };

    const nowIso = new Date().toISOString();

    await idbDeleteTransaction(id, userId);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'transactions',
      action: 'DELETE',
      payload: { id },
      created_at: nowIso,
      retries: 0,
    });

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'DELETE',
      entity_type: 'TRANSACTION',
      entity_id: id,
      summary: `Deleted ${target.type} of ₹${target.amount.toFixed(2)} (${target.category})`,
      details: { deletedTransaction: target },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Reconcile Account Balance
  const reconcileAccount = async (
    accountId: string,
    actualBankBalance: number,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'Account not found.' };

    const calculated = summary.accounts.find((a) => a.account.id === accountId)?.calculatedBalance || 0;
    const diff = Math.round((Number(actualBankBalance) - calculated) * 100) / 100;
    const nowIso = new Date().toISOString();
    const recId = generateUUID();

    const rec: Reconciliation = {
      id: recId,
      user_id: userId,
      account_id: accountId,
      reconciled_date: getTodayKolkata(),
      actual_bank_balance: Number(actualBankBalance),
      calculated_balance: calculated,
      difference: diff,
      notes: notes?.trim() || '',
      created_at: nowIso,
    };

    await idbSaveReconciliation(rec);

    await idbAddToSyncQueue({
      id: generateUUID(),
      table: 'reconciliations',
      action: 'UPSERT',
      payload: rec as unknown as Record<string, unknown>,
      created_at: nowIso,
      retries: 0,
    });

    await idbSaveAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'RECONCILE',
      entity_type: 'RECONCILIATION',
      entity_id: recId,
      summary: `Reconciled ${account.display_name}: Statement ₹${actualBankBalance.toFixed(2)}, Diff: ₹${diff.toFixed(2)}`,
      details: { reconciliation: rec },
      created_at: nowIso,
    });

    await refreshData(userId);
    triggerSync();
    return { success: true };
  };

  // Export CSV
  const exportCSV = () => {
    const csv = exportTransactionsToCSV(transactions, accounts);
    const dateStr = getTodayKolkata();
    downloadFile(csv, `SD-Ledger-Transactions-${dateStr}.csv`, 'text/csv');
  };

  // Export JSON Backup
  const exportJSON = async () => {
    if (!userId) return;
    const backup = await idbExportDatabase(userId);
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = getTodayKolkata();
    downloadFile(jsonStr, `SD-Ledger-Backup-${dateStr}.json`, 'application/json');
  };

  // Restore JSON Backup
  const restoreJSON = async (jsonStr: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'Please log in to restore backup.' };
    try {
      const backup = JSON.parse(jsonStr);
      await idbRestoreDatabase(userId, backup);

      await idbSaveAuditLog({
        id: generateUUID(),
        user_id: userId,
        action: 'RESTORE',
        entity_type: 'SYSTEM',
        entity_id: userId,
        summary: `Restored backup containing ${backup.accounts?.length || 0} accounts and ${backup.transactions?.length || 0} transactions`,
        details: { backupExportedAt: backup.exportedAt },
        created_at: new Date().toISOString(),
      });

      await refreshData(userId);
      triggerSync();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON file format';
      return { success: false, error: msg };
    }
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        transactions,
        reconciliations,
        auditLogs,
        syncStatus,
        summary,
        isInitialized,
        needsSetupWizard,
        hasOfflineDataToMigrate,
        syncMessage,
        clearSyncMessage,
        setupTwoAccounts,
        addAccount,
        migrateDemoDataToCloud,
        addExpense,
        addIncome,
        addTransfer,
        updateTransaction,
        deleteTransaction,
        reconcileAccount,
        triggerSync,
        exportCSV,
        exportJSON,
        restoreJSON,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}

function formatINR(val: number) {
  return `₹${val.toFixed(2)}`;
}
