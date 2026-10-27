import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import {
  idbGetSyncQueue,
  idbRemoveFromSyncQueue,
  idbGetAccounts,
  idbSaveAccount,
  idbDeleteAccount,
  idbUpdateTransactionAccountIds,
  idbUpdateReconciliationAccountIds,
  idbRemapQueueAccountId,
  idbGetTransactions,
  idbSaveTransaction,
  idbDeleteTransaction,
  idbGetReconciliations,
  idbSaveReconciliation,
  idbGetAuditLogs,
  idbSaveAuditLog,
  idbSetMeta,
  idbGetMeta,
  idbGetDeletedAccountIds,
} from './indexedDB';
import { Account, Transaction, Reconciliation, AuditLog, SyncStatus, SyncQueueItem } from '../types';
import { DEMO_USER_ID } from '../constants';

let isSyncInProgress = false;

export interface SyncResult {
  success: boolean;
  requiresAuth?: boolean;
  isOffline?: boolean;
  requiresConfig?: boolean;
  pushedCount?: number;
  pulledCount?: number;
  mergedCount?: number;
  message: string;
}

export async function processSync(
  userId: string,
  onStatusUpdate?: (status: SyncStatus) => void
): Promise<SyncResult> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Browser environment required.' };
  }

  // 1. Check if user is in demo mode or unauthenticated
  if (!userId || userId === DEMO_USER_ID) {
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: navigator.onLine,
        isSyncing: false,
        lastSyncedAt: null,
        pendingCount: 0,
        errorMessage: 'Online account required for cloud sync.',
      });
    }
    return {
      success: false,
      requiresAuth: true,
      message: 'Please connect your online Supabase account to sync offline data to the cloud.',
    };
  }

  // 2. Check if device is physically offline
  const isOnline = navigator.onLine;
  if (!isOnline) {
    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');
    const msg = 'Device is currently offline. Connect to the internet to sync with cloud.';
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: false,
        isSyncing: false,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: msg,
      });
    }
    return { success: false, isOffline: true, message: msg };
  }

  // 3. Check Supabase config
  if (!isSupabaseConfigured()) {
    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');
    const msg = 'Supabase credentials not configured. Please enter your project URL and anon key.';
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: msg,
      });
    }
    return { success: false, requiresConfig: true, message: msg };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Could not initialize Supabase client.' };
  }

  if (isSyncInProgress) {
    return { success: false, message: 'A sync operation is already in progress.' };
  }
  isSyncInProgress = true;

  try {
    const initialQueue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');

    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: true,
        isSyncing: true,
        lastSyncedAt: lastSync || null,
        pendingCount: initialQueue.length,
        errorMessage: null,
      });
    }

    let pushedCount = 0;
    let pulledCount = 0;
    let mergedCount = 0;

    // -------------------------------------------------------------------------
    // STEP 1: RESOLVE DELETED ACCOUNTS & SMART MERGE ACCOUNTS
    // Prevents deleted accounts from resurrecting from the cloud!
    // Cloud storage is the source of truth for existing accounts.
    // Only brand new accounts created offline get added to the cloud.
    // -------------------------------------------------------------------------
    const deletedAccountIds = new Set<string>([
      ...(await idbGetDeletedAccountIds(userId)),
      ...(await idbGetDeletedAccountIds(DEMO_USER_ID)),
    ]);
    initialQueue
      .filter((q) => q.table === 'accounts' && q.action === 'DELETE')
      .forEach((q) => {
        const targetId = (q.payload as { id: string })?.id;
        if (targetId) deletedAccountIds.add(targetId);
      });

    // Ensure all deleted account IDs are immediately deleted from Supabase cloud
    for (const delId of deletedAccountIds) {
      await supabase.from('accounts').delete().eq('id', delId);
    }

    const { data: remoteAccountsData, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (accError) {
      throw new Error(`Failed to fetch cloud accounts: ${accError.message}`);
    }

    // Filter out any remote accounts that are marked as deleted locally
    const remoteAccounts = ((remoteAccountsData as Account[]) || []).filter(
      (acc) => !deletedAccountIds.has(acc.id)
    );

    // Merge accounts from both the active cloud cache and local offline store
    const userAccs = await idbGetAccounts(userId);
    const demoAccs = await idbGetAccounts(DEMO_USER_ID);
    const localAccountsMap = new Map<string, Account>();
    for (const a of [...userAccs, ...demoAccs]) {
      if (!deletedAccountIds.has(a.id)) {
        const key = a.display_name.trim().toLowerCase();
        if (!localAccountsMap.has(key)) {
          localAccountsMap.set(key, a);
        }
      }
    }
    const localAccounts = Array.from(localAccountsMap.values());

    const remoteByName = new Map<string, Account>();
    const remoteById = new Map<string, Account>();
    remoteAccounts.forEach((acc) => {
      remoteByName.set(acc.display_name.trim().toLowerCase(), acc);
      remoteById.set(acc.id, acc);
    });

    const handledAccountQueueIds = new Set<string>();

    for (const local of localAccounts) {
      const normName = local.display_name.trim().toLowerCase();
      const matchingRemote = remoteByName.get(normName) || remoteById.get(local.id);

      if (matchingRemote) {
        // MATCH: Account exists on the cloud!
        // CLOUD STORAGE IS THE SOURCE OF TRUTH FOR EXISTING ACCOUNTS.
        // Remap all local transactions from local UUID to cloud authoritative UUID
        if (local.id !== matchingRemote.id) {
          await idbUpdateTransactionAccountIds(local.id, matchingRemote.id, userId);
          await idbUpdateTransactionAccountIds(local.id, matchingRemote.id, DEMO_USER_ID);
          await idbUpdateReconciliationAccountIds(local.id, matchingRemote.id, userId);
          await idbUpdateReconciliationAccountIds(local.id, matchingRemote.id, DEMO_USER_ID);
          await idbRemapQueueAccountId(local.id, matchingRemote.id);
          await idbDeleteAccount(local.id, userId);
          await idbDeleteAccount(local.id, DEMO_USER_ID);
        }
        await idbSaveAccount(matchingRemote);
        // Also mirror into DEMO_USER_ID so offline mode always keeps persistent accounts
        await idbSaveAccount({ ...matchingRemote, user_id: DEMO_USER_ID });
        mergedCount++;

        // Mark any pending queue upsert for this local account as handled
        initialQueue
          .filter((q) => q.table === 'accounts' && q.payload?.id === local.id)
          .forEach((q) => handledAccountQueueIds.add(q.id));
      } else {
        // BRAND NEW PERSONAL ACCOUNT CREATED OFFLINE:
        // Does not exist on the cloud yet, so add it to the cloud!
        const cleanAccount: Record<string, unknown> = {
          ...local,
          user_id: userId,
        };
        delete cleanAccount.sync_status;

        const { error: insertErr } = await supabase
          .from('accounts')
          .upsert(cleanAccount, { onConflict: 'id' });

        if (insertErr) throw insertErr;

        pushedCount++;
        await idbSaveAccount({ ...(local as Account), user_id: userId });
        await idbSaveAccount({ ...(local as Account), user_id: DEMO_USER_ID });
        initialQueue
          .filter((q) => q.table === 'accounts' && q.payload?.id === local.id)
          .forEach((q) => handledAccountQueueIds.add(q.id));
      }
    }

    // Pull any remote accounts not present locally (excluding deleted ones)
    const localByName = new Map<string, Account>();
    localAccounts.forEach((l) => localByName.set(l.display_name.trim().toLowerCase(), l));

    for (const remote of remoteAccounts) {
      if (deletedAccountIds.has(remote.id)) continue;
      const normName = remote.display_name.trim().toLowerCase();
      if (!localByName.has(normName)) {
        // New account created on cloud / another device: download it
        await idbSaveAccount(remote);
        await idbSaveAccount({ ...remote, user_id: DEMO_USER_ID });
        pulledCount++;
      }
    }

    // -------------------------------------------------------------------------
    // STEP 2: FLUSH REMAINING MUTATION QUEUE
    // (Transactions, Reconciliations, Deletions)
    // -------------------------------------------------------------------------
    const currentQueue = await idbGetSyncQueue();
    for (const item of currentQueue) {
      if (handledAccountQueueIds.has(item.id)) {
        await idbRemoveFromSyncQueue(item.id);
        continue;
      }

      try {
        if (item.action === 'UPSERT') {
          const cleanPayload: Record<string, unknown> = {
            ...item.payload,
            user_id: userId,
          };
          delete cleanPayload.sync_status;

          const { error } = await supabase.from(item.table).upsert(cleanPayload, {
            onConflict: 'id',
          });

          if (error) {
            console.error(`Sync error on ${item.table} upsert:`, error);
            throw error;
          }
          pushedCount++;
        } else if (item.action === 'DELETE') {
          const targetId = (item.payload as { id: string })?.id;
          if (targetId) {
            const { error } = await supabase
              .from(item.table)
              .delete()
              .eq('id', targetId);

            if (error) {
              console.error(`Sync error on ${item.table} delete:`, error);
              throw error;
            }
            pushedCount++;
          }
        }

        await idbRemoveFromSyncQueue(item.id);
      } catch (err: unknown) {
        console.warn(`Failed to sync queue item ${item.id}:`, err);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 3: SMART MERGE TRANSACTIONS (Multi-Device LWW by updated_at)
    // -------------------------------------------------------------------------
    const { data: remoteTransactionsData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (!txError && Array.isArray(remoteTransactionsData)) {
      const remoteTransactions = remoteTransactionsData as Transaction[];
      const userTxs = await idbGetTransactions(userId);
      const demoTxs = await idbGetTransactions(DEMO_USER_ID);
      
      const localTxMap = new Map<string, Transaction>();
      [...userTxs, ...demoTxs].forEach((t) => {
        localTxMap.set(t.id, { ...t, user_id: userId });
      });

      for (const remoteTx of remoteTransactions) {
        const localTx = localTxMap.get(remoteTx.id);
        if (localTx) {
          const remoteTime = new Date(remoteTx.updated_at || remoteTx.created_at || 0).getTime();
          const localTime = new Date(localTx.updated_at || localTx.created_at || 0).getTime();

          if (remoteTime > localTime) {
            if (remoteTx.is_deleted) {
              await idbDeleteTransaction(remoteTx.id, userId);
              await idbDeleteTransaction(remoteTx.id, DEMO_USER_ID);
            } else {
              await idbSaveTransaction(remoteTx);
              await idbSaveTransaction({ ...remoteTx, user_id: DEMO_USER_ID });
            }
            pulledCount++;
          } else if (localTime > remoteTime) {
            if (!localTx.is_deleted) {
              const cleanTx: Record<string, unknown> = { ...localTx, user_id: userId };
              delete cleanTx.sync_status;
              await supabase.from('transactions').upsert(cleanTx, { onConflict: 'id' });
              pushedCount++;
            }
          }
        } else {
          // New transaction from cloud / another device
          if (!remoteTx.is_deleted) {
            await idbSaveTransaction(remoteTx);
            await idbSaveTransaction({ ...remoteTx, user_id: DEMO_USER_ID });
            pulledCount++;
          }
        }
      }

      // Any local transaction not on remote: push up to Supabase
      const remoteTxMap = new Map<string, Transaction>();
      remoteTransactions.forEach((r) => remoteTxMap.set(r.id, r));

      for (const localTx of Array.from(localTxMap.values())) {
        if (!remoteTxMap.has(localTx.id) && !localTx.is_deleted) {
          const cleanTx: Record<string, unknown> = { ...localTx, user_id: userId };
          delete cleanTx.sync_status;
          const { error: txErr } = await supabase.from('transactions').upsert(cleanTx, { onConflict: 'id' });
          if (txErr) {
            console.error('Failed to upsert transaction during upload:', txErr.message);
          } else {
            await idbSaveTransaction({ ...localTx, user_id: userId });
            await idbSaveTransaction({ ...localTx, user_id: DEMO_USER_ID });
            pushedCount++;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 4: PULL REMOTE RECONCILIATIONS
    // -------------------------------------------------------------------------
    const { data: remoteRecs, error: recError } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('user_id', userId);

    if (!recError && Array.isArray(remoteRecs)) {
      for (const r of remoteRecs) {
        await idbSaveReconciliation(r as Reconciliation);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 5: SYNC AUDIT LOGS ACROSS ALL DEVICES
    // -------------------------------------------------------------------------
    try {
      const { data: remoteLogs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!logError && Array.isArray(remoteLogs)) {
        for (const l of remoteLogs) {
          await idbSaveAuditLog(l as AuditLog);
          await idbSaveAuditLog({ ...(l as AuditLog), user_id: DEMO_USER_ID });
        }
      }

      // Push local audit logs to cloud if not yet on remote
      const [userLogs, demoLogs] = await Promise.all([
        idbGetAuditLogs(userId),
        idbGetAuditLogs(DEMO_USER_ID),
      ]);
      const remoteLogIds = new Set((remoteLogs || []).map((l: AuditLog) => l.id));
      const localLogMap = new Map<string, AuditLog>();
      [...userLogs, ...demoLogs].forEach((l) => {
        if (!localLogMap.has(l.id)) localLogMap.set(l.id, l);
      });

      for (const l of Array.from(localLogMap.values())) {
        if (!remoteLogIds.has(l.id)) {
          await supabase.from('audit_logs').upsert({ ...l, user_id: userId }, { onConflict: 'id' });
          remoteLogIds.add(l.id);
        }
      }
    } catch (auditSyncErr) {
      console.warn('Could not sync audit logs during cloud sync:', auditSyncErr);
    }

    // -------------------------------------------------------------------------
    // FINALIZE: Set last synced timestamp and report success
    // -------------------------------------------------------------------------
    const nowIso = new Date().toISOString();
    await idbSetMeta('last_synced_at', nowIso);
    await idbSetMeta('sync_error', null);

    const remainingQueue = await idbGetSyncQueue();
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: nowIso,
        pendingCount: remainingQueue.length,
        errorMessage: remainingQueue.length > 0 ? 'Some items pending retry.' : null,
      });
    }

    const summaryMsg =
      pushedCount > 0 || pulledCount > 0 || mergedCount > 0
        ? `Cloud Sync Complete: ${pushedCount} uploaded, ${pulledCount} downloaded, ${mergedCount} accounts merged.`
        : 'Cloud Sync Complete: All records are fully matched with cloud.';

    return {
      success: true,
      pushedCount,
      pulledCount,
      mergedCount,
      message: summaryMsg,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Sync failed';
    console.error('Smart Sync failed:', error);
    await idbSetMeta('sync_error', errorMsg);

    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');

    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: navigator.onLine,
        isSyncing: false,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: errorMsg,
      });
    }

    return { success: false, message: errorMsg };
  } finally {
    isSyncInProgress = false;
  }
}
