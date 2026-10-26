'use client';

import React, { useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { ACCOUNT_COLORS } from '../lib/constants';
import { getTodayKolkata, formatINR } from '../lib/utils/formatters';
import {
  X,
  Building2,
  Calendar,
  Lock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const { addAccount } = useLedger();

  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankColor, setBankColor] = useState(ACCOUNT_COLORS[0].from);
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccountName('');
      setOpeningBalance('');
      setBankColor(ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)].from);
      setStartDate(getTodayKolkata());
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountName.trim()) {
      setError('Please provide an account name.');
      return;
    }

    const bal = parseFloat(openingBalance);
    if (isNaN(bal)) {
      setError('Opening balance must be a valid number (e.g. 0.00).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addAccount({
        name: accountName,
        balance: bal,
        color: bankColor,
        startDate,
      });

      if (res.success) {
        setSuccess(`Account "${accountName.trim()}" added successfully!`);
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccess(null);
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Failed to add account.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding account';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add New Account</h2>
              <p className="text-[11px] text-zinc-400">
                Track additional bank, wallet, or cash accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Reassurance */}
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-300">
          <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>No bank account numbers or credentials are ever stored.</span>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Account Display Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                autoFocus
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. ICICI Bank, Cash Wallet, Kotak 811"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Opening Balance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-base font-semibold text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-8 pr-4 text-base font-mono font-bold text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {openingBalance && !isNaN(parseFloat(openingBalance)) && (
              <p className="mt-1 text-xs text-emerald-400 font-mono">
                {formatINR(parseFloat(openingBalance))}
              </p>
            )}
          </div>

          {/* Starting Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Opening Tracking Date (Asia/Kolkata)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-3">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setBankColor(c.from)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    bankColor === c.from ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.from }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-950 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
