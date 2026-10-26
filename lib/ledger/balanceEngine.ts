import { Account, Transaction, Reconciliation, AccountBalanceSummary, LedgerSummary } from '../types';

/**
 * Calculates current ledger balance for a single account
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = Number(account.opening_balance) || 0;

  for (const t of transactions) {
    if (t.is_deleted) continue;

    const amount = Number(t.amount) || 0;

    if (t.type === 'INCOME') {
      if (t.to_account_id === account.id) {
        balance += amount;
      }
    } else if (t.type === 'EXPENSE') {
      if (t.from_account_id === account.id) {
        balance -= amount;
      }
    } else if (t.type === 'TRANSFER') {
      if (t.to_account_id === account.id) {
        balance += amount;
      }
      if (t.from_account_id === account.id) {
        balance -= amount;
      }
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Calculates complete ledger summary for both accounts
 */
export function computeLedgerSummary(
  accounts: Account[],
  transactions: Transaction[],
  reconciliations: Reconciliation[],
  currentMonthPrefix: string // e.g. "2026-10"
): LedgerSummary {
  const accountSummaries: AccountBalanceSummary[] = accounts.map((account) => {
    const calculatedBalance = calculateAccountBalance(account, transactions);

    // Find latest reconciliation for this account
    const accountRecs = reconciliations
      .filter((r) => r.account_id === account.id)
      .sort((a, b) => b.reconciled_date.localeCompare(a.reconciled_date));
    
    const latestReconciliation = accountRecs[0];
    const reconciledDifference = latestReconciliation
      ? Math.round((Number(latestReconciliation.actual_bank_balance) - calculatedBalance) * 100) / 100
      : undefined;

    return {
      account,
      calculatedBalance,
      latestReconciliation,
      reconciledDifference,
    };
  });

  const totalCalculatedBalance = accountSummaries.reduce(
    (sum, a) => sum + a.calculatedBalance,
    0
  );

  // Calculate monthly stats (for transactions in current month)
  let monthIncome = 0;
  let monthExpense = 0;

  for (const t of transactions) {
    if (t.is_deleted) continue;
    if (!t.transaction_date.startsWith(currentMonthPrefix)) continue;

    const amt = Number(t.amount) || 0;
    if (t.type === 'INCOME') {
      monthIncome += amt;
    } else if (t.type === 'EXPENSE') {
      monthExpense += amt;
    }
  }

  const monthNetSavings = monthIncome - monthExpense;

  return {
    accounts: accountSummaries,
    totalCalculatedBalance: Math.round(totalCalculatedBalance * 100) / 100,
    monthIncome: Math.round(monthIncome * 100) / 100,
    monthExpense: Math.round(monthExpense * 100) / 100,
    monthNetSavings: Math.round(monthNetSavings * 100) / 100,
  };
}
