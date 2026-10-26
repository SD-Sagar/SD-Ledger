import { Account, Transaction, Reconciliation, AuditLog, SyncQueueItem } from '../types';

const DB_NAME = 'SD_Ledger_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Accounts Store
      if (!db.objectStoreNames.contains('accounts')) {
        const store = db.createObjectStore('accounts', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }

      // Transactions Store
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('transaction_date', 'transaction_date', { unique: false });
      }

      // Reconciliations Store
      if (!db.objectStoreNames.contains('reconciliations')) {
        const store = db.createObjectStore('reconciliations', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('account_id', 'account_id', { unique: false });
      }

      // Audit Logs Store
      if (!db.objectStoreNames.contains('audit_logs')) {
        const store = db.createObjectStore('audit_logs', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Sync Queue Store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Meta Store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ---------------------- ACCOUNTS ----------------------
export async function idbGetAccounts(userId: string): Promise<Account[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readonly');
    const store = tx.objectStore('accounts');
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const accounts = (request.result as Account[]) || [];
      accounts.sort((a, b) => a.account_index - b.account_index);
      resolve(accounts);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveAccount(account: Account): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readwrite');
    const store = tx.objectStore('accounts');
    const request = store.put(account);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveAccounts(accounts: Account[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readwrite');
    const store = tx.objectStore('accounts');
    accounts.forEach((acc) => store.put(acc));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------- TRANSACTIONS ----------------------
export async function idbGetTransactions(userId: string): Promise<Transaction[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const list = (request.result as Transaction[]) || [];
      // Filter out soft deleted entries and sort newest first
      const active = list.filter((t) => !t.is_deleted);
      active.sort((a, b) => {
        const dateCompare = b.transaction_date.localeCompare(a.transaction_date);
        if (dateCompare !== 0) return dateCompare;
        return (b.transaction_time || '').localeCompare(a.transaction_time || '');
      });
      resolve(active);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const request = store.put(transaction);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveTransactions(transactions: Transaction[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    transactions.forEach((t) => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDeleteTransaction(id: string, userId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as Transaction | undefined;
      if (item && item.user_id === userId) {
        // Soft delete so sync queue can propagate to Supabase
        item.is_deleted = true;
        item.updated_at = new Date().toISOString();
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ---------------------- RECONCILIATIONS ----------------------
export async function idbGetReconciliations(userId: string): Promise<Reconciliation[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reconciliations', 'readonly');
    const store = tx.objectStore('reconciliations');
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const list = (request.result as Reconciliation[]) || [];
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveReconciliation(rec: Reconciliation): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reconciliations', 'readwrite');
    const store = tx.objectStore('reconciliations');
    const request = store.put(rec);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------- AUDIT LOGS ----------------------
export async function idbGetAuditLogs(userId: string): Promise<AuditLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audit_logs', 'readonly');
    const store = tx.objectStore('audit_logs');
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const list = (request.result as AuditLog[]) || [];
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveAuditLog(log: AuditLog): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audit_logs', 'readwrite');
    const store = tx.objectStore('audit_logs');
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------- SYNC QUEUE ----------------------
export async function idbAddToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = (request.result as SyncQueueItem[]) || [];
      list.sort((a, b) => a.created_at.localeCompare(b.created_at));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbRemoveFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------- META ----------------------
export async function idbGetMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result && 'value' in request.result) {
        resolve(request.result.value as T);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbSetMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------- BACKUP & RESTORE ----------------------
export interface FullDatabaseBackup {
  version: number;
  appName: string;
  exportedAt: string;
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  reconciliations: Reconciliation[];
  auditLogs: AuditLog[];
}

export async function idbExportDatabase(userId: string): Promise<FullDatabaseBackup> {
  const [accounts, transactions, reconciliations, auditLogs] = await Promise.all([
    idbGetAccounts(userId),
    idbGetTransactions(userId),
    idbGetReconciliations(userId),
    idbGetAuditLogs(userId),
  ]);

  return {
    version: 1,
    appName: 'SD-Ledger',
    exportedAt: new Date().toISOString(),
    userId,
    accounts,
    transactions,
    reconciliations,
    auditLogs,
  };
}

export async function idbRestoreDatabase(userId: string, backup: FullDatabaseBackup): Promise<void> {
  if (!backup || !Array.isArray(backup.accounts) || !Array.isArray(backup.transactions)) {
    throw new Error('Invalid SD-Ledger backup file format.');
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['accounts', 'transactions', 'reconciliations', 'audit_logs'], 'readwrite');

    const accStore = tx.objectStore('accounts');
    const txStore = tx.objectStore('transactions');
    const recStore = tx.objectStore('reconciliations');
    const auditStore = tx.objectStore('audit_logs');

    // Assign current user_id to avoid permission mismatch
    backup.accounts.forEach((acc) => {
      accStore.put({ ...acc, user_id: userId });
    });

    backup.transactions.forEach((t) => {
      txStore.put({ ...t, user_id: userId });
    });

    if (Array.isArray(backup.reconciliations)) {
      backup.reconciliations.forEach((r) => {
        recStore.put({ ...r, user_id: userId });
      });
    }

    if (Array.isArray(backup.auditLogs)) {
      backup.auditLogs.forEach((a) => {
        auditStore.put({ ...a, user_id: userId });
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
