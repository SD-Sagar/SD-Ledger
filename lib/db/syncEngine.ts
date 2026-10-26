import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import {
  idbGetSyncQueue,
  idbRemoveFromSyncQueue,
  idbSaveAccounts,
  idbSaveTransactions,
  idbSaveReconciliation,
  idbSetMeta,
  idbGetMeta,
} from './indexedDB';
import { Account, Transaction, Reconciliation, SyncStatus } from '../types';

let isSyncInProgress = false;

export async function processSync(
  userId: string,
  onStatusUpdate?: (status: SyncStatus) => void
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const isOnline = navigator.onLine;

  if (!isOnline) {
    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: false,
        isSyncing: false,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: 'Device is offline. Changes are saved locally in IndexedDB.',
      });
    }
    return false;
  }

  if (!isSupabaseConfigured()) {
    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');
    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: null,
      });
    }
    return false;
  }

  const supabase = getSupabase();
  if (!supabase) return false;

  if (isSyncInProgress) return false;
  isSyncInProgress = true;

  try {
    const queue = await idbGetSyncQueue();
    const lastSync = await idbGetMeta<string>('last_synced_at');

    if (onStatusUpdate) {
      onStatusUpdate({
        isOnline: true,
        isSyncing: true,
        lastSyncedAt: lastSync || null,
        pendingCount: queue.length,
        errorMessage: null,
      });
    }

    // 1. Flush local mutation queue to Supabase
    for (const item of queue) {
      try {
        if (item.action === 'UPSERT') {
          // Clean payload to match Supabase schema (strip client-only keys)
          const cleanPayload = { ...item.payload };
          delete cleanPayload.sync_status;

          const { error } = await supabase.from(item.table).upsert(cleanPayload, {
            onConflict: 'id',
          });

          if (error) {
            console.error(`Sync error on ${item.table} upsert:`, error);
            throw error;
          }
        } else if (item.action === 'DELETE') {
          const { error } = await supabase
            .from(item.table)
            .delete()
            .eq('id', (item.payload as { id: string }).id);

          if (error) {
            console.error(`Sync error on ${item.table} delete:`, error);
            throw error;
          }
        }

        // Successfully synced item, remove from queue
        await idbRemoveFromSyncQueue(item.id);
      } catch (err: unknown) {
        console.warn(`Failed to sync item ${item.id}:`, err);
        // Continue with others
      }
    }

    // 2. Pull latest accounts from Supabase
    const { data: remoteAccounts, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (!accError && remoteAccounts && remoteAccounts.length > 0) {
      await idbSaveAccounts(remoteAccounts as Account[]);
    }

    // 3. Pull latest transactions from Supabase
    const { data: remoteTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (!txError && remoteTransactions && remoteTransactions.length > 0) {
      await idbSaveTransactions(remoteTransactions as Transaction[]);
    }

    // 4. Pull latest reconciliations from Supabase
    const { data: remoteRecs, error: recError } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('user_id', userId);

    if (!recError && remoteRecs && remoteRecs.length > 0) {
      for (const r of remoteRecs) {
        await idbSaveReconciliation(r as Reconciliation);
      }
    }

    // Update last synced timestamp
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
        errorMessage: remainingQueue.length > 0 ? 'Some items pending sync retry.' : null,
      });
    }

    return true;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Sync failed';
    console.error('Sync failed:', error);
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

    return false;
  } finally {
    isSyncInProgress = false;
  }
}
