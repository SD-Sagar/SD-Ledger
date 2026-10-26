import { APP_TIMEZONE } from '../constants';
import { Transaction, Account } from '../types';

/**
 * Format a number as Indian Currency (INR, ₹)
 */
export function formatINR(amount: number, showSign: boolean = false): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);

  if (isNegative) {
    return `- ${formatted}`;
  }
  if (showSign && amount > 0) {
    return `+ ${formatted}`;
  }
  return formatted;
}

/**
 * Returns today's date string YYYY-MM-DD in Asia/Kolkata timezone
 */
export function getTodayKolkata(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns current time string HH:mm in Asia/Kolkata timezone
 */
export function getCurrentTimeKolkata(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(now);
}

/**
 * Format a date string (YYYY-MM-DD) into readable Indian date
 * e.g., "26 Oct 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp into readable date & time (Asia/Kolkata)
 */
export function formatDisplayDateTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: APP_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoStr;
  }
}

/**
 * Secure client-side UUID generator
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate CSV text from transactions
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[]
): string {
  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.display_name));

  const headers = [
    'Transaction ID',
    'Date',
    'Time (IST)',
    'Type',
    'Amount (INR)',
    'Account / From Account',
    'To Account',
    'Category / Source',
    'Description',
    'Created At',
  ];

  const rows = transactions.map((t) => {
    const fromName = t.from_account_id ? accountMap.get(t.from_account_id) || 'Unknown' : '';
    const toName = t.to_account_id ? accountMap.get(t.to_account_id) || 'Unknown' : '';
    const desc = (t.description || '').replace(/"/g, '""');

    return [
      t.id,
      t.transaction_date,
      t.transaction_time || '',
      t.type,
      t.amount.toFixed(2),
      `"${fromName}"`,
      `"${toName}"`,
      `"${t.category || ''}"`,
      `"${desc}"`,
      t.created_at,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
