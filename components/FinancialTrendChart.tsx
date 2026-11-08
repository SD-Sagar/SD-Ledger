'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Account, Transaction, TransactionType } from '../lib/types';
import { formatINR, formatDisplayDate, getTodayKolkata } from '../lib/utils/formatters';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/constants';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ChevronDown,
  PieChart,
  Sparkles,
} from 'lucide-react';

interface FinancialTrendChartProps {
  accounts: Account[];
  transactions: Transaction[];
}

type MetricType = 'BALANCE' | 'EXPENSE' | 'CREDIT';
type TimeHorizon = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartPoint {
  date: string; // YYYY-MM-DD
  displayDate: string;
  value: number;
}

// Indian compact currency formatting (e.g. ₹54.2k, ₹1.2L)
function formatCompactINR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export function FinancialTrendChart({ accounts, transactions }: FinancialTrendChartProps) {
  const [metric, setMetric] = useState<MetricType>('BALANCE');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('1M');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [chartMode, setChartMode] = useState<'trend' | 'donut'>('trend');
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string;
    amount: number;
    color: string;
    count: number;
    percent: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date object in local midnight
  const parseYMD = (ymd: string): Date => {
    const parts = ymd.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1);
  };

  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Today string
  const todayStr = useMemo(() => getTodayKolkata(), []);

  // Compute daily series
  const dataPoints = useMemo<ChartPoint[]>(() => {
    if (accounts.length === 0) return [];

    const today = parseYMD(todayStr);

    // Determine start date based on timeHorizon
    let startDate = new Date(today);
    switch (timeHorizon) {
      case '1W':
        startDate.setDate(today.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case 'ALL': {
        // Earliest opening date across active accounts or earliest tx
        let earliestYMD = todayStr;
        accounts.forEach((a) => {
          if (a.opening_date && a.opening_date < earliestYMD) {
            earliestYMD = a.opening_date;
          }
        });
        transactions.forEach((t) => {
          if (t.transaction_date && t.transaction_date < earliestYMD) {
            earliestYMD = t.transaction_date;
          }
        });
        startDate = parseYMD(earliestYMD);
        // Ensure at least 7 days span for rendering
        if (startDate.getTime() >= today.getTime() - 7 * 86400000) {
          startDate.setDate(today.getDate() - 7);
        }
        break;
      }
    }

    const startYMD = formatYMD(startDate);

    // Filter relevant transactions (non-deleted)
    const validTxs = transactions.filter((t) => !t.is_deleted);

    // Target accounts
    const targetAccounts = selectedAccountId === 'ALL'
      ? accounts
      : accounts.filter((a) => a.id === selectedAccountId);

    const targetAccountIds = new Set(targetAccounts.map((a) => a.id));

    // Generate list of days from startDate to today
    const days: string[] = [];
    const cur = new Date(startDate);
    while (cur <= today) {
      days.push(formatYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }

    if (days.length === 0) {
      days.push(todayStr);
    }

    // Group transactions by date
    const txByDate = new Map<string, Transaction[]>();
    validTxs.forEach((t) => {
      const arr = txByDate.get(t.transaction_date) || [];
      arr.push(t);
      txByDate.set(t.transaction_date, arr);
    });

    if (metric === 'BALANCE') {
      // Calculate starting balance prior to startYMD
      let runningBalance = 0;

      // Add opening balances of accounts opened on or before startYMD
      targetAccounts.forEach((acc) => {
        runningBalance += acc.opening_balance;
      });

      // Factor in all transactions BEFORE startYMD
      validTxs.forEach((t) => {
        if (t.transaction_date < startYMD) {
          if (selectedAccountId === 'ALL') {
            if (t.type === 'INCOME') runningBalance += t.amount;
            else if (t.type === 'EXPENSE') runningBalance -= t.amount;
            // Internal transfers cancel out when ALL accounts selected
          } else {
            // Specific account
            if (t.type === 'INCOME' && t.to_account_id === selectedAccountId) {
              runningBalance += t.amount;
            } else if (t.type === 'EXPENSE' && t.from_account_id === selectedAccountId) {
              runningBalance -= t.amount;
            } else if (t.type === 'TRANSFER') {
              if (t.to_account_id === selectedAccountId) runningBalance += t.amount;
              if (t.from_account_id === selectedAccountId) runningBalance -= t.amount;
            }
          }
        }
      });

      // Now iterate through days and build running balance
      const points: ChartPoint[] = [];
      days.forEach((day) => {
        const dayTxs = txByDate.get(day) || [];
        dayTxs.forEach((t) => {
          if (selectedAccountId === 'ALL') {
            if (t.type === 'INCOME') runningBalance += t.amount;
            else if (t.type === 'EXPENSE') runningBalance -= t.amount;
          } else {
            if (t.type === 'INCOME' && t.to_account_id === selectedAccountId) {
              runningBalance += t.amount;
            } else if (t.type === 'EXPENSE' && t.from_account_id === selectedAccountId) {
              runningBalance -= t.amount;
            } else if (t.type === 'TRANSFER') {
              if (t.to_account_id === selectedAccountId) runningBalance += t.amount;
              if (t.from_account_id === selectedAccountId) runningBalance -= t.amount;
            }
          }
        });

        points.push({
          date: day,
          displayDate: formatDisplayDate(day),
          value: Math.round(runningBalance * 100) / 100,
        });
      });

      return points;
    } else if (metric === 'EXPENSE') {
      // Cumulative or daily expenses in this period
      let cumulativeExpense = 0;
      const points: ChartPoint[] = [];

      days.forEach((day) => {
        const dayTxs = txByDate.get(day) || [];
        dayTxs.forEach((t) => {
          if (t.type === 'EXPENSE') {
            if (selectedAccountId === 'ALL' || t.from_account_id === selectedAccountId) {
              cumulativeExpense += t.amount;
            }
          }
        });

        points.push({
          date: day,
          displayDate: formatDisplayDate(day),
          value: Math.round(cumulativeExpense * 100) / 100,
        });
      });

      return points;
    } else {
      // CREDIT (Income)
      let cumulativeCredit = 0;
      const points: ChartPoint[] = [];

      days.forEach((day) => {
        const dayTxs = txByDate.get(day) || [];
        dayTxs.forEach((t) => {
          if (t.type === 'INCOME') {
            if (selectedAccountId === 'ALL' || t.to_account_id === selectedAccountId) {
              cumulativeCredit += t.amount;
            }
          }
        });

        points.push({
          date: day,
          displayDate: formatDisplayDate(day),
          value: Math.round(cumulativeCredit * 100) / 100,
        });
      });

      return points;
    }
  }, [accounts, transactions, metric, selectedAccountId, timeHorizon, todayStr]);

  // Current display value (hovered point or latest point)
  const currentPoint = useMemo(() => {
    if (hoveredPoint) return hoveredPoint;
    if (dataPoints.length > 0) return dataPoints[dataPoints.length - 1];
    return { date: todayStr, displayDate: formatDisplayDate(todayStr), value: 0 };
  }, [hoveredPoint, dataPoints, todayStr]);

  // Net change across the period
  const periodChange = useMemo(() => {
    if (dataPoints.length < 2) return { diff: 0, percent: 0, isPositive: true };
    const firstVal = dataPoints[0].value;
    const lastVal = currentPoint.value;
    const diff = lastVal - firstVal;
    const percent = firstVal !== 0 ? (diff / Math.abs(firstVal)) * 100 : 0;
    return {
      diff,
      percent: Math.round(percent * 10) / 10,
      isPositive: diff >= 0,
    };
  }, [dataPoints, currentPoint]);

  // SVG Geometry Calculation
  const svgWidth = 800;
  const svgHeight = 240;
  const padding = { top: 22, right: 48, bottom: 35, left: 18 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const { pathD, areaD, pointsMap, minVal, maxVal } = useMemo(() => {
    if (dataPoints.length === 0) {
      return { pathD: '', areaD: '', pointsMap: [], minVal: 0, maxVal: 0 };
    }

    const values = dataPoints.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);

    // Ensure a reasonable non-zero delta
    if (min === max) {
      min = min > 0 ? min * 0.9 : -100;
      max = max > 0 ? max * 1.1 : 100;
    }

    // Add 10% breathing headroom on top and bottom
    const range = max - min;
    const plotMin = min - range * 0.08;
    const plotMax = max + range * 0.08;
    const plotRange = plotMax - plotMin || 1;

    const coords = dataPoints.map((pt, i) => {
      const x = padding.left + (i / Math.max(1, dataPoints.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((pt.value - plotMin) / plotRange) * plotHeight;
      return { x, y, pt };
    });

    // Build smooth Catmull-Rom or Bezier path
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const baselineY = padding.top + plotHeight;
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const area = `${d} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { pathD: d, areaD: area, pointsMap: coords, minVal: min, maxVal: max };
  }, [dataPoints, plotWidth, plotHeight, padding]);

  // Color theme: Emerald for balance/credit, Rose for expense or negative balance
  const isThemePositive = metric === 'EXPENSE' ? false : periodChange.isPositive;

  // Refined dual-gradient palette for subtle, glowing fintech aesthetics
  const startColor =
    metric === 'EXPENSE'
      ? '#f59e0b' // Amber
      : metric === 'CREDIT'
      ? '#06b6d4' // Cyan
      : isThemePositive
      ? '#10b981' // Emerald
      : '#fb7185'; // Soft Rose

  const endColor =
    metric === 'EXPENSE'
      ? '#f43f5e' // Rose
      : metric === 'CREDIT'
      ? '#10b981' // Emerald
      : isThemePositive
      ? '#14b8a6' // Teal
      : '#e11d48'; // Rose red

  const gradientId = `trendGradient_${metric}_${isThemePositive ? 'pos' : 'neg'}`;
  const lineGradId = `lineGrad_${metric}_${isThemePositive ? 'pos' : 'neg'}`;

  // Interactive scrubber handling
  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current || pointsMap.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));

    const targetIdx = Math.round(ratio * (pointsMap.length - 1));
    const matched = pointsMap[targetIdx];
    if (matched) {
      setHoveredPoint(matched.pt);
    }
  }, [pointsMap]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const onPointerLeave = () => {
    setHoveredPoint(null);
  };

  // Active point coordinates for crosshair
  const activeCoord = useMemo(() => {
    if (!hoveredPoint) return null;
    return pointsMap.find((c) => c.pt.date === hoveredPoint.date) || null;
  }, [hoveredPoint, pointsMap]);

  // High, Low, Average statistics for the period
  const stats = useMemo(() => {
    if (dataPoints.length === 0) return { high: 0, low: 0, avg: 0 };
    const vals = dataPoints.map((p) => p.value);
    const high = Math.max(...vals);
    const low = Math.min(...vals);
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    return { high, low, avg };
  }, [dataPoints]);

  // Milestone Date ticks for X axis (3 to 5 evenly spaced)
  const dateMilestones = useMemo(() => {
    if (dataPoints.length === 0) return [];
    if (dataPoints.length <= 4) {
      return dataPoints.map((p, i) => ({
        label: p.date.substring(5), // MM-DD
        x: padding.left + (i / Math.max(1, dataPoints.length - 1)) * plotWidth,
      }));
    }
    const step = Math.floor((dataPoints.length - 1) / 4);
    const indices = [0, step, step * 2, step * 3, dataPoints.length - 1];
    return indices.map((idx) => {
      const p = dataPoints[idx];
      return {
        label: p.date.substring(5),
        x: padding.left + (idx / (dataPoints.length - 1)) * plotWidth,
      };
    });
  }, [dataPoints, plotWidth, padding.left]);

  // Date range bounds for the selected timeHorizon
  const horizonStartDateStr = useMemo(() => {
    const today = parseYMD(todayStr);
    const startDate = new Date(today);
    switch (timeHorizon) {
      case '1W': startDate.setDate(today.getDate() - 7); break;
      case '1M': startDate.setMonth(today.getMonth() - 1); break;
      case '3M': startDate.setMonth(today.getMonth() - 3); break;
      case '6M': startDate.setMonth(today.getMonth() - 6); break;
      case '1Y': startDate.setFullYear(today.getFullYear() - 1); break;
      case 'ALL':
      default:
        startDate.setMonth(today.getMonth() - 6); break;
    }
    return formatYMD(startDate);
  }, [todayStr, timeHorizon]);

  // Category breakdown calculation (Spending by Category)
  const categoryData = useMemo(() => {
    const isIncome = metric === 'CREDIT';
    const targetType: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';
    const predefinedList = isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES;
    const predefinedMap = new Map<string, { label: string; color: string }>();
    predefinedList.forEach((c) => {
      predefinedMap.set(c.label.toLowerCase(), { label: c.label, color: c.color });
      predefinedMap.set(c.id.toLowerCase(), { label: c.label, color: c.color });
    });
    // Support common aliases for friend dues and khata settlements
    if (isIncome) {
      predefinedMap.set('debt repayment / khata', { label: 'Debt Recovery / Khata', color: '#10b981' });
      predefinedMap.set('debt recovery / khata', { label: 'Debt Recovery / Khata', color: '#10b981' });
    } else {
      predefinedMap.set('lending / dues', { label: 'Lending & Dues', color: '#0ea5e9' });
      predefinedMap.set('lending & dues', { label: 'Lending & Dues', color: '#0ea5e9' });
      predefinedMap.set('borrowing / dues', { label: 'Lending & Dues', color: '#0ea5e9' });
    }

    const targetAccountIds = selectedAccountId === 'ALL'
      ? null
      : new Set([selectedAccountId]);

    const catSums = new Map<string, { name: string; amount: number; color: string; count: number }>();
    let total = 0;

    transactions.forEach((t) => {
      if (t.is_deleted || t.type !== targetType) return;
      if (t.transaction_date < horizonStartDateStr || t.transaction_date > todayStr) return;

      if (targetAccountIds) {
        const inFrom = t.from_account_id ? targetAccountIds.has(t.from_account_id) : false;
        const inTo = t.to_account_id ? targetAccountIds.has(t.to_account_id) : false;
        if (!inFrom && !inTo) return;
      }

      total += t.amount;
      const raw = (t.category || '').trim();
      const match = raw ? predefinedMap.get(raw.toLowerCase()) : null;

      // Rule: if not in already given options, it automatically groups into 'Other / Miscellaneous'
      const key = match ? match.label : (isIncome ? 'Other Income' : 'Other / Miscellaneous');
      const color = match ? match.color : '#64748b';

      const existing = catSums.get(key) || { name: key, amount: 0, color, count: 0 };
      existing.amount += t.amount;
      existing.count += 1;
      catSums.set(key, existing);
    });

    const items = Array.from(catSums.values())
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((i) => ({
        ...i,
        percent: total > 0 ? (i.amount / total) * 100 : 0,
      }));

    return { items, total, isIncome };
  }, [transactions, metric, selectedAccountId, horizonStartDateStr, todayStr]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 shadow-xl dark:shadow-2xl transition-all">
      {/* BACKGROUND GLOW */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${
          isThemePositive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* HEADER SECTION: METRICS & CONTROLS */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
        {/* BIG VALUE & CHANGE (GROWW STYLE) */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {chartMode === 'donut' ? (
              <PieChart className={`h-4 w-4 ${categoryData.isIncome ? 'text-emerald-500' : 'text-amber-500'}`} />
            ) : (
              <Activity className={`h-4 w-4 ${isThemePositive ? 'text-emerald-500' : 'text-rose-500'}`} />
            )}
            <span>
              {chartMode === 'donut'
                ? categoryData.isIncome
                  ? 'Total Income by Source'
                  : 'Spending by Category'
                : metric === 'BALANCE'
                ? 'Total Ledger Balance'
                : metric === 'EXPENSE'
                ? 'Total Expenses Over Period'
                : 'Total Credits Over Period'}
            </span>
            <span className="rounded bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
              {timeHorizon}
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-3 flex-wrap">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-white">
              {chartMode === 'donut' ? formatINR(categoryData.total) : formatINR(currentPoint.value)}
            </h2>

            {chartMode === 'donut' ? (
              <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {categoryData.items.length} Active {categoryData.items.length === 1 ? 'Category' : 'Categories'}
                </span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${
                  periodChange.isPositive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                }`}
              >
                {periodChange.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {periodChange.isPositive ? '+' : ''}
                  {formatINR(periodChange.diff, true)} ({periodChange.isPositive ? '+' : ''}
                  {periodChange.percent}%)
                </span>
              </div>
            )}
          </div>

          {/* ACTIVE DATE INDICATOR */}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {chartMode === 'donut' ? (
                <>
                  Horizon: <strong className="text-zinc-800 dark:text-zinc-200">{horizonStartDateStr} to {todayStr}</strong>
                </>
              ) : hoveredPoint ? (
                <>
                  Point in Time: <strong className="text-zinc-800 dark:text-zinc-200">{hoveredPoint.displayDate}</strong>
                </>
              ) : (
                <>
                  Live Position: <strong className="text-zinc-800 dark:text-zinc-200">Current Today</strong>
                </>
              )}
            </span>
          </p>
        </div>

        {/* METRIC & ACCOUNT TOGGLES */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {/* IN-BOX SWITCH: TREND WAVE vs SPENDING BY CATEGORY DONUT */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setChartMode('trend');
                if (metric !== 'BALANCE' && metric !== 'EXPENSE' && metric !== 'CREDIT') setMetric('BALANCE');
              }}
              title="Switch to Trend Wave Chart"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                chartMode === 'trend'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Trend</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChartMode('donut');
                if (metric === 'BALANCE') setMetric('EXPENSE');
              }}
              title="Switch to Spending by Category Donut"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                chartMode === 'donut'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>Categories</span>
            </button>
          </div>

          {/* METRIC SEGMENTED PILL */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            {chartMode === 'trend' && (
              <button
                type="button"
                onClick={() => setMetric('BALANCE')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  metric === 'BALANCE'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Balance
              </button>
            )}
            <button
              type="button"
              onClick={() => setMetric('EXPENSE')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                metric === 'EXPENSE'
                  ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setMetric('CREDIT')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                metric === 'CREDIT'
                  ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {chartMode === 'donut' ? 'Income' : 'Credits'}
            </button>
          </div>

          {/* ACCOUNT SELECTOR DROPDOWN */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 py-1.5 pl-3 pr-8 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Accounts ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.display_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* VIEW: DONUT CHART OR TREND WAVE */}
      {chartMode === 'donut' ? (
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-6 py-2 min-h-[230px]">
          {categoryData.items.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-10 text-center text-zinc-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-3 text-zinc-500">
                <PieChart className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No {categoryData.isIncome ? 'income' : 'expenses'} found in this period
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Log a transaction or change the time horizon pills below to see category breakdowns.
              </p>
            </div>
          ) : (
            <>
              {/* Donut Graphic with Interactive Center Hole */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="h-52 w-52 sm:h-56 sm:w-56 overflow-visible -rotate-90 select-none"
                >
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="24"
                    className="text-zinc-100 dark:text-zinc-900/60"
                  />

                  {/* Slices */}
                  {(() => {
                    const C = 2 * Math.PI * 68;
                    let accum = 0;
                    return categoryData.items.map((cat, idx) => {
                      const sliceLen = Math.max(1, (cat.percent / 100) * C - (categoryData.items.length > 1 ? 3 : 0));
                      const offset = -accum;
                      accum += (cat.percent / 100) * C;
                      const isHovered = hoveredCategory?.name === cat.name;

                      return (
                        <circle
                          key={idx}
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke={cat.color}
                          strokeWidth={isHovered ? 29 : 24}
                          strokeDasharray={`${sliceLen} ${C - sliceLen}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          onMouseEnter={() => setHoveredCategory(cat)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          className="cursor-pointer transition-all duration-200 hover:opacity-90"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Center Content */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate max-w-[120px]">
                    {hoveredCategory ? hoveredCategory.name : categoryData.isIncome ? 'Total Income' : 'Total Spent'}
                  </span>
                  <span className="mt-0.5 text-base sm:text-lg font-extrabold font-mono text-zinc-900 dark:text-white">
                    {formatINR(hoveredCategory ? hoveredCategory.amount : categoryData.total)}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {hoveredCategory
                      ? `${hoveredCategory.percent.toFixed(1)}% of total`
                      : `${categoryData.items.length} ${categoryData.items.length === 1 ? 'Category' : 'Categories'}`}
                  </span>
                </div>
              </div>

              {/* Category Breakdown List with Progress Bars (Image 1 Style) */}
              <div className="w-full flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {categoryData.items.map((cat, idx) => {
                  const isHovered = hoveredCategory?.name === cat.name;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`group cursor-pointer rounded-2xl border p-2.5 transition-all ${
                        isHovered
                          ? 'border-emerald-500/40 bg-zinc-50 dark:bg-zinc-900 shadow-sm'
                          : 'border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            ({cat.count})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {formatINR(cat.amount)}
                          </span>
                          <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                            {cat.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Mini visual proportion bar */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(2, cat.percent)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        onMouseLeave={onPointerLeave}
        onTouchEnd={onPointerLeave}
        className="relative mt-4 w-full cursor-crosshair select-none touch-none"
        style={{ height: '230px' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <defs>
            {/* Smooth 4-Stop Vertical Gradient for Area */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={startColor} stopOpacity={0.32} />
              <stop offset="35%" stopColor={endColor} stopOpacity={0.14} />
              <stop offset="70%" stopColor={endColor} stopOpacity={0.03} />
              <stop offset="100%" stopColor={endColor} stopOpacity={0.0} />
            </linearGradient>

            {/* Horizontal Line Gradient */}
            <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
          </defs>

          {/* DOTTED HORIZONTAL GRIDLINES WITH RIGHT-ALIGNED COMPACT VALUE LABELS */}
          <g className="opacity-70 dark:opacity-60">
            {/* Top Gridline */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={svgWidth - padding.right}
              y2={padding.top}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <text
              x={svgWidth - padding.right + 6}
              y={padding.top + 3}
              textAnchor="start"
              className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[9px] font-semibold"
            >
              {formatCompactINR(maxVal)}
            </text>

            {/* Mid Gridline */}
            <line
              x1={padding.left}
              y1={padding.top + plotHeight / 2}
              x2={svgWidth - padding.right}
              y2={padding.top + plotHeight / 2}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <text
              x={svgWidth - padding.right + 6}
              y={padding.top + plotHeight / 2 + 3}
              textAnchor="start"
              className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[9px] font-semibold"
            >
              {formatCompactINR((maxVal + minVal) / 2)}
            </text>

            {/* Bottom Gridline */}
            <line
              x1={padding.left}
              y1={padding.top + plotHeight}
              x2={svgWidth - padding.right}
              y2={padding.top + plotHeight}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <text
              x={svgWidth - padding.right + 6}
              y={padding.top + plotHeight + 3}
              textAnchor="start"
              className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[9px] font-semibold"
            >
              {formatCompactINR(minVal)}
            </text>
          </g>

          {/* GRADIENT FILL AREA UNDER CURVE */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#${gradientId})`}
              className="transition-all duration-300"
            />
          )}

          {/* CRISP SHARP FOREGROUND TRENDLINE */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${lineGradId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* INTERACTIVE CROSSHAIR & GLOWING RADAR DOT */}
          {activeCoord && (
            <>
              {/* Vertical Dashed Guide Line */}
              <line
                x1={activeCoord.x}
                y1={padding.top}
                x2={activeCoord.x}
                y2={padding.top + plotHeight}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="text-zinc-400 dark:text-zinc-600 animate-in fade-in"
              />

              {/* Glowing Outer Ping Radar */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="8"
                fill={startColor}
                opacity="0.35"
                className="animate-ping"
              />

              {/* Outer Ring */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="6"
                fill="white"
                stroke={startColor}
                strokeWidth="2.5"
                className="dark:fill-zinc-950 shadow-md"
              />

              {/* Inner Glowing Center Dot */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="2.5"
                fill={endColor}
              />
            </>
          )}

          {/* X AXIS DATE MILESTONES */}
          {dateMilestones.map((m, idx) => (
            <text
              key={idx}
              x={m.x}
              y={svgHeight - 8}
              textAnchor={idx === 0 ? 'start' : idx === dateMilestones.length - 1 ? 'end' : 'middle'}
              className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px] font-medium"
            >
              {m.label}
            </text>
          ))}
        </svg>

        {/* FLOATING SCRUBBER TOOLTIP (CLAMPED & RESPONSIVE) */}
        {activeCoord && (
          <div
            className="pointer-events-none absolute -top-3 z-30 -translate-x-1/2 rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 px-3 py-1.5 shadow-xl backdrop-blur-xl text-xs font-mono transition-all animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.min(86, Math.max(14, (activeCoord.x / svgWidth) * 100))}%`,
            }}
          >
            <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: startColor }} />
                <span>{activeCoord.pt.displayDate}</span>
              </span>
              {dataPoints[0] && (
                <span
                  className={`font-semibold ${
                    activeCoord.pt.value >= dataPoints[0].value
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {activeCoord.pt.value >= dataPoints[0].value ? '+' : ''}
                  {formatINR(activeCoord.pt.value - dataPoints[0].value)}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
              {formatINR(activeCoord.pt.value)}
            </p>
          </div>
        )}
      </div>
      )}

      {/* BOTTOM CONTROLS: STATS STRIP & TIME HORIZON PILLS */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
        {/* Sleek Period Statistics (High / Low / Average) */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">High</span>
            <strong className="text-zinc-800 dark:text-zinc-200">{formatCompactINR(stats.high)}</strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Low</span>
            <strong className="text-zinc-800 dark:text-zinc-200">{formatCompactINR(stats.low)}</strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700 hidden md:inline">•</span>
          <span className="hidden md:flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Avg</span>
            <strong className="text-zinc-800 dark:text-zinc-200">{formatCompactINR(stats.avg)}</strong>
          </span>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
          {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setTimeHorizon(h)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                timeHorizon === h
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
