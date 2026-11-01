'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Delete,
  Copy,
  Check,
  Calculator,
  CornerDownLeft,
  Percent,
  Plus,
  Minus,
  Divide,
  X as Multiply,
} from 'lucide-react';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCalculatorModal({ isOpen, onClose }: QuickCalculatorModalProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [expression, setExpression] = useState('');
  const [copied, setCopied] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Clear all
  const handleClear = useCallback(() => {
    setDisplayValue('0');
    setExpression('');
    setJustCalculated(false);
  }, []);

  // Backspace
  const handleBackspace = useCallback(() => {
    if (justCalculated) {
      handleClear();
      return;
    }
    setDisplayValue((prev) => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  }, [justCalculated, handleClear]);

  // Append digit or decimal
  const handleDigit = useCallback(
    (digit: string) => {
      setDisplayValue((prev) => {
        if (justCalculated) {
          setJustCalculated(false);
          setExpression('');
          return digit === '.' ? '0.' : digit;
        }
        if (prev === '0' && digit !== '.') return digit;
        if (digit === '.' && prev.includes('.')) return prev;
        if (prev.length >= 14) return prev; // Limit display length
        return prev + digit;
      });
    },
    [justCalculated]
  );

  // Safely evaluate math expression string
  const evaluateMath = (expr: string): number | null => {
    try {
      // Replace visual signs with JavaScript operators
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[^-()\d/*+.]/g, '');
      if (!sanitized) return null;
      // Use Function constructor in isolated scope for simple arithmetic only
      const fn = new Function(`'use strict'; return (${sanitized})`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return Math.round(val * 10000) / 10000;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Handle operator (+, -, ×, ÷)
  const handleOperator = useCallback(
    (op: string) => {
      if (displayValue === 'Error') return;

      if (justCalculated) {
        setJustCalculated(false);
        setExpression(`${displayValue} ${op} `);
        setDisplayValue('0');
        return;
      }

      if (expression && !expression.endsWith(' ')) {
        const fullExpr = expression + displayValue;
        const res = evaluateMath(fullExpr);
        if (res !== null) {
          setExpression(`${res} ${op} `);
          setDisplayValue('0');
          return;
        }
      }

      setExpression((prev) => `${prev}${displayValue} ${op} `);
      setDisplayValue('0');
    },
    [displayValue, expression, justCalculated]
  );

  // Equals / Calculate
  const handleEquals = useCallback(() => {
    if (!expression || displayValue === 'Error') return;
    const fullExpr = expression + displayValue;
    const result = evaluateMath(fullExpr);

    if (result !== null) {
      setExpression(`${fullExpr} =`);
      setDisplayValue(String(result));
      setJustCalculated(true);
    } else {
      setDisplayValue('Error');
      setJustCalculated(true);
    }
  }, [expression, displayValue]);

  // Percentage
  const handlePercent = useCallback(() => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      const result = val / 100;
      setDisplayValue(String(result));
    }
  }, [displayValue]);

  // Quick GST (+18%)
  const handleAddGst = useCallback(
    (percent: number) => {
      const val = parseFloat(displayValue);
      if (!isNaN(val)) {
        const gstAmount = val * (percent / 100);
        const total = Math.round((val + gstAmount) * 100) / 100;
        setExpression(`${val} + ${percent}% (${Math.round(gstAmount * 100) / 100}) =`);
        setDisplayValue(String(total));
        setJustCalculated(true);
      }
    },
    [displayValue]
  );

  // Toggle plus/minus
  const handleToggleSign = useCallback(() => {
    setDisplayValue((prev) => {
      if (prev === '0' || prev === 'Error') return prev;
      return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
    });
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (displayValue && displayValue !== 'Error') {
      navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [displayValue]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDigit('.');
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleOperator, handleEquals, handleBackspace, handlePercent, onClose]);

  if (!isOpen) return null;

  // Format large values with Indian thousand grouping
  const formatDisplay = (val: string) => {
    if (val === 'Error' || val.includes('e')) return val;
    const parts = val.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    const isNeg = integerPart.startsWith('-');
    const cleanInt = isNeg ? integerPart.slice(1) : integerPart;

    // Indian numbering formatting
    let lastThree = cleanInt.slice(-3);
    const otherNumbers = cleanInt.slice(0, -3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return (isNeg ? '-' : '') + formattedInt + decimalPart;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="relative w-full max-w-[340px] sm:max-w-[360px] overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                Quick Calculator
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Everyday ledger helper</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy Result"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="my-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3 text-right">
          <div className="min-h-[16px] text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
            {expression || '\u00A0'}
          </div>
          <div className="mt-0.5 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white truncate">
            {formatDisplay(displayValue)}
          </div>
        </div>

        {/* Financial Quick Helpers */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          <button
            type="button"
            onClick={() => handleAddGst(5)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            +5% GST
          </button>
          <button
            type="button"
            onClick={() => handleAddGst(12)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            +12% GST
          </button>
          <button
            type="button"
            onClick={() => handleAddGst(18)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            +18% GST
          </button>
          <button
            type="button"
            onClick={() => handlePercent()}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-0.5"
          >
            <Percent className="h-3 w-3" />
          </button>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 py-3 text-sm font-bold transition-all active:scale-95"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800/80 py-3 text-sm font-semibold transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleSign}
            className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800/80 py-3 text-sm font-semibold transition-all active:scale-95 font-mono"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-3 text-base font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            <Divide className="h-4 w-4" />
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-3 text-base font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            <Multiply className="h-4 w-4" />
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-3 text-base font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-3 text-base font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="col-span-2 rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono text-center pl-4"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleDigit('.')}
            className="rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 py-3 text-base font-semibold shadow-xs transition-all active:scale-95 font-mono"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/20 py-3 text-base font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

