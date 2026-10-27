export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface Account {
  id: string; // UUID
  user_id: string;
  display_name: string;
  opening_balance: number;
  opening_date: string; // YYYY-MM-DD
  is_active: boolean;
  account_index: number; // Supports initial 2 accounts and unlimited additional accounts
  bank_color?: string; // Visual tag/gradient
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string; // UUID
  user_id: string;
  type: TransactionType;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  transaction_time: string; // HH:mm (IST)
  from_account_id?: string | null; // For EXPENSE and TRANSFER
  to_account_id?: string | null;   // For INCOME and TRANSFER
  category: string; // Expense Category or Income Source
  description?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  sync_status?: 'synced' | 'pending' | 'conflict' | 'error';
}

export interface Reconciliation {
  id: string;
  user_id: string;
  account_id: string;
  reconciled_date: string; // YYYY-MM-DD
  actual_bank_balance: number; // Balance from bank statement
  calculated_balance: number;  // System computed balance
  difference: number;          // actual - calculated
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RECONCILE' | 'SETUP' | 'RESTORE';
  entity_type: 'TRANSACTION' | 'ACCOUNT' | 'RECONCILIATION' | 'SYSTEM' | 'NOTE';
  entity_id: string;
  summary: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export type NoteType = 'THEY_OWE_ME' | 'I_OWE_THEM' | 'REMINDER';
export type NoteColor = 'yellow' | 'mint' | 'rose' | 'sky' | 'lavender' | 'slate';

export interface FinancialNote {
  id: string; // UUID
  user_id: string;
  title: string;
  description?: string;
  type: NoteType;
  amount?: number | null;
  due_date?: string | null; // YYYY-MM-DD
  card_color: NoteColor;
  is_pinned: boolean;
  is_resolved: boolean;
  resolved_at?: string | null;
  resolved_transaction_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  table: 'accounts' | 'transactions' | 'reconciliations' | 'audit_logs' | 'financial_notes';
  action: 'UPSERT' | 'DELETE';
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
}

export interface AccountBalanceSummary {
  account: Account;
  calculatedBalance: number;
  latestReconciliation?: Reconciliation;
  reconciledDifference?: number;
}

export interface LedgerSummary {
  accounts: AccountBalanceSummary[];
  totalCalculatedBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthNetSavings: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  isEmailVerified: boolean;
}
