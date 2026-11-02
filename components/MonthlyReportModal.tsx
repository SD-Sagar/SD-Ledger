'use client';

import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Account, Transaction } from '../lib/types';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import {
  formatINR,
  formatDisplayDate,
  downloadFile,
  getTodayKolkata,
} from '../lib/utils/formatters';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart,
  Wallet,
  Calendar,
  Sparkles,
  ChevronDown,
  Percent,
  Receipt,
  FileText,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string; // YYYY-MM
}

export function MonthlyReportModal({
  isOpen,
  onClose,
  initialMonth,
}: MonthlyReportModalProps) {
  const { accounts, transactions } = useLedger();
  const todayStr = useMemo(() => getTodayKolkata(), []);

  // Account map for quick display name resolution
  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Compute available 6 months list (bounded by the 6-month cap)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const parts = todayStr.split('-').map(Number);
    const curYear = parts[0];
    const curMonth = parts[1]; // 1-12

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    for (let i = 0; i < 6; i++) {
      let m = curMonth - i;
      let y = curYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${monthNames[m - 1]} ${y}`;
      list.push({ key, label, year: y, month: m });
    }

    return list;
  }, [todayStr]);

  // Selected Month key (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (initialMonth && availableMonths.some((m) => m.key === initialMonth)) {
      return initialMonth;
    }
    return availableMonths[0]?.key || todayStr.substring(0, 7);
  });

  // Synchronize selectedMonth whenever modal opens with a targeted initialMonth
  React.useEffect(() => {
    if (isOpen) {
      if (initialMonth && availableMonths.some((m) => m.key === initialMonth)) {
        setSelectedMonth(initialMonth);
      } else if (!initialMonth && availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0].key);
      }
    }
  }, [isOpen, initialMonth, availableMonths]);

  // Checkbox option: include full transactions in PDF export or 1-page summary only
  const [includeTransactionsInPdf, setIncludeTransactionsInPdf] = useState(true);

  // Download / Export dropdown menu state & ref
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Scroll ref to ensure print begins at top
  const modalContentRef = React.useRef<HTMLDivElement>(null);

  // Calculate detailed Monthly Report metrics with 100% mathematical precision
  const reportData = useMemo(() => {
    if (!selectedMonth) return null;

    const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
    const monthStartDate = `${selectedMonth}-01`;
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
    const monthEndDate = `${selectedMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Non-deleted transactions
    const validTxs = transactions.filter((t) => !t.is_deleted);

    // Active accounts
    const activeAccounts = accounts.filter((a) => a.is_active);
    const accountMap = new Map<string, Account>();
    accounts.forEach((a) => accountMap.set(a.id, a));

    // 1. OPENING BALANCE (as of 00:00 on monthStartDate)
    // Account initial opening balances + transactions prior to monthStartDate
    let openingBalance = 0;
    const accountOpeningMap = new Map<string, number>();

    // Initial account opening balances
    activeAccounts.forEach((acc) => {
      // If opening date is before or within monthStartDate
      const initial = acc.opening_balance || 0;
      accountOpeningMap.set(acc.id, initial);
      openingBalance += initial;
    });

    // Apply all historical transactions before monthStartDate
    validTxs.forEach((t) => {
      if (t.transaction_date >= monthStartDate) return; // Only past txs

      if (t.type === 'INCOME') {
        openingBalance += t.amount;
        if (t.to_account_id && accountOpeningMap.has(t.to_account_id)) {
          accountOpeningMap.set(
            t.to_account_id,
            (accountOpeningMap.get(t.to_account_id) || 0) + t.amount
          );
        }
      } else if (t.type === 'EXPENSE') {
        openingBalance -= t.amount;
        if (t.from_account_id && accountOpeningMap.has(t.from_account_id)) {
          accountOpeningMap.set(
            t.from_account_id,
            (accountOpeningMap.get(t.from_account_id) || 0) - t.amount
          );
        }
      } else if (t.type === 'TRANSFER') {
        // Transfers net 0 across overall balance, but shift between accounts
        if (t.from_account_id && accountOpeningMap.has(t.from_account_id)) {
          accountOpeningMap.set(
            t.from_account_id,
            (accountOpeningMap.get(t.from_account_id) || 0) - t.amount
          );
        }
        if (t.to_account_id && accountOpeningMap.has(t.to_account_id)) {
          accountOpeningMap.set(
            t.to_account_id,
            (accountOpeningMap.get(t.to_account_id) || 0) + t.amount
          );
        }
      }
    });

    // 2. CURRENT MONTH TRANSACTIONS
    const monthTxs = validTxs.filter(
      (t) => t.transaction_date >= monthStartDate && t.transaction_date <= monthEndDate
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    let transferVolume = 0;
    let transferCount = 0;

    // Account inflows & outflows during month
    const accountInflowMap = new Map<string, number>();
    const accountOutflowMap = new Map<string, number>();
    activeAccounts.forEach((a) => {
      accountInflowMap.set(a.id, 0);
      accountOutflowMap.set(a.id, 0);
    });

    // Predefined maps for categories
    const expCatMap = new Map<string, { label: string; color: string }>();
    EXPENSE_CATEGORIES.forEach((c) => {
      expCatMap.set(c.label.toLowerCase(), { label: c.label, color: c.color });
      expCatMap.set(c.id.toLowerCase(), { label: c.label, color: c.color });
    });

    const categorySums = new Map<
      string,
      { name: string; amount: number; color: string; count: number }
    >();

    monthTxs.forEach((t) => {
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
        if (t.to_account_id && accountInflowMap.has(t.to_account_id)) {
          accountInflowMap.set(
            t.to_account_id,
            (accountInflowMap.get(t.to_account_id) || 0) + t.amount
          );
        }
      } else if (t.type === 'EXPENSE') {
        totalExpenses += t.amount;
        if (t.from_account_id && accountOutflowMap.has(t.from_account_id)) {
          accountOutflowMap.set(
            t.from_account_id,
            (accountOutflowMap.get(t.from_account_id) || 0) + t.amount
          );
        }

        // Category breakdown with "Other / Miscellaneous" fallback
        const rawCat = (t.category || '').trim();
        const match = rawCat ? expCatMap.get(rawCat.toLowerCase()) : null;
        const catKey = match ? match.label : 'Other / Miscellaneous';
        const catColor = match ? match.color : '#64748b';

        const existing = categorySums.get(catKey) || {
          name: catKey,
          amount: 0,
          color: catColor,
          count: 0,
        };
        existing.amount += t.amount;
        existing.count += 1;
        categorySums.set(catKey, existing);
      } else if (t.type === 'TRANSFER') {
        transferVolume += t.amount;
        transferCount += 1;
        if (t.from_account_id && accountOutflowMap.has(t.from_account_id)) {
          accountOutflowMap.set(
            t.from_account_id,
            (accountOutflowMap.get(t.from_account_id) || 0) + t.amount
          );
        }
        if (t.to_account_id && accountInflowMap.has(t.to_account_id)) {
          accountInflowMap.set(
            t.to_account_id,
            (accountInflowMap.get(t.to_account_id) || 0) + t.amount
          );
        }
      }
    });

    // 3. CLOSING BALANCE & SAVINGS RATE
    const closingBalance = openingBalance + totalIncome - totalExpenses;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10
        : 0;

    // 4. CATEGORY BREAKDOWN LIST
    const categoryBreakdown = Array.from(categorySums.values())
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((c) => ({
        ...c,
        percentage:
          totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 1000) / 10 : 0,
      }));

    // 5. ACCOUNT-WISE BREAKDOWN
    const accountBreakdown = activeAccounts.map((acc) => {
      const open = accountOpeningMap.get(acc.id) || 0;
      const inflow = accountInflowMap.get(acc.id) || 0;
      const outflow = accountOutflowMap.get(acc.id) || 0;
      const close = open + inflow - outflow;
      const net = close - open;

      return {
        id: acc.id,
        name: acc.display_name,
        opening: open,
        inflow,
        outflow,
        closing: close,
        netChange: net,
      };
    });

    const monthLabel =
      availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth;

    // Sort transactions reverse-chronologically (latest first)
    const sortedMonthTxs = [...monthTxs].sort((a, b) => {
      if (b.transaction_date !== a.transaction_date) {
        return b.transaction_date.localeCompare(a.transaction_date);
      }
      return b.created_at.localeCompare(a.created_at);
    });

    return {
      monthKey: selectedMonth,
      monthLabel,
      monthStartDate,
      monthEndDate,
      transactionCount: monthTxs.length,
      openingBalance,
      totalIncome,
      totalExpenses,
      transferVolume,
      transferCount,
      closingBalance,
      netSavings,
      savingsRate,
      categoryBreakdown,
      accountBreakdown,
      monthTxs: sortedMonthTxs,
    };
  }, [selectedMonth, accounts, transactions, availableMonths]);

  if (!isOpen || !reportData) return null;

  // EXPORT AS CSV
  const handleExportCSV = () => {
    const lines = [
      `"SD-Ledger - Monthly Financial Report"`,
      `"Month:","${reportData.monthLabel}"`,
      `"Period:","${reportData.monthStartDate} to ${reportData.monthEndDate}"`,
      `"Generated At:","${todayStr} (IST)"`,
      ``,
      `"--- EXECUTIVE SUMMARY ---"`,
      `"Metric","Amount (INR)"`,
      `"Opening Balance",${reportData.openingBalance.toFixed(2)}`,
      `"Total Income",${reportData.totalIncome.toFixed(2)}`,
      `"Total Expenses",${reportData.totalExpenses.toFixed(2)}`,
      `"Net Monthly Savings",${reportData.netSavings.toFixed(2)}`,
      `"Savings Rate (%)","${reportData.savingsRate}%"`,
      `"Total Transfers Volume",${reportData.transferVolume.toFixed(2)}`,
      `"Transfer Transactions Count",${reportData.transferCount}`,
      `"Closing Balance",${reportData.closingBalance.toFixed(2)}`,
      ``,
      `"--- ACCOUNT-WISE BALANCE CHANGES ---"`,
      `"Account Name","Opening Balance (INR)","Total Inflow (INR)","Total Outflow (INR)","Closing Balance (INR)","Net Change (INR)"`,
      ...reportData.accountBreakdown.map((a) =>
        [
          `"${a.name}"`,
          a.opening.toFixed(2),
          a.inflow.toFixed(2),
          a.outflow.toFixed(2),
          a.closing.toFixed(2),
          (a.netChange >= 0 ? `+` : ``) + a.netChange.toFixed(2),
        ].join(',')
      ),
      ``,
      `"--- EXPENSE CATEGORY BREAKDOWN ---"`,
      `"Category","Amount (INR)","Percentage (%)","Transactions Count"`,
      ...reportData.categoryBreakdown.map((c) =>
        [
          `"${c.name}"`,
          c.amount.toFixed(2),
          `"${c.percentage}%"`,
          c.count,
        ].join(',')
      ),
      ``,
      `"--- ITEMIZED TRANSACTIONS LEDGER ---"`,
      `"Date","Type","Category / Title","Description","Account","Amount (INR)"`,
      ...reportData.monthTxs.map((t) => {
        const fromAcc = t.from_account_id ? accountMap.get(t.from_account_id)?.display_name : '';
        const toAcc = t.to_account_id ? accountMap.get(t.to_account_id)?.display_name : '';
        const accStr =
          t.type === 'TRANSFER'
            ? `${fromAcc || ''} -> ${toAcc || ''}`
            : t.type === 'INCOME'
            ? toAcc || ''
            : fromAcc || '';
        const sign = t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : '';
        return [
          `"${t.transaction_date}"`,
          `"${t.type}"`,
          `"${(t.category || '').replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          `"${(accStr || '').replace(/"/g, '""')}"`,
          `"${sign}${t.amount.toFixed(2)}"`,
        ].join(',');
      }),
    ];

    const csvContent = lines.join('\n');
    downloadFile(
      csvContent,
      `SD-Ledger-Report-${reportData.monthKey}.csv`,
      'text/csv'
    );
  };

  // EXPORT AS PDF VIA WINDOW.PRINT
  const handlePrintPDF = () => {
    // Ensure modal scroll is at the very top before printing
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
    // Settle layout before triggering browser print dialog
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:w-full print:h-auto print:overflow-visible">
      {/* Modal Container */}
      <div
        ref={modalContentRef}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-7 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 transition-colors print:static print:max-h-none print:max-w-none print:w-full print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:overflow-visible print:bg-white print:text-black print:space-y-4"
      >
        {/* Dynamic print style to strictly hide transactions if unchecked */}
        <style>{`
          @media print {
            ${!includeTransactionsInPdf ? '#monthly-report-transactions-section { display: none !important; visibility: hidden !important; }' : ''}
          }
        `}</style>

        {/* TOP BAR: BRAND, MONTH PICKER & ACTION CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 print:hidden">
          {/* Brand & Title (with Close button on mobile) */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">Monthly Financial Report</span>
                  <span className="hidden xs:inline rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                    Verified
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  Ledger statement, breakdown &amp; savings rate
                </p>
              </div>
            </div>

            {/* Close Button on Mobile (top-right of header) */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Toolbar: Month Selector, Checkbox & Unified Download Dropdown */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 flex-nowrap">
            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 py-1.5 pl-2.5 pr-7 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            </div>

            {/* Checkbox for PDF Transaction Ledger */}
            <label
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition-colors select-none shadow-xs"
              title="When checked, full transaction stack is included across page 2+ in PDF. When unchecked, exports a clean 1-page summary."
            >
              <input
                type="checkbox"
                checked={includeTransactionsInPdf}
                onChange={(e) => setIncludeTransactionsInPdf(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] whitespace-nowrap">
                <span className="hidden sm:inline">Include </span>Txns
              </span>
            </label>

            {/* Unified Download Dropdown (PDF & CSV in One Button) */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
                <ChevronDown className={`h-3 w-3 ml-0.5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-2xl animate-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handlePrintPDF();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-zinc-900 dark:text-white">Save as PDF</span>
                      <span className="text-[10px] text-zinc-400">Printable statement format</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportCSV();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-zinc-900 dark:text-white">Export as CSV</span>
                      <span className="text-[10px] text-zinc-400">Spreadsheet table format</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button on Desktop */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE STATEMENT CONTAINER (ISOLATED AT 0,0 ON PAGE 1 DURING PRINT) */}
        <div id="monthly-report-printable" className="space-y-6 print:space-y-4">
          {/* PRINTABLE REPORT DOCUMENT HEADER */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 print:border-zinc-300">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
              Financial Statement
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {reportData.monthLabel}
            </h3>
            <p className="text-xs text-zinc-500">
              Period: {formatDisplayDate(reportData.monthStartDate)} to{' '}
              {formatDisplayDate(reportData.monthEndDate)} &bull; {reportData.transactionCount} transactions recorded
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">SD-Ledger</span>
            <span className="block text-[11px] text-zinc-400 font-mono">
              Generated: {todayStr} (IST)
            </span>
          </div>
        </div>

        {/* 6 KEY METRICS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Opening Balance */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Opening Balance
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white">
              {formatINR(reportData.openingBalance)}
            </p>
            <span className="text-[10px] text-zinc-400">As of 1st {reportData.monthLabel.split(' ')[0]}</span>
          </div>

          {/* 2. Total Income */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Total Income
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{formatINR(reportData.totalIncome)}
            </p>
            <span className="text-[10px] text-zinc-400">Credits during month</span>
          </div>

          {/* 3. Total Expenses */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Total Expenses
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
              -{formatINR(reportData.totalExpenses)}
            </p>
            <span className="text-[10px] text-zinc-400">Debits during month</span>
          </div>

          {/* 4. Net Savings */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Net Savings
            </span>
            <p
              className={`mt-1 text-base sm:text-lg font-bold font-mono ${
                reportData.netSavings >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {reportData.netSavings >= 0 ? '+' : ''}
              {formatINR(reportData.netSavings)}
            </p>
            <span className="text-[10px] text-zinc-400">Income minus expenses</span>
          </div>

          {/* 5. Savings Rate */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Savings Rate
            </span>
            <p
              className={`mt-1 text-base sm:text-lg font-bold font-mono ${
                reportData.savingsRate >= 20
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : reportData.savingsRate >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {reportData.savingsRate}%
            </p>
            <span className="text-[10px] text-zinc-400">Of monthly earnings</span>
          </div>

          {/* 6. Closing Balance */}
          <div className="rounded-2xl border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
              Closing Balance
            </span>
            <p className="mt-1 text-base sm:text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
              {formatINR(reportData.closingBalance)}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">As of month end</span>
          </div>
        </div>

        {/* SECTION 1: ACCOUNT-WISE BALANCE CHANGES TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Account-wise Balance Changes</span>
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              {reportData.accountBreakdown.length} Accounts
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/70 dark:bg-zinc-900/70 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3 font-mono text-right">Opening</th>
                  <th className="py-2.5 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400">Inflow (+)</th>
                  <th className="py-2.5 px-3 font-mono text-right text-rose-600 dark:text-rose-400">Outflow (-)</th>
                  <th className="py-2.5 px-3 font-mono text-right font-bold text-zinc-900 dark:text-white">Closing</th>
                  <th className="py-2.5 px-3 font-mono text-right">Net Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono">
                {reportData.accountBreakdown.map((acc) => (
                  <tr key={acc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-2.5 px-3 font-sans font-semibold text-zinc-900 dark:text-white">
                      {acc.name}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {formatINR(acc.opening)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      +{formatINR(acc.inflow)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                      -{formatINR(acc.outflow)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-zinc-900 dark:text-white">
                      {formatINR(acc.closing)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        acc.netChange >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {acc.netChange >= 0 ? '+' : ''}
                      {formatINR(acc.netChange)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: CATEGORY BREAKDOWN TABLE & BARS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Spending by Category Breakdown</span>
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              Total Spent: {formatINR(reportData.totalExpenses)}
            </span>
          </div>

          {reportData.categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              No expenses recorded in {reportData.monthLabel}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportData.categoryBreakdown.map((cat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-3 bg-zinc-50/40 dark:bg-zinc-900/30"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-zinc-900 dark:text-white truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ({cat.count} txns)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {formatINR(cat.amount)}
                      </span>
                      <span className="rounded-md bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, cat.percentage)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: INTER-ACCOUNT TRANSFERS SUMMARY */}
        {reportData.transferCount > 0 && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Inter-Account Transfers
                </span>
                <span className="text-zinc-500 text-[11px]">
                  Internal funds transferred between active ledger accounts
                </span>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="font-bold text-zinc-900 dark:text-white">
                {formatINR(reportData.transferVolume)}
              </span>
              <span className="text-[10px] text-zinc-400 block">
                {reportData.transferCount} transfers
              </span>
            </div>
          </div>
        )}

        {/* SECTION 4: ITEMIZED MONTHLY TRANSACTIONS LEDGER */}
        <div
          className={`space-y-3 ${
            includeTransactionsInPdf
              ? 'print:block print-page-break-before'
              : 'print:hidden'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Itemized Transactions Ledger ({reportData.transactionCount})</span>
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              {reportData.monthLabel}
            </span>
          </div>

          {reportData.monthTxs.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              No transactions recorded in {reportData.monthLabel}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-h-[420px] overflow-y-auto print:max-h-none print:overflow-visible print:border print:border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 print:static print:bg-zinc-100 print:text-black">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category / Title</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-xs print:divide-zinc-300">
                  {reportData.monthTxs.map((t) => {
                    const fromAcc = t.from_account_id ? accountMap.get(t.from_account_id)?.display_name : null;
                    const toAcc = t.to_account_id ? accountMap.get(t.to_account_id)?.display_name : null;
                    const accountLabel =
                      t.type === 'TRANSFER'
                        ? `${fromAcc || 'Unknown'} → ${toAcc || 'Unknown'}`
                        : t.type === 'INCOME'
                        ? toAcc || 'Income Account'
                        : fromAcc || 'Payment Account';

                    return (
                      <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-2.5 px-3 font-sans text-zinc-600 dark:text-zinc-400 text-[11px] whitespace-nowrap">
                          {formatDisplayDate(t.transaction_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              t.type === 'INCOME'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : t.type === 'EXPENSE'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-900 dark:text-white">
                          <div className="font-semibold text-xs truncate max-w-[180px] sm:max-w-[260px]">
                            {t.category || t.description || 'Uncategorized'}
                          </div>
                          {t.description && t.description !== t.category && (
                            <div className="text-[10px] text-zinc-400 truncate max-w-[180px] sm:max-w-[260px]">
                              {t.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-600 dark:text-zinc-400 text-[11px] truncate max-w-[130px]">
                          {accountLabel}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold font-mono text-xs whitespace-nowrap ${
                            t.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : t.type === 'EXPENSE'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}
                          {formatINR(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>

        {/* FOOTER */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400 print:hidden">
          <span>SD-Ledger &bull; Verified Monthly Financial Report</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

