'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Account,
  Transaction,
  Reconciliation,
  AuditLog,
  FinancialNote,
  NoteType,
  NoteColor,
  SyncStatus,
  LedgerSummary,
  SyncQueueItem,
} from '../lib/types';
import {
  idbGetAccounts,
  idbSaveAccount,
  idbSaveAccounts,
  idbDeleteAccount,
  idbClearUserData,
  idbGetTransactions,
  idbSaveTransaction,
  idbSaveTransactions,
  idbDeleteTransaction,
  idbGetReconciliations,
  idbSaveReconciliation,
  idbGetAuditLogs,
  idbSaveAuditLog,
  idbGetNotes,
  idbSaveNote,
  idbSaveNotes,
  idbDeleteNote,
  idbAddToSyncQueue,
  idbGetSyncQueue,
  idbGetMeta,
  idbExportDatabase,
  idbRestoreDatabase,
  idbUpdateTransactionAccountIds,
  idbUpdateReconciliationAccountIds,
  idbRemapQueueAccountId,
  idbGetDeletedTransactionIds,
  idbMarkTransactionDeleted,
} from '../lib/db/indexedDB';
import { processSync, SyncResult } from '../lib/db/syncEngine';
import { computeLedgerSummary } from '../lib/ledger/balanceEngine';
import { getSupabase } from '../lib/supabase/client';
import {
  generateUUID,
  getTodayKolkata,
  getSixMonthsAgoKolkata,
  getCurrentTimeKolkata,
  exportTransactionsToCSV,
  downloadFile,
} from '../lib/utils/formatters';
import {
  DEMO_USER_ID,
  MAX_AUDIT_TRAIL_LIMIT,
  RESOLVED_NOTES_RETENTION_DAYS,
  TRANSACTION_HISTORY_MONTHS_LIMIT,
} from '../lib/constants';

interface LedgerContextType {
  accounts: Account[];
  transactions: Transaction[];
  reconciliations: Reconciliation[];
  auditLogs: AuditLog[];
  notes: FinancialNote[];
  syncStatus: SyncStatus;
  summary: LedgerSummary;
  isInitialized: boolean;
  needsSetupWizard: boolean;

  hasOfflineDataToMigrate: boolean;
  syncMessage: string | null;
  clearSyncMessage: () => void;

  linkedCloudAccount: string | null;
  linkedCloudUserId: string | null;
  setLinkedCloudAccount: (email: string, uid: string) => void;
  clearLinkedCloudAccount: () => void;
  uploadOfflineToCloud: () => Promise<SyncResult>;
  pullLatestFromCloud: () => Promise<{ success: boolean; count: number; error?: string }>;
  pushLocalDataToCloud: () => Promise<{ success: boolean; count: number; error?: string }>;

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

  deleteAccount: (
    accountId: string
  ) => Promise<{ success: boolean; error?: string }>;

  clearLocalData: (targetUserId?: string) => Promise<void>;

  migrateDemoDataToCloud: (
    targetUserId: string
  ) => Promise<{ success: boolean; count: number; error?: string }>;

  importAccountsFromCloud: (
    cloudUserId?: string
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

  // Financial Notes / Dues Actions
  addNote: (data: {
    title: string;
    description?: string;
    type: NoteType;
    amount?: number;
    due_date?: string;
    card_color?: NoteColor;
    is_pinned?: boolean;
  }) => Promise<{ success: boolean; note?: FinancialNote; error?: string }>;

  updateNote: (
    note: FinancialNote
  ) => Promise<{ success: boolean; error?: string }>;

  deleteNote: (
    noteId: string
  ) => Promise<{ success: boolean; error?: string }>;

  resolveNote: (
    noteId: string,
    options?: {
      convertToTransaction?: boolean;
      accountId?: string;
      transactionDate?: string;
    }
  ) => Promise<{ success: boolean; transactionId?: string; error?: string }>;

  reopenNote: (
    noteId: string
  ) => Promise<{ success: boolean; error?: string }>;

  triggerSync: () => Promise<SyncResult>;
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
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [linkedCloudAccount, setLinkedCloudAccountState] = useState<string | null>(null);
  const [linkedCloudUserId, setLinkedCloudUserIdState] = useState<string | null>(null);

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

  // Load linked cloud account info on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('sd_ledger_linked_cloud_email');
      const uid = localStorage.getItem('sd_ledger_linked_cloud_uid');
      if (email) setLinkedCloudAccountState(email);
      if (uid) setLinkedCloudUserIdState(uid);
    }
  }, []);

  const setLinkedCloudAccount = useCallback((email: string, uid: string) => {
    setLinkedCloudAccountState(email);
    setLinkedCloudUserIdState(uid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sd_ledger_linked_cloud_email', email);
      localStorage.setItem('sd_ledger_linked_cloud_uid', uid);
    }
  }, []);

  const clearLinkedCloudAccount = useCallback(() => {
    setLinkedCloudAccountState(null);
    setLinkedCloudUserIdState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sd_ledger_linked_cloud_email');
      localStorage.removeItem('sd_ledger_linked_cloud_uid');
    }
  }, []);

  // Load user data: In online mode fetches from Supabase if online; in offline mode automatically populates from linked cloud first!
  const refreshData = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const supabase = getSupabase();

      // If pure online mode (authenticated Supabase user) and device is online:
      if (uid !== DEMO_USER_ID && supabase && navigator.onLine) {
        try {
          const deletedTxIds = new Set<string>([
            ...(await idbGetDeletedTransactionIds(uid)),
            ...(await idbGetDeletedTransactionIds(DEMO_USER_ID)),
          ]);

          const [accRes, txRes, recRes, logRes, notesRes, localTxs, localNotes] = await Promise.all([
            supabase.from('accounts').select('*').eq('user_id', uid).order('account_index', { ascending: true }),
            supabase.from('transactions').select('*').eq('user_id', uid).order('transaction_date', { ascending: false }),
            supabase.from('reconciliations').select('*').eq('user_id', uid).order('reconciled_date', { ascending: false }),
            supabase.from('audit_logs').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(MAX_AUDIT_TRAIL_LIMIT),
            supabase.from('financial_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
            idbGetTransactions(uid),
            idbGetNotes(uid),
          ]);

          const remoteTxMap = new Map<string, Transaction>();
          if (txRes.data) {
            for (const rt of txRes.data as Transaction[]) {
              if (rt.is_deleted || deletedTxIds.has(rt.id)) {
                await idbDeleteTransaction(rt.id, uid);
                await idbDeleteTransaction(rt.id, DEMO_USER_ID);
              } else {
                remoteTxMap.set(rt.id, rt);
              }
            }
          }

          // RECOVERY: Push any local transactions created on this device that failed to reach Supabase
          // (Only truly active transactions that were never deleted)
          for (const lt of localTxs) {
            if (!remoteTxMap.has(lt.id) && !lt.is_deleted && !deletedTxIds.has(lt.id)) {
              const { sync_status, ...cloudTx } = lt;
              const { error: pushErr } = await supabase.from('transactions').upsert({
                ...cloudTx,
                user_id: uid,
              }, { onConflict: 'id' });
              if (!pushErr) {
                remoteTxMap.set(lt.id, lt);
              } else {
                console.warn('Could not auto-sync local transaction to Supabase:', pushErr);
              }
            }
          }

          // RECOVERY & MIRROR FOR FINANCIAL NOTES (Auto-pruning resolved notes > 5 days)
          const fiveDaysAgoMs = Date.now() - RESOLVED_NOTES_RETENTION_DAYS * 24 * 60 * 60 * 1000;
          const remoteNoteMap = new Map<string, FinancialNote>();

          if (notesRes.data) {
            for (const rn of notesRes.data as FinancialNote[]) {
              const isResolved = Boolean(rn.is_resolved);
              const resolvedTime = new Date(rn.resolved_at || rn.updated_at || rn.created_at || 0).getTime();
              const isExpired = isResolved && resolvedTime < fiveDaysAgoMs;

              if (isExpired) {
                await supabase.from('financial_notes').delete().eq('id', rn.id);
                await idbDeleteNote(rn.id, uid);
              } else {
                remoteNoteMap.set(rn.id, rn);
              }
            }
          }

          for (const ln of localNotes) {
            const isResolved = Boolean(ln.is_resolved);
            const resolvedTime = new Date(ln.resolved_at || ln.updated_at || ln.created_at || 0).getTime();
            const isExpired = isResolved && resolvedTime < fiveDaysAgoMs;

            if (isExpired) {
              await idbDeleteNote(ln.id, uid);
              await supabase.from('financial_notes').delete().eq('id', ln.id);
              continue;
            }

            if (!remoteNoteMap.has(ln.id)) {
              const { error: pushNoteErr } = await supabase.from('financial_notes').upsert({
                ...ln,
                user_id: uid,
              }, { onConflict: 'id' });
              if (!pushNoteErr) {
                remoteNoteMap.set(ln.id, ln);
              }
            }
          }

          if (accRes.data) {
            await idbSaveAccounts(accRes.data as Account[]);
          }
          if (txRes.data) {
            await idbSaveTransactions(Array.from(remoteTxMap.values()));
          }
          if (recRes.data) {
            for (const r of recRes.data) await idbSaveReconciliation(r as Reconciliation);
          }
          if (logRes.data) {
            for (const l of logRes.data) await idbSaveAuditLog(l as AuditLog);
          }
          if (notesRes.data || localNotes.length > 0) {
            await idbSaveNotes(Array.from(remoteNoteMap.values()));
          }
        } catch (fetchErr) {
          console.warn('Could not fetch cloud data, falling back to local cache:', fetchErr);
        }
      }

      // OFFLINE MODE: Always populate first with current cloud data before showing to user!
      if (uid === DEMO_USER_ID && supabase && navigator.onLine) {
        let linkedUid = linkedCloudUserId || (typeof window !== 'undefined' ? localStorage.getItem('sd_ledger_linked_cloud_uid') : null);

        // Fallback: If not set in localStorage, check active Supabase auth session
        if (!linkedUid) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              linkedUid = session.user.id;
              setLinkedCloudAccount(session.user.email || 'Cloud User', linkedUid);
            }
          } catch (sessionErr) {
            console.warn('Session check error in offline mode:', sessionErr);
          }
        }

        if (linkedUid) {
          try {
            const deletedTxIds = new Set<string>([
              ...(await idbGetDeletedTransactionIds(DEMO_USER_ID)),
              ...(await idbGetDeletedTransactionIds(linkedUid)),
            ]);

            const [accRes, txRes, recRes, logRes, notesRes, localTxs, localNotes, localQueue] = await Promise.all([
              supabase.from('accounts').select('*').eq('user_id', linkedUid).order('account_index', { ascending: true }),
              supabase.from('transactions').select('*').eq('user_id', linkedUid).order('transaction_date', { ascending: false }),
              supabase.from('reconciliations').select('*').eq('user_id', linkedUid).order('reconciled_date', { ascending: false }),
              supabase.from('audit_logs').select('*').eq('user_id', linkedUid).order('created_at', { ascending: false }).limit(MAX_AUDIT_TRAIL_LIMIT),
              supabase.from('financial_notes').select('*').eq('user_id', linkedUid).order('created_at', { ascending: false }),
              idbGetTransactions(DEMO_USER_ID),
              idbGetNotes(DEMO_USER_ID),
              idbGetSyncQueue(),
            ]);

            if (accRes.data && accRes.data.length > 0) {
              const remoteAccIds = new Set(accRes.data.map((a: Account) => a.id));
              const localAccs = await idbGetAccounts(DEMO_USER_ID);
              for (const la of localAccs) {
                if (!remoteAccIds.has(la.id) && !localQueue.some((q) => q.payload?.id === la.id)) {
                  await idbDeleteAccount(la.id, DEMO_USER_ID);
                }
              }

              const offlineAccounts: Account[] = accRes.data.map((a: Account) => ({
                ...a,
                user_id: DEMO_USER_ID,
              }));
              await idbSaveAccounts(offlineAccounts);
            }

            if (txRes.data) {
              const remoteTxIds = new Set(txRes.data.map((t: Transaction) => t.id));
              for (const lt of localTxs) {
                if (
                  !remoteTxIds.has(lt.id) &&
                  lt.sync_status !== 'pending' &&
                  !localQueue.some((q) => q.payload?.id === lt.id)
                ) {
                  await idbDeleteTransaction(lt.id, DEMO_USER_ID);
                }
              }

              // Process remote transactions, soft-deleting any that were marked deleted
              for (const rt of txRes.data as Transaction[]) {
                if (rt.is_deleted || deletedTxIds.has(rt.id)) {
                  await idbDeleteTransaction(rt.id, DEMO_USER_ID);
                }
              }

              const remoteTxs: Transaction[] = (txRes.data as Transaction[])
                .filter((t) => !t.is_deleted && !deletedTxIds.has(t.id))
                .map((t: Transaction) => ({
                  ...t,
                  user_id: DEMO_USER_ID,
                  sync_status: 'synced',
                }));

              // Preserve any pending local offline entries
              const pendingLocalTxs = localTxs.filter(
                (lt) =>
                  !deletedTxIds.has(lt.id) &&
                  !lt.is_deleted &&
                  (lt.sync_status === 'pending' || localQueue.some((q) => q.payload?.id === lt.id))
              );

              const mergedTxs = new Map<string, Transaction>();
              remoteTxs.forEach((rt) => mergedTxs.set(rt.id, rt));
              pendingLocalTxs.forEach((pt) => mergedTxs.set(pt.id, pt));

              await idbSaveTransactions(Array.from(mergedTxs.values()));
            }

            if (recRes.data) {
              for (const r of recRes.data) {
                await idbSaveReconciliation({ ...(r as Reconciliation), user_id: DEMO_USER_ID });
              }
            }

            if (logRes.data) {
              for (const l of logRes.data) {
                await idbSaveAuditLog({ ...(l as AuditLog), user_id: DEMO_USER_ID });
              }
            }

            if (notesRes.data) {
              const fiveDaysAgoMs = Date.now() - RESOLVED_NOTES_RETENTION_DAYS * 24 * 60 * 60 * 1000;
              const remoteNoteIds = new Set(notesRes.data.map((n: FinancialNote) => n.id));

              for (const ln of localNotes) {
                const isResolved = Boolean(ln.is_resolved);
                const resolvedTime = new Date(ln.resolved_at || ln.updated_at || ln.created_at || 0).getTime();
                const isExpired = isResolved && resolvedTime < fiveDaysAgoMs;

                if (isExpired || (!remoteNoteIds.has(ln.id) && !localQueue.some((q) => q.payload?.id === ln.id))) {
                  await idbDeleteNote(ln.id, DEMO_USER_ID);
                }
              }

              const remoteNotes: FinancialNote[] = (notesRes.data as FinancialNote[])
                .filter((n) => {
                  const isResolved = Boolean(n.is_resolved);
                  const resolvedTime = new Date(n.resolved_at || n.updated_at || n.created_at || 0).getTime();
                  return !(isResolved && resolvedTime < fiveDaysAgoMs);
                })
                .map((n: FinancialNote) => ({
                  ...n,
                  user_id: DEMO_USER_ID,
                }));

              const pendingLocalNotes = localNotes.filter((ln) => {
                const isResolved = Boolean(ln.is_resolved);
                const resolvedTime = new Date(ln.resolved_at || ln.updated_at || ln.created_at || 0).getTime();
                return !(isResolved && resolvedTime < fiveDaysAgoMs) && localQueue.some((q) => q.payload?.id === ln.id);
              });

              const mergedNotes = new Map<string, FinancialNote>();
              remoteNotes.forEach((rn) => mergedNotes.set(rn.id, rn));
              pendingLocalNotes.forEach((pn) => mergedNotes.set(pn.id, pn));

              await idbSaveNotes(Array.from(mergedNotes.values()));
            }
          } catch (offlinePullErr) {
            console.warn('Could not auto-pull latest cloud data for offline mode, using cached IndexedDB:', offlinePullErr);
          }
        }
      }

      const [accs, txs, recs, logs, userNotes, lastSync, queue] = await Promise.all([
        idbGetAccounts(uid),
        idbGetTransactions(uid),
        idbGetReconciliations(uid),
        idbGetAuditLogs(uid),
        idbGetNotes(uid),
        idbGetMeta<string>('last_synced_at'),
        idbGetSyncQueue(),
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setReconciliations(recs);
      setAuditLogs(logs);
      setNotes(userNotes);
      setSyncStatus((prev) => ({
        ...prev,
        lastSyncedAt: lastSync || null,
        pendingCount: uid === DEMO_USER_ID ? queue.length : 0,
      }));
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to load local ledger data:', err);
      setIsInitialized(true);
    }
  }, [linkedCloudUserId]);

  // Pull latest cloud data manually on demand
  const pullLatestFromCloud = useCallback(async (): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!navigator.onLine) {
      const msg = 'Device is currently offline. Connect to the internet to pull cloud data.';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }
    const targetUid = linkedCloudUserId || (typeof window !== 'undefined' ? localStorage.getItem('sd_ledger_linked_cloud_uid') : null);
    if (!targetUid) {
      const msg = 'No cloud account linked yet.';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      await refreshData(DEMO_USER_ID);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      const msg = `Successfully pulled latest cloud records from ${linkedCloudAccount || 'cloud'}!`;
      setSyncMessage(msg);
      setTimeout(() => setSyncMessage(null), 4000);
      return { success: true, count: accounts.length };
    } catch (err: unknown) {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      const msg = err instanceof Error ? err.message : 'Failed to pull cloud records';
      return { success: false, count: 0, error: msg };
    }
  }, [linkedCloudUserId, linkedCloudAccount, refreshData, accounts.length]);

  // Force push local browser ledger (accounts, transactions, reconciliations) straight to Supabase Cloud
  const pushLocalDataToCloud = useCallback(async (): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!navigator.onLine) {
      const msg = 'Device is currently offline. Connect to the internet to push data to cloud.';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }
    const supabase = getSupabase();
    if (!supabase) {
      const msg = 'Supabase client not initialized.';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const effectiveUid = session?.user?.id || (userId !== DEMO_USER_ID ? userId : linkedCloudUserId);
    if (!effectiveUid) {
      const msg = 'Please log in to your Supabase cloud account before uploading local ledger data.';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      // 1. Fetch remote accounts
      const { data: remoteAccs, error: accFetchErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', effectiveUid);

      if (accFetchErr) throw accFetchErr;

      const remoteByName = new Map<string, Account>();
      const remoteById = new Map<string, Account>();
      ((remoteAccs as Account[]) || []).forEach((a) => {
        remoteByName.set(a.display_name.trim().toLowerCase(), a);
        remoteById.set(a.id, a);
      });

      // 2. Fetch local accounts from this user AND demo store
      const userAccs = await idbGetAccounts(effectiveUid);
      const demoAccs = await idbGetAccounts(DEMO_USER_ID);
      const allLocalAccs = [...userAccs, ...demoAccs];
      const localAccMap = new Map<string, Account>();
      allLocalAccs.forEach((a) => {
        if (!localAccMap.has(a.id)) localAccMap.set(a.id, a);
      });

      // Push or link accounts
      const accountIdMapping = new Map<string, string>(); // localId -> cloudId
      for (const local of Array.from(localAccMap.values())) {
        const normName = local.display_name.trim().toLowerCase();
        const matchingRemote = remoteByName.get(normName) || remoteById.get(local.id);
        if (matchingRemote) {
          accountIdMapping.set(local.id, matchingRemote.id);
        } else {
          // New account, push to Supabase
          const cleanAcc = { ...local, user_id: effectiveUid };
          delete (cleanAcc as Record<string, unknown>).sync_status;
          const { error: insErr } = await supabase.from('accounts').upsert(cleanAcc, { onConflict: 'id' });
          if (!insErr) {
            accountIdMapping.set(local.id, local.id);
            remoteById.set(local.id, cleanAcc);
          }
        }
      }

      // 3. Gather all local transactions from this user AND demo store (excluding deleted)
      const deletedTxIds = new Set<string>([
        ...(await idbGetDeletedTransactionIds(effectiveUid)),
        ...(await idbGetDeletedTransactionIds(DEMO_USER_ID)),
      ]);
      const nowIsoTombstone = new Date().toISOString();
      for (const delId of deletedTxIds) {
        await supabase.from('transactions').update({ is_deleted: true, updated_at: nowIsoTombstone }).eq('id', delId);
      }

      const userTxs = await idbGetTransactions(effectiveUid);
      const demoTxs = await idbGetTransactions(DEMO_USER_ID);
      const allLocalTxs = [...userTxs, ...demoTxs];
      const txMap = new Map<string, Transaction>();
      allLocalTxs.forEach((t) => {
        if (!txMap.has(t.id) && !t.is_deleted && !deletedTxIds.has(t.id)) txMap.set(t.id, t);
      });

      let pushed = 0;
      for (const tx of Array.from(txMap.values())) {
        const fromId = tx.from_account_id ? (accountIdMapping.get(tx.from_account_id) || tx.from_account_id) : null;
        const toId = tx.to_account_id ? (accountIdMapping.get(tx.to_account_id) || tx.to_account_id) : null;

        const { sync_status, ...cloudTx } = tx;
        const payload = {
          ...cloudTx,
          user_id: effectiveUid,
          from_account_id: fromId,
          to_account_id: toId,
        };

        const { error: txErr } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
        if (!txErr) {
          pushed++;
          await idbSaveTransaction({ ...tx, user_id: effectiveUid, sync_status: 'synced' });
        } else {
          console.warn('Failed to push transaction to Supabase:', txErr.message);
        }
      }

      // 4. Reconciliations
      const userRecs = await idbGetReconciliations(effectiveUid);
      const demoRecs = await idbGetReconciliations(DEMO_USER_ID);
      const allRecs = [...userRecs, ...demoRecs];
      for (const rec of allRecs) {
        const accId = accountIdMapping.get(rec.account_id) || rec.account_id;
        await supabase.from('reconciliations').upsert({
          ...rec,
          user_id: effectiveUid,
          account_id: accId,
        }, { onConflict: 'id' });
      }

      // 5. Audit Logs
      const userLogs = await idbGetAuditLogs(effectiveUid);
      const demoLogs = await idbGetAuditLogs(DEMO_USER_ID);
      const allLogs = [...userLogs, ...demoLogs];
      const logMap = new Map<string, AuditLog>();
      allLogs.forEach((l) => {
        if (!logMap.has(l.id)) logMap.set(l.id, l);
      });
      for (const logItem of Array.from(logMap.values())) {
        await supabase.from('audit_logs').upsert({
          ...logItem,
          user_id: effectiveUid,
        }, { onConflict: 'id' });
      }

      // 6. Financial Notes
      const userNotes = await idbGetNotes(effectiveUid);
      const demoNotes = await idbGetNotes(DEMO_USER_ID);
      const allNotes = [...userNotes, ...demoNotes];
      const noteMap = new Map<string, FinancialNote>();
      allNotes.forEach((n) => {
        if (!noteMap.has(n.id)) noteMap.set(n.id, n);
      });
      for (const noteItem of Array.from(noteMap.values())) {
        await supabase.from('financial_notes').upsert({
          ...noteItem,
          user_id: effectiveUid,
        }, { onConflict: 'id' });
      }

      await refreshData(effectiveUid);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      const msg = `Successfully uploaded ${pushed} transactions and notes to Supabase Cloud!`;
      setSyncMessage(msg);
      setTimeout(() => setSyncMessage(null), 5000);
      return { success: true, count: pushed };
    } catch (err: unknown) {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      const msg = err instanceof Error ? err.message : 'Failed to push local data to cloud';
      setSyncMessage(msg);
      return { success: false, count: 0, error: msg };
    }
  }, [userId, linkedCloudUserId, refreshData]);

  // Upload offline changes to linked cloud account (MANUAL ACTION ONLY - never runs automatically)
  const uploadOfflineToCloud = useCallback(async (): Promise<SyncResult> => {
    if (!navigator.onLine) {
      const offlineMsg = 'Device is offline. Connect to the internet to upload to cloud.';
      setSyncMessage(offlineMsg);
      return { success: false, isOffline: true, message: offlineMsg };
    }

    const targetUid = linkedCloudUserId || (typeof window !== 'undefined' ? localStorage.getItem('sd_ledger_linked_cloud_uid') : null);
    if (!targetUid) {
      const noLinkedMsg = 'No cloud account linked yet. Please import from your online account first.';
      setSyncMessage(noLinkedMsg);
      return { success: false, requiresAuth: true, message: noLinkedMsg };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase client not initialized.' };
    }

    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== targetUid) {
      const authMsg = `Please sign in with your linked cloud account (${linkedCloudAccount || 'cloud account'}) to upload changes.`;
      setSyncMessage(authMsg);
      return { success: false, requiresAuth: true, message: authMsg };
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    const res = await processSync(targetUid, (newStatus) => {
      setSyncStatus(newStatus);
    });

    if (res.success) {
      // Mirror authoritative cloud accounts and notes into DEMO_USER_ID
      const cloudAccounts = await idbGetAccounts(targetUid);
      for (const a of cloudAccounts) {
        await idbSaveAccount({ ...a, user_id: DEMO_USER_ID });
      }
      const cloudNotes = await idbGetNotes(targetUid);
      for (const n of cloudNotes) {
        await idbSaveNote({ ...n, user_id: DEMO_USER_ID });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('sd_ledger_offline_changes_made', 'false');
      }
      await refreshData(DEMO_USER_ID);
      const successMsg = `Successfully uploaded offline changes to ${linkedCloudAccount || 'cloud'}!`;
      setSyncMessage(successMsg);
      setTimeout(() => setSyncMessage(null), 5000);
      return { ...res, message: successMsg };
    } else {
      setSyncMessage(res.message);
      return res;
    }
  }, [linkedCloudUserId, linkedCloudAccount, refreshData]);

  // triggerSync alias for backward compatibility
  const triggerSync = uploadOfflineToCloud;

  // Initial load when user changes - NEVER AUTO-SYNC!
  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      setTransactions([]);
      setReconciliations([]);
      setAuditLogs([]);
      setNotes([]);
      setIsInitialized(true);
      setHasOfflineDataToMigrate(false);
      return;
    }

    refreshData(userId);
  }, [userId, refreshData]);

  // Listen to browser online/offline events (Status indicator only - NEVER AUTO-SYNC!)
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Prompt user before closing if in offline mode with unsynced changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (userId === DEMO_USER_ID && syncStatus.pendingCount > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsynced changes in offline mode. Be sure to upload to cloud before switching devices or clearing browser cache.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, syncStatus.pendingCount]);

  // In Offline mode: setup wizard is needed if 0 accounts have been imported yet.
  // In Online mode: setup wizard is needed if fewer than 2 accounts exist.
  const needsSetupWizard = isInitialized && (
    userId === DEMO_USER_ID
      ? accounts.length === 0
      : accounts.length < 2
  );

  // Compute ledger summary
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    setCurrentMonth(getTodayKolkata().substring(0, 7));
  }, []);

  const summary = useMemo(() => {
    return computeLedgerSummary(accounts, transactions, reconciliations, currentMonth);
  }, [accounts, transactions, reconciliations, currentMonth]);

  const markOfflineChange = useCallback(() => {
    if (typeof window !== 'undefined' && (!userId || userId === DEMO_USER_ID)) {
      localStorage.setItem('sd_ledger_offline_changes_made', 'true');
    }
  }, [userId]);

  const recordAuditLog = useCallback(async (log: AuditLog) => {
    await idbSaveAuditLog(log);
    if (userId && userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('audit_logs').insert(log);
        } catch (err) {
          console.warn('Could not sync audit log to Supabase:', err);
        }
      }
    }
  }, [userId]);

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

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const clean1 = { ...account1 };
          const clean2 = { ...account2 };
          await supabase.from('accounts').upsert([clean1, clean2]);
        } catch (cloudErr) {
          console.warn('Could not write accounts directly to Supabase:', cloudErr);
        }
      }
    } else {
      // Offline mode: queue for later manual upload
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
      markOfflineChange();
    }

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
    await recordAuditLog(audit);

    await refreshData(userId);
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

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('accounts').insert(newAccount);
        } catch (cloudErr) {
          console.warn('Could not insert account directly to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'accounts',
        action: 'UPSERT',
        payload: newAccount as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
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
    return { success: true };
  };

  // Delete Account
  const deleteAccount = async (
    accountId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return { success: false, error: 'Account not found.' };

    const nowIso = new Date().toISOString();

    await idbDeleteAccount(accountId, userId);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('accounts').delete().eq('id', accountId);
        } catch (cloudErr) {
          console.warn('Could not delete account directly on Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'accounts',
        action: 'DELETE',
        payload: { id: accountId },
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'DELETE',
      entity_type: 'ACCOUNT',
      entity_id: accountId,
      summary: `Deleted personal account "${target.display_name}"`,
      details: { deletedAccount: target },
      created_at: nowIso,
    });

    await refreshData(userId);
    return { success: true };
  };

  // Clear local data for active user or demo (used when switching accounts)
  const clearLocalData = async (targetUserId?: string): Promise<void> => {
    const uid = targetUserId || userId;
    if (uid) {
      await idbClearUserData(uid);
      await refreshData(uid);
    }
  };

  // Migrate offline demo data to cloud account (Smart Merge by name, no duplicates, preserve offline profile)
  const migrateDemoDataToCloud = async (
    targetUserId: string
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!targetUserId) return { success: false, count: 0, error: 'No target user ID' };
    const nowIso = new Date().toISOString();

    const [demoAccs, demoTxs, demoRecs, targetExistingAccs] = await Promise.all([
      idbGetAccounts(DEMO_USER_ID),
      idbGetTransactions(DEMO_USER_ID),
      idbGetReconciliations(DEMO_USER_ID),
      idbGetAccounts(targetUserId),
    ]);

    if (demoAccs.length === 0 && demoTxs.length === 0) {
      setHasOfflineDataToMigrate(false);
      return { success: true, count: 0 };
    }

    // Map existing target accounts by normalized display name and id
    const targetByName = new Map<string, Account>();
    targetExistingAccs.forEach((a) => {
      targetByName.set(a.display_name.trim().toLowerCase(), a);
      targetByName.set(a.id, a);
    });

    // Remap demo accounts to matching cloud accounts or prepare new ones
    const accountsToSave: Account[] = [];
    const idRemap = new Map<string, string>(); // oldDemoId -> targetAccountId

    for (const dAcc of demoAccs) {
      const match = targetByName.get(dAcc.display_name.trim().toLowerCase()) || targetByName.get(dAcc.id);
      if (match) {
        // MATCH: Cloud account is authoritative. Remap demo transactions to this cloud account ID
        idRemap.set(dAcc.id, match.id);
        await idbUpdateTransactionAccountIds(dAcc.id, match.id, targetUserId);
        await idbUpdateTransactionAccountIds(dAcc.id, match.id, DEMO_USER_ID);
        await idbUpdateReconciliationAccountIds(dAcc.id, match.id, targetUserId);
        await idbUpdateReconciliationAccountIds(dAcc.id, match.id, DEMO_USER_ID);
        await idbRemapQueueAccountId(dAcc.id, match.id);
        accountsToSave.push(match);
      } else {
        // Brand new account created offline: add to targetUserId
        const newAcc: Account = {
          ...dAcc,
          user_id: targetUserId,
          account_index: targetExistingAccs.length + accountsToSave.length + 1,
          updated_at: nowIso,
        };
        accountsToSave.push(newAcc);
        idRemap.set(dAcc.id, newAcc.id);
        await idbAddToSyncQueue({
          id: generateUUID(),
          table: 'accounts',
          action: 'UPSERT',
          payload: newAcc as unknown as Record<string, unknown>,
          created_at: nowIso,
          retries: 0,
        });
      }
    }

    const updatedTxs: Transaction[] = demoTxs.map((t) => {
      const remappedFrom = t.from_account_id ? idRemap.get(t.from_account_id) || t.from_account_id : null;
      const remappedTo = t.to_account_id ? idRemap.get(t.to_account_id) || t.to_account_id : null;
      return {
        ...t,
        user_id: targetUserId,
        from_account_id: remappedFrom,
        to_account_id: remappedTo,
        updated_at: nowIso,
      };
    });

    const updatedRecs: Reconciliation[] = demoRecs.map((r) => ({
      ...r,
      user_id: targetUserId,
      account_id: idRemap.get(r.account_id) || r.account_id,
    }));

    await idbSaveAccounts(accountsToSave);
    await idbSaveTransactions(updatedTxs);
    for (const r of updatedRecs) {
      await idbSaveReconciliation(r);
    }

    // Push transactions to sync queue
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

    // Migrate offline notes to cloud account
    const demoNotes = await idbGetNotes(DEMO_USER_ID);
    for (const dNote of demoNotes) {
      const newNote: FinancialNote = {
        ...dNote,
        user_id: targetUserId,
        updated_at: nowIso,
      };
      await idbSaveNote(newNote);
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'UPSERT',
        payload: newNote as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
    }

    // Keep persistent offline accounts in sync with authoritative cloud accounts (DO NOT wipe DEMO_USER_ID!)
    for (const acc of accountsToSave) {
      await idbSaveAccount({ ...acc, user_id: DEMO_USER_ID });
    }

    setHasOfflineDataToMigrate(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sd_ledger_offline_changes_made', 'false');
      localStorage.removeItem('sd_ledger_offline_synced_cloud_account');
    }
    await refreshData(targetUserId);
    await triggerSync();
    return { success: true, count: accountsToSave.length + updatedTxs.length };
  };

  // Import accounts directly from cloud into offline local storage
  const importAccountsFromCloud = async (
    cloudUserId?: string
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { success: false, count: 0, error: 'Supabase is not configured yet.' };
      }

      let targetUid = cloudUserId;
      let targetEmail = '';
      const { data: { session } } = await supabase.auth.getSession();
      if (!targetUid) {
        targetUid = session?.user?.id;
      }
      if (session?.user?.id === targetUid) {
        targetEmail = session?.user?.email || '';
      }

      if (!targetUid) {
        return { success: false, count: 0, error: 'Please sign in with your Supabase account to import cloud bank accounts.' };
      }

      const [accRes, txRes, recRes, notesRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', targetUid).order('account_index', { ascending: true }),
        supabase.from('transactions').select('*').eq('user_id', targetUid).order('transaction_date', { ascending: false }),
        supabase.from('reconciliations').select('*').eq('user_id', targetUid).order('reconciled_date', { ascending: false }),
        supabase.from('financial_notes').select('*').eq('user_id', targetUid).order('created_at', { ascending: false }),
      ]);

      if (accRes.error) throw accRes.error;
      const remoteAccs = accRes.data || [];
      if (remoteAccs.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'No bank accounts found in this cloud account. Please create accounts in online mode first.',
        };
      }

      const nowIso = new Date().toISOString();
      const offlineAccounts: Account[] = remoteAccs.map((a: Account) => ({
        ...a,
        user_id: DEMO_USER_ID,
        updated_at: nowIso,
      }));

      const offlineTxs: Transaction[] = (txRes.data || []).map((t: Transaction) => ({
        ...t,
        user_id: DEMO_USER_ID,
        sync_status: 'synced',
        updated_at: t.updated_at || nowIso,
      }));

      const offlineRecs: Reconciliation[] = (recRes.data || []).map((r: Reconciliation) => ({
        ...r,
        user_id: DEMO_USER_ID,
      }));

      // Save into IndexedDB for offline demo
      await idbSaveAccounts(offlineAccounts);
      await idbSaveTransactions(offlineTxs);
      for (const r of offlineRecs) {
        await idbSaveReconciliation(r);
      }

      if (notesRes.data) {
        const offlineNotes: FinancialNote[] = notesRes.data.map((n: FinancialNote) => ({
          ...n,
          user_id: DEMO_USER_ID,
        }));
        await idbSaveNotes(offlineNotes);
      }

      // Record linked cloud credentials
      if (targetEmail) {
        setLinkedCloudAccount(targetEmail, targetUid);
      } else {
        setLinkedCloudUserIdState(targetUid);
        if (typeof window !== 'undefined') {
          localStorage.setItem('sd_ledger_linked_cloud_uid', targetUid);
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('sd_ledger_offline_changes_made', 'false');
      }

      await refreshData(DEMO_USER_ID);
      return { success: true, count: offlineAccounts.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import accounts';
      return { success: false, count: 0, error: msg };
    }
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
      sync_status: userId === DEMO_USER_ID ? 'pending' : 'synced',
    };

    await idbSaveTransaction(tx);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { sync_status, ...cloudTx } = tx;
          const { error } = await supabase.from('transactions').insert(cloudTx);
          if (error) {
            console.error('Failed to insert expense into Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not insert transaction to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'UPSERT',
        payload: tx as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    // Audit log
    const acc = accounts.find((a) => a.id === data.fromAccountId);
    await recordAuditLog({
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
      sync_status: userId === DEMO_USER_ID ? 'pending' : 'synced',
    };

    await idbSaveTransaction(tx);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { sync_status, ...cloudTx } = tx;
          const { error } = await supabase.from('transactions').insert(cloudTx);
          if (error) {
            console.error('Failed to insert income into Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not insert income to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'UPSERT',
        payload: tx as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    const acc = accounts.find((a) => a.id === data.toAccountId);
    await recordAuditLog({
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
      sync_status: userId === DEMO_USER_ID ? 'pending' : 'synced',
    };

    await idbSaveTransaction(tx);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { sync_status, ...cloudTx } = tx;
          const { error } = await supabase.from('transactions').insert(cloudTx);
          if (error) {
            console.error('Failed to insert transfer into Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not insert transfer to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'UPSERT',
        payload: tx as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
    const toAcc = accounts.find((a) => a.id === data.toAccountId);

    await recordAuditLog({
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
      sync_status: userId === DEMO_USER_ID ? 'pending' : 'synced',
    };

    await idbSaveTransaction(cleanUpdated);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { sync_status, ...cloudTx } = cleanUpdated;
          const { error } = await supabase.from('transactions').upsert(cloudTx);
          if (error) {
            console.error('Failed to update transaction in Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not update transaction in Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'UPSERT',
        payload: cleanUpdated as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
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
    return { success: true };
  };

  // Delete Transaction (Soft delete for sync propagation & audit trail)
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = transactions.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Transaction not found.' };

    const nowIso = new Date().toISOString();

    await idbDeleteTransaction(id, userId);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { error } = await supabase
            .from('transactions')
            .update({ is_deleted: true, updated_at: nowIso })
            .eq('id', id);
          if (error) {
            console.error('Could not mark transaction deleted in Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not mark transaction deleted in Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'transactions',
        action: 'DELETE',
        payload: { id, is_deleted: true },
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
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

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('reconciliations').insert(rec);
        } catch (cloudErr) {
          console.warn('Could not insert reconciliation to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'reconciliations',
        action: 'UPSERT',
        payload: rec as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
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

      await recordAuditLog({
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
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON file format';
      return { success: false, error: msg };
    }
  };

  // Add Financial Note / Friend Due
  const addNote = async (data: {
    title: string;
    description?: string;
    type: NoteType;
    amount?: number;
    due_date?: string;
    card_color?: NoteColor;
    is_pinned?: boolean;
  }): Promise<{ success: boolean; note?: FinancialNote; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    if (!data.title?.trim()) return { success: false, error: 'Title or friend name is required.' };

    const nowIso = new Date().toISOString();
    const noteId = generateUUID();

    const note: FinancialNote = {
      id: noteId,
      user_id: userId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      type: data.type,
      amount: data.amount ? Math.round(Number(data.amount) * 100) / 100 : null,
      due_date: data.due_date || null,
      card_color: data.card_color || 'yellow',
      is_pinned: !!data.is_pinned,
      is_resolved: false,
      resolved_at: null,
      resolved_transaction_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await idbSaveNote(note);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { error } = await supabase.from('financial_notes').insert(note);
          if (error) {
            console.error('Failed to insert note to Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not insert note directly to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'UPSERT',
        payload: note as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'NOTE',
      entity_id: noteId,
      summary: `Created note: "${note.title}" (${note.type}${note.amount ? ` ₹${note.amount}` : ''})`,
      details: { note },
      created_at: nowIso,
    });

    await refreshData(userId);
    return { success: true, note };
  };

  // Update Financial Note
  const updateNote = async (
    updated: FinancialNote
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };

    const nowIso = new Date().toISOString();
    const note: FinancialNote = {
      ...updated,
      updated_at: nowIso,
    };

    await idbSaveNote(note);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          const { error } = await supabase.from('financial_notes').upsert(note, { onConflict: 'id' });
          if (error) {
            console.error('Failed to update note in Supabase:', error.message);
          }
        } catch (cloudErr) {
          console.warn('Could not update note in Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'UPSERT',
        payload: note as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'NOTE',
      entity_id: note.id,
      summary: `Updated note: "${note.title}"`,
      details: { note },
      created_at: nowIso,
    });

    await refreshData(userId);
    return { success: true };
  };

  // Delete Financial Note
  const deleteNote = async (
    noteId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = notes.find((n) => n.id === noteId);

    await idbDeleteNote(noteId, userId);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('financial_notes').delete().eq('id', noteId);
        } catch (cloudErr) {
          console.warn('Could not delete note in Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'DELETE',
        payload: { id: noteId },
        created_at: new Date().toISOString(),
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'DELETE',
      entity_type: 'NOTE',
      entity_id: noteId,
      summary: `Deleted note: "${target?.title || noteId}"`,
      details: { note: target },
      created_at: new Date().toISOString(),
    });

    await refreshData(userId);
    return { success: true };
  };

  // Resolve and Settle Note (Optional: Auto-record transaction in ledger)
  const resolveNote = async (
    noteId: string,
    options?: {
      convertToTransaction?: boolean;
      accountId?: string;
      transactionDate?: string;
    }
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = notes.find((n) => n.id === noteId);
    if (!target) return { success: false, error: 'Note not found.' };

    const nowIso = new Date().toISOString();
    let createdTxId: string | null = null;

    if (options?.convertToTransaction && options?.accountId && target.amount && target.amount > 0) {
      const txDate = options.transactionDate || getTodayKolkata();
      if (target.type === 'THEY_OWE_ME') {
        // Friend paid us back -> Income into chosen account
        const res = await addIncome({
          amount: target.amount,
          toAccountId: options.accountId,
          category: 'Debt Repayment / Khata',
          date: txDate,
          description: `Settled note: ${target.title}${target.description ? ` - ${target.description}` : ''}`,
        });
        if (!res.success) {
          return { success: false, error: res.error || 'Failed to record income.' };
        }
      } else if (target.type === 'I_OWE_THEM') {
        // We paid back friend -> Expense from chosen account
        const res = await addExpense({
          amount: target.amount,
          fromAccountId: options.accountId,
          category: 'Debt Repayment / Khata',
          date: txDate,
          description: `Settled note: ${target.title}${target.description ? ` - ${target.description}` : ''}`,
        });
        if (!res.success) {
          return { success: false, error: res.error || 'Failed to record expense.' };
        }
      }
    }

    const updatedNote: FinancialNote = {
      ...target,
      is_resolved: true,
      resolved_at: nowIso,
      resolved_transaction_id: createdTxId,
      updated_at: nowIso,
    };

    await idbSaveNote(updatedNote);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('financial_notes').upsert(updatedNote, { onConflict: 'id' });
        } catch (cloudErr) {
          console.warn('Could not sync resolved note to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'UPSERT',
        payload: updatedNote as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'NOTE',
      entity_id: noteId,
      summary: `Resolved note: "${target.title}"${options?.convertToTransaction ? ' (Recorded in personal account)' : ''}`,
      details: { note: updatedNote, options },
      created_at: nowIso,
    });

    await refreshData(userId);
    return { success: true };
  };

  // Reopen Note
  const reopenNote = async (
    noteId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User is not logged in.' };
    const target = notes.find((n) => n.id === noteId);
    if (!target) return { success: false, error: 'Note not found.' };

    const nowIso = new Date().toISOString();
    const updatedNote: FinancialNote = {
      ...target,
      is_resolved: false,
      resolved_at: null,
      resolved_transaction_id: null,
      updated_at: nowIso,
    };

    await idbSaveNote(updatedNote);

    if (userId !== DEMO_USER_ID) {
      const supabase = getSupabase();
      if (supabase && navigator.onLine) {
        try {
          await supabase.from('financial_notes').upsert(updatedNote, { onConflict: 'id' });
        } catch (cloudErr) {
          console.warn('Could not sync reopened note to Supabase:', cloudErr);
        }
      }
    } else {
      await idbAddToSyncQueue({
        id: generateUUID(),
        table: 'financial_notes',
        action: 'UPSERT',
        payload: updatedNote as unknown as Record<string, unknown>,
        created_at: nowIso,
        retries: 0,
      });
      markOfflineChange();
    }

    await recordAuditLog({
      id: generateUUID(),
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'NOTE',
      entity_id: noteId,
      summary: `Reopened note: "${target.title}"`,
      details: { note: updatedNote },
      created_at: nowIso,
    });

    await refreshData(userId);
    return { success: true };
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        transactions,
        reconciliations,
        auditLogs,
        notes,
        syncStatus,
        summary,
        isInitialized,
        needsSetupWizard,
        hasOfflineDataToMigrate,
        syncMessage,
        clearSyncMessage,
        linkedCloudAccount,
        linkedCloudUserId,
        setLinkedCloudAccount,
        clearLinkedCloudAccount,
        uploadOfflineToCloud,
        pullLatestFromCloud,
        pushLocalDataToCloud,
        setupTwoAccounts,
        addAccount,
        deleteAccount,
        clearLocalData,
        migrateDemoDataToCloud,
        importAccountsFromCloud,
        addExpense,
        addIncome,
        addTransfer,
        updateTransaction,
        deleteTransaction,
        reconcileAccount,
        addNote,
        updateNote,
        deleteNote,
        resolveNote,
        reopenNote,
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
